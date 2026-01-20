import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { getGateway, closeGateway } from "./gateway.js";
import cors from "cors";
import "dotenv/config";

const app = express();
const utf8Decoder = new TextDecoder();

// --- KONFIGURASI ENV & VALIDASI ---
const {
  JWT_SECRET,
  ADMIN_USERNAME,
  ADMIN_PASSWORD_HASH,
  CHANNEL_NAME,
  CHAINCODE_ID,
  PORT,
} = process.env;

if (!JWT_SECRET || !ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) {
  console.error("❌ ERROR: Konfigurasi keamanan (.env) tidak lengkap!");
  process.exit(1);
}

// --- STATE BLOCKCHAIN GLOBAL ---
let contract: any;

const initializeGateway = async () => {
  try {
    console.log(`🔗 Menghubungkan ke Hyperledger Fabric...`);
    const gateway = await getGateway();
    const network = gateway.getNetwork(CHANNEL_NAME);
    contract = network.getContract(CHAINCODE_ID);
    console.log(
      `✅ Blockchain Ready | Channel: ${CHANNEL_NAME} | Contract: ${CHAINCODE_ID}`,
    );
  } catch (err: any) {
    console.error("❌ Gagal inisialisasi Blockchain:", err.message);
    process.exit(1);
  }
};

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    file.mimetype === "application/pdf"
      ? cb(null, true)
      : cb(new Error("Hanya file PDF yang diperbolehkan"));
  },
});

// --- FUNGSI INTERNAL IPFS ---
async function uploadToIPFS(
  fileBuffer: Buffer,
  fileName: string,
): Promise<string> {
  const IPFS_URL = process.env.IPFS_API_URL || "http://localhost:5001/api/v0";
  const form = new FormData();
  form.append("file", fileBuffer, { filename: fileName });

  try {
    const response = await axios.post(`${IPFS_URL}/add`, form, {
      headers: { ...form.getHeaders() },
    });
    return response.data.Hash;
  } catch (error: any) {
    throw new Error(`IPFS_ERROR: ${error.message}`);
  }
}

// --- MIDDLEWARE AUTENTIKASI ---
interface AuthRequest extends Request {
  user?: any;
}
const authenticateUniversity = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token)
    return res.status(401).json({ error: "Akses ditolak. Silakan login." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res
      .status(403)
      .json({ error: "Sesi tidak valid atau telah berakhir." });
  }
};

// --- ENDPOINTS ---

// 1. LOGIN
app.post("/api/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const isUserMatch = username === ADMIN_USERNAME;
    const isPassMatch = await bcrypt.compare(
      password,
      ADMIN_PASSWORD_HASH || "",
    );

    if (isUserMatch && isPassMatch) {
      const token = jwt.sign(
        { username, role: "ADMIN", mspId: process.env.MSP_ID || "Org1MSP" },
        JWT_SECRET,
        { expiresIn: "1h" },
      );
      return res.json({ token });
    }
    res.status(401).json({ error: "Username atau Password salah!" });
  } catch (err) {
    res.status(500).json({ error: "Gagal memproses login." });
  }
});

// 2. ISSUE (PENERBITAN)
app.post(
  "/api/issue",
  authenticateUniversity,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    console.log(`[ISSUE] Memulai proses ID: ${req.body.id}`);
    try {
      if (!req.file)
        return res.status(400).json({ error: "File PDF wajib disertakan." });

      const validatedData = z
        .object({
          id: z.string().min(5),
          studentName: z.string().min(1),
          nim: z.string().regex(/^\d+$/),
          degree: z.string().min(1),
        })
        .parse(req.body);

      const ipfsHash = await uploadToIPFS(
        req.file.buffer,
        req.file.originalname,
      );
      console.log(`[IPFS] Berhasil upload: ${ipfsHash}`);

      await contract.submitTransaction(
        "issueCertificate",
        validatedData.id,
        validatedData.studentName,
        validatedData.nim,
        validatedData.degree,
        ipfsHash,
      );

      res.json({
        message: "Ijazah sukses diamankan!",
        id: validatedData.id,
        ipfsHash,
      });
    } catch (err: any) {
      console.error("[ISSUE ERROR]", err.message);
      const status = err.message.includes("VALIDATION") ? 400 : 500;
      res.status(status).json({ error: err.message });
    }
  },
);

// 3. VERIFY (QUERY)
app.get("/api/verify/:id", async (req: Request, res: Response) => {
  try {
    const resultBytes = await contract.evaluateTransaction(
      "queryCertificate",
      req.params.id,
    );
    res.json(JSON.parse(utf8Decoder.decode(resultBytes)));
  } catch (error) {
    res.status(404).json({ error: "Ijazah tidak terdaftar di Blockchain." });
  }
});

// 4. HISTORY (AUDIT)
app.get("/api/history/:id", async (req: Request, res: Response) => {
  try {
    console.log(`[AUDIT] Fetching history for: ${req.params.id}`);
    const resultBytes = await contract.evaluateTransaction(
      "getCertificateHistory",
      req.params.id,
    );
    res.json(JSON.parse(utf8Decoder.decode(resultBytes)));
  } catch (error) {
    res.status(404).json({ error: "Gagal mengambil riwayat audit." });
  }
});

// --- ENDPOINT BARU: VERIFIKASI DENGAN FILE ---
app.post(
  "/api/verify-file",
  upload.single("file"), // Multer kembali bekerja di sini
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "File PDF wajib diunggah." });
      }

      // 1. Hitung Hash (CID) dari file yang diunggah
      // Kita gunakan parameter 'only-hash=true' agar IPFS tidak menyimpan file duplikat
      const IPFS_URL =
        process.env.IPFS_API_URL || "http://localhost:5001/api/v0";
      const form = new FormData();
      form.append("file", req.file.buffer, { filename: req.file.originalname });

      const ipfsResponse = await axios.post(
        `${IPFS_URL}/add?only-hash=true`,
        form,
        {
          headers: { ...form.getHeaders() },
        },
      );

      const uploadedFileHash = ipfsResponse.data.Hash;

      // 2. Cari metadata di Blockchain berdasarkan ID yang dikirim di body
      // (User tetap memasukkan ID untuk mempercepat lookup)
      const certId = req.body.id;
      if (!certId) {
        return res.status(400).json({ error: "ID Ijazah wajib disertakan." });
      }

      const resultBytes = await contract.evaluateTransaction(
        "queryCertificate",
        certId,
      );
      const blockchainData = JSON.parse(utf8Decoder.decode(resultBytes));

      // 3. Bandingkan Hash
      const isMatch = uploadedFileHash === blockchainData.ipfsHash;

      res.json({
        isMatch,
        blockchainData,
        uploadedFileHash,
        message: isMatch
          ? "✅ VERIFIKASI BERHASIL: File identik dengan data Blockchain."
          : "❌ VERIFIKASI GAGAL: File telah dimodifikasi atau tidak cocok.",
      });
    } catch (error: any) {
      console.error("[VERIFY-FILE ERROR]", error.message);
      res
        .status(404)
        .json({ error: "Data ijazah tidak ditemukan atau file tidak valid." });
    }
  },
);

// 5. REVOKE (PENCABUTAN)
app.post("/api/revoke", authenticateUniversity, async (req, res) => {
  const { id, reason } = req.body;
  try {
    await contract.submitTransaction(
      "revokeCertificate",
      id,
      reason || "Tidak disebutkan",
    );
    res.json({ message: `Ijazah ${id} telah dicabut.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- STARTUP & SHUTDOWN ---
app.listen(PORT, async () => {
  await initializeGateway();
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});

const shutdown = async () => {
  console.log("\n🛑 Menutup koneksi Blockchain...");
  await closeGateway();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

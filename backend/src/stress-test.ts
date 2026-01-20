import axios from "axios";
import FormData from "form-data";
import fs from "fs";

// --- KONFIGURASI ---
const BACKEND_URL = "http://localhost:3000/api";
const ADMIN_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluX2thbXB1cyIsInJvbGUiOiJBRE1JTiIsIm1zcElkIjoiT3JnMU1TUCIsImlhdCI6MTc2ODY1NzI4MywiZXhwIjoxNzY4NjYwODgzfQ.ZoAXOWxWCP2CbN-ksTuSe--9YBSDeh_oGc9DHh_TwDQ";
const TOTAL_ISSUANCE = 20; // Jumlah pendaftaran (Write)
const TOTAL_VERIFICATION = 100; // Jumlah verifikasi (Read)
const CONCURRENCY = 10; // Jumlah pengiriman simultan

const sampleFile = fs.readFileSync("./test-sample.pdf");

async function runFullTest() {
  console.log("--- 🚀 MEMULAI FULL SYSTEM STRESS TEST ---");

  // 1. TEST PENDAFTARAN (WRITE)
  console.log(`\n[1/2] Menguji Pendaftaran (${TOTAL_ISSUANCE} Ijazah)...`);
  const startIssue = Date.now();
  const createdIds: string[] = [];

  for (let i = 0; i < TOTAL_ISSUANCE; i += CONCURRENCY) {
    const batch = [];
    for (let j = 0; j < CONCURRENCY && i + j < TOTAL_ISSUANCE; j++) {
      const id = `TEST-${Date.now()}-${i + j}`;
      createdIds.push(id);
      batch.push(sendIssueRequest(id));
    }
    await Promise.all(batch);
  }
  const endIssue = (Date.now() - startIssue) / 1000;
  console.log(
    `✅ Pendaftaran Selesai: ${TOTAL_ISSUANCE} data dalam ${endIssue.toFixed(2)} detik.`,
  );
  console.log(
    `📊 Throughput Write: ${(TOTAL_ISSUANCE / endIssue).toFixed(2)} TPS`,
  );

  // 2. TEST VERIFIKASI (READ)
  console.log(
    `\n[2/2] Menguji Verifikasi Massal (${TOTAL_VERIFICATION} Kueri)...`,
  );
  const startVerify = Date.now();

  for (let i = 0; i < TOTAL_VERIFICATION; i += CONCURRENCY) {
    const batch = [];
    for (let j = 0; j < CONCURRENCY && i + j < TOTAL_VERIFICATION; j++) {
      // Mengambil ID secara acak dari yang baru dibuat tadi
      const randomId =
        createdIds[Math.floor(Math.random() * createdIds.length)];
      batch.push(sendVerifyRequest(randomId));
    }
    await Promise.all(batch);
  }
  const endVerify = (Date.now() - startVerify) / 1000;
  console.log(
    `✅ Verifikasi Selesai: ${TOTAL_VERIFICATION} kueri dalam ${endVerify.toFixed(2)} detik.`,
  );
  console.log(
    `📊 Throughput Read: ${(TOTAL_VERIFICATION / endVerify).toFixed(2)} QPS (Queries Per Second)`,
  );

  console.log("\n--- TEST SELESAI ---");
}

async function sendIssueRequest(certId: string) {
  const form = new FormData();
  form.append("id", certId);
  form.append("studentName", "Stress Test User");
  form.append("nim", "999999");
  form.append("degree", "S1-Informatika");
  form.append("file", sampleFile, { filename: "test.pdf" });

  try {
    await axios.post(`${BACKEND_URL}/issue`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function sendVerifyRequest(certId: string) {
  try {
    // Kita menguji Verifikasi dan Histori sekaligus (karena di frontend dipanggil berurutan)
    await axios.get(`${BACKEND_URL}/verify/${certId}`);
    await axios.get(`${BACKEND_URL}/history/${certId}`);
    return true;
  } catch (e) {
    return false;
  }
}

runFullTest();

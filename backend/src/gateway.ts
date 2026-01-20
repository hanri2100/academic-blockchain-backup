import * as grpc from "@grpc/grpc-js";
import {
  connect,
  Identity,
  Signer,
  signers,
} from "@hyperledger/fabric-gateway";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "node:crypto";
import "dotenv/config";

// Ambil konfigurasi dari .env dengan fallback default
const MSP_ID = process.env.MSP_ID || "Org1MSP";
const PEER_ENDPOINT = process.env.PEER_ENDPOINT || "localhost:7051";
const PEER_HOST_ALIAS = process.env.PEER_HOST_ALIAS || "peer0.org1.example.com";

// Path Sertifikat dari .env
const certPath = path.resolve(process.env.PATH_CERT || "");
const keyDirectoryPath = path.resolve(process.env.PATH_KEY_DIR || "");
const tlsCertPath = path.resolve(process.env.PATH_TLS_CERT || "");

let client: grpc.Client | undefined;
let gatewayInstance: any | undefined;

export async function getGateway() {
  if (gatewayInstance) return gatewayInstance;

  try {
    client = await newGrpcConnection();
    gatewayInstance = connect({
      identity: await newIdentity(),
      signer: await newSigner(),
      client,
      evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
      endorseOptions: () => ({ deadline: Date.now() + 15000 }),
    });
    return gatewayInstance;
  } catch (error) {
    console.error("Gagal menghubungkan ke Hyperledger Fabric:", error);
    throw new Error("Koneksi Blockchain Gagal");
  }
}

async function newGrpcConnection(): Promise<grpc.Client> {
  const tlsRead = await fs.readFile(tlsCertPath);
  const tlsCert = grpc.credentials.createSsl(tlsRead);
  return new grpc.Client(PEER_ENDPOINT, tlsCert, {
    "grpc.ssl_target_name_override": PEER_HOST_ALIAS,
    "grpc.max_receive_message_length": -1,
    "grpc.max_send_message_length": -1,
  });
}

async function newIdentity(): Promise<Identity> {
  try {
    const credentials = await fs.readFile(certPath);
    return { mspId: MSP_ID, credentials };
  } catch (err) {
    throw new Error(`Sertifikat tidak ditemukan di path: ${certPath}`);
  }
}

async function newSigner(): Promise<Signer> {
  try {
    const files = await fs.readdir(keyDirectoryPath);
    const keyFileName = files.find((f) => f.endsWith("_sk"));
    if (!keyFileName) throw new Error("File Private Key (_sk) tidak ditemukan");

    const keyPath = path.resolve(keyDirectoryPath, keyFileName);
    const privateKeyPem = await fs.readFile(keyPath, "utf8");
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
  } catch (err: any) {
    throw new Error(`Gagal memuat Private Key: ${err.message}`);
  }
}

export async function closeGateway() {
  if (client) {
    client.close();
    client = undefined;
    gatewayInstance = undefined;
  }
}

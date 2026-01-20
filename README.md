# Sistem Verifikasi Ijazah Berbasis Blockchain (Hyperledger Fabric & IPFS)

Proyek ini adalah implementasi sistem penerbitan dan verifikasi ijazah digital menggunakan **Hyperledger Fabric** (sebagai ledger immutable) dan **IPFS** (InterPlanetary File System) untuk penyimpanan dokumen terdesentralisasi. Sistem ini menjamin integritas data, keamanan, dan transparansi dokumen akademik.

## 📋 Daftar Isi

- [Arsitektur Teknologi](#-arsitektur-teknologi)
- [Prasyarat](#-prasyarat)
- [Instalasi & Konfigurasi](#-instalasi--konfigurasi)
  - [1. Setup Network & Channel](#1-setup-network--channel)
  - [2. Deploy Chaincode](#2-deploy-chaincode)
  - [3. Setup IPFS](#3-setup-ipfs)
  - [4. Setup Backend](#4-setup-backend)
  - [5. Setup Frontend](#5-setup-frontend)
- [Mekanisme Penggunaan](#-mekanisme-penggunaan)
- [Troubleshooting](#-troubleshooting)

---

## 🛠 Arsitektur Teknologi

- **Blockchain Network:** Hyperledger Fabric v2.5
- **Smart Contract:** Chaincode (Go/JavaScript)
- **Storage:** IPFS Kubo (Local Node)
- **Backend:** Node.js, Express, Fabric SDK, JWT Authentication
- **Frontend:** React.js, Tailwind CSS, Shadcn UI

---

## 💻 Prasyarat

Pastikan komputer Anda sudah terinstal tools berikut:

- Docker & Docker Compose
- Node.js (v18 atau v20) & npm
- Go (Golang)
- IPFS Desktop / IPFS CLI (Kubo)
- cURL & JQ
- Hyperledger Fabric Binaries & Docker Images

---

## 🚀 Instalasi & Konfigurasi

### Persiapan

#### Persiapan update upgrade dan installasi paket yang diperlukan

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git make jq build-essential libssl-dev
```

#### Membuat direktori dan subdirektori untuk sistem dan installasi **Hyperledger Fabric 2.5.11** dan **Fabric CA 1.5.13**

```bash
cd ~
mkdir -p academic-blockchain && cd academic-blockchain
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.11 1.5.13
```

#### Lalu melakukan installasi **IPFS Kubo**

```bash
wget https://dist.ipfs.tech/kubo/v0.32.1/kubo_v0.32.1_linux-amd64.tar.gz
tar -xvzf kubo_v0.32.1_linux-amd64.tar.gz
cd kubo
sudo bash install.sh
ipfs init
# Jalankan daemon di terminal terpisah nanti: ipfs daemon
```

#### Struktur direktori project:

academic-blockchain/
├── fabric-samples/test-network/ (Blockchain Network)
├── chaincode/ (Logic Smart Contract - TS)
├── ccaas-config (menyimpan file connection dan metadata)
├── data (couchdb dan ipfs file)
├── backend/ (API Express + Gateway - TS)
├── kubo (direktori ipfs)
└── frontend/ (React/Next.js - TS)

#### Inisialisasi Chaincode (Smart Contract)

```bash
mkdir -p chaincode && cd chaincode
pnpm init
pnpm add fabric-contract-api fabric-shim
pnpm add -D typescript ts-node
npx tsc --init
```

#### Membuat Package Chaincode palsu di direktori ccaas-config

```bash
# Bungkus menjadi package
tar cfz code.tar.gz connection.json
tar cfz academic-cc.tar.gz metadata.json code.tar.gz
```

#### Inisialisasi Backend

```bash
cd ~/academic-blockchain
mkdir backend && cd backend
pnpm init
pnpm add express bcrypt form-data jsonwebtoken dotenv zod fabric-network fabric-common fabric-ca-client @grpc/grpc-js @hyperledger/fabric-gateway
pnpm add -D typescript ts-node @types/express @types/jsonwebtoken @types/node @types/bcrypt @types/multer
pnpm exec tsc --init
```

#### Inisialisasi Frontend

```bash
pnpm create vite frontend --template react-ts
cd frontend
pnpm install
pnpm add axios lucide-react jwt-decode
```

#### Sinkronisasi

Generate token untuk backend:

```bash
cd academic-blockchain/backend/
pnpm generate-token
```

Setelah itu update .env di direktori frontend. Salin token yang muncul tadi, lalu paste ke file frontend/.env di variabel VITE_ADMIN_TOKEN.

Setelah itu buka /etc/hosts dengan menggunakan sudo nano dan tambahkan baris berikut ini:

```bash
127.0.0.1 peer0.org1.example.com
127.0.0.1 peer0.org2.example.com
127.0.0.1 orderer.example.com
```

## Ikuti langkah-langkah ini secara berurutan untuk menjalankan sistem.

### Fase 1: Setup Network & Channel

Masuk ke direktori jaringan Fabric (misalnya `test-network`) dan jalankan jaringan serta buat channel.

```bash
cd fabric-samples/test-network
# Matikan network lama (jika ada) untuk membersihkan container
./network.sh down
# Nyalakan network, buat channel 'mychannel', dan aktifkan Certificate Authority (CA)
./network.sh up createChannel -c mychannel -s couchdb -ca
```

### Fase 2: Build & Persiapan Chaincode (CCaaS)

Karena menggunakan arsitektur **Chaincode-as-a-Service (CCaaS)** dengan TypeScript, kita perlu membangun image Docker chaincode terlebih dahulu sebelum melakukan deployment ke network.

Pastikan memiliki `Dockerfile` di dalam folder `chaincode`.

```bash
cd ~/academic-blockchain/chaincode
pnpm install
pnpm build
```

Pastikan file connection.json di direktori ccaas-config sudah benar, Isinya harus merujuk ke alamat container chaincode:

```bash
{
  "address": "academic-cc.org1.example.com:9999",
  "dial_timeout": "10s",
  "tls_required": false
}
```

### Fase 3: Install & Deploy Chaincode

Gunakan script yang sudah saya buat di direktori ccaas-config namun ikuti urutan ini. Tetap di folder test-network

#### Install ke Org1:

```bash
# Pastikan script memiliki izin eksekusi: chmod +x ../../ccaas-config/*.sh
# Install ke Org1
bash ../../ccaas-config/install-chaincode-ke-org1.sh
```

PENTING: Lihat outputnya, cari teks seperti: academic-cc:5678.... Salin (Copy) Package ID tersebut.

#### Install ke Org2:

```bash
# Install ke Org2
bash ../../ccaas-config/install-chaincode-ke-org2.sh
```

#### Approve & Commit

Update Package ID di script approve-commit-org1.sh dan approve-commit-org2.sh dengan ID yang baru tadi saat install chaincode. Lalu jalankan:

```bash
bash ../../ccaas-config/approve-org1.sh
bash ../../ccaas-config/approve-commit-org2.sh
```

### Fase 4: Menjalankan Container Chaincode dan IPFS

Sekarang kita jalankan "mesin" Smart Contract-nya di Docker.

#### 1. Update Package ID

Dalam script build-run-img-chaincode-org1.sh (pada bagian CHAINCODE_ID) isi dengan Package ID yang telah didapat saat installasi chaincode pada fase 3 sebelumnya.

#### 2. Jalankan script:

```bash
 bash ../../ccaas-config/build-run-img-chaincode-org1.sh
```

#### 3. Cek apakah container jalan:

```bash
docker ps | grep academic-cc
```

#### 4. Setup dan Jalankan IPFS

Agar Frontend bisa menggunggah file PDF langsung ke IPFS, harus dibuka dulu "Pintu" izin di IPFS Kubo dengan menggunakan perintah dibawah ini.

```bash
ipfs-kubo ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:5173", "http://localhost:3000"]'

ipfs-kubo ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'

# Lalu Jalankan ipfs
ipfs daemon
```

### Fase 5: Menjalankan BE dan FE lalu melakukan Pengujian

#### 1. Menjalankan Backend & Frontend

Buka terminal baru pada direktori backend dan direktori frontend, lalu masukkan perintah dibawah ini

```bash
pnpm dev
```

#### 2. Pengujian Alur Akhir (End-to-End Test)

Sekarang, silakan buka browser Anda dan ikuti urutan ini untuk memastikan seluruh sistem (Frontend, Backend, IPFS, Blockchain) bekerja dengan harmonis:

##### Langkah A: Penerbitan (Admin Universitas)

1.  **Akses Web**
    Buka `http://localhost:5173` di browser.
2.  **Menu Admin**
    Pilih tab **Universitas**.
3.  **Upload Dokumen**
    Klik **Pilih File** dan masukkan file PDF apa saja (sebagai contoh ijazah).
    - _Cek:_ ✅ Jika muncul teks hijau berisi Hash (seperti `Qm...`), maka **IPFS Berhasil**.
4.  **Input Data**
    Isi formulir dengan data dummy berikut:
    - **ID:** `CERT12345`
    - **Nama:** `Hanri`
    - **NIM:** `123456`
    - **Gelar:** `Sarjana Komputer`
5.  **Eksekusi**
    Klik tombol **Daftarkan ke Blockchain**.
    - _Cek:_ ✅ Jika muncul notifikasi **"SUKSES: Ijazah telah diamankan"**, maka **Blockchain & Backend Berhasil**.

##### Langkah B: Verifikasi (Umum)

1.  **Menu Publik**
    Pindah ke tab **Verifikasi**.
2.  **Cari Data**
    Masukkan ID yang baru saja dibuat: `CERT12345`.
3.  **Validasi**
    Klik tombol **Periksa**.
    - _Cek:_ ✅ Data **Nama**, **NIM**, dan **Gelar** harus muncul secara instan di layar.
4.  **Akses Fisik**
    Klik link **IPFS Hash Arsitektur**.
    - _Cek:_ ✅ Browser harus membuka file PDF yang Anda unggah tadi melalui gateway IPFS lokal (`localhost:8080`).

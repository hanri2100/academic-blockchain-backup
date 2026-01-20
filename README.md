# Sistem Verifikasi Ijazah Berbasis Blockchain (Hyperledger Fabric & IPFS)

Proyek ini adalah implementasi sistem penerbitan dan verifikasi ijazah digital menggunakan **Hyperledger Fabric** (sebagai ledger immutable) dan **IPFS** (InterPlanetary File System) untuk penyimpanan dokumen terdesentralisasi. Sistem ini menjamin integritas data, keamanan, dan transparansi dokumen akademik.

## 📋 Daftar Isi

- [Arsitektur Teknologi](#-arsitektur-teknologi)
- [Prasyarat](#-prasyarat)
- [Instalasi & Konfigurasi](#-instalasi--konfigurasi)
  - [1. Setup Network & Channel](#Fase-1:-Setup-Network-&-Channel)
  - [2. Persiapan Deploy Chaincode](#2-deploy-chaincode)
  - [2. Deploy Chaincode](#2-deploy-chaincode)
  - [3. Setup IPFS](#3-setup-ipfs)
  - [4. Setup Backend](#4-setup-backend)
  - [5. Setup Frontend](#5-setup-frontend)
- [Mekanisme Penggunaan](#-Pengujian-Alur-Akhir (End-to-End Test))
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
pnpm add express bcrypt form-data multer axios bcrypt jsonwebtoken dotenv zod fabric-network fabric-common fabric-ca-client @grpc/grpc-js @hyperledger/fabric-gateway
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
# Nyalakan network, buat channel 'academic-network', dan aktifkan Certificate Authority (CA)
./network.sh up createChannel -c academic-network -s couchdb -ca
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

Ikuti urutan pengujian berikut untuk memastikan seluruh integrasi (Frontend, Backend, IPFS, dan Blockchain) berfungsi dengan sempurna:

##### Langkah A: Login & Penerbitan (Admin Universitas)

1.  **Akses Web**: Buka `http://localhost:5173` di browser Anda.
2.  **Otorisasi**: Pilih tab **Portal Kampus** dan masukkan kredensial Admin (contoh: `admin_kampus` / password sesuai `.env`).
    - *Cek*: ✅ Jika berhasil masuk ke Dashboard Admin, sistem **Autentikasi JWT Berhasil**.
3.  **Unggah Dokumen**: Pada menu **Terbitkan**, klik tombol **Pilih File** dan masukkan file PDF ijazah asli.
    - *Cek*: ✅ Jika muncul informasi ukuran file dan teks hijau berisi **IPFS Hash (CID)**, maka koneksi ke **Node IPFS Lokal Berhasil**.
4.  **Input Data Ledger**: Isi formulir data ijazah:
    - **ID Ijazah**: `CERT12345`
    - **NIM**: `123456`
    - **Nama Mahasiswa**: `ANON`
    - **Program Studi**: `Sarjana Kompute`
5.  **Eksekusi Blockchain**: Klik tombol **Daftarkan ke Blockchain**.
    - *Cek*: ✅ Jika muncul notifikasi **"BERHASIL: Ijazah telah resmi terdaftar"**, maka transaksi pada **Smart Contract (CCaaS) Berhasil**.

##### Langkah B: Verifikasi (Umum/Publik)

Pindah ke tab **Verifikasi** (dapat dilakukan tanpa login). Anda dapat menguji dua metode validasi:

**Metode 1: Pencarian via ID (Lookup ID)**
1.  Pilih opsi **"Cari ID / Nama"**.
2.  Masukkan ID: `CERT12345` lalu klik **Mulai Verifikasi**.
    - *Cek*: ✅ Data Nama, NIM, dan Gelar akan ditarik langsung dari Blockchain. Pastikan muncul kartu sertifikat berwarna hijau bertuliskan **"Verified Certificate"**.

**Metode 2: Validasi Integritas File (Pencocokan Hash)**
1.  Pilih opsi **"Unggah File PDF"**.
2.  Masukkan ID Ijazah: `CERT12345`.
3.  Unggah file PDF yang **sama** dengan yang didaftarkan sebelumnya.
4.  Klik **Mulai Verifikasi**.
    - *Cek*: ✅ Sistem akan mencocokkan hash file fisik dengan data di Blockchain. Jika asli, muncul laporan: **"VERIFIKASI BERHASIL: File identik dengan data Blockchain"**.
5.  **Uji Pemalsuan (Opsional)**: Coba unggah file PDF yang berbeda atau file yang sudah diedit isinya dengan ID yang sama.
    - *Cek*: ❌ Sistem akan mendeteksi perbedaan hash dan menampilkan status: **"VERIFIKASI GAGAL: File telah dimodifikasi"**.

##### Langkah C: Akses Audit & Dokumen Fisik

1.  **Audit Ledger**: Lihat bagian bawah hasil verifikasi pada **"Riwayat Ledger Blockchain"**.
    - *Cek*: ✅ Pastikan detail **Transaction ID** dan stempel waktu (Timestamp) muncul sebagai bukti audit.
2.  **Lihat Dokumen Fisik**: Klik pada link **"Lihat Dokumen Asli"** di bawah Hash IPFS.
    - *Cek*: ✅ Browser harus membuka file PDF ijazah secara instan melalui gateway lokal `http://localhost:8080/ipfs/...`.

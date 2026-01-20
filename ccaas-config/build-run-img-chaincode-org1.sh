#!/bin/bash

# 1. Masuk ke direktori chaincode
cd ../../chaincode

echo "--------- Step 1: Membangun Image Docker Baru ---------"
# Membangun image (ini akan menjalankan 'pnpm build' di dalam Docker)
docker build -t academic-cc-image .

echo "--------- Step 2: Menghapus Kontainer Lama ---------"
# Menghapus kontainer lama agar nama bisa digunakan kembali
docker rm -f academic-cc.org1.example.com || true

echo "--------- Step 3: Menjalankan Kontainer Baru ---------"
# Jalankan kontainer dengan Package ID yang tetap sama
# Pastikan CHAINCODE_ID di bawah ini selalu sama dengan hasil 'queryinstalled' di peer
docker run -d --name academic-cc.org1.example.com \
  --network fabric_test \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  -e CHAINCODE_ID=academic-cc:047c5a776355ec3fc3d158cecac43b8b6b9b3e982075b91c119614ab5a4e97de \
  academic-cc-image

echo "--------- SELESAI: Logika baru telah aktif! ---------"
docker ps | grep academic-cc
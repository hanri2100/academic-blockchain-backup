#!/bin/bash

# 1. Masuk ke direktori chaincode
cd ../../chaincode

echo "--------- Step 1: Membangun Image Docker (Sync with Org1) ---------"
# Kita menggunakan image yang sama agar logikanya identik
docker build -t academic-cc-image .

echo "--------- Step 2: Menghapus Kontainer Org2 Lama ---------"
# Nama kontainer disesuaikan untuk Org2
docker rm -f academic-cc.org2.example.com || true

echo "--------- Step 3: Menjalankan Kontainer Baru untuk Org2 ---------"
# PERHATIAN: Pastikan CHAINCODE_ID di bawah ini sesuai dengan hasil 
# 'peer lifecycle chaincode queryinstalled' pada peer Org2.
# Jika Anda menginstall file .tar.gz yang sama, Package ID biasanya identik.

docker run -d --name academic-cc.org2.example.com \
  --network fabric_test \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  -e CHAINCODE_ID=academic-cc:047c5a776355ec3fc3d158cecac43b8b6b9b3e982075b91c119614ab5a4e97de \
  academic-cc-image

echo "--------- SELESAI: Kontainer Org2 telah diperbarui! ---------"
docker ps | grep academic-cc
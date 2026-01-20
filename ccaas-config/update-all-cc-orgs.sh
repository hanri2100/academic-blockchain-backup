#!/bin/bash

# 1. Tentukan Variabel
CC_IMAGE_NAME="academic-cc-image"
ORG1_CONTAINER="academic-cc.org1.example.com"
ORG2_CONTAINER="academic-cc.org2.example.com"
# Package ID (Biasanya sama jika menggunakan file .tar.gz yang sama)
PACKAGE_ID="academic-cc:047c5a776355ec3fc3d158cecac43b8b6b9b3e982075b91c119614ab5a4e97de"

echo "======================================================"
echo "🚀 MEMULAI PEMBARUAN UNIVERSAL CHAINCODE (ORG1 & ORG2)"
echo "======================================================"

# 2. Build Image Docker (Hanya perlu sekali)
echo "📦 Step 1: Membangun Image dari Source Code Terbaru..."
cd ../../chaincode
docker build -t $CC_IMAGE_NAME .

echo ""
echo "🗑️  Step 2: Membersihkan Kontainer Lama..."
docker rm -f $ORG1_CONTAINER $ORG2_CONTAINER || true

echo ""
echo "🏗️  Step 3: Menjalankan Kontainer Baru untuk Org1..."
docker run -d --name $ORG1_CONTAINER \
  --network fabric_test \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  -e CHAINCODE_ID=$PACKAGE_ID \
  $CC_IMAGE_NAME

echo "🏗️  Step 4: Menjalankan Kontainer Baru untuk Org2..."
docker run -d --name $ORG2_CONTAINER \
  --network fabric_test \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  -e CHAINCODE_ID=$PACKAGE_ID \
  $CC_IMAGE_NAME

echo ""
echo "======================================================"
echo "✅ SELESAI: Org1 dan Org2 telah disinkronkan!"
echo "======================================================"
docker ps --filter name=academic-cc
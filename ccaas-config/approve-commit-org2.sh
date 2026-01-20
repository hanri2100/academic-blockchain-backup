export PATH=$HOME/academic-blockchain/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=$HOME/academic-blockchain/fabric-samples/config
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

# 1. Approve untuk Org2 (Gunakan ID dan Sequence yang SAMA dengan Org1)
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem --channelID academic-network --name academic-cc --version 1.0 --package-id academic-cc:047c5a776355ec3fc3d158cecac43b8b6b9b3e982075b91c119614ab5a4e97de --sequence 1 --signature-policy "OR('Org1MSP.peer','Org2MSP.peer')"

# 2. Commit ke Channel (Hanya perlu dijalankan sekali oleh salah satu Org setelah keduanya approve)
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem --channelID academic-network --name academic-cc --version 1.0 --sequence 1 --signature-policy "OR('Org1MSP.peer','Org2MSP.peer')" --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
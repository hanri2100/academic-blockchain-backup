export PATH=$HOME/academic-blockchain/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=$HOME/academic-blockchain/fabric-samples/config
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# GANTI --package-id dengan hasil dari langkah install tadi
# GANTI --sequence ke 2 (karena ini upgrade)
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem --channelID academic-network --name academic-cc --version 1.0 --package-id academic-cc:047c5a776355ec3fc3d158cecac43b8b6b9b3e982075b91c119614ab5a4e97de --sequence 1 --signature-policy "OR('Org1MSP.peer','Org2MSP.peer')"
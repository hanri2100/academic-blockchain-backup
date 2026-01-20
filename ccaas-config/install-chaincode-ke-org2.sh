# Pastikan dijalankan di dalam folder: ~/academic-blockchain/fabric-samples/test-network
export PATH=$HOME/academic-blockchain/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=$HOME/academic-blockchain/fabric-samples/config
# Environment Variables untuk Peer Org2
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
# Jalankan Install Chaincode di Org2
peer lifecycle chaincode install ../../ccaas-config/academic-cc.tar.gz
#Setelah script ini dijalankan, akan muncul package ID di terminal, catat package ID tersebut untuk proses selanjutnya.
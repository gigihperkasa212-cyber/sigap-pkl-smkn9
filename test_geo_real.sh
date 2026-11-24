#!/bin/bash
# Test server_geocode dengan data nyata siswa
# Ambil siswa pertama yang koordinatnya 0
RESULT=$(mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -se "SELECT id,name,pklLocation FROM users WHERE role='siswa' AND latitude_pkl=0 LIMIT 1;" 2>/dev/null)
ID=$(echo "$RESULT" | cut -f1)
NAME=$(echo "$RESULT" | cut -f2)
PKL=$(echo "$RESULT" | cut -f3)

echo "Siswa: $NAME"
echo "PKL: $PKL"
echo "ID: $ID"
echo ""

# Test geocode
RESPONSE=$(curl -sk -X POST "https://localhost/api.php?action=server_geocode" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$ID\",\"pklLocation\":\"$PKL\"}")
echo "Response: $RESPONSE"

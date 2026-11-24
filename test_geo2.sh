#!/bin/bash
# Test dengan nama yang lebih pendek
echo "Test 1: Ahass Kartika Sari Dinoyo"
curl -sk -X POST "https://localhost/api.php?action=server_geocode" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","pklLocation":"Ahass Kartika Sari Dinoyo"}'
echo ""

echo "Test 2: AHASS Kharisma Motor Gajayana"  
curl -sk -X POST "https://localhost/api.php?action=server_geocode" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","pklLocation":"AHASS Kharisma Motor Jalan Simpang Gajayana"}'
echo ""

echo "Test 3: Geocode All - berapa yang bisa"
curl -sk -X POST "https://localhost/api.php?action=geocode_all_students" \
  -H "Content-Type: application/json" \
  -d '{}'
echo ""

#!/bin/bash
echo "=== Status batch geocode ==="
echo "OK count:"
grep -c '^OK:' /tmp/smart_geocode_log.txt 2>/dev/null || echo "0"
echo "FAIL count:"
grep -c '^FAIL:' /tmp/smart_geocode_log.txt 2>/dev/null || echo "0"
echo "=== Last 10 lines ==="
tail -10 /tmp/smart_geocode_log.txt 2>/dev/null
echo "=== DB check ==="
mysql -u sigap_user -pSigapPKL@2026! sigap_pkl -e "SELECT SUM(CASE WHEN latitude_pkl!=0 AND longitude_pkl!=0 THEN 1 ELSE 0 END) as valid, SUM(CASE WHEN latitude_pkl=0 OR longitude_pkl=0 THEN 1 ELSE 0 END) as zero FROM users WHERE role='siswa';" 2>&1

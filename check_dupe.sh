#!/bin/bash
echo "=== Semua permissions di DB ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT id, name, tanggal, type, supervisor, status, created_at FROM permissions ORDER BY created_at DESC LIMIT 15;
" 2>/dev/null

echo ""
echo "=== Duplikat (nama+tanggal sama) ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT name, tanggal, COUNT(*) as cnt FROM permissions GROUP BY name, tanggal HAVING cnt > 1;
" 2>/dev/null

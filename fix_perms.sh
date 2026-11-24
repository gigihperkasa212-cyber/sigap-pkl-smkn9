#!/bin/bash
echo "=== Struktur tabel permissions ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "DESCRIBE permissions;" 2>/dev/null

echo ""
echo "=== Tambah kolom yang kurang ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'izin';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS supervisor VARCHAR(200) DEFAULT NULL;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL;
SELECT 'columns added OK';
" 2>/dev/null

echo ""
echo "=== Push api.php terbaru ==="
pct push 102 /tmp/api.php /var/www/html/SIGAP-SMKN9-Official/api.php --perms 755 --user 33 --group 33
echo "api.php pushed"

echo ""
echo "=== Verifikasi permissions dari API ==="
pct exec 102 -- curl -sk "https://localhost/api.php?action=get_permissions" | python3 -c "
import sys,json
d=json.load(sys.stdin)
p=d.get('permissions',d.get('data',[]))
print('Total permissions:', len(p))
for x in p[:3]: print(' -', x.get('studentName','?'), '|', x.get('type','?'), '|', x.get('status','?'))
" 2>&1

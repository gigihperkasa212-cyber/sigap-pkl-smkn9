#!/bin/bash
echo "=== Update supervisor field dari tabel users ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
UPDATE permissions p
JOIN users u ON (u.name = p.name OR u.username = p.username)
SET p.supervisor = u.supervisor
WHERE p.supervisor IS NULL OR p.supervisor = '';
SELECT ROW_COUNT() as updated;
" 2>/dev/null

echo ""
echo "=== Cek hasil update ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT p.id, p.name, p.supervisor, u.supervisor as user_supervisor
FROM permissions p
LEFT JOIN users u ON (u.name = p.name)
ORDER BY p.created_at DESC;
" 2>/dev/null

echo ""
echo "=== API setelah update ==="
pct exec 102 -- curl -sk "https://localhost/api.php?action=get_permissions" | python3 -c "
import sys,json
d=json.load(sys.stdin)
p=d.get('permissions',d.get('data',[]))
print('Total:', len(p))
for x in p:
    print(' -', x.get('studentName','?'), '| supervisor:', x.get('supervisor','?'), '| status:', x.get('status','?'))
" 2>&1

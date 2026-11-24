#!/bin/bash
echo "=== Permissions di DB ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT id, user_id, username, name, tanggal, type, supervisor, status FROM permissions ORDER BY created_at DESC LIMIT 10;
" 2>/dev/null

echo ""
echo "=== API get_permissions response ==="
pct exec 102 -- curl -sk "https://localhost/api.php?action=get_permissions" | python3 -c "
import sys,json
d=json.load(sys.stdin)
p=d.get('permissions',d.get('data',[]))
print('Total:', len(p))
for x in p:
    print(' ID:', x.get('id'), '| student:', x.get('studentName','?'), '| type:', x.get('type','?'), '| status:', x.get('status','?'), '| supervisor:', x.get('supervisor','?'))
" 2>&1

echo ""
echo "=== Users & supervisor di DB ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT username, name, role, supervisor FROM users WHERE role='siswa';
" 2>/dev/null

echo ""
echo "=== Guru list ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT username, name, role FROM users WHERE role='guru';
" 2>/dev/null

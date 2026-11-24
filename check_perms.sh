#!/bin/bash
echo "=== Tabel permissions di DB ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
SELECT id, user_id, username, name, tanggal, alasan, type, supervisor, status FROM permissions ORDER BY created_at DESC LIMIT 10;
" 2>/dev/null

echo ""
echo "=== API get_permissions response ==="
pct exec 102 -- curl -sk "https://localhost/api.php?action=get_permissions" | python3 -c "
import sys,json
d=json.load(sys.stdin)
p=d.get('permissions',d.get('data',[]))
print('Total:', len(p))
print('Keys sample:', list(p[0].keys()) if p else 'EMPTY')
for x in p[:5]:
    print(' -', x.get('studentName','?'), '|', x.get('type','?'), '|', x.get('status','?'), '| supervisor:', x.get('supervisor','?'))
" 2>&1

echo ""
echo "=== Test create_permission ==="
pct exec 102 -- curl -sk -X POST "https://localhost/api.php?action=create_permission" \
  -H "Content-Type: application/json" \
  -d '{"id":"test001","userId":"usr_test","username":"siswates","name":"Siswa Test","type":"Izin","startDate":"2026-08-22","endDate":"2026-08-22","tanggal":"2026-08-22","alasan":"Test izin","reason":"Test izin","status":"Pending","studentName":"Siswa Test","supervisor":"agus"}' | python3 -c "import sys,json; print(json.load(sys.stdin))" 2>&1

echo ""
echo "=== Verifikasi setelah create ==="
pct exec 102 -- curl -sk "https://localhost/api.php?action=get_permissions" | python3 -c "
import sys,json
d=json.load(sys.stdin)
p=d.get('permissions',d.get('data',[]))
print('Total permissions now:', len(p))
for x in p[:5]:
    print(' -', x.get('studentName','?'), '|', x.get('type','?'), '|', x.get('status','?'), '| supervisor:', x.get('supervisor','?'))
" 2>&1

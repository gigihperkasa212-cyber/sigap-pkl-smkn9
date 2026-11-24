#!/bin/bash
echo "=== Tambah kolom plain_password ==="
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password VARCHAR(100) DEFAULT NULL;
SELECT 'Column added OK';
" 2>/dev/null

echo ""
echo "=== Isi plain_password dari data yang diketahui ==="
# User yang dibuat via app.js pakai password plaintext sebelum di-hash
# Kita tahu dari DEFAULT_USERS_LIST dan data test:
# admin = sampurna01, guru9/guru2 = 123 (default), siswa = 123 atau 123456
pct exec 102 -- mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl -e "
UPDATE users SET plain_password='sampurna01' WHERE username='admin' AND (plain_password IS NULL OR plain_password='');
UPDATE users SET plain_password='123' WHERE role IN ('guru','siswa') AND (plain_password IS NULL OR plain_password='');
SELECT username, role, plain_password, LENGTH(password) as bcrypt_len FROM users;
" 2>/dev/null

echo ""
echo "=== Verifikasi ==="
pct exec 102 -- curl -sk "http://127.0.0.1/api.php?action=get_users" | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('users',d.get('data',[]))
print('Total users:', len(u))
for x in u:
    print(' -', x.get('username'), '| plain:', x.get('plain_password','N/A'), '| has_bcrypt:', bool(x.get('password','')))
"

#!/bin/bash
# Cari socket MySQL yang benar dan jalankan SQL
SOCKET=$(find /var/lib/mysql /tmp /run /var/run -name "mysql.sock" -o -name "mysqld.sock" 2>/dev/null | head -1)

if [ -n "$SOCKET" ]; then
    CMD="mysql -u root -S $SOCKET sigap_pkl"
else
    # Coba TCP
    CMD="mysql -u root -h 127.0.0.1 -P 3306 sigap_pkl"
fi

echo "Using: $CMD"

$CMD << 'SQL'
ALTER TABLE users ADD COLUMN IF NOT EXISTS pkl_start_date DATE DEFAULT NULL;
UPDATE users SET pkl_start_date = DATE(created_at) WHERE pkl_start_date IS NULL;
SELECT COUNT(*) as total, COUNT(pkl_start_date) as with_date FROM users WHERE role='siswa';
SQL
echo "SQL DONE: $?"

# Cek via api.php jika mysql tidak berhasil
php -r "
\$pdo = new PDO('mysql:host=localhost;dbname=sigap_pkl;charset=utf8', 'root', '');
\$pdo->exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS pkl_start_date DATE DEFAULT NULL');
\$pdo->exec('UPDATE users SET pkl_start_date = DATE(created_at) WHERE pkl_start_date IS NULL');
\$row = \$pdo->query('SELECT COUNT(*) as t, COUNT(pkl_start_date) as w FROM users')->fetch();
echo 'PHP: total='.\$row['t'].' with_date='.\$row['w'].PHP_EOL;
" 2>&1

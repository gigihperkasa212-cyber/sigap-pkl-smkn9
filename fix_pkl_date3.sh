#!/bin/bash
mysql -h 192.168.100.1 -u sigap_user -p'SigapPKL@2026!' sigap_pkl << 'SQL'
ALTER TABLE users ADD COLUMN IF NOT EXISTS pkl_start_date DATE DEFAULT NULL;
UPDATE users SET pkl_start_date = DATE(created_at) WHERE pkl_start_date IS NULL;
SELECT COUNT(*) as total, COUNT(pkl_start_date) as with_date, MIN(pkl_start_date) as earliest FROM users WHERE role='siswa';
SQL
echo "DONE: $?"

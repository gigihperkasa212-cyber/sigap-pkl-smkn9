#!/bin/bash
mysql -u root sigap_pkl << 'SQL'
ALTER TABLE users ADD COLUMN IF NOT EXISTS pkl_start_date DATE DEFAULT NULL;
UPDATE users SET pkl_start_date = DATE(created_at) WHERE pkl_start_date IS NULL;
SELECT COUNT(*) as total_users, COUNT(pkl_start_date) as with_start_date FROM users;
SQL
echo "DONE"

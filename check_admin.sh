#!/bin/bash
mysql -h 192.168.100.1 -u sigap_user -p'SigapPKL@2026!' sigap_pkl << 'SQL'
SELECT username, plain_password, status, aktif FROM users WHERE username='admin' OR role='admin';
SQL

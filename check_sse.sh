#!/bin/bash
echo "=== Cek nginx status ==="
pct exec 102 -- nginx -t 2>&1

echo ""
echo "=== Cek SSE endpoint (header only) ==="
pct exec 102 -- curl -sk -I --max-time 3 "https://localhost/api.php?action=sse_events" 2>/dev/null | head -10

echo ""
echo "=== Cek SSE di api.php ==="
pct exec 102 -- grep -n "sse_events\|text/event-stream\|sleep(" /var/www/html/SIGAP-SMKN9-Official/api.php | head -10

echo ""
echo "=== Versi file di server ==="
pct exec 102 -- grep "app.js" /var/www/html/SIGAP-SMKN9-Official/index.html

echo ""
echo "=== PHP-FPM status ==="
pct exec 102 -- systemctl is-active php8.2-fpm 2>/dev/null || echo "php-fpm check failed"

echo ""
echo "=== Nginx error log (last 5 lines) ==="
pct exec 102 -- tail -5 /var/log/nginx/error.log 2>/dev/null

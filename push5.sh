#!/bin/bash
CT=102; WEB="/var/www/html/SIGAP-SMKN9-Official"
pct push $CT /tmp/app.js     $WEB/js/app.js   --perms 755 --user 33 --group 33
pct push $CT /tmp/index.html $WEB/index.html  --perms 755 --user 33 --group 33
pct push $CT /tmp/api.php    $WEB/api.php     --perms 755 --user 33 --group 33
echo "PUSH_DONE"
pct exec $CT -- grep "app.js" $WEB/index.html

# Verifikasi API sekarang return plain password
echo "=== API test ==="
pct exec $CT -- curl -sk "https://localhost/api.php?action=get_users" | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('users',d.get('data',[]))
print('users:', len(u))
for x in u[:5]:
    p=x.get('password','')
    print(' -', x.get('username'), '| pwd:', p[:20] if p else 'KOSONG', '| bcrypt:', p.startswith('\$2'))
" 2>&1 || echo "API test skip (HTTPS cert)"

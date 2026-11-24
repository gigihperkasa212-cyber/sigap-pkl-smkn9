$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$SCP = "C:\Windows\System32\OpenSSH\scp.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=30","-i",$KEY)

# Tulis script bash ke bytes tanpa BOM
$bashScript = "CT=102`nWEB=/var/www/html/SIGAP-SMKN9-Official`nSIGAP=/opt/sigap-build`npct push `$CT `$SIGAP/js/app.js `$WEB/js/app.js --perms 755 --user 33 --group 33 && echo app_OK`npct push `$CT `$SIGAP/api.php `$WEB/api.php --perms 755 --user 33 --group 33 && echo api_OK`npct exec `$CT -- python3 -c `"with open('`$WEB/api.php','rb') as f: c=f.read()`nif c[:3]==b'\xef\xbb\xbf': c=c[3:]`nlines=c.decode('utf-8','replace').split('\n')`nwhile len(lines)>1 and lines[0].strip()=='<?php' and lines[1].strip()=='<?php': lines=lines[1:]`nwith open('`$WEB/api.php','wb') as f: f.write('\n'.join(lines).encode('utf-8'))`nprint('php_fixed')`" && echo py_OK`npct exec `$CT -- rm -f /tmp/sigap_users_cache.json /tmp/sigap_presensi_cache.json && echo cache_OK`npct exec `$CT -- php -l `$WEB/api.php`npct exec `$CT -- grep -c 'kolom name' `$WEB/api.php && echo cols_OK`necho ALL_DONE"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($bashScript)
[System.IO.File]::WriteAllBytes("$env:TEMP\do_push.sh", $bytes)

& $SCP @OPT "$env:TEMP\do_push.sh" "${SERVER}:/tmp/do_push.sh"
Start-Sleep -Seconds 1
& $SSH @OPT $SERVER "bash /tmp/do_push.sh"
Write-Host "Script done"

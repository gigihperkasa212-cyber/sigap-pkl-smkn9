@echo off
setlocal EnableDelayedExpansion

set SSH=C:\Windows\System32\OpenSSH\ssh.exe
set SCP=C:\Windows\System32\OpenSSH\scp.exe
set KEY=%USERPROFILE%\.ssh\sigap_pkl_key
set SERVER=root@103.153.190.69
set ROOT=d:\absen pkl update

echo [1/4] Test koneksi...
"%SSH%" -o StrictHostKeyChecking=no -o ConnectTimeout=15 -i "%KEY%" %SERVER% "echo CONNECTED"

echo [2/4] Upload app.js (ini mungkin lambat ~830KB)...
"%SCP%" -o StrictHostKeyChecking=no -o ConnectTimeout=60 -i "%KEY%" "%ROOT%\js\app.js" %SERVER%:/opt/sigap-build/js/app.js
echo app.js DONE

echo [3/4] Upload api.php...
"%SCP%" -o StrictHostKeyChecking=no -o ConnectTimeout=30 -i "%KEY%" "%ROOT%\api.php" %SERVER%:/opt/sigap-build/api.php
echo api.php DONE

echo [4a/4] Upload index.html...
"%SCP%" -o StrictHostKeyChecking=no -o ConnectTimeout=30 -i "%KEY%" "%ROOT%\index.html" %SERVER%:/opt/sigap-build/index.html
echo index.html DONE

echo [4b/4] Deploy ke CT102 + sync assets...
"%SSH%" -o StrictHostKeyChecking=no -o ConnectTimeout=30 -i "%KEY%" %SERVER% "pct push 102 /opt/sigap-build/js/app.js /var/www/html/SIGAP-SMKN9-Official/js/app.js --perms 644 --user 33 --group 33 && pct push 102 /opt/sigap-build/api.php /var/www/html/SIGAP-SMKN9-Official/api.php --perms 644 --user 33 --group 33 && pct push 102 /opt/sigap-build/index.html /var/www/html/SIGAP-SMKN9-Official/index.html --perms 644 --user 33 --group 33 && cp /opt/sigap-build/js/app.js /opt/sigap-build/android/app/src/main/assets/public/js/app.js && cp /opt/sigap-build/index.html /opt/sigap-build/android/app/src/main/assets/public/index.html && echo ALL_DONE"

echo.
echo Verifikasi baris di server:
"%SSH%" -o StrictHostKeyChecking=no -o ConnectTimeout=15 -i "%KEY%" %SERVER% "wc -l /opt/sigap-build/js/app.js /opt/sigap-build/api.php /opt/sigap-build/index.html"

echo.
echo DEPLOY SELESAI
endlocal

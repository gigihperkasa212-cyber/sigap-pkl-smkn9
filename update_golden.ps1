$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-i",$KEY)
& $SSH @OPT $SERVER "cp /opt/sigap-build/js/app.js /opt/sigap-build/golden_backup_v2.2.112/js/app.js && cp /opt/sigap-build/api.php /opt/sigap-build/golden_backup_v2.2.112/api.php && cp /opt/sigap-build/index.html /opt/sigap-build/golden_backup_v2.2.112/index.html && cp /opt/sigap-build/output/SIGAP-PKL-K9-v2.2.187.apk /opt/sigap-build/golden_backup_v2.2.112/ && echo GOLDEN_OK"

$SSH = "C:\Windows\System32\OpenSSH\ssh.exe"
$KEY = "$env:USERPROFILE\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$OPT = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15","-i",$KEY)

& $SSH @OPT $SERVER "pct exec 102 -- rm -f /tmp/sigap_users_cache.json /tmp/sigap_presensi_cache.json && echo cache_cleared"
& $SSH @OPT $SERVER "pct exec 102 -- curl -sk --max-time 5 'https://localhost/api.php?action=get_users' 2>/dev/null | python3 -c ""import sys,json; raw=sys.stdin.buffer.read(); data=json.loads(raw[3:] if raw[:3]==b'\xef\xbb\xbf' else raw); users=data.get('users',[]); print([u.get('username'),u.get('data_reset_at')] for u in users[:3])"" 2>&1 | head -5"

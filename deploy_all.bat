@echo off
setlocal EnableDelayedExpansion

set "SERVER=root@103.153.190.69"
set "KEY=%USERPROFILE%\.ssh\sigap_pkl_key"
set "BDIR=/opt/sigap-build"
set "CT=102"
set "WEB=/var/www/html/SIGAP-SMKN9-Official"
set "SSH=C:\Windows\System32\OpenSSH\ssh.exe"
set "SCP=C:\Windows\System32\OpenSSH\scp.exe"
set "ROOT=%~dp0"

echo.
echo ===================================================
echo  SIGAP PKL K9 - Deploy + Build APK
echo  %DATE% %TIME%
echo ===================================================

:: Test koneksi
echo.
echo [0/4] Test koneksi SSH...
"%SSH%" -o StrictHostKeyChecking=no -o ConnectTimeout=10 -i "%KEY%" %SERVER% "echo CONNECTED" >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Tidak bisa konek ke server!
    echo  Jalankan dulu: LANGKAH_1_DAFTAR_KEY.bat
    pause & exit /b 1
)
echo  OK: Terhubung ke server

:: Upload web files
echo.
echo [1/4] Upload web files...
"%SCP%" -o StrictHostKeyChecking=no -i "%KEY%" "%ROOT%js\app.js"   %SERVER%:%BDIR%/js/app.js
echo  app.js OK
"%SCP%" -o StrictHostKeyChecking=no -i "%KEY%" "%ROOT%index.html"  %SERVER%:%BDIR%/index.html
echo  index.html OK
"%SCP%" -o StrictHostKeyChecking=no -i "%KEY%" "%ROOT%api.php"     %SERVER%:%BDIR%/api.php
echo  api.php OK

:: Upload Android source yang berubah
echo.
echo [2/4] Upload Android source...
"%SCP%" -o StrictHostKeyChecking=no -i "%KEY%" -r "%ROOT%android\app\src\main\assets\public" %SERVER%:%BDIR%/android/app/src/main/assets/
echo  assets OK
"%SCP%" -o StrictHostKeyChecking=no -i "%KEY%" "%ROOT%android\app\build.gradle" %SERVER%:%BDIR%/android/app/build.gradle
echo  build.gradle OK

:: Upload server_build.sh
"%SCP%" -o StrictHostKeyChecking=no -i "%KEY%" "%ROOT%server_build.sh" %SERVER%:/tmp/server_build.sh
echo  server_build.sh OK

:: Build di server
echo.
echo [3/4] Build APK di server (3-5 menit)...
"%SSH%" -o StrictHostKeyChecking=no -o ServerAliveInterval=20 -o ConnectTimeout=120 -i "%KEY%" %SERVER% "bash /tmp/server_build.sh 2>&1"
if errorlevel 1 (
    echo  ERROR: Build gagal!
    pause & exit /b 1
)

:: Download APK
echo.
echo [4/4] Download APK...
if not exist "%ROOT%output" mkdir "%ROOT%output"
"%SCP%" -o StrictHostKeyChecking=no -i "%KEY%" "%SERVER%:/opt/sigap-build/output/*.apk" "%ROOT%output\"
if errorlevel 1 (
    echo  WARN: Download APK gagal, ambil manual dari server
) else (
    echo  APK tersimpan di: %ROOT%output\
)

echo.
echo ===================================================
echo  SELESAI!
echo  Web: http://103.153.190.69
echo  APK: %ROOT%output\
echo ===================================================
pause

@echo off
:: ============================================================
:: LANGKAH 2 - Upload project + Install JDK di server
:: Jalankan setelah LANGKAH_1_DAFTAR_KEY.bat berhasil
:: Proses ini 5-15 menit (download JDK + Android SDK)
:: ============================================================
echo.
echo =====================================================
echo  SIGAP PKL K9 - Langkah 2: Setup Server
echo =====================================================

set KEY=%USERPROFILE%\.ssh\sigap_pkl_key
set SERVER=root@103.153.190.69
set SSH=C:\Windows\System32\OpenSSH\ssh.exe
set SCP=C:\Windows\System32\OpenSSH\scp.exe
set OPT=-o StrictHostKeyChecking=no -i "%KEY%"
set ROOT=%~dp0
set SIGAP=/opt/sigap-build

:: Test koneksi key
echo.
echo [0/5] Test SSH key...
%SSH% %OPT% %SERVER% "echo KEY_OK" >nul 2>&1
if errorlevel 1 (
    echo GAGAL: SSH key belum terdaftar.
    echo Jalankan dulu: LANGKAH_1_DAFTAR_KEY.bat
    pause
    exit /b 1
)
echo  OK

:: Setup folder di server
echo.
echo [1/5] Buat folder di server...
%SSH% %OPT% %SERVER% "mkdir -p %SIGAP%/js %SIGAP%/output %SIGAP%/android/app/src/main/assets; echo FOLDER_OK"

:: Upload web files
echo.
echo [2/5] Upload web files...
%SCP% %OPT% "%ROOT%js\app.js"   %SERVER%:%SIGAP%/js/app.js
%SCP% %OPT% "%ROOT%index.html"  %SERVER%:%SIGAP%/index.html
%SCP% %OPT% "%ROOT%api.php"     %SERVER%:%SIGAP%/api.php
echo  Web files OK

:: Upload Android project (hanya folder penting, tanpa build/)
echo.
echo [3/5] Upload Android project (mungkin 3-5 menit)...
%SCP% %OPT% -r "%ROOT%android\app\src"                     %SERVER%:%SIGAP%/android/app/
%SCP% %OPT%    "%ROOT%android\app\build.gradle"             %SERVER%:%SIGAP%/android/app/
%SCP% %OPT%    "%ROOT%android\app\capacitor.build.gradle"   %SERVER%:%SIGAP%/android/app/
%SCP% %OPT%    "%ROOT%android\app\proguard-rules.pro"       %SERVER%:%SIGAP%/android/app/
%SCP% %OPT%    "%ROOT%android\build.gradle"                 %SERVER%:%SIGAP%/android/
%SCP% %OPT%    "%ROOT%android\variables.gradle"             %SERVER%:%SIGAP%/android/
%SCP% %OPT%    "%ROOT%android\settings.gradle"              %SERVER%:%SIGAP%/android/
%SCP% %OPT%    "%ROOT%android\gradlew"                      %SERVER%:%SIGAP%/android/
%SCP% %OPT% -r "%ROOT%android\gradle"                      %SERVER%:%SIGAP%/android/
%SCP% %OPT%    "%ROOT%android\release.keystore"             %SERVER%:%SIGAP%/android/
echo  Android project OK

:: Upload capacitor plugin (dependency)
echo.
echo [4/5] Upload Capacitor plugins...
%SCP% %OPT% -r "%ROOT%android\capacitor-android"                %SERVER%:%SIGAP%/android/ 2>nul
%SCP% %OPT% -r "%ROOT%android\capacitor-cordova-android-plugins" %SERVER%:%SIGAP%/android/ 2>nul
echo  Plugins OK

:: Upload dan jalankan server_setup.sh
echo.
echo [5/5] Install JDK 17 + Android SDK di server...
echo  (5-15 menit, tergantung kecepatan server)
%SCP% %OPT% "%ROOT%server_setup.sh" "%ROOT%server_build.sh" %SERVER%:/tmp/
%SSH% %OPT% %SERVER% "chmod +x /tmp/server_setup.sh; bash /tmp/server_setup.sh"

echo.
echo =====================================================
echo  SETUP SELESAI!
echo  Sekarang klik: deploy_all.bat untuk build APK
echo =====================================================
pause

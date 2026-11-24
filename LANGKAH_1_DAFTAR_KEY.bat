@echo off
:: ============================================================
:: LANGKAH 1 - Daftarkan SSH Key ke Server (jalankan SEKALI)
:: Klik dua kali file ini, masukkan password server saat diminta
:: Setelah ini: klik LANGKAH_2_SETUP_SERVER.bat
:: ============================================================
echo.
echo =====================================================
echo  SIGAP PKL K9 - Langkah 1: Daftarkan SSH Key
echo =====================================================
echo.
echo Masukkan password root server (103.153.190.69) saat diminta.
echo Password hanya perlu dimasukkan SEKALI.
echo.

set KEY=%USERPROFILE%\.ssh\sigap_pkl_key
set SERVER=root@103.153.190.69
set SSH=C:\Windows\System32\OpenSSH\ssh.exe
set SCP=C:\Windows\System32\OpenSSH\scp.exe

:: Baca public key
set /p PUB=<%KEY%.pub

:: Upload public key ke server (butuh password)
echo [1/2] Upload SSH key ke server...
%SCP% -o StrictHostKeyChecking=no "%KEY%.pub" %SERVER%:/tmp/sigap_key.pub
if errorlevel 1 (
    echo GAGAL upload key. Cek password dan koneksi.
    pause
    exit /b 1
)

:: Daftarkan key
echo [2/2] Mendaftarkan SSH key...
%SSH% -o StrictHostKeyChecking=no %SERVER% "mkdir -p ~/.ssh; chmod 700 ~/.ssh; cat /tmp/sigap_key.pub >> ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys; rm /tmp/sigap_key.pub; echo KEY_REGISTERED_OK"
if errorlevel 1 (
    echo GAGAL mendaftarkan key.
    pause
    exit /b 1
)

echo.
echo =====================================================
echo  SSH Key berhasil didaftarkan!
echo  Sekarang klik: LANGKAH_2_SETUP_SERVER.bat
echo =====================================================
pause

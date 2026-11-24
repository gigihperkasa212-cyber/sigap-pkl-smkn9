@echo off
:: Jalankan SEKALI untuk setup server (daftarkan SSH key + install JDK)
:: Setelah ini gunakan deploy_all.bat untuk deploy sehari-hari
echo Membuka Git Bash untuk inisialisasi server...
echo Masukkan password root server saat diminta!
echo.
start "" "C:\Program Files\Git\bin\bash.exe" --login -i -c "cd '/d/absen pkl update' && bash init_server.sh; echo; read -p 'Tekan Enter untuk tutup...'"

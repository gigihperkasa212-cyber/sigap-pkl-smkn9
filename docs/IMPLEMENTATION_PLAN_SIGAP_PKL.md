# IMPLEMENTATION PLAN SIGAP PKL
## Sistem Informasi & Geofencing Absensi PKL
### SMK Negeri 9 Malang

**Versi:** 1.1
**Tanggal:** Agustus 2026
**Disusun oleh:** Tim Pengembang SIGAP PKL SMKN 9 Malang

---

## Daftar Isi

- [BAB 1 - Ringkasan Eksekutif](#bab-1---ringkasan-eksekutif)
- [BAB 2 - Arsitektur Sistem](#bab-2---arsitektur-sistem)
- [BAB 3 - Infrastruktur Server](#bab-3---infrastruktur-server)
- [BAB 4 - Database](#bab-4---database)
- [BAB 5 - Setup APK Android](#bab-5---setup-apk-android)
- [BAB 6 - Onboarding Pengguna](#bab-6---onboarding-pengguna)
- [BAB 7 - Monitoring & Maintenance](#bab-7---monitoring--maintenance)
- [BAB 8 - Keamanan](#bab-8---keamanan)
- [BAB 9 - Roadmap Pengembangan](#bab-9---roadmap-pengembangan)
- [BAB 10 - Checklist Implementasi](#bab-10---checklist-implementasi)
- [Lampiran A - Kredensial](#lampiran-a---kredensial-sistem-lengkap)
- [Lampiran B - Perintah SSH](#lampiran-b---perintah-ssh-berguna)
- [Lampiran C - Kontak & Support](#lampiran-c---kontak--support)
- [Lampiran D - File Backup Penting](#lampiran-d---daftar-file-backup-penting)

---

## BAB 1 - Ringkasan Eksekutif

### 1.1 Informasi Proyek

| Atribut | Detail |
|---------|--------|
| **Nama Proyek** | SIGAP PKL — Sistem Informasi & Geofencing Absensi PKL |
| **Institusi** | SMK Negeri 9 Malang |
| **Platform** | Android APK + Web (Capacitor + PHP + MariaDB) |
| **Versi Saat Ini** | 1.1 |
| **Status** | Production (Live) |
| **Server** | VPS 103.153.190.69 (Proxmox VE → LXC Container 102) |
| **URL Akses** | https://103.153.190.69:8443 |
| **APK** | SIGAP-PKL-K9-v1.0.apk |
| **Mulai Pengembangan** | 2025 |
| **Go-Live** | Agustus 2026 |

### 1.2 Status Fitur

| Fitur | Status | Catatan |
|-------|--------|---------|
| Login Multi-Role (Siswa/Guru/Admin) | ✅ Live | NISN, NIP, username |
| Absensi GPS + Foto Selfie | ✅ Live | Radius 350m, bounding box Jawa |
| Geofencing Radius Dinamis | ✅ Live | Per lokasi PKL |
| Peta Leaflet Realtime | ✅ Live | Zoom/pan bebas, multi-marker |
| SSE Realtime | ✅ Live | Auto-reconnect setelah standby |
| Pengajuan Izin/Sakit | ✅ Live | Dengan persetujuan guru |
| Laporan PDF (Puppeteer) | ✅ Live | Pixel-perfect, simpan ke HP |
| Filter Laporan Per Guru | ✅ Live | Tidak bocor ke guru lain |
| Autocomplete Lokasi (Nominatim) | ✅ Live | Bounding box Pulau Jawa |
| Mode Siang/Malam | ✅ Live | Persisten localStorage |
| Splash Screen Animasi 3D | ✅ Live | 9 detik |
| Deploy Script Otomatis | ✅ Live | deploy.ps1 satu perintah |
| Backup Script | ✅ Live | backup.ps1 + backup_proxmox.ps1 |
| SSH Key Authentication | ✅ Live | sigap_pkl_key |
| Import CSV Massal | ✅ Live | Bulk input siswa |
| Push Notification | 🔄 Planned | v1.2 |
| Domain SSL Publik | 🔄 Planned | smkn9malang.sch.id |
| Ganti Password Mandiri | 🔄 Planned | v1.2 |
| Export Excel | 🔄 Planned | v1.3 |

### 1.3 Timeline Proyek

| Fase | Periode | Status |
|------|---------|--------|
| Analisis Kebutuhan | Januari 2025 | ✅ Selesai |
| Desain Sistem & Database | Februari 2025 | ✅ Selesai |
| Pengembangan Backend (PHP API) | Maret–April 2025 | ✅ Selesai |
| Pengembangan Frontend (app.js) | April–Mei 2025 | ✅ Selesai |
| Integrasi Capacitor Android | Mei 2025 | ✅ Selesai |
| UAT (User Acceptance Test) | Juni 2025 | ✅ Selesai |
| Penyempurnaan & Bug Fix | Juli 2025–Juli 2026 | ✅ Selesai |
| Go-Live Production | Agustus 2026 | ✅ Live |
| Maintenance & Enhancement | Agustus 2026 → | 🔄 Ongoing |

---

## BAB 2 - Arsitektur Sistem

### 2.1 Diagram Arsitektur Lengkap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARSITEKTUR SIGAP PKL                                │
│                                                                             │
│  ╔═══════════════════╗         ╔═══════════════════════╗                   │
│  ║  PERANGKAT SISWA  ║         ║  PERANGKAT GURU/ADMIN ║                   │
│  ║                   ║         ║                       ║                   │
│  ║  APK Android      ║         ║  APK Android          ║                   │
│  ║  (Capacitor 5.x)  ║         ║  ATAU                 ║                   │
│  ║  ┌─────────────┐  ║         ║  Chrome Browser       ║                   │
│  ║  │ app.js      │  ║         ╚══════════╦════════════╝                   │
│  ║  │ Leaflet.js  │  ║                    ║                                │
│  ║  │ Chart.js    │  ║                    ║ HTTPS:8443 / HTTP:80           │
│  ║  └─────────────┘  ║                    ║                                │
│  ╚═══════╦═══════════╝                    ║                                │
│          ║ HTTPS:8443                     ║                                │
│          ║ (SSL self-signed)              ║                                │
│          ╚════════════════╦═══════════════╝                                │
│                           ║                                                │
│              ╔════════════╩══════════════════════════════════╗             │
│              ║           VPS: 103.153.190.69                  ║             │
│              ║                                               ║             │
│              ║  ┌────────────────────────────────────────┐  ║             │
│              ║  │         PROXMOX VE (Hypervisor)        │  ║             │
│              ║  │                                        │  ║             │
│              ║  │  ┌──────────────────────────────────┐  │  ║             │
│              ║  │  │      LXC CONTAINER 102           │  │  ║             │
│              ║  │  │      (Debian 12 Bookworm)        │  │  ║             │
│              ║  │  │                                  │  │  ║             │
│              ║  │  │  ┌────────────────────────────┐  │  │  ║             │
│              ║  │  │  │  NGINX (Reverse Proxy)     │  │  │  ║             │
│              ║  │  │  │  Port 80 → redirect HTTPS  │  │  │  ║             │
│              ║  │  │  │  Port 8443 (SSL)            │  │  │  ║             │
│              ║  │  │  └──────────────┬─────────────┘  │  │  ║             │
│              ║  │  │                 │                 │  │  ║             │
│              ║  │  │     ┌───────────┴────────────┐   │  │  ║             │
│              ║  │  │     │                        │   │  │  ║             │
│              ║  │  │  ┌──▼──────────┐  ┌─────────▼─┐ │  │  ║             │
│              ║  │  │  │ PHP-FPM 8.2 │  │ Node.js 18│ │  │  ║             │
│              ║  │  │  │ (api.php)   │  │ (Puppeteer│ │  │  ║             │
│              ║  │  │  │             │  │ /Chromium)│ │  │  ║             │
│              ║  │  │  └──────┬──────┘  └───────────┘ │  │  ║             │
│              ║  │  │         │                        │  │  ║             │
│              ║  │  │  ┌──────▼──────────────────┐    │  │  ║             │
│              ║  │  │  │    MariaDB 10.x          │    │  │  ║             │
│              ║  │  │  │  Host: 192.168.100.1     │    │  │  ║             │
│              ║  │  │  │  DB: sigap_pkl           │    │  │  ║             │
│              ║  │  │  └─────────────────────────┘    │  │  ║             │
│              ║  │  └──────────────────────────────────┘  │  ║             │
│              ║  └────────────────────────────────────────┘  ║             │
│              ╚════════════════════════════════════════════════╝             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Penjelasan Komponen

| Komponen | Teknologi | Fungsi |
|----------|-----------|--------|
| **Android APK** | Capacitor 5.x + HTML/JS | Antarmuka pengguna mobile |
| **Web Frontend** | HTML5 + CSS3 + JavaScript | Antarmuka browser |
| **app.js** | Vanilla JS + Leaflet + Chart.js | Logic utama aplikasi |
| **Nginx** | v1.22+ | Reverse proxy, SSL termination, static files |
| **PHP-FPM 8.2** | PHP 8.2 + extensions | API handler, SSE, business logic |
| **MariaDB** | 10.x | Penyimpanan data utama |
| **Node.js 18** | Node.js LTS | Runtime untuk Puppeteer |
| **Puppeteer** | Puppeteer + Chromium | Generate PDF server-side |
| **Proxmox VE** | Proxmox 7.x/8.x | Hypervisor virtualisasi |
| **LXC Container** | Container Linux 102 | Isolasi environment aplikasi |

### 2.3 Flow Data antara APK dan Server

```
APK (Capacitor)                     SERVER (api.php)
     │                                    │
     │──── POST login ────────────────────►│
     │                                    │── Query DB users
     │◄─── { userId, role, token } ───────│
     │                                    │
     │──── GET get_all_data ──────────────►│
     │◄─── { attendance[], users[], ... } ─│
     │                                    │
     │──── GET sse_events (SSE) ──────────►│ (Long-lived connection)
     │◄═══ event: heartbeat ══════════════│ (setiap ~25 detik)
     │◄═══ event: attendance_update ══════│ (saat ada absensi baru)
     │                                    │
     │──── POST save_attendance ──────────►│
     │    { nisn, photo_b64, lat, lng }   │── INSERT attendance
     │◄─── { success: true, id: xxx } ────│── Broadcast SSE ke guru
     │                                    │
     │──── POST generate_pdf ─────────────►│
     │    { html_content: "..." }         │── Puppeteer/Chromium render
     │◄─── { pdf_base64: "..." } ──────────│── Return base64 PDF
     │                                    │
     │ Capacitor.Filesystem.writeFile()   │
     │ (simpan PDF ke Documents/)         │
```

---

## BAB 3 - Infrastruktur Server

### 3.1 Spesifikasi VPS dan Proxmox VE

| Komponen | Detail |
|----------|--------|
| **Provider VPS** | IDCloudHost / Provider lokal Indonesia |
| **IP Publik** | 103.153.190.69 |
| **Hypervisor** | Proxmox VE 7.x atau 8.x |
| **OS Host** | Debian 11/12 (Proxmox base) |
| **CPU Host** | Minimal 2 vCPU (rekomendasi 4 vCPU) |
| **RAM Host** | Minimal 4 GB (rekomendasi 8 GB) |
| **Storage Host** | Minimal 50 GB SSD |

### 3.2 Konfigurasi LXC Container 102

| Parameter | Nilai |
|-----------|-------|
| **Container ID** | 102 |
| **OS** | Debian 12 (Bookworm) |
| **CPU** | 2 vCPU |
| **RAM** | 2 GB |
| **Storage** | 20 GB |
| **Network** | Bridge vmbr0, IP: (DHCP atau statis internal) |
| **Unprivileged** | Yes |

#### Paket yang Terinstal di Container 102

```bash
# Web Server
nginx

# PHP & Extensions
php8.2-fpm
php8.2-cli
php8.2-mysql
php8.2-json
php8.2-mbstring
php8.2-curl
php8.2-gd
php8.2-xml
php8.2-zip

# Database Client
mariadb-client

# Node.js & Tools
nodejs (v18 LTS via NodeSource)
npm
chromium

# Utilities
curl
wget
git
unzip
sudo
logrotate
```

### 3.3 Konfigurasi Nginx

File konfigurasi: `/etc/nginx/sites-available/sigap_pkl`

```nginx
# HTTP → HTTPS Redirect
server {
    listen 80;
    server_name 103.153.190.69;
    return 301 https://$host:8443$request_uri;
}

# HTTPS Server (SSL Self-Signed)
server {
    listen 8443 ssl;
    server_name 103.153.190.69;

    ssl_certificate     /etc/nginx/ssl/sigap_pkl.crt;
    ssl_certificate_key /etc/nginx/ssl/sigap_pkl.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    root /var/www/presensiku;
    index index.html;

    # Upload limit untuk foto selfie base64
    client_max_body_size 10M;

    # PHP handler
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;

        # SSE: disable buffering
        fastcgi_buffering off;
        fastcgi_read_timeout 120s;
    }

    # SSE: no buffering untuk endpoint sse_events
    location ~* /api\.php.*action=sse_events {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_buffering off;
        fastcgi_read_timeout 120s;
        # Headers SSE
        add_header X-Accel-Buffering no;
        add_header Cache-Control no-cache;
    }

    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Logs
    access_log /var/log/nginx/sigap_pkl_access.log;
    error_log  /var/log/nginx/sigap_pkl_error.log;
}
```

#### Konfigurasi Sudoers untuk Node.js (Puppeteer)

File: `/etc/sudoers.d/www-data-node`

```
# Izinkan www-data menjalankan node tanpa password
www-data ALL=(ALL) NOPASSWD: /usr/bin/node
```

### 3.4 Port yang Digunakan

| Port | Protokol | Service | Akses |
|------|----------|---------|-------|
| 22 | TCP | SSH | Admin only (key-based) |
| 80 | TCP | HTTP (redirect ke 8443) | Public |
| 8443 | TCP | HTTPS (SSL/TLS) | Public |
| 3306 | TCP | MariaDB | Internal only (192.168.100.1) |
| 8006 | TCP | Proxmox Web UI | Admin only |

### 3.5 Struktur Direktori Server

```
/var/www/presensiku/          ← Root web directory
├── index.html                ← Halaman utama SPA
├── api.php                   ← API handler utama (semua endpoint)
├── js/
│   └── app.js               ← Logic frontend utama
├── css/
│   └── styles.css           ← Stylesheet utama
├── uploads/                  ← Folder foto selfie absensi
│   └── YYYY/MM/             ← Diorganisir per tahun/bulan
│       └── [nisn]_[ts].jpg
├── pdf_temp/                 ← Temporary folder PDF generation
├── node_modules/             ← Dependencies Node.js (Puppeteer)
├── package.json              ← Node.js project config
└── generate_pdf.js           ← Script Puppeteer PDF generator

/etc/nginx/
├── sites-available/
│   └── sigap_pkl            ← Konfigurasi Nginx
├── sites-enabled/
│   └── sigap_pkl -> ...     ← Symlink
└── ssl/
    ├── sigap_pkl.crt        ← SSL Certificate (self-signed)
    └── sigap_pkl.key        ← SSL Private Key

/var/log/nginx/
├── sigap_pkl_access.log     ← Access log
└── sigap_pkl_error.log      ← Error log

/backup/                      ← Folder backup di server
├── sigap_pkl_YYYYMMDD.sql   ← DB dump harian
└── uploads_YYYYMMDD.tar.gz  ← Foto backup
```

---

## BAB 4 - Database

### 4.1 Informasi Koneksi Database

| Parameter | Nilai |
|-----------|-------|
| **Host** | 192.168.100.1 |
| **Port** | 3306 |
| **Database** | sigap_pkl |
| **Username** | sigap_user |
| **Password** | SigapPKL@2026! |
| **Engine** | MariaDB 10.x |
| **Charset** | utf8mb4 |
| **Collation** | utf8mb4_unicode_ci |

### 4.2 Schema Tabel: `users`

```sql
CREATE TABLE `users` (
  `id`            INT(11)      NOT NULL AUTO_INCREMENT,
  `identifier`    VARCHAR(20)  NOT NULL COMMENT 'NISN (siswa) / NIP (guru) / username (admin)',
  `password`      VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
  `role`          ENUM('siswa','guru','admin') NOT NULL,
  `name`          VARCHAR(100) NOT NULL,
  `kelas`         VARCHAR(20)  NULL     COMMENT 'hanya untuk siswa',
  `tempat_pkl`    VARCHAR(200) NULL     COMMENT 'nama tempat PKL siswa',
  `alamat_pkl`    TEXT         NULL     COMMENT 'alamat lengkap lokasi PKL',
  `lat`           DECIMAL(10,7) NULL    COMMENT 'latitude lokasi PKL',
  `lng`           DECIMAL(10,7) NULL    COMMENT 'longitude lokasi PKL',
  `guru_id`       INT(11)      NULL     COMMENT 'FK ke users.id (guru pembimbing)',
  `no_hp`         VARCHAR(15)  NULL,
  `status`        ENUM('active','inactive','pending') NOT NULL DEFAULT 'active',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_identifier` (`identifier`),
  KEY `idx_role` (`role`),
  KEY `idx_guru_id` (`guru_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_users_guru` FOREIGN KEY (`guru_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4.3 Schema Tabel: `attendance`

```sql
CREATE TABLE `attendance` (
  `id`           INT(11)      NOT NULL AUTO_INCREMENT,
  `user_id`      INT(11)      NOT NULL COMMENT 'FK ke users.id',
  `nisn`         VARCHAR(20)  NOT NULL COMMENT 'duplikasi untuk query cepat',
  `date`         DATE         NOT NULL,
  `type`         ENUM('masuk','pulang') NOT NULL,
  `lat`          DECIMAL(10,7) NOT NULL,
  `lng`          DECIMAL(10,7) NOT NULL,
  `accuracy`     FLOAT        NULL     COMMENT 'akurasi GPS dalam meter',
  `distance`     FLOAT        NULL     COMMENT 'jarak dari lokasi PKL (meter)',
  `photo_path`   VARCHAR(255) NULL     COMMENT 'path relatif foto selfie di server',
  `status`       ENUM('hadir','izin','sakit','alpa') NOT NULL DEFAULT 'hadir',
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_attendance_daily` (`user_id`, `date`, `type`),
  KEY `idx_nisn` (`nisn`),
  KEY `idx_date` (`date`),
  KEY `idx_user_date` (`user_id`, `date`),
  CONSTRAINT `fk_attendance_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4.4 Schema Tabel: `permissions`

```sql
CREATE TABLE `permissions` (
  `id`           INT(11)      NOT NULL AUTO_INCREMENT,
  `user_id`      INT(11)      NOT NULL COMMENT 'FK ke users.id (siswa)',
  `nisn`         VARCHAR(20)  NOT NULL,
  `type`         ENUM('izin','sakit') NOT NULL,
  `start_date`   DATE         NOT NULL,
  `end_date`     DATE         NOT NULL,
  `reason`       TEXT         NOT NULL,
  `attachment`   VARCHAR(255) NULL     COMMENT 'path file lampiran',
  `status`       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by`  INT(11)      NULL     COMMENT 'FK ke users.id (guru yang menyetujui)',
  `review_note`  TEXT         NULL     COMMENT 'catatan guru saat menolak',
  `reviewed_at`  DATETIME     NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_date_range` (`start_date`, `end_date`),
  CONSTRAINT `fk_permissions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_permissions_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4.5 Schema Tabel: `monthly_reports`

```sql
CREATE TABLE `monthly_reports` (
  `id`           INT(11)      NOT NULL AUTO_INCREMENT,
  `user_id`      INT(11)      NOT NULL,
  `month`        TINYINT(2)   NOT NULL COMMENT '1-12',
  `year`         SMALLINT(4)  NOT NULL,
  `total_hadir`  SMALLINT     NOT NULL DEFAULT 0,
  `total_izin`   SMALLINT     NOT NULL DEFAULT 0,
  `total_sakit`  SMALLINT     NOT NULL DEFAULT 0,
  `total_alpa`   SMALLINT     NOT NULL DEFAULT 0,
  `pct_hadir`    FLOAT        NOT NULL DEFAULT 0 COMMENT 'persentase kehadiran',
  `generated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `generated_by` INT(11)      NULL     COMMENT 'siapa yang generate PDF',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_monthly` (`user_id`, `month`, `year`),
  KEY `idx_month_year` (`month`, `year`),
  CONSTRAINT `fk_monthly_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4.6 Schema Tabel: `system_config`

```sql
CREATE TABLE `system_config` (
  `key`          VARCHAR(50)  NOT NULL,
  `value`        TEXT         NOT NULL,
  `description`  VARCHAR(200) NULL,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data awal
INSERT INTO `system_config` (`key`, `value`, `description`) VALUES
('kepala_sekolah_nama', '', 'Nama Kepala Sekolah untuk laporan PDF'),
('kepala_sekolah_nip',  '', 'NIP Kepala Sekolah untuk laporan PDF'),
('geofence_radius',     '350', 'Radius geofencing dalam meter'),
('max_upload_size',     '5242880', 'Max ukuran foto selfie (bytes)');
```

### 4.7 Indeks yang Diperlukan

```sql
-- Indeks tambahan untuk performa query laporan
CREATE INDEX idx_attendance_month ON attendance (user_id, YEAR(date), MONTH(date));
CREATE INDEX idx_attendance_status ON attendance (status, date);
CREATE INDEX idx_users_guru_active ON users (guru_id, status) WHERE role = 'siswa';
```

### 4.8 Backup Strategy Database

| Jenis Backup | Frekuensi | Retensi | Metode |
|-------------|-----------|---------|--------|
| mysqldump full | Harian (otomatis/manual) | 7 hari di server, 30 hari lokal | backup.ps1 |
| snapshot LXC | Bulanan | 3 bulan | backup_proxmox.ps1 |
| mysqldump sebelum reset | Sebelum reset data | Permanen | Manual |

---

## BAB 5 - Setup APK Android

### 5.1 File Konfigurasi Capacitor

**File:** `capacitor.config.json` (di root project)

```json
{
  "appId": "com.smkn9.sigappkl",
  "appName": "SIGAP PKL K9",
  "webDir": "www",
  "android": {
    "allowMixedContent": true,
    "captureInput": true,
    "webContentsDebuggingEnabled": true
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#0f172a",
      "showSpinner": false,
      "androidFullScreen": true,
      "splashFullScreen": true,
      "splashImmersive": true
    },
    "StatusBar": {
      "style": "DARK",
      "backgroundColor": "#0f172a"
    }
  }
}
```

### 5.2 Android Manifest

**File:** `android/app/src/main/AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true"
            android:screenOrientation="portrait"
            android:windowSoftInputMode="adjustResize">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
</manifest>
```

### 5.3 Network Security Config

**File:** `android/app/src/main/res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Trust self-signed certificate untuk server SIGAP PKL -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="false">103.153.190.69</domain>
        <trust-anchors>
            <!-- Trust CA sistem Android -->
            <certificates src="system" />
            <!-- Trust sertifikat user-installed (untuk bypass self-signed) -->
            <certificates src="user" />
        </trust-anchors>
    </domain-config>

    <!-- Base config: tidak izinkan cleartext (HTTP) -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

### 5.4 IP Server yang Diobfuscate (Base64)

Dalam `app.js`, URL server dikodekan base64 untuk menghindari plain-text IP di source code APK:

```javascript
// IP obfuscation di app.js
(function(){
  var _a = ['aHR0cHM6Ly8xMDMuMTUzLjE5MC42OTo4NDQz'];
  // Decode: https://103.153.190.69:8443
  var _b = atob(_a[0]);
  window._SERVER_HTTPS = _b;
  window._SSE_URL = _b + '/api.php?action=sse_events';
})();
```

> **Catatan:** Obfuscation base64 bukan enkripsi sejati. Untuk keamanan lebih tinggi di masa depan, pertimbangkan penggunaan domain publik dengan SSL Let's Encrypt.

### 5.5 Build Command dan Script Deploy

#### Persiapan (satu kali)

```powershell
# 1. Install Node.js dan Capacitor CLI
npm install -g @capacitor/cli

# 2. Install dependencies project
cd "D:\absen pkl update"
npm install

# 3. Inisialisasi Capacitor (jika belum)
npx cap init "SIGAP PKL K9" "com.smkn9.sigappkl"

# 4. Tambah platform Android
npx cap add android

# 5. Setup SSH key
ssh-keygen -t rsa -b 4096 -f "C:\Users\FUJITSU T939\.ssh\sigap_pkl_key" -N ""
# Salin public key ke server
```

#### Build dan Deploy (setiap update)

```powershell
# Jalankan script deploy otomatis (satu perintah)
cd "D:\absen pkl update"
.\deploy.ps1
```

#### Deploy hanya Web (tanpa build APK)

```powershell
$KEY = "C:\Users\FUJITSU T939\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$WEB = "/var/www/presensiku"

scp -i $KEY js\app.js      "${SERVER}:${WEB}/js/app.js"
scp -i $KEY css\styles.css "${SERVER}:${WEB}/css/styles.css"
scp -i $KEY index.html     "${SERVER}:${WEB}/index.html"
ssh -i $KEY $SERVER "chown www-data:www-data $WEB/js/app.js $WEB/css/styles.css $WEB/index.html"
```

---

## BAB 6 - Onboarding Pengguna

### 6.1 Urutan Persiapan Data Awal

Data harus diinput dengan urutan yang benar untuk menghindari error foreign key:

```
URUTAN INPUT DATA:
─────────────────
1. Data Kepala Sekolah
   (Pengaturan → Data Kepala Sekolah)

2. Data Guru Pembimbing
   (Manajemen Pengguna → Tambah Guru)
   → Input semua guru terlebih dahulu

3. Data Siswa
   (Manajemen Pengguna → Tambah Siswa)
   → Setiap siswa memerlukan guru_id yang valid
   → Gunakan Import CSV untuk input massal
```

### 6.2 Distribusi APK ke Siswa

#### Metode Distribusi

| Metode | Kelebihan | Kekurangan |
|--------|-----------|------------|
| Transfer via USB | Cepat, tanpa internet | Harus satu per satu |
| WhatsApp/Telegram | Mudah, familiar | File > 100MB mungkin terpotong |
| Google Drive/OneDrive | Satu link untuk semua | Butuh akun Google/Microsoft |
| SD Card | Offline, massal | Butuh card reader |

#### Template Pesan Distribusi APK (WhatsApp/Grup)

```
Assalamu'alaikum wr wb.

Kepada seluruh siswa PKL SMK Negeri 9 Malang,

Berikut informasi sistem absensi PKL digital (SIGAP PKL K9):

📱 Link download APK:
[link_APK_diisi_admin]

📋 Data login Anda:
• NISN : [nisn_siswa]
• Password : [password_awal]
(Simpan baik-baik, jangan dibagikan!)

📌 Cara install:
1. Download APK dari link di atas
2. Buka file APK → Instal → Izinkan semua permission
3. Login dengan NISN dan password di atas

⚠️ WAJIB: Aktifkan GPS sebelum absen!

Jika ada kendala, hubungi guru pembimbing Anda.

Wassalamu'alaikum wr wb.
Admin SIGAP PKL - SMKN 9 Malang
```

### 6.3 Checklist Sosialisasi Guru (Durasi: ~1 Jam)

| No | Materi | Durasi | Keterangan |
|----|--------|--------|------------|
| 1 | Pengenalan sistem SIGAP PKL | 10 menit | Demo live login guru |
| 2 | Cara monitoring siswa di peta | 10 menit | Demo peta multi-marker |
| 3 | Cara persetujuan izin/sakit | 10 menit | Demo approval workflow |
| 4 | Cara generate laporan PDF | 15 menit | Demo pilih siswa → generate → simpan |
| 5 | Troubleshooting umum | 10 menit | Demo reconnect SSE, filter siswa |
| 6 | Tanya jawab | 5 menit | - |

**Bahan yang perlu disiapkan:**
- HP/laptop masing-masing guru sudah terinstal APK atau bisa akses browser
- NIP dan password masing-masing guru (dicetak atau dikirim sebelum sesi)
- Koneksi internet stabil di ruang sosialisasi
- Proyektor/screen untuk demo

### 6.4 Checklist Sosialisasi Siswa (Durasi: ~30 Menit)

| No | Materi | Durasi | Keterangan |
|----|--------|--------|------------|
| 1 | Instalasi APK di HP masing-masing | 10 menit | Dibantu teman/guru |
| 2 | Login dan pengenalan tampilan | 5 menit | Demo di proyektor |
| 3 | Cara absen masuk dan pulang | 10 menit | Demo langsung di halaman sekolah |
| 4 | Cara ajukan izin/sakit | 5 menit | Demo singkat |

**Poin penting yang harus disampaikan:**
- GPS harus aktif sebelum absen
- Foto selfie harus jelas (wajah terlihat)
- Radius 350 meter — harus di lokasi PKL
- Tidak bisa absen dengan GPS palsu (fake GPS)
- Jika ada masalah, hubungi guru pembimbing (bukan langsung admin)

---

## BAB 7 - Monitoring & Maintenance

### 7.1 Jadwal Monitoring Harian

| Waktu | Aktivitas | Cara Cek |
|-------|-----------|----------|
| 07.00 WIB | Cek server aktif | `curl -k https://103.153.190.69:8443` |
| 07.00 WIB | Cek Nginx running | `systemctl status nginx` |
| 07.00 WIB | Cek PHP-FPM running | `systemctl status php8.2-fpm` |
| 12.00 WIB | Cek error log | `tail -50 /var/log/nginx/sigap_pkl_error.log` |
| 17.00 WIB | Review absensi hari ini | Via dashboard admin |
| 23.00 WIB | Jalankan backup harian | `.\backup.ps1` |

### 7.2 Jadwal Monitoring Mingguan

| Hari | Aktivitas |
|------|-----------|
| Senin | Review log error seminggu, cek disk usage server |
| Rabu | Cek koneksi MariaDB, verifikasi backup sukses |
| Jumat | Review statistik absensi mingguan, laporan ke admin sekolah |

### 7.3 Jadwal Monitoring Bulanan

| Aktivitas | Detail |
|-----------|--------|
| Jalankan backup_proxmox.ps1 | Snapshot penuh container LXC 102 |
| Review performa server | CPU, RAM, disk usage trend |
| Update package sistem | `apt update && apt upgrade` (dengan hati-hati) |
| Review log Nginx bulan lalu | Cek anomali traffic atau error 500 |
| Generate laporan rekap | PDF laporan semua siswa untuk arsip sekolah |
| Hapus foto lama (>6 bulan) | Jika storage terbatas |

### 7.4 Prosedur Update Aplikasi

#### Update Hanya File Web (tanpa rebuild APK)

```powershell
# Edit file yang perlu diupdate:
# - D:\absen pkl update\js\app.js
# - D:\absen pkl update\css\styles.css
# - D:\absen pkl update\index.html
# - D:\absen pkl update\api.php

# Deploy ke server (hanya file web, tanpa build APK):
$KEY = "C:\Users\FUJITSU T939\.ssh\sigap_pkl_key"
$SERVER = "root@103.153.190.69"
$WEB = "/var/www/presensiku"

scp -i $KEY "D:\absen pkl update\api.php" "${SERVER}:${WEB}/api.php"
scp -i $KEY "D:\absen pkl update\js\app.js" "${SERVER}:${WEB}/js/app.js"
ssh -i $KEY $SERVER "chown www-data:www-data $WEB/api.php $WEB/js/app.js && chmod 755 $WEB/api.php $WEB/js/app.js"
```

#### Update Lengkap (Web + APK)

```powershell
# Satu perintah:
cd "D:\absen pkl update"
.\deploy.ps1
# → Upload web ke server
# → Build APK baru
# → APK tersedia di: android/app/build/outputs/apk/release/SIGAP-PKL-K9-v1.0.apk
```

> **Catatan:** Setelah update web, pengguna browser cukup refresh halaman. Pengguna APK mendapatkan update otomatis karena APK memuat konten dari server (webDir = www yang diupload).

### 7.5 Monitoring Log Server

```bash
# Pantau access log realtime
tail -f /var/log/nginx/sigap_pkl_access.log

# Pantau error log realtime
tail -f /var/log/nginx/sigap_pkl_error.log

# Cek status semua service
systemctl status nginx php8.2-fpm mariadb

# Cek disk usage
df -h /

# Cek ukuran folder uploads
du -sh /var/www/presensiku/uploads/

# Cek koneksi aktif ke server
netstat -an | grep :8443 | wc -l
```

### 7.6 SLA Target Sistem

| Metrik | Target |
|--------|--------|
| Uptime server | ≥ 99.5% per bulan |
| Response time API | < 2 detik (p95) |
| Generate PDF | < 20 detik |
| SSE reconnect | < 10 detik setelah terputus |
| Recovery dari downtime | < 30 menit (dengan backup) |
| Akurasi GPS absensi | Radius 350m |

---

## BAB 8 - Keamanan

### 8.1 Daftar Kredensial dan Prioritas Penggantian

| Kredensial | Nilai Saat Ini | Prioritas Ganti | Cara Ganti |
|------------|----------------|-----------------|------------|
| Admin password | sampurna01 | 🔴 TINGGI (segera) | Via dashboard admin → Pengaturan |
| DB password (sigap_user) | SigapPKL@2026! | 🟡 SEDANG | Ganti di MariaDB + update api.php |
| SSH key (sigap_pkl_key) | RSA 4096-bit | 🟢 RENDAH (sudah kuat) | Regenerate jika key bocor |
| SSL Certificate | Self-signed | 🟡 SEDANG | Ganti ke Let's Encrypt + domain |

> **Rekomendasi:** Ganti password admin segera setelah serah terima sistem ke pihak sekolah.

### 8.2 SSH Key Management

| Item | Lokasi | Keterangan |
|------|--------|------------|
| Private key | `C:\Users\FUJITSU T939\.ssh\sigap_pkl_key` | Jangan dibagikan |
| Public key | `/root/.ssh/authorized_keys` di server | Sudah terpasang di server |
| Passphrase | (Tidak ada) | Diperlukan untuk deploy otomatis |

**Prosedur jika private key bocor:**

```powershell
# 1. Generate key baru
ssh-keygen -t rsa -b 4096 -f "C:\Users\..\.ssh\sigap_pkl_key_new"

# 2. Upload public key baru ke server
ssh-copy-id -i "C:\Users\..\.ssh\sigap_pkl_key_new.pub" root@103.153.190.69

# 3. Hapus key lama dari server
ssh root@103.153.190.69 "sed -i '/[isi_public_key_lama]/d' ~/.ssh/authorized_keys"

# 4. Update deploy.ps1 untuk menggunakan key baru
# Ganti: $SSH_KEY = "...\sigap_pkl_key"
# Menjadi: $SSH_KEY = "...\sigap_pkl_key_new"
```

### 8.3 Rekomendasi: Setup Domain dengan SSL Let's Encrypt

Menggunakan domain publik + SSL Let's Encrypt akan:
- Menghilangkan kebutuhan bypass SSL warning di browser
- APK tidak perlu network_security_config khusus
- Lebih profesional untuk institusi pendidikan

**Langkah setup (estimasi 2 jam):**

```bash
# Di server, install Certbot
apt install certbot python3-certbot-nginx

# Arahkan DNS: sigap.smkn9malang.sch.id → 103.153.190.69

# Dapatkan sertifikat
certbot --nginx -d sigap.smkn9malang.sch.id

# Update konfigurasi Nginx (Certbot otomatis mengupdate)
# Ubah listen dari 8443 ke 443

# Renew otomatis (sudah diatur oleh Certbot)
certbot renew --dry-run
```

**Setelah setup domain:**
1. Update `_SERVER_HTTPS` di `app.js` ke `https://sigap.smkn9malang.sch.id`
2. Update base64 encoding IP → URL baru
3. Rebuild dan redistribusi APK

### 8.4 Keamanan Data Foto Selfie

- Foto disimpan di `/var/www/presensiku/uploads/` di server
- **Tidak boleh diakses publik langsung via URL**
- Akses foto hanya melalui API (dengan autentikasi token)
- Konfigurasi Nginx untuk blokir akses langsung ke folder `uploads/`:

```nginx
# Tambahkan ke konfigurasi Nginx
location /uploads/ {
    internal;
    # Hanya bisa diakses via PHP (X-Accel-Redirect)
}
```

### 8.5 Keamanan API (api.php)

Praktik keamanan yang sudah diimplementasikan:

| Mekanisme | Implementasi |
|-----------|-------------|
| Password hashing | bcrypt (password_hash/verify PHP) |
| SQL Injection prevention | Prepared statements (PDO) |
| CORS | Header `Access-Control-Allow-Origin` dikontrol |
| Token session | Random token per sesi login |
| Input validation | Validasi tipe data dan panjang input |
| File upload validation | Validasi format base64 dan ukuran foto |

---

## BAB 9 - Roadmap Pengembangan

### 9.1 Fitur yang Direncanakan

| ID | Fitur | Prioritas | Estimasi | Versi Target | Dependensi |
|----|-------|-----------|----------|-------------|------------|
| R01 | Domain publik + SSL Let's Encrypt | Tinggi | 1–2 hari | v1.2 | Akses DNS smkn9malang.sch.id |
| R02 | Ganti password mandiri (siswa/guru) | Tinggi | 2–3 hari | v1.2 | - |
| R03 | Push Notification (FCM) | Tinggi | 1–2 minggu | v1.2 | Firebase project, domain |
| R04 | Export Excel (rekap absensi) | Sedang | 3–5 hari | v1.3 | Library SheetJS atau PhpSpreadsheet |
| R05 | Notifikasi WhatsApp API | Sedang | 1 minggu | v1.3 | Langganan WhatsApp Business API |
| R06 | Dashboard statistik chart lebih detail | Sedang | 3–5 hari | v1.3 | Chart.js (sudah ada) |
| R07 | Scan QR Code (alternatif foto) | Rendah | 1–2 minggu | v1.4 | QR generator per siswa |
| R08 | iOS (iPhone) Support | Rendah | 2–4 minggu | v2.0 | MacOS + Xcode + Apple Dev Account |
| R09 | Multi-sekolah / Multi-tenant | Rendah | 1–2 bulan | v2.0 | Redesain database |
| R10 | Integrasi e-Raport SMKN 9 | Rendah | 1–2 bulan | v2.1 | API e-Raport SMKN 9 |

### 9.2 Detail Roadmap per Versi

#### Versi 1.2 (Target: September–Oktober 2026)

- **R01 — Domain SSL:** Daftarkan domain `sigap.smkn9malang.sch.id`, setup Certbot, update kode, rebuild APK
- **R02 — Ganti Password:** Tambahkan halaman "Ubah Password" di profil semua role. Validasi password lama sebelum ganti.
- **R03 — Push Notification:** Integrasikan Firebase Cloud Messaging (FCM). Notifikasi untuk: absensi baru (ke guru), persetujuan izin (ke siswa), reminder belum absen (ke siswa jam 10 pagi)

#### Versi 1.3 (Target: Januari 2027)

- **R04 — Export Excel:** Tombol "Download Excel" di halaman laporan. Generate file .xlsx dengan library server-side.
- **R05 — WhatsApp API:** Kirim notifikasi ringkasan absensi mingguan ke nomor orang tua siswa via WhatsApp Business API.
- **R06 — Chart Detail:** Tambah chart tren kehadiran bulanan, perbandingan antar siswa, heatmap hari-hari dengan banyak ketidakhadiran.

#### Versi 2.0 (Target: Pertengahan 2027)

- **R08 — iOS Support:** Port ke iOS menggunakan Capacitor. Memerlukan MacOS + Xcode + Apple Developer Account ($99/tahun).
- **R09 — Multi-tenant:** Memungkinkan lebih dari satu sekolah menggunakan sistem yang sama dengan data terpisah.

---

## BAB 10 - Checklist Implementasi

### 10.1 Pre-Launch Checklist: Server & Infrastruktur

- [ ] VPS aktif dan dapat diakses via SSH
- [ ] Proxmox VE terinstal di VPS
- [ ] LXC Container 102 berjalan (status: running)
- [ ] Nginx terinstal dan running (`systemctl status nginx`)
- [ ] PHP 8.2 + FPM terinstal dan running
- [ ] Node.js 18 terinstal (`node --version`)
- [ ] Chromium terinstal (`chromium --version`)
- [ ] MariaDB dapat diakses dari container (`mysql -h 192.168.100.1 -u sigap_user -p sigap_pkl`)
- [ ] SSL certificate terpasang di Nginx (self-signed atau Let's Encrypt)
- [ ] Port 80, 8443, 22 terbuka di firewall
- [ ] SSH key-based auth berfungsi (login tanpa password)
- [ ] File `api.php` sudah di `/var/www/presensiku/`
- [ ] Permission file `www-data:www-data` pada semua file web
- [ ] Folder `uploads/` dan `pdf_temp/` ada dan writable oleh www-data

### 10.2 Pre-Launch Checklist: Database

- [ ] Database `sigap_pkl` sudah dibuat
- [ ] User `sigap_user` dengan password yang benar sudah dibuat
- [ ] Semua tabel sudah dibuat (users, attendance, permissions, monthly_reports, system_config)
- [ ] Data kepala sekolah sudah diinput di `system_config`
- [ ] Index-index tambahan sudah dibuat
- [ ] Koneksi dari api.php ke database berhasil (test via browser: `api.php?action=health_check`)

### 10.3 Pre-Launch Checklist: APK Android

- [ ] `capacitor.config.json` sudah diisi dengan appId yang benar
- [ ] `network_security_config.xml` sudah mengizinkan self-signed cert 103.153.190.69
- [ ] URL server di `app.js` sudah benar (base64 encode IP baru jika diperlukan)
- [ ] `AndroidManifest.xml` sudah memiliki semua permission yang diperlukan
- [ ] APK berhasil di-build tanpa error (`.\deploy.ps1`)
- [ ] APK sudah diuji di HP Android (minimal 2 device berbeda)
- [ ] Login 3 role berhasil (siswa, guru, admin)
- [ ] Absensi GPS + foto berhasil
- [ ] SSE realtime berfungsi
- [ ] Generate PDF berfungsi dan tersimpan ke HP

### 10.4 Pre-Launch Checklist: Data Awal

- [ ] Data kepala sekolah diinput
- [ ] Minimal 1 akun admin aktif (username: admin, password sudah diganti dari default)
- [ ] Semua guru pembimbing sudah diinput dengan NIP dan password
- [ ] Semua siswa PKL sudah diinput dengan NISN, password, guru_id, dan koordinat PKL
- [ ] Koordinat PKL semua siswa sudah diverifikasi (tidak ada yang kosong atau salah)
- [ ] Data telah diuji: siswa dapat login dan melihat lokasi PKL di peta

### 10.5 Launch Checklist: Distribusi

- [ ] File APK (`SIGAP-PKL-K9-v1.0.apk`) sudah dikumpulkan ke folder distribusi
- [ ] Link download APK sudah dibuat (Google Drive / OneDrive / server)
- [ ] Daftar NISN + password awal semua siswa sudah dicetak/disiapkan
- [ ] Daftar NIP + password awal semua guru sudah dicetak/disiapkan
- [ ] Sesi sosialisasi guru sudah dijadwalkan
- [ ] Sesi sosialisasi siswa sudah dijadwalkan

### 10.6 Launch Checklist: Sosialisasi

- [ ] Sesi sosialisasi guru dilaksanakan (~1 jam)
- [ ] Setiap guru dapat login dan melihat siswa bimbingannya
- [ ] Setiap guru dapat menyetujui izin (demo)
- [ ] Setiap guru dapat generate PDF (demo)
- [ ] Sesi sosialisasi siswa dilaksanakan (~30 menit per kelas)
- [ ] Semua siswa sudah menginstal APK
- [ ] Minimal 80% siswa dapat login berhasil
- [ ] Test absensi kolektif (seluruh kelas absen bersamaan untuk cek beban server)

### 10.7 Post-Launch Week 1 Checklist

- [ ] Hari 1: Monitor log error Nginx setiap jam
- [ ] Hari 1: Cek semua absensi pagi masuk dengan benar
- [ ] Hari 2: Evaluasi masalah yang dilaporkan siswa/guru
- [ ] Hari 3: Perbaiki bug/isu yang muncul (hotfix jika perlu)
- [ ] Hari 5 (Jumat): Cetak laporan minggu pertama — verifikasi format PDF
- [ ] Hari 7: Review backup berhasil dijalankan setiap malam
- [ ] Hari 7: Laporan ringkasan kepada kepala sekolah/wakasek

---

---

## LAMPIRAN A - Kredensial Sistem Lengkap

> ⚠️ **DOKUMEN RAHASIA** — Simpan dokumen ini dengan aman. Jangan distribusikan kepada pihak yang tidak berwenang.

| Sistem | Username / Identifier | Password / Key | Catatan |
|--------|----------------------|----------------|---------|
| **Master Admin** | admin | sampurna01 | Ganti segera setelah serah terima |
| **Database** | sigap_user | SigapPKL@2026! | Host: 192.168.100.1, DB: sigap_pkl |
| **SSH Server** | root@103.153.190.69 | (key-based, no password) | Key: sigap_pkl_key |
| **Proxmox VE** | root | (tanyakan ke provider VPS) | Port 8006 |
| **SSL Certificate** | — | sigap_pkl.key | /etc/nginx/ssl/sigap_pkl.key |

### Lokasi File Kredensial

| File | Lokasi | Isi |
|------|--------|-----|
| SSH Private Key | `C:\Users\FUJITSU T939\.ssh\sigap_pkl_key` | Private key untuk login server |
| SSH Public Key | `/root/.ssh/authorized_keys` (di server) | Public key yang terpasang |
| SSL Private Key | `/etc/nginx/ssl/sigap_pkl.key` (di server) | Private key SSL |
| SSL Certificate | `/etc/nginx/ssl/sigap_pkl.crt` (di server) | Sertifikat SSL self-signed |
| DB Config | `api.php` (baris konstanta DB_*) | Semua koneksi DB |

---

## LAMPIRAN B - Perintah SSH Berguna

### Koneksi ke Server

```bash
# Login ke server
ssh -i "C:\Users\FUJITSU T939\.ssh\sigap_pkl_key" root@103.153.190.69

# Login dengan alias (setelah setup ~/.ssh/config)
ssh sigap-pkl
```

### Setup SSH Config (opsional, untuk kemudahan)

Tambahkan ke `C:\Users\FUJITSU T939\.ssh\config`:

```
Host sigap-pkl
    HostName 103.153.190.69
    User root
    IdentityFile C:\Users\FUJITSU T939\.ssh\sigap_pkl_key
    StrictHostKeyChecking no
```

### Perintah Server yang Sering Digunakan

```bash
# Restart Nginx
systemctl restart nginx

# Restart PHP-FPM
systemctl restart php8.2-fpm

# Status semua service
systemctl status nginx php8.2-fpm mariadb

# Lihat log error Nginx (live)
tail -f /var/log/nginx/sigap_pkl_error.log

# Lihat log akses Nginx (live)
tail -f /var/log/nginx/sigap_pkl_access.log

# Masuk ke database
mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl

# Cek ukuran database
mysql -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! -e "SELECT table_name, ROUND(data_length/1024/1024,2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema='sigap_pkl';"

# Backup database manual
mysqldump -h 192.168.100.1 -u sigap_user -pSigapPKL@2026! sigap_pkl > /backup/sigap_pkl_manual_$(date +%Y%m%d).sql

# Cek disk usage
df -h /

# Cek RAM usage
free -h

# Cek folder uploads
du -sh /var/www/presensiku/uploads/

# Test API
curl -k "https://103.153.190.69:8443/api.php?action=health_check"
```

### Perintah Proxmox (dari SSH ke host Proxmox)

```bash
# Masuk ke container LXC 102
pct enter 102

# Status container
pct status 102

# Start/stop container
pct start 102
pct stop 102

# Buat snapshot container
pct snapshot 102 snap_$(date +%Y%m%d) --description "Manual backup"

# List snapshot
pct listsnapshot 102

# Hapus snapshot
pct delsnapshot 102 snap_20260801

# Backup container ke vzdump
vzdump 102 --compress gzip --storage local
```

---

## LAMPIRAN C - Kontak & Support

### Tim Pengembang

| Peran | Nama | Kontak |
|-------|------|--------|
| Pengembang Utama | [Nama Pengembang] | [No HP / Email] |
| Admin Server | [Nama Admin IT] | [No HP / Email] |
| Koordinator PKL | [Nama Wakasek/Koordinator] | [No HP / Email] |

### Prosedur Pelaporan Masalah

**Level 1 — Masalah Pengguna (Siswa/Guru):**
- Lapor ke guru pembimbing masing-masing
- Guru pembimbing coba troubleshooting berdasarkan BAB 8 Manual Book

**Level 2 — Masalah Teknis (Admin Sekolah):**
- Admin sekolah login ke dashboard admin
- Cek dan perbaiki data pengguna jika perlu
- Jika masalah berlanjut, hubungi admin IT

**Level 3 — Masalah Server/Infrastruktur:**
- Admin IT login ke server via SSH
- Cek log Nginx dan PHP-FPM
- Restart service jika diperlukan
- Jika server down total: hubungi provider VPS

### Waktu Support

| Waktu | Ketersediaan |
|-------|-------------|
| Senin–Jumat 07.00–17.00 WIB | Full support (semua masalah) |
| Senin–Jumat 17.00–22.00 WIB | Support terbatas (darurat saja) |
| Sabtu–Minggu | Darurat saja (server down) |

---

## LAMPIRAN D - Daftar File Backup Penting

### File yang Wajib Di-Backup

| File/Folder | Lokasi | Frekuensi | Keterangan |
|-------------|--------|-----------|------------|
| api.php | `D:\absen pkl update\api.php` | Setiap edit | File API utama |
| app.js | `D:\absen pkl update\js\app.js` | Setiap edit | Logic frontend |
| styles.css | `D:\absen pkl update\css\styles.css` | Setiap edit | Stylesheet |
| index.html | `D:\absen pkl update\index.html` | Setiap edit | Halaman utama |
| capacitor.config.json | `D:\absen pkl update\capacitor.config.json` | Jika berubah | Config Capacitor |
| AndroidManifest.xml | `D:\absen pkl update\android\app\src\main\` | Jika berubah | Manifest Android |
| network_security_config.xml | `D:\absen pkl update\android\...res\xml\` | Jika berubah | Security config |
| deploy.ps1 | `D:\absen pkl update\deploy.ps1` | Jika berubah | Script deploy |
| backup.ps1 | `D:\absen pkl update\backup.ps1` | Jika berubah | Script backup |
| sigap_pkl_key | `C:\Users\FUJITSU T939\.ssh\` | Sekali | SSH private key |
| sigap_pkl_key.pub | `C:\Users\FUJITSU T939\.ssh\` | Sekali | SSH public key |

### File Database Backup

| File | Lokasi | Frekuensi |
|------|--------|-----------|
| sigap_pkl_YYYYMMDD.sql | `D:\backup\` | Harian |
| lxc-102-YYYYMMDD.tar.gz | `D:\backup\proxmox\` | Bulanan |
| sigap_pkl_BEFORE_RESET.sql | `D:\backup\reset\` | Sebelum reset data |

### Folder Backup Lokal (Disarankan)

```
D:\backup\
├── db\           ← mysqldump harian
├── proxmox\      ← LXC dump bulanan
├── reset\        ← DB dump sebelum reset data
├── ssl\          ← Salinan SSL key/cert
│   ├── sigap_pkl.crt
│   └── sigap_pkl.key
└── backup.log    ← Log hasil backup
```

---

## Catatan Perubahan Dokumen

| Versi | Tanggal | Perubahan | Oleh |
|-------|---------|-----------|------|
| 1.0 | Juli 2026 | Dokumen awal dibuat | Tim Pengembang |
| 1.1 | Agustus 2026 | Penambahan roadmap, checklist, lampiran lengkap | Tim Pengembang |

---

*Dokumen ini merupakan rencana implementasi resmi sistem SIGAP PKL*
*SMK Negeri 9 Malang | Versi 1.1 | Agustus 2026*
*Bersifat RAHASIA — Hanya untuk keperluan internal sekolah*

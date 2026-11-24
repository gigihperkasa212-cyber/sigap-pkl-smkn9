# -*- coding: utf-8 -*-
"""
Generate 4 file DOCX untuk SIGAP PKL SMK Negeri 9 Malang
Standar: Times New Roman 12pt, A4, margin 4-4-3-3, spasi 1.5, justify
"""
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

BASE_DIR = r"d:\absen pkl update"

# ─── Helper fungsi ────────────────────────────────────────────────────────────

def new_doc():
    doc = Document()
    sec = doc.sections[0]
    sec.page_width  = Cm(21.0)
    sec.page_height = Cm(29.7)
    sec.left_margin   = Cm(4.0)
    sec.top_margin    = Cm(4.0)
    sec.right_margin  = Cm(3.0)
    sec.bottom_margin = Cm(3.0)
    # Default normal style
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style.font.size = Pt(12)
    style.paragraph_format.alignment     = WD_ALIGN_PARAGRAPH.JUSTIFY
    style.paragraph_format.space_before  = Pt(0)
    style.paragraph_format.space_after   = Pt(6)
    style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    return doc

def para(doc, text, bold=False, size=12, space_after=6, align=WD_ALIGN_PARAGRAPH.JUSTIFY,
         color=None, italic=False, indent=None, center=False):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if center else align
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    if indent:
        p.paragraph_format.first_line_indent = Cm(indent)
    run = p.add_run(text)
    run.bold   = bold
    run.italic = italic
    run.font.name = 'Times New Roman'
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = RGBColor(*color)
    return p

def heading(doc, text, level=1, size=None):
    sizes = {1: 16, 2: 14, 3: 13, 4: 12}
    sz = size or sizes.get(level, 12)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after  = Pt(6)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    run = p.add_run(text)
    run.bold = True
    run.font.name = 'Times New Roman'
    run.font.size = Pt(sz)
    return p

def cover_text(doc, text, size=12, bold=False, space_after=4, color=None, italic=False):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.name = 'Times New Roman'
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = RGBColor(*color)
    return p

def add_table(doc, headers, rows, col_widths=None):
    n_cols = len(headers)
    tbl = doc.add_table(rows=1, cols=n_cols)
    tbl.style = 'Table Grid'
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Header
    hdr = tbl.rows[0]
    for i, h in enumerate(headers):
        cell = hdr.cells[i]
        cell.text = h
        cell.paragraphs[0].runs[0].bold = True
        cell.paragraphs[0].runs[0].font.size = Pt(11)
        cell.paragraphs[0].runs[0].font.name = 'Times New Roman'
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        tc = cell._tc
        tcPr = tc.get_or_add_tcPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:fill'), '0F172A')
        shd.set(qn('w:color'), 'FFFFFF')
        shd.set(qn('w:val'), 'clear')
        tcPr.append(shd)
        for run in cell.paragraphs[0].runs:
            run.font.color.rgb = RGBColor(255,255,255)
    # Data rows
    for row_data in rows:
        row = tbl.add_row()
        for i, val in enumerate(row_data):
            cell = row.cells[i]
            cell.text = str(val)
            cell.paragraphs[0].runs[0].font.size = Pt(10)
            cell.paragraphs[0].runs[0].font.name = 'Times New Roman'
    # Column widths
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in tbl.rows:
                row.cells[i].width = Cm(w)
    return tbl

def cover_page(doc, title, subtitle, version, date, role_desc=None):
    doc.add_paragraph()
    doc.add_paragraph()
    doc.add_paragraph()
    cover_text(doc, "DOKUMEN TEKNIS", size=13, bold=False, space_after=6)
    cover_text(doc, title, size=20, bold=True, space_after=6)
    cover_text(doc, subtitle, size=14, bold=False, space_after=4)
    doc.add_paragraph()
    cover_text(doc, "SMK NEGERI 9 MALANG", size=14, bold=True, space_after=4)
    cover_text(doc, "Jalan Sampurna Nomor 1, Cemorokandang, Kedungkandang, Malang, 65138", size=11, space_after=4)
    cover_text(doc, "Telepon 0341727998 | https://smkn9malang.sch.id/", size=11, space_after=8)
    doc.add_paragraph()
    if role_desc:
        cover_text(doc, role_desc, size=11, italic=True, space_after=4)
    cover_text(doc, version, size=12, bold=True, space_after=4)
    cover_text(doc, date, size=11, space_after=4)
    doc.add_page_break()


# ══════════════════════════════════════════════════════════════════════════════
# 1. FLOWCHART SIGAP PKL
# ══════════════════════════════════════════════════════════════════════════════
def make_flowchart():
    doc = new_doc()
    cover_page(doc,
               "FLOWCHART SISTEM SIGAP PKL",
               "Sistem Informasi & Geofencing Absensi PKL",
               "Versi 2.1.63",
               "3 September 2026",
               "Dokumen ini menjelaskan alur proses sistem SIGAP PKL dalam format flowchart teks")

    # FC-1
    heading(doc, "FC-1. Alur Utama Sistem SIGAP PKL", 1)
    para(doc, "Alur berikut menggambarkan proses utama dari awal aplikasi dibuka hingga pengguna masuk ke dashboard sesuai perannya.", indent=1.27)

    flows_fc1 = [
        ("MULAI", "Aplikasi dibuka (APK diklik atau URL diakses di browser)"),
        ("PROSES", "checkAuthSession() — Sistem memeriksa sesi tersimpan di localStorage dan flag SIGAP_PKL_K9_remember_v1"),
        ("KEPUTUSAN", "Apakah ada sesi tersimpan DAN flag remember aktif?"),
        ("YA →", "Verifikasi ke server (timeout 6 detik) → Jika valid: auto-login via _proceedWithLocalSession() | Jika tidak/timeout: fallback ke sesi lokal"),
        ("TIDAK →", "Tampilkan halaman Login → User input Username + Password"),
        ("KEPUTUSAN", "Apakah login valid? (username + password cocok, aktif = 1)"),
        ("YA →", "performUserLogin() — Simpan sesi (sessionStorage default, localStorage jika Ingat Saya dicentang)"),
        ("TIDAK →", "Toast error 'Username atau password salah' → Kembali ke form login"),
        ("PROSES", "applyUserInterface(user) — Routing berdasarkan role pengguna"),
        ("SISWA", "Tampilkan Tab Absensi + Peta Lokasi PKL"),
        ("GURU", "Tampilkan Tab Monitoring + Statistik Siswa Bimbingan"),
        ("ADMIN", "Tampilkan Dashboard Admin + Statistik Realtime"),
        ("SELESAI", "Polling background 8 detik menjaga data selalu terkini"),
    ]
    tbl = add_table(doc, ["Tipe Node", "Keterangan"], flows_fc1, [3.5, 11.0])
    doc.add_paragraph()

    # FC-2
    heading(doc, "FC-2. Login & Autentikasi", 1)
    para(doc, "Alur detail proses login pengguna termasuk mekanisme penyimpanan sesi.", indent=1.27)
    flows_fc2 = [
        ("MULAI", "User mengisi form login dan klik tombol [MASUK]"),
        ("PROSES", "Baca username + password dari form input"),
        ("PROSES", "Cari di getUsers() (data lokal cache) — cocokkan username + password"),
        ("KEPUTUSAN", "User ditemukan dan aktif = 1?"),
        ("TIDAK →", "Toast: 'Username atau password salah' → Kembali ke form"),
        ("KEPUTUSAN", "Apakah checkbox 'Ingat Saya' dicentang?"),
        ("YA →", "Simpan ke localStorage + set flag SIGAP_PKL_K9_remember_v1 = '1' (persist antar sesi browser)"),
        ("TIDAK →", "Simpan ke sessionStorage saja (hilang saat tab/browser ditutup)"),
        ("PROSES", "applyUserInterface(user) — sembunyikan login, tampilkan dashboard"),
        ("PROSES", "applyTargetLocationFromUser() — set TARGET_LOCATION dari koordinat PKL"),
        ("SELESAI", "User masuk ke dashboard sesuai peran"),
    ]
    add_table(doc, ["Tipe Node", "Keterangan"], flows_fc2, [3.5, 11.0])
    para(doc, "Catatan: Default isRemember = false. Membuka tab atau browser baru akan selalu menampilkan halaman login, tidak auto-masuk.", italic=True, indent=1.27)
    doc.add_paragraph()

    # FC-3
    heading(doc, "FC-3. Absensi Siswa PKL (Masuk & Pulang)", 1)
    para(doc, "Alur proses absensi siswa menggunakan GPS geofencing dan foto selfie.", indent=1.27)
    flows_fc3 = [
        ("MULAI", "Siswa klik tombol [ABSEN MASUK] atau [ABSEN PULANG]"),
        ("KEPUTUSAN", "Apakah sudah absen tipe yang sama hari ini?"),
        ("SUDAH →", "Toast: 'Sudah absen hari ini' → Selesai tanpa proses"),
        ("BELUM →", "openCameraModal() — minta izin kamera dan GPS"),
        ("KEPUTUSAN", "Apakah izin kamera dan GPS diberikan?"),
        ("TIDAK →", "Error: 'Izin kamera/GPS diperlukan'"),
        ("YA →", "Tampilkan live kamera + overlay GPS realtime"),
        ("PROSES", "Hitung jarak Haversine antara posisi user dengan TARGET_LOCATION PKL"),
        ("PROSES", "User klik [AMBIL FOTO] — foto selfie diambil"),
        ("KEPUTUSAN", "Apakah jarak < radius geofence (default 350 meter)?"),
        ("YA →", "Status = 'Hadir'"),
        ("TIDAK →", "Status = 'Luar Radius Xm' (tetap terabsen)"),
        ("PROSES", "POST api.php?action=simpan_presensi dengan data: user_id, tipe, GPS, foto base64, status, waktu"),
        ("PROSES", "SSE broadcast ke semua client — admin/guru update realtime"),
        ("PROSES", "_runAutoAlpa() — cek akhir hari, jika tidak ada masuk+pulang → insert record Alpa"),
        ("SELESAI", "Toast konfirmasi + dashboard diperbarui"),
    ]
    add_table(doc, ["Tipe Node", "Keterangan"], flows_fc3, [3.5, 11.0])
    doc.add_paragraph()

    # FC-4
    heading(doc, "FC-4. Pengajuan & Persetujuan Izin/Sakit", 1)
    para(doc, "Alur pengajuan izin atau sakit oleh siswa dan proses persetujuan oleh guru atau admin.", indent=1.27)
    flows_fc4 = [
        ("SISWA — MULAI", "Buka tab Izin/Sakit"),
        ("SISWA — PROSES", "Isi form: jenis (Izin/Sakit), tanggal mulai, tanggal selesai, keterangan"),
        ("SISWA — PROSES", "POST submit_permission → status = 'pending'"),
        ("SISWA — STATUS", "Menunggu Persetujuan dari Guru/Admin"),
        ("GURU/ADMIN — PROSES", "SSE broadcast → notifikasi muncul di tab Persetujuan"),
        ("GURU/ADMIN — KEPUTUSAN", "Setujui atau Tolak pengajuan?"),
        ("SETUJUI →", "PUT approve_user dengan status = 'approved' → Log Alpa berubah ke Izin/Sakit pada rentang tanggal"),
        ("TOLAK →", "PUT approve_user dengan status = 'rejected' → Log tetap Alpa"),
        ("SELESAI", "Status pengajuan diperbarui, siswa dapat melihat hasilnya"),
    ]
    add_table(doc, ["Tipe Node", "Keterangan"], flows_fc4, [3.5, 11.0])
    doc.add_paragraph()

    # FC-5
    heading(doc, "FC-5. Import Data Massal CSV", 1)
    para(doc, "Alur proses import data siswa dan guru secara massal menggunakan file CSV.", indent=1.27)
    flows_fc5 = [
        ("MULAI", "Admin upload file .csv atau .xlsx"),
        ("PROSES", "parseAndImportCSV(csvText) — split baris, deteksi delimiter"),
        ("PROSES", "Loop setiap baris CSV"),
        ("KEPUTUSAN", "Apakah baris valid? (role benar, nama ada, username unik)"),
        ("TIDAK VALID →", "Tambah ke validationErrors[] → lanjut baris berikutnya"),
        ("VALID — KEPUTUSAN", "Apakah username sudah ada di database?"),
        ("SUDAH ADA →", "Update pklLocation + reset koordinat ke 0 + trigger geocode ulang"),
        ("BARU →", "POST create_user ke server dengan latitude=0, longitude=0"),
        ("PROSES", "saveUsers() → renderAdminUsersTable()"),
        ("PROSES", "Filter _toGeocode: siswa dengan koordinat = 0, dedup per nama lokasi"),
        ("PROSES", "Batch geocode via Nominatim (1.2 detik per lokasi unik)"),
        ("PROSES", "POST update_pkl_location untuk setiap siswa yang berhasil di-geocode"),
        ("PROSES", "renderCSVValidationReport() — tampilkan hasil berhasil/gagal"),
        ("SELESAI", "Data tersimpan di DB, koordinat PKL di-geocode otomatis"),
    ]
    add_table(doc, ["Tipe Node", "Keterangan"], flows_fc5, [3.5, 11.0])
    doc.add_paragraph()

    # FC-6
    heading(doc, "FC-6. Geocoding Koordinat Lokasi PKL", 1)
    flows_fc6 = [
        ("MULAI", "geocodeLocationName(locationName, user) dipanggil"),
        ("KEPUTUSAN", "Apakah nama lokasi ada di _geocodeNameCache (cache 30 hari)?"),
        ("CACHE HIT →", "Pakai koordinat dari cache — 0 request ke Nominatim — langsung update user dan DB"),
        ("CACHE MISS →", "Buat 4 query Nominatim dengan strategi berbeda (spesifik → umum)"),
        ("PROSES", "fetch nominatim.openstreetmap.org dengan countrycodes=id, limit=5"),
        ("PROSES", "Dari semua hasil, pilih yang terdekat Malang menggunakan Haversine"),
        ("KEPUTUSAN", "Apakah hasil ditemukan dan dalam radius 1000km dari Malang?"),
        ("YA →", "Koordinat presisi dari Nominatim"),
        ("TIDAK →", "Fallback ke getCoordinatesByLocationName() — kamus lokal 50+ entry"),
        ("PROSES", "_addToGeocodeCache(nama, lat, lng) — simpan ke localStorage, berlaku 30 hari"),
        ("PROSES", "POST update_pkl_location → UPDATE DB: latitude_pkl, longitude_pkl"),
        ("PROSES", "Update user object + localStorage + _updateMapUIAndReset()"),
        ("SELESAI", "Koordinat PKL tersimpan di DB dan cache"),
    ]
    add_table(doc, ["Tipe Node", "Keterangan"], flows_fc6, [3.5, 11.0])
    para(doc, "Catatan: Cache deduplikasi memastikan 50 siswa dengan nama PKL yang sama hanya menghasilkan 1 request ke Nominatim.", italic=True, indent=1.27)
    doc.add_paragraph()

    # FC-7
    heading(doc, "FC-7. Cetak Laporan PDF", 1)
    flows_fc7 = [
        ("MULAI", "Admin/Guru klik tombol Cetak Lengkap / Cetak Statistik / Cetak Rekap"),
        ("CETAK LENGKAP — PROSES", "showToast → setTimeout(80ms) → _doExportCetakLengkap()"),
        ("CETAK LENGKAP — KEPUTUSAN", "Apakah jumlah siswa > 50? → Tampilkan dialog konfirmasi"),
        ("CETAK LENGKAP — PROSES", "Pre-index O(n): build _logsIndex dan _journalsIndex (foto di-strip untuk performa)"),
        ("CETAK LENGKAP — PROSES", "Loop per siswa: buildSiswaSection() + makeMapIframe (1 tile OSM)"),
        ("STATISTIK/REKAP — PROSES", "showToast → setTimeout(50ms) → _doExport...()"),
        ("STATISTIK/REKAP — PROSES", "Pre-index O(n): _rekLogsIndex (filter bulan via string slice) + _rekPermsIndex"),
        ("SEMUA — PROSES", "_buildTtdHtml() — 3 kolom: Waka Humas | Kepala Sekolah | Ketua Pokja PKL (admin) / Guru Pembimbing (guru)"),
        ("SEMUA — PROSES", "_printAsPDF(html) — requestAnimationFrame → setTimeout(50ms) → Blob → frame.src"),
        ("KEPUTUSAN", "User klik [Simpan PDF]?"),
        ("YA →", "_savePdfViaServer() — POST HTML ke Puppeteer → base64 PDF → simpan ke Downloads"),
        ("CTRL+P →", "Browser print dialog — Save as PDF manual"),
        ("SELESAI", "File PDF tersimpan"),
    ]
    add_table(doc, ["Tipe Node", "Keterangan"], flows_fc7, [3.5, 11.0])
    doc.add_paragraph()

    # FC-8
    heading(doc, "FC-8. Sinkronisasi Realtime (SSE + Polling)", 1)
    flows_fc8 = [
        ("STARTUP — PROSES", "startupSync() → fetch get_users → _mergeServerUsers() → _initGeocodeCache()"),
        ("SSE — PROSES", "connectRealtimeSSE() — EventSource ke /api.php?action=sse_events"),
        ("SSE — PROSES", "onmessage → renderAdminDashboard() — update UI realtime"),
        ("SSE — KEPUTUSAN", "Apakah koneksi SSE putus?"),
        ("SSE — YA →", "Reconnect otomatis setelah 5 detik"),
        ("POLLING — PROSES", "setInterval(8000) — setiap 8 detik"),
        ("POLLING — PROSES", "fetch get_users → _mergeServerUsers(res)"),
        ("POLLING — PROSES", "Cek koordinat: jika server kirim default SMKN9 dan lokal sudah geocoded (<5 menit) → preserve lokal"),
        ("POLLING — PROSES", "Update activeUser koordinat + _updateMapUIAndReset()"),
        ("POLLING — PROSES", "renderAdminUsersTable() + renderAdminDashboard()"),
        ("CATATAN", "syncDataFromServer() TIDAK dipanggil saat klik cetak — mencegah hang akibat download ribuan log"),
    ]
    add_table(doc, ["Tipe Node", "Keterangan"], flows_fc8, [3.5, 11.0])
    doc.add_paragraph()

    # FC-9
    heading(doc, "FC-9. Reset Database", 1)
    flows_fc9 = [
        ("MULAI", "Admin klik tombol [Reset Database] di tab Pengaturan"),
        ("KEPUTUSAN", "Dialog konfirmasi pertama — 'Yakin ingin reset semua data?'"),
        ("BATAL →", "Tidak ada perubahan — selesai"),
        ("OK →", "Dialog konfirmasi kedua — 'Tindakan tidak bisa dibatalkan!'"),
        ("BATAL →", "Tidak jadi reset — selesai"),
        ("OK LANJUTKAN →", "_doResetDatabase()"),
        ("PROSES", "POST api.php?action=reset_database — server menghapus semua data kecuali akun admin"),
        ("PROSES", "saveUsers([admin only]) → _invalidateLogsCache()"),
        ("PROSES", "saveLogs([]) + savePermissions([]) + saveApprovalReports([])"),
        ("PROSES", "_initGeocodeCache() — refresh cache koordinat (geocache TIDAK dihapus)"),
        ("PROSES", "Render ulang semua tab — dashboard menjadi kosong"),
        ("SELESAI", "Toast: 'Database berhasil di-reset' — akun admin tetap aktif"),
    ]
    add_table(doc, ["Tipe Node", "Keterangan"], flows_fc9, [3.5, 11.0])
    para(doc, "Perhatian: Tindakan reset bersifat permanen dan tidak dapat dibatalkan. Cache koordinat PKL tetap tersimpan untuk mempercepat proses import ulang data.", italic=True, indent=1.27)
    doc.add_paragraph()

    # FC-10
    heading(doc, "FC-10. Monitoring Guru & Persetujuan Akun/PKL", 1)
    flows_fc10 = [
        ("MONITORING — MULAI", "Guru klik tombol [Absen Monitoring]"),
        ("MONITORING — PROSES", "openCameraModal() dengan mode = 'monitoring'"),
        ("MONITORING — PROSES", "Guru foto selfie + pilih siswa/PKL yang dikunjungi dari dropdown"),
        ("MONITORING — PROSES", "Simpan log: isGuruMonitoring=true, monitoringTarget=nama siswa/PKL, foto, GPS"),
        ("MONITORING — SELESAI", "Log kunjungan tampil di Cetak Lengkap sebagai bukti monitoring"),
        ("EDIT PKL — PROSES", "Guru klik [Edit Data] siswa → ubah nama lokasi PKL"),
        ("EDIT PKL — PROSES", "POST request_edit_pkl → status = 'pending_edit_pkl'"),
        ("EDIT PKL — PROSES", "Admin: tab Persetujuan → [Setujui] → UPDATE koordinat PKL di DB + geocode"),
        ("DASHBOARD — PROSES", "getSupervisedStudentsOnly() — filter siswa dengan supervisor = nama guru login"),
        ("DASHBOARD — PROSES", "Statistik: hadir/alpa/izin khusus siswa bimbingan saja"),
        ("DASHBOARD — PROSES", "Update otomatis setiap 8 detik via polling _mergeServerUsers()"),
    ]
    add_table(doc, ["Tipe Node", "Keterangan"], flows_fc10, [3.5, 11.0])

    path = BASE_DIR + r"\FLOWCHART_SIGAP_PKL.docx"
    doc.save(path)
    print(f"[OK] {path}")


# ══════════════════════════════════════════════════════════════════════════════
# 2. STORYBOARD SIGAP PKL
# ══════════════════════════════════════════════════════════════════════════════
def make_storyboard():
    doc = new_doc()
    cover_page(doc,
               "STORYBOARD SIGAP PKL",
               "Sistem Informasi & Geofencing Absensi PKL",
               "Versi 2.1.63",
               "3 September 2026",
               "Dokumen storyboard alur penggunaan aplikasi per peran\nKolom Screenshot disediakan untuk menempelkan gambar tampilan aplikasi")

    # Intro
    heading(doc, "Petunjuk Penggunaan Storyboard", 1)
    para(doc, "Dokumen ini berisi storyboard alur penggunaan aplikasi SIGAP PKL untuk tiga peran pengguna: Siswa PKL, Guru Pembimbing, dan Master Admin. Setiap frame storyboard terdiri dari nomor frame, judul langkah, deskripsi, langkah-langkah, serta kolom gambar yang disediakan untuk menempelkan screenshot tampilan aplikasi.", indent=1.27)
    para(doc, "Cara mengisi: Cetak dokumen ini, kemudian tempel screenshot aplikasi (foto HP atau screenshot PC) ke dalam kotak bergaris putus-putus yang tersedia di kolom Screenshot pada setiap frame.", indent=1.27)
    doc.add_paragraph()

    def sb_frame(doc, num, title, role, desc, steps, note=None, warn=None):
        heading(doc, f"{num}  |  {title}  [{role}]", 2, size=13)
        para(doc, desc, indent=1.27)

        # Steps
        for i, s in enumerate(steps, 1):
            p = doc.add_paragraph(style='Normal')
            p.paragraph_format.left_indent = Cm(1.27)
            p.paragraph_format.first_line_indent = Cm(-0.5)
            p.paragraph_format.space_after = Pt(3)
            r = p.add_run(f"{i}.  {s}")
            r.font.size = Pt(11)
            r.font.name = 'Times New Roman'

        # Screenshot placeholder table
        stbl = doc.add_table(rows=1, cols=2)
        stbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        stbl.style = 'Table Grid'
        c0 = stbl.rows[0].cells[0]
        c1 = stbl.rows[0].cells[1]
        c0.width = Cm(7)
        c1.width = Cm(9)
        # Label kiri
        p0 = c0.paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r0 = p0.add_run("[ SCREENSHOT ]\n\nTempelkan gambar\ntampilan aplikasi\ndi sini")
        r0.font.size = Pt(10)
        r0.font.name = 'Times New Roman'
        r0.font.color.rgb = RGBColor(148,163,184)
        c0._tc.get_or_add_tcPr()
        # Tinggi baris
        tr = stbl.rows[0]._tr
        trPr = tr.get_or_add_trPr()
        trHeight = OxmlElement('w:trHeight')
        trHeight.set(qn('w:val'), '3600')
        trPr.append(trHeight)
        # Info kanan
        info_lines = []
        if note:
            info_lines.append(f"Catatan: {note}")
        if warn:
            info_lines.append(f"Perhatian: {warn}")
        p1 = c1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r1 = p1.add_run("Keterangan Screenshot:\n" + "\n".join(info_lines) if info_lines else "Keterangan Screenshot:\nTampilan layar pada langkah ini")
        r1.font.size = Pt(10)
        r1.font.name = 'Times New Roman'

        doc.add_paragraph()

    # ── Umum ──
    heading(doc, "BAGIAN I — ALUR UMUM (Semua Peran)", 1)

    sb_frame(doc, "U-1", "Splash Screen & Loading Awal", "SEMUA",
        "Saat pertama kali dibuka, aplikasi menampilkan splash screen dengan logo SIGAP PKL dan animasi loading. Sistem sekaligus memeriksa sesi yang tersimpan.",
        ["Aplikasi dibuka (APK diklik atau URL diakses)",
         "Splash screen muncul dengan logo dan animasi",
         "checkAuthSession() — sistem memeriksa sesi",
         "Jika ada sesi valid → langsung ke dashboard",
         "Jika tidak ada sesi → tampil halaman login"],
        note="Splash screen memuat data dari server secara background")

    sb_frame(doc, "U-2", "Halaman Login", "SEMUA",
        "Pengguna memasukkan username dan password untuk masuk ke sistem.",
        ["Ketik Username pada kolom pertama",
         "Ketik Password pada kolom kedua",
         "Centang 'Ingat Saya' jika ingin tetap login setelah browser ditutup",
         "Klik tombol [MASUK]",
         "Sistem memverifikasi ke server"],
        warn="Jangan centang 'Ingat Saya' jika HP digunakan bersama orang lain")

    sb_frame(doc, "U-3", "Login Berhasil — Routing ke Dashboard", "SEMUA",
        "Setelah login berhasil, sistem otomatis menampilkan UI yang sesuai dengan peran pengguna.",
        ["Muncul toast notifikasi 'Login berhasil'",
         "Halaman login tersembunyi",
         "Siswa → Tab Absensi + Peta",
         "Guru → Tab Monitoring",
         "Admin → Tab Dashboard Admin",
         "Data pengguna dimuat dari server"],
        note="Nama, peran, dan data PKL pengguna tampil di bagian atas layar")

    sb_frame(doc, "U-4", "Ganti Tema Siang / Malam", "SEMUA",
        "Aplikasi mendukung dua mode tampilan yang bisa diganti kapan saja.",
        ["Klik ikon 🌙 / ☀️ di pojok kanan atas header",
         "Tema berganti: Malam (gelap) ↔ Siang (terang)",
         "Preferensi tersimpan otomatis di localStorage",
         "Berlaku untuk semua halaman dan grafik Chart.js"],
        note="Mode Malam (gelap) adalah tampilan default aplikasi")

    sb_frame(doc, "U-5", "Logout", "SEMUA",
        "Pengguna keluar dari aplikasi melalui tab Profil.",
        ["Buka tab Profil di menu navigasi",
         "Klik tombol [Logout]",
         "Konfirmasi logout",
         "Sesi dihapus dari browser (localStorage + sessionStorage + flag remember)",
         "Kembali ke halaman login"])

    # ── Siswa ──
    heading(doc, "BAGIAN II — ALUR SISWA PKL", 1)

    sb_frame(doc, "S-1", "Dashboard Siswa — Tampilan Awal", "SISWA",
        "Setelah login, siswa melihat halaman utama dengan semua informasi absensi PKL.",
        ["Header: nama siswa, NISN, nama lokasi PKL",
         "Status kehadiran hari ini (Hadir/Belum/Alpa)",
         "Peta Leaflet OSM dengan marker lokasi PKL dan lingkaran geofence",
         "Tombol [ABSEN MASUK] dan [ABSEN PULANG]",
         "Menu navigasi bawah: Absensi | Log Presensi | Izin/Sakit | Jurnal | Profil"])

    sb_frame(doc, "S-2", "Peta Lokasi PKL & Status GPS", "SISWA",
        "Peta interaktif menampilkan posisi siswa dan lokasi PKL secara realtime.",
        ["Marker merah = Lokasi PKL terdaftar di database",
         "Titik biru = Posisi siswa saat ini (dari GPS HP)",
         "Lingkaran = Radius geofence (default 350 meter)",
         "Badge GPS: 'Dalam Radius' (hijau) atau 'Luar Radius Xm' (merah)",
         "Koordinat PKL otomatis diambil dari database"],
        note="GPS perlu beberapa detik untuk akurasi optimal. Aktifkan mode akurasi tinggi di HP.")

    sb_frame(doc, "S-3", "Absen Masuk — Buka Modal Kamera", "SISWA",
        "Setelah klik [ABSEN MASUK], modal kamera terbuka untuk mengambil foto selfie.",
        ["Klik tombol [ABSEN MASUK]",
         "Browser meminta izin kamera → klik Izinkan",
         "Tampilan kamera live muncul di modal",
         "Info GPS tampil: koordinat + jarak dari PKL",
         "Arahkan kamera ke wajah Anda"],
        warn="Jika kamera tidak terbuka, beri izin kamera di pengaturan browser/HP")

    sb_frame(doc, "S-4", "Absen Masuk — Foto Selfie & Konfirmasi", "SISWA",
        "Foto diambil dan absensi tersimpan ke server beserta data GPS.",
        ["Klik tombol [AMBIL FOTO]",
         "Foto selfie diambil secara otomatis",
         "Data dikirim ke server: foto, GPS, waktu, status",
         "Toast notifikasi: 'Absen Masuk berhasil! HH:MM'",
         "Status dashboard berubah menjadi Hadir",
         "Tombol [ABSEN MASUK] nonaktif (sudah absen hari ini)"],
        note="Data absensi langsung tampil di dashboard admin/guru secara realtime")

    sb_frame(doc, "S-5", "Absen Pulang", "SISWA",
        "Prosedur absen pulang identik dengan absen masuk, dilakukan di akhir jam PKL.",
        ["Klik tombol [ABSEN PULANG]",
         "Modal kamera terbuka",
         "Foto selfie diambil",
         "Konfirmasi: 'Absen Pulang berhasil! HH:MM'",
         "Log harian lengkap: jam masuk + jam pulang + status Hadir"],
        note="Jika hari berakhir tanpa absen masuk dan pulang → tercatat Alpa otomatis")

    sb_frame(doc, "S-6", "Tab Log Presensi", "SISWA",
        "Menampilkan semua riwayat kehadiran siswa selama PKL.",
        ["Klik tab Log Presensi di menu bawah",
         "Tampil daftar per hari: tanggal, jam masuk, jam pulang, status",
         "Warna status: Hadir (hijau), Izin (biru), Sakit (kuning), Alpa (merah)",
         "Scroll ke atas untuk melihat hari ini",
         "Statistik ringkas di bagian atas: total hadir/izin/sakit/alpa"])

    sb_frame(doc, "S-7", "Pengajuan Izin / Sakit", "SISWA",
        "Siswa mengajukan izin atau sakit yang akan disetujui oleh guru pembimbing.",
        ["Klik tab Izin/Sakit",
         "Pilih jenis: Izin atau Sakit",
         "Isi tanggal mulai dan tanggal selesai",
         "Tulis keterangan atau alasan",
         "Klik [KIRIM PENGAJUAN]",
         "Status: Menunggu Persetujuan"],
        note="Setelah disetujui guru, status Alpa otomatis berubah ke Izin atau Sakit")

    sb_frame(doc, "S-8", "Isi Jurnal Harian", "SISWA",
        "Siswa mengisi jurnal kegiatan harian di tempat PKL.",
        ["Klik tab Jurnal",
         "Tanggal otomatis terisi hari ini",
         "Tulis narasi kegiatan hari ini",
         "Opsional: klik [Tambah Foto] untuk foto kegiatan",
         "Klik [SIMPAN JURNAL]",
         "Jurnal tersimpan dan akan tampil di Cetak Lengkap"],
        note="Jurnal hanya bisa diisi 1 kali per hari")

    sb_frame(doc, "S-9", "Tab Profil Siswa", "SISWA",
        "Menampilkan informasi lengkap akun siswa.",
        ["Foto profil avatar siswa",
         "Nama lengkap, NISN, kelas, sekolah",
         "Nama dan koordinat GPS lokasi PKL",
         "Nama guru pembimbing",
         "Tombol ganti password (opsional)",
         "Tombol [Logout]"])

    # ── Guru ──
    heading(doc, "BAGIAN III — ALUR GURU PEMBIMBING", 1)

    sb_frame(doc, "G-1", "Dashboard Guru — Tampilan Awal", "GURU",
        "Guru melihat ringkasan kehadiran siswa bimbingannya secara realtime.",
        ["Nama guru dan NIP di header",
         "Statistik: total siswa bimbingan, hadir hari ini, belum absen, alpa",
         "Grafik kehadiran mingguan/bulanan",
         "Tombol besar [ABSEN MONITORING]",
         "Menu navigasi: Monitoring | Log Presensi | Persetujuan | Daftar Siswa"],
        note="Data dashboard update otomatis setiap 8 detik via polling server")

    sb_frame(doc, "G-2", "Absen Monitoring Kunjungan PKL", "GURU",
        "Guru mencatat kunjungan ke lokasi PKL siswa untuk monitoring langsung.",
        ["Pergi ke lokasi PKL siswa yang dikunjungi",
         "Klik [ABSEN MONITORING]",
         "Modal kamera terbuka — foto selfie guru",
         "Pilih nama siswa/PKL yang dikunjungi dari dropdown",
         "Tulis catatan kunjungan (opsional)",
         "Klik [AMBIL FOTO & SIMPAN]"],
        note="Log monitoring tampil di Cetak Lengkap sebagai bukti kunjungan resmi")

    sb_frame(doc, "G-3", "Daftar Siswa Bimbingan", "GURU",
        "Menampilkan hanya siswa yang dibimbing oleh guru yang sedang login.",
        ["Klik tab Kelola Siswa & Guru",
         "Tampil tabel: nama, username, lokasi PKL",
         "Klik link GPS untuk buka Google Maps lokasi PKL siswa",
         "Gunakan kotak pencarian untuk filter siswa",
         "Klik [Edit Data] untuk melihat detail atau ajukan perubahan lokasi PKL"],
        note="Guru hanya melihat siswa dengan field supervisor = nama guru tersebut")

    sb_frame(doc, "G-4", "Persetujuan Izin/Sakit Siswa", "GURU",
        "Guru memproses pengajuan izin/sakit dari siswa bimbingannya.",
        ["Buka tab Persetujuan Pengajuan",
         "Tampil daftar pengajuan pending dari siswa bimbingan",
         "Baca keterangan: nama siswa, jenis, tanggal, alasan",
         "Klik [Setujui] → status berubah menjadi Disetujui",
         "Atau klik [Tolak] → status berubah menjadi Ditolak",
         "Log absensi siswa otomatis diperbarui"])

    sb_frame(doc, "G-5", "Cetak Laporan — Pilih Filter", "GURU",
        "Guru memilih periode dan jenis laporan sebelum mencetak.",
        ["Buka tab Dashboard atau Log Presensi",
         "Pilih bulan dari dropdown filter",
         "Pilih jenis laporan: Cetak Statistik / Cetak Rekap / Cetak Lengkap",
         "Klik tombol cetak yang diinginkan",
         "Modal preview muncul dalam beberapa detik"])

    sb_frame(doc, "G-6", "Preview & Simpan PDF", "GURU",
        "Laporan tampil dalam modal fullscreen sebelum disimpan.",
        ["Modal preview fullscreen muncul",
         "Toolbar atas: [Kembali] | Judul File | [Simpan PDF]",
         "Isi laporan tampil di area bawah (bisa discroll)",
         "Klik [Simpan PDF] untuk menyimpan file",
         "File tersimpan ke folder Downloads",
         "Atau tekan Ctrl+P untuk cetak langsung via browser"],
        note="File PDF berisi kop surat resmi, data lengkap, dan TTD 3 kolom sejajar")

    # ── Admin ──
    heading(doc, "BAGIAN IV — ALUR MASTER ADMIN", 1)

    sb_frame(doc, "A-1", "Dashboard Admin — Statistik Realtime", "ADMIN",
        "Admin melihat statistik kehadiran seluruh siswa secara realtime.",
        ["Kartu statistik: total siswa, hadir, alpa, izin/sakit",
         "Grafik kehadiran per hari dan per bulan",
         "Daftar absensi masuk hari ini (realtime)",
         "Notifikasi: akun pending, izin pending",
         "Update otomatis setiap 8 detik",
         "Filter per guru pembimbing tersedia"])

    sb_frame(doc, "A-2", "Daftar User Siswa & Guru", "ADMIN",
        "Admin melihat dan mengelola semua pengguna sistem.",
        ["Klik tab Kelola Siswa & Guru",
         "Tampil semua user: nama, username, peran, lokasi PKL",
         "Badge peran: ADMIN (merah) | GURU (biru) | SISWA (hijau)",
         "Klik link GPS untuk verifikasi lokasi PKL di Google Maps",
         "Gunakan pencarian untuk filter cepat",
         "Klik [Edit Data] untuk mengelola user tertentu"])

    sb_frame(doc, "A-3", "Import Data Massal — Upload CSV", "ADMIN",
        "Admin mengupload file CSV untuk mendaftarkan banyak siswa dan guru sekaligus.",
        ["Klik [Download Template CSV] untuk mendapatkan format yang benar",
         "Isi data di template: role, nama, nomor_induk, username, password, kelas, sekolah, lokasi_pkl, guru_pembimbing",
         "Simpan file dengan format .csv atau .xlsx",
         "Klik [Pilih File] dan pilih file CSV",
         "Klik [Import Sekarang]",
         "Tunggu proses validasi dan geocoding"],
        note="Lokasi PKL yang pernah di-geocode diambil dari cache — tidak perlu tunggu lama")

    sb_frame(doc, "A-4", "Import CSV — Hasil Validasi", "ADMIN",
        "Sistem menampilkan laporan detail setelah proses import selesai.",
        ["Jumlah siswa dan guru yang berhasil diimpor",
         "Tabel baris yang gagal beserta keterangan error",
         "Penyebab umum: username duplikat, role tidak valid",
         "Perbaiki file CSV sesuai saran yang diberikan",
         "Upload ulang untuk baris yang gagal",
         "Geocoding koordinat PKL berjalan di background"])

    sb_frame(doc, "A-5", "Edit Data User", "ADMIN",
        "Admin bisa mengubah semua data user termasuk koordinat PKL secara langsung.",
        ["Klik [Edit Data] pada baris user yang ingin diubah",
         "Modal edit terbuka dengan semua field terisi data lama",
         "Ubah field yang diperlukan (nama, password, kelas, lokasi PKL, dll.)",
         "Untuk lokasi PKL: ketik nama tempat → klik [Cari di Maps]",
         "Mini peta preview muncul dengan koordinat baru",
         "Klik [Simpan Perubahan]"],
        note="Perubahan langsung tersimpan ke database dan berlaku untuk semua perangkat")

    sb_frame(doc, "A-6", "Persetujuan Akun Guru Baru", "ADMIN",
        "Akun guru yang baru didaftarkan perlu disetujui admin sebelum bisa login.",
        ["Buka tab Persetujuan Pengajuan",
         "Lihat seksi 'Akun Baru Pending'",
         "Periksa nama, username, dan peran akun",
         "Klik [Setujui] → akun aktif, guru bisa login",
         "Atau klik [Tolak] → akun tidak aktif"])

    sb_frame(doc, "A-7", "Persetujuan Edit Lokasi PKL", "ADMIN",
        "Guru bisa mengajukan perubahan lokasi PKL siswa, admin yang menyetujui.",
        ["Buka tab Persetujuan Pengajuan",
         "Lihat seksi 'Edit PKL Pending'",
         "Periksa: nama siswa, lokasi lama, lokasi baru, koordinat",
         "Klik [Setujui] → koordinat PKL siswa berubah di database",
         "Atau klik [Tolak] → lokasi tidak berubah"])

    sb_frame(doc, "A-8", "Pengaturan Sekolah & TTD", "ADMIN",
        "Data ini digunakan untuk kop surat dan tanda tangan di semua laporan cetak.",
        ["Buka tab Profil & Pengaturan",
         "Isi nama dan NIP Kepala Sekolah",
         "Isi nama dan NIP Waka Humas",
         "Isi nama dan NIP Ketua Pokja PKL",
         "Isi nama kota untuk baris tanggal TTD",
         "Klik [Simpan Pengaturan]"],
        warn="Jika tidak diisi, TTD di laporan akan menampilkan garis kosong")

    sb_frame(doc, "A-9", "Cetak Lengkap — Per Siswa", "ADMIN",
        "Laporan paling detail — setiap siswa mendapat halaman sendiri dengan peta lokasi PKL.",
        ["Pilih filter guru pembimbing (disarankan untuk performa lebih cepat)",
         "Klik [Cetak Lengkap]",
         "Jika > 50 siswa: dialog konfirmasi muncul",
         "Tunggu modal preview (beberapa detik)",
         "Setiap siswa: foto, info, statistik, peta OSM 1 tile, tabel harian, jurnal",
         "TTD 3 kolom di halaman terakhir: Waka Humas | Kepala Sekolah | Ketua Pokja PKL"],
        note="Cetak per guru pembimbing lebih cepat dari cetak semua siswa sekaligus")

    sb_frame(doc, "A-10", "Cetak Statistik PDF", "ADMIN",
        "Laporan statistik kehadiran dengan grafik visual per guru pembimbing.",
        ["Pilih bulan dari dropdown filter",
         "Klik [Cetak Statistik]",
         "Halaman 1: tabel statistik per siswa dan summary",
         "Halaman 2: grafik doughnut overall + bar chart per guru",
         "TTD 3 kolom di setiap halaman",
         "Klik [Simpan PDF]"])

    sb_frame(doc, "A-11", "Cetak Rekap PDF", "ADMIN",
        "Tabel ringkasan presensi semua siswa dalam satu bulan.",
        ["Pilih bulan dan guru pembimbing dari filter",
         "Klik [Cetak Rekap]",
         "Tabel: nama, pembimbing, lokasi PKL, per tanggal masuk/pulang/status",
         "Dikelompokkan per guru pembimbing",
         "TTD 3 kolom di akhir dan di halaman grafik",
         "Klik [Simpan PDF]"])

    sb_frame(doc, "A-12", "Reset Database", "ADMIN",
        "Menghapus semua data siswa, guru, dan log presensi. Hanya akun admin yang dipertahankan.",
        ["Buka tab Profil & Pengaturan",
         "Scroll ke bagian Reset Database",
         "Klik [Reset Database]",
         "Dialog konfirmasi pertama → klik OK",
         "Dialog konfirmasi kedua → klik OK untuk lanjutkan",
         "Semua data terhapus, dashboard menjadi kosong"],
        warn="TIDAK BISA DIBATALKAN. Pastikan sudah backup data sebelum reset. Cache koordinat PKL tetap tersimpan.")

    path = BASE_DIR + r"\STORYBOARD_SIGAP_PKL.docx"
    doc.save(path)
    print(f"[OK] {path}")


# ══════════════════════════════════════════════════════════════════════════════
# 3. SIGAP_PKL_FULL_DOCUMENTATION
# ══════════════════════════════════════════════════════════════════════════════
def make_full_documentation():
    doc = new_doc()
    cover_page(doc,
               "SIGAP PKL — DOKUMENTASI LENGKAP",
               "Sistem Informasi & Geofencing Absensi PKL",
               "Versi 2.1.63 | Build Android 163",
               "3 September 2026",
               "Dokumen Teknis Internal — Tidak untuk Distribusi Publik")

    # I. Pendahuluan
    heading(doc, "I. PENDAHULUAN", 1)
    heading(doc, "1.1 Latar Belakang", 2)
    para(doc, "SIGAP PKL (Sistem Informasi & Geofencing Absensi PKL) adalah aplikasi berbasis web dan Android yang dikembangkan untuk mengelola absensi siswa Praktik Kerja Lapangan (PKL) di SMK Negeri 9 Malang. Aplikasi menggunakan teknologi GPS Geofencing untuk memastikan siswa berada di lokasi PKL yang telah terdaftar sebelum dapat melakukan absensi.", indent=1.27)
    para(doc, "Sistem ini menggantikan proses absensi manual yang rawan manipulasi dan tidak dapat dilacak secara realtime oleh guru pembimbing dan administrator sekolah.", indent=1.27)

    heading(doc, "1.2 Tujuan Sistem", 2)
    items = [
        "Memastikan siswa PKL hadir di lokasi yang benar menggunakan GPS geofencing",
        "Mempermudah pencatatan dan pelaporan kehadiran siswa PKL secara digital",
        "Memberikan informasi realtime kepada guru pembimbing dan administrator",
        "Menghasilkan laporan kehadiran otomatis dalam format PDF",
        "Mengelola data lokasi PKL siswa dengan koordinat GPS yang akurat",
    ]
    for item in items:
        p = doc.add_paragraph(style='Normal')
        p.paragraph_format.left_indent = Cm(1.27)
        p.paragraph_format.first_line_indent = Cm(-0.5)
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(f"• {item}")
        r.font.size = Pt(12); r.font.name = 'Times New Roman'

    heading(doc, "1.3 Ruang Lingkup", 2)
    para(doc, "Sistem mencakup tiga jenis pengguna: Siswa PKL, Guru Pembimbing, dan Master Administrator. Masing-masing memiliki hak akses dan fitur yang berbeda sesuai kebutuhan operasional.", indent=1.27)

    # II. Teknologi
    heading(doc, "II. TEKNOLOGI DAN INFRASTRUKTUR", 1)
    heading(doc, "2.1 Stack Teknologi", 2)
    add_table(doc,
        ["Layer", "Teknologi", "Versi / Detail"],
        [
            ("Frontend Web", "Vanilla JavaScript, HTML5, CSS3", "Single-file SPA (app.js ~489KB)"),
            ("Mobile App", "Capacitor 5", "Android APK — com.smkn9.sigappkl"),
            ("Peta Interaktif", "Leaflet.js + OpenStreetMap", "Geofencing + OSM tiles"),
            ("Geocoding", "Nominatim OpenStreetMap", "Gratis, tanpa API key"),
            ("Grafik", "Chart.js", "Doughnut + Bar chart"),
            ("Backend API", "PHP 8.2 (FPM + Nginx)", "Single file api.php"),
            ("Database", "MariaDB", "sigap_pkl — 6 tabel"),
            ("PDF Generator", "Puppeteer (via API)", "Headless Chrome"),
            ("Realtime", "Server-Sent Events (SSE)", "Polling fallback 8 detik"),
            ("Server", "Proxmox VE CT102 (Debian)", "IP 103.153.190.69:8443"),
        ],
        [4.0, 5.5, 6.5]
    )

    heading(doc, "2.2 Infrastruktur Server", 2)
    add_table(doc,
        ["Komponen", "Detail"],
        [
            ("URL Produksi", "https://103.153.190.69:8443 (HTTPS self-signed)"),
            ("Container", "Proxmox CT102 — Debian Linux — IP 192.168.100.30"),
            ("Web Root", "/var/www/html/SIGAP-SMKN9-Official/"),
            ("PHP Version", "8.2.33 (FPM)"),
            ("Database Host", "192.168.100.1:3306 (MariaDB)"),
            ("DB Name", "sigap_pkl"),
            ("DB User", "sigap_user"),
            ("SSH Key", "C:\\Users\\FUJITSU T939\\.ssh\\sigap_pkl_key"),
        ],
        [5.0, 10.0]
    )

    # III. Struktur Database
    heading(doc, "III. STRUKTUR DATABASE", 1)
    heading(doc, "3.1 Tabel Users", 2)
    add_table(doc,
        ["Kolom", "Tipe", "Keterangan"],
        [
            ("id", "VARCHAR(50) PK", "ID unik format: usr_[uniqid]"),
            ("username", "VARCHAR(100) UNIQUE", "Login identifier pengguna"),
            ("password", "VARCHAR(255)", "Bcrypt hash"),
            ("plain_password", "VARCHAR(100)", "Plaintext untuk APK offline"),
            ("name", "VARCHAR(150)", "Nama lengkap"),
            ("role", "ENUM(admin,guru,siswa)", "Peran pengguna"),
            ("kelas", "VARCHAR(50)", "Kelas siswa (hanya untuk siswa)"),
            ("pklLocation", "VARCHAR(200)", "Nama lokasi PKL"),
            ("latitude_pkl", "DOUBLE", "Koordinat GPS latitude PKL"),
            ("longitude_pkl", "DOUBLE", "Koordinat GPS longitude PKL"),
            ("allowed_radius", "INT(11)", "Radius geofence (meter, default 350)"),
            ("supervisor", "VARCHAR(200)", "Nama guru pembimbing"),
            ("status", "VARCHAR(50)", "approved / pending / pending_edit_pkl"),
            ("aktif", "TINYINT(1)", "1=aktif, 0=nonaktif"),
            ("pkl_start_date", "DATE", "Tanggal mulai PKL (batas bawah absensi)"),
            ("created_at", "DATETIME", "Waktu pembuatan akun"),
        ],
        [3.5, 3.5, 8.0]
    )

    heading(doc, "3.2 Tabel Attendance", 2)
    add_table(doc,
        ["Kolom", "Tipe", "Keterangan"],
        [
            ("id", "VARCHAR(100) PK", "ID unik absensi"),
            ("user_id", "VARCHAR(50)", "FK ke tabel users"),
            ("type", "ENUM(masuk,pulang,izin)", "Jenis absensi"),
            ("timestamp", "DATETIME", "Waktu absensi"),
            ("latitude / longitude", "DOUBLE", "Koordinat GPS saat absen"),
            ("distance_meters", "DOUBLE", "Jarak dari lokasi PKL"),
            ("status", "VARCHAR(50)", "Hadir / Luar Radius / Alpa / Izin / Sakit"),
            ("foto", "TEXT", "Base64 foto selfie"),
        ],
        [3.5, 3.5, 8.0]
    )

    # IV. API Endpoints
    heading(doc, "IV. API ENDPOINTS (api.php)", 1)
    add_table(doc,
        ["Endpoint (action=)", "Method", "Keterangan"],
        [
            ("get_users", "GET", "Ambil semua user aktif + pending"),
            ("create_user", "POST", "Buat user baru. Jika sudah ada: update lokasi + reset koordinat"),
            ("update_user", "POST", "Update data user lengkap"),
            ("update_pkl_location", "POST", "Update koordinat PKL hasil geocoding"),
            ("simpan_presensi", "POST", "Simpan log absensi masuk/pulang"),
            ("get_presensi", "GET", "Ambil semua log absensi"),
            ("submit_permission", "POST", "Pengajuan izin/sakit siswa"),
            ("get_permissions", "GET", "Ambil data izin"),
            ("approve_user", "POST", "Setujui/tolak akun atau perubahan PKL"),
            ("request_edit_pkl", "POST", "Pengajuan edit lokasi PKL oleh guru"),
            ("reset_database", "POST", "Reset semua data (kecuali admin)"),
            ("generate_pdf_base64", "POST", "Generate PDF via Puppeteer"),
            ("save_monthly_report", "POST", "Arsip laporan bulanan"),
            ("sse_events", "GET", "Server-Sent Events untuk realtime update"),
        ],
        [4.5, 2.0, 8.5]
    )

    # V. Fitur Utama
    heading(doc, "V. FITUR UTAMA SISTEM", 1)
    heading(doc, "5.1 GPS Geofencing", 2)
    para(doc, "Sistem menggunakan rumus Haversine untuk menghitung jarak antara posisi GPS siswa dengan koordinat lokasi PKL yang terdaftar. Radius default adalah 350 meter. Jika siswa berada dalam radius, status absen adalah 'Hadir'. Jika di luar radius, status adalah 'Luar Radius Xm' namun tetap terabsen.", indent=1.27)

    heading(doc, "5.2 Geocoding Koordinat PKL", 2)
    para(doc, "Koordinat lokasi PKL siswa diperoleh secara otomatis melalui Nominatim OpenStreetMap API menggunakan nama tempat yang diinputkan. Sistem menggunakan 4 strategi query dengan tingkat spesifisitas menurun dan memilih hasil yang paling dekat dengan Malang (radius maksimal 1000 km).", indent=1.27)
    para(doc, "Hasil geocoding disimpan dalam cache (SIGAP_PKL_K9_geocache_v1) yang berlaku selama 30 hari. Cache ini memastikan nama lokasi yang sama hanya di-geocode satu kali, menghemat kuota API dan mempercepat proses import massal.", indent=1.27)

    heading(doc, "5.3 In-Memory Cache", 2)
    para(doc, "Untuk meningkatkan performa terutama saat generate laporan PDF, sistem menggunakan in-memory cache untuk data logs (_logsCache) dan journals (_journalCache). Data hanya di-parse dari localStorage satu kali per sesi, kemudian disimpan di memori untuk akses cepat.", indent=1.27)

    heading(doc, "5.4 Laporan PDF", 2)
    para(doc, "Tiga jenis laporan tersedia: Cetak Lengkap (per siswa dengan peta OSM), Cetak Statistik (grafik Chart.js), dan Cetak Rekap (tabel semua siswa). Semua laporan menggunakan TTD 3 kolom sejajar: Waka Humas | Kepala Sekolah | Ketua Pokja PKL (admin) atau Guru Pembimbing (guru). Data TTD diambil dari Pengaturan Sekolah.", indent=1.27)

    # VI. Sistem Autentikasi
    heading(doc, "VI. SISTEM AUTENTIKASI", 1)
    add_table(doc,
        ["Parameter", "Nilai / Perilaku"],
        [
            ("Storage default", "sessionStorage (hilang saat browser/tab ditutup)"),
            ("Storage 'Ingat Saya'", "localStorage + flag SIGAP_PKL_K9_remember_v1"),
            ("Buka tab baru tanpa remember", "Selalu tampilkan halaman login"),
            ("Verifikasi server", "Timeout 6 detik, fallback ke sesi lokal"),
            ("Logout", "Hapus localStorage + sessionStorage + flag remember"),
            ("Default isRemember", "false — user harus aktif mencentang"),
        ],
        [6.0, 9.0]
    )

    # VII. Changelog
    heading(doc, "VII. CHANGELOG TERBARU", 1)
    add_table(doc,
        ["Versi", "Tanggal", "Perubahan Utama"],
        [
            ("v2.1.63", "3 Sep 2026", "Map OSM 1-tile di cetak lengkap, algoritma marker pixel-perfect"),
            ("v2.1.62", "3 Sep 2026", "In-memory cache getLogs/getJournals, strip foto base64 cetak"),
            ("v2.1.61", "3 Sep 2026", "Pre-index rekap O(n), _journalsIndex, defer wrapper eksport"),
            ("v2.1.60", "3 Sep 2026", "Fix auto-login: default isRemember=false, flag remember_v1"),
            ("v2.1.59", "3 Sep 2026", "Hapus syncDataFromServer dari cetak — cegah hang"),
            ("v2.1.58", "3 Sep 2026", "TTD 3-kolom seragam, helper _buildTtdHtml()"),
            ("v2.1.51-57", "2 Sep 2026", "Cache geocode 30 hari, TTD flex rata, fix kop surat"),
            ("v2.1.48-50", "2 Sep 2026", "Live geocode lokal→server, filter koordinat default"),
            ("v2.1.43-47", "1 Sep 2026", "pkl_start_date batas bawah absensi, batch geocode"),
            ("v2.0.3 - v2.1.42", "Agt 2026", "Basis sistem: absen GPS+selfie, monitoring guru, cetak PDF"),
        ],
        [2.5, 2.5, 10.0]
    )

    path = BASE_DIR + r"\SIGAP_PKL_FULL_DOCUMENTATION.docx"
    doc.save(path)
    print(f"[OK] {path}")


# ══════════════════════════════════════════════════════════════════════════════
# 4. SIGAP_PKL_PUBLIC_MANUAL
# ══════════════════════════════════════════════════════════════════════════════
def make_public_manual():
    doc = new_doc()
    cover_page(doc,
               "BUKU MANUAL PENGGUNAAN",
               "SIGAP PKL — Sistem Informasi & Geofencing Absensi PKL",
               "Versi 2.1.63",
               "3 September 2026",
               "Panduan lengkap penggunaan aplikasi untuk Siswa, Guru Pembimbing, dan Master Admin")

    # Pendahuluan
    heading(doc, "PENDAHULUAN", 1)
    para(doc, "Buku manual ini menjelaskan cara menggunakan aplikasi SIGAP PKL untuk tiga jenis pengguna: Siswa PKL, Guru Pembimbing, dan Master Administrator. Setiap bagian menjelaskan fitur-fitur yang tersedia beserta langkah-langkah penggunaan secara detail.", indent=1.27)
    para(doc, "Aplikasi SIGAP PKL dapat diakses melalui dua cara: menginstal file APK (SIGAP-PKL-K9-v2.1.63.apk) di perangkat Android, atau membuka URL https://103.153.190.69:8443 melalui browser web. Jika browser menampilkan peringatan SSL, klik tombol 'Lanjutkan' untuk melanjutkan ke aplikasi.", indent=1.27)

    # Tabel fitur per peran
    heading(doc, "Fitur per Peran Pengguna", 2)
    add_table(doc,
        ["Fitur", "Siswa", "Guru", "Admin"],
        [
            ("Absen masuk & pulang (GPS + selfie)", "✓", "—", "—"),
            ("Jurnal harian kegiatan PKL", "✓", "—", "—"),
            ("Pengajuan izin / sakit", "✓", "—", "—"),
            ("Absen monitoring kunjungan PKL", "—", "✓", "—"),
            ("Persetujuan izin dan akun", "—", "✓", "✓"),
            ("Cetak laporan PDF", "—", "✓", "✓"),
            ("Import data massal CSV", "—", "—", "✓"),
            ("Kelola semua user", "—", "—", "✓"),
            ("Dashboard statistik realtime", "—", "✓", "✓"),
            ("Reset database", "—", "—", "✓"),
        ],
        [7.5, 2.0, 2.0, 2.0]
    )

    # BAB 1: Login
    heading(doc, "BAB 1 — LOGIN KE APLIKASI", 1)
    para(doc, "Semua pengguna menggunakan halaman login yang sama. Perbedaan tampilan muncul setelah login berhasil berdasarkan peran masing-masing pengguna.", indent=1.27)

    heading(doc, "1.1 Langkah-Langkah Login", 2)
    for step in [
        "Buka aplikasi atau akses URL https://103.153.190.69:8443",
        "Masukkan Username pada kolom yang tersedia",
        "Masukkan Password pada kolom yang tersedia",
        "Centang 'Ingat Saya' jika ingin tetap login setelah menutup browser (opsional)",
        "Klik tombol [MASUK]",
        "Sistem akan memverifikasi data ke server dan menampilkan dashboard sesuai peran"
    ]:
        p = doc.add_paragraph(style='Normal')
        p.paragraph_format.left_indent = Cm(1.27)
        p.paragraph_format.first_line_indent = Cm(-0.5)
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(f"• {step}")
        r.font.size = Pt(12); r.font.name = 'Times New Roman'

    heading(doc, "1.2 Informasi Login Default", 2)
    add_table(doc,
        ["Peran", "Contoh Username", "Password Default"],
        [
            ("Master Admin", "admin", "sampurna01"),
            ("Guru Pembimbing", "budi.santoso (sesuai import CSV)", "Sesuai kolom password CSV"),
            ("Siswa PKL", "nasywa69 (NISN/username sesuai import)", "Sesuai kolom password CSV"),
        ],
        [3.5, 5.5, 5.5]
    )

    heading(doc, "1.3 Logout", 2)
    para(doc, "Untuk keluar dari aplikasi: buka tab Profil → klik tombol [Logout]. Setelah logout, membuka link aplikasi kembali akan selalu menampilkan halaman login.", indent=1.27)

    # BAB 2: Siswa
    heading(doc, "BAB 2 — PANDUAN SISWA PKL", 1)

    heading(doc, "2.1 Tampilan Utama", 2)
    para(doc, "Setelah login sebagai siswa, halaman utama menampilkan: nama dan NISN siswa, informasi lokasi PKL, peta interaktif Leaflet dengan marker lokasi PKL dan lingkaran geofence, tombol [ABSEN MASUK] dan [ABSEN PULANG], serta menu navigasi di bagian bawah.", indent=1.27)

    heading(doc, "2.2 Absen Masuk", 2)
    para(doc, "Absen masuk dilakukan setiap pagi di awal jam PKL. Sistem memerlukan GPS aktif dan izin kamera.", indent=1.27)
    for step in [
        "Pastikan GPS aktif dan akurasi tinggi diaktifkan di pengaturan HP",
        "Buka tab Absensi — pastikan titik biru (posisi Anda) terlihat di peta",
        "Klik tombol [ABSEN MASUK]",
        "Browser meminta izin kamera → klik Izinkan",
        "Modal kamera terbuka dengan tampilan live dan informasi GPS",
        "Arahkan kamera ke wajah Anda",
        "Klik tombol [AMBIL FOTO]",
        "Sistem menyimpan foto, koordinat GPS, dan waktu absen ke server",
        "Muncul konfirmasi: 'Absen Masuk berhasil! HH:MM — Hadir/Luar Radius'"
    ]:
        p = doc.add_paragraph(style='Normal')
        p.paragraph_format.left_indent = Cm(1.27)
        p.paragraph_format.first_line_indent = Cm(-0.5)
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(f"• {step}")
        r.font.size = Pt(12); r.font.name = 'Times New Roman'

    heading(doc, "2.3 Absen Pulang", 2)
    para(doc, "Prosedur absen pulang identik dengan absen masuk. Klik tombol [ABSEN PULANG] dan ikuti langkah yang sama.", indent=1.27)
    para(doc, "Penting: Absen masuk dan pulang masing-masing hanya dapat dilakukan satu kali per hari. Jika hari berakhir tanpa absen masuk dan pulang, sistem secara otomatis mencatat Alpa.", indent=1.27)

    heading(doc, "2.4 Melihat Riwayat Presensi", 2)
    para(doc, "Klik tab Log Presensi di menu bawah untuk melihat riwayat kehadiran harian. Tampil daftar per hari dengan tanggal, jam masuk, jam pulang, dan status berwarna (Hadir, Izin, Sakit, Alpa).", indent=1.27)

    heading(doc, "2.5 Pengajuan Izin / Sakit", 2)
    for step in [
        "Klik tab Izin/Sakit",
        "Pilih jenis: Izin atau Sakit",
        "Isi tanggal mulai dan tanggal selesai",
        "Tulis keterangan atau alasan",
        "Klik [KIRIM PENGAJUAN]",
        "Status pengajuan: Menunggu Persetujuan",
        "Setelah disetujui guru, status Alpa berubah menjadi Izin atau Sakit secara otomatis"
    ]:
        p = doc.add_paragraph(style='Normal')
        p.paragraph_format.left_indent = Cm(1.27)
        p.paragraph_format.first_line_indent = Cm(-0.5)
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(f"• {step}")
        r.font.size = Pt(12); r.font.name = 'Times New Roman'

    heading(doc, "2.6 Jurnal Harian", 2)
    para(doc, "Klik tab Jurnal untuk mengisi jurnal kegiatan harian. Tanggal terisi otomatis. Tulis narasi kegiatan, tambahkan foto kegiatan jika ada, kemudian klik [SIMPAN JURNAL]. Jurnal hanya dapat diisi satu kali per hari dan akan tampil di laporan Cetak Lengkap.", indent=1.27)

    # BAB 3: Guru
    heading(doc, "BAB 3 — PANDUAN GURU PEMBIMBING", 1)

    heading(doc, "3.1 Dashboard Guru", 2)
    para(doc, "Dashboard guru menampilkan statistik kehadiran siswa bimbingan secara realtime: jumlah hadir, belum absen, dan alpa hari ini, beserta grafik kehadiran. Tombol [ABSEN MONITORING] tersedia untuk mencatat kunjungan ke lokasi PKL.", indent=1.27)

    heading(doc, "3.2 Absen Monitoring Kunjungan", 2)
    para(doc, "Fitur ini digunakan saat guru mengunjungi langsung lokasi PKL siswa untuk monitoring.", indent=1.27)
    for step in [
        "Pergi ke lokasi PKL siswa yang akan dikunjungi",
        "Klik tombol [ABSEN MONITORING]",
        "Modal kamera terbuka — foto selfie guru di lokasi",
        "Pilih nama siswa atau PKL yang dikunjungi dari dropdown",
        "Tulis catatan kunjungan (opsional)",
        "Klik [AMBIL FOTO & SIMPAN]",
        "Log kunjungan tersimpan dan akan tampil di laporan Cetak Lengkap"
    ]:
        p = doc.add_paragraph(style='Normal')
        p.paragraph_format.left_indent = Cm(1.27)
        p.paragraph_format.first_line_indent = Cm(-0.5)
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(f"• {step}")
        r.font.size = Pt(12); r.font.name = 'Times New Roman'

    heading(doc, "3.3 Persetujuan Izin/Sakit", 2)
    para(doc, "Buka tab Persetujuan Pengajuan untuk melihat daftar izin pending dari siswa bimbingan. Klik [Setujui] untuk menyetujui atau [Tolak] untuk menolak. Setelah disetujui, log absensi siswa otomatis diperbarui.", indent=1.27)

    heading(doc, "3.4 Cetak Laporan", 2)
    para(doc, "Pilih bulan dari filter, kemudian klik tombol cetak yang diinginkan: Cetak Statistik untuk grafik kehadiran, Cetak Rekap untuk tabel rekapitulasi, atau Cetak Lengkap untuk laporan detail per siswa. Modal preview muncul dan klik [Simpan PDF] untuk menyimpan file.", indent=1.27)

    # BAB 4: Admin
    heading(doc, "BAB 4 — PANDUAN MASTER ADMIN", 1)

    heading(doc, "4.1 Import Data Massal CSV", 2)
    para(doc, "Fitur import CSV memungkinkan admin mendaftarkan banyak siswa dan guru sekaligus. Format file CSV menggunakan 9 kolom per baris:", indent=1.27)
    para(doc, "role, nama, nomor_induk, username, password, kelas, sekolah, lokasi_pkl, guru_pembimbing", bold=True, indent=1.27)
    para(doc, "Langkah import: klik [Download Template CSV] untuk mendapatkan contoh format yang benar, isi data di template, upload file, klik [Import Sekarang], dan periksa laporan validasi. Sistem otomatis melakukan geocoding koordinat PKL setelah import selesai.", indent=1.27)

    heading(doc, "4.2 Pengaturan Kop Surat dan TTD", 2)
    para(doc, "Buka tab Profil & Pengaturan dan isi data berikut untuk memastikan laporan cetak memiliki kop surat dan tanda tangan yang lengkap dan benar:", indent=1.27)
    add_table(doc,
        ["Data", "Digunakan di"],
        [
            ("Nama dan NIP Kepala Sekolah", "TTD kolom tengah semua laporan"),
            ("Nama dan NIP Waka Humas", "TTD kolom kiri semua laporan"),
            ("Nama dan NIP Ketua Pokja PKL", "TTD kolom kanan laporan admin"),
            ("Nama Kota", "Baris tanggal pada setiap TTD"),
            ("Nama Sekolah", "Kop surat dan judul laporan"),
        ],
        [6.0, 9.0]
    )

    heading(doc, "4.3 Reset Database", 2)
    para(doc, "Fitur reset database menghapus semua data siswa, guru, log presensi, izin, dan jurnal. Akun Master Admin tetap dipertahankan. Cache koordinat PKL juga tidak ikut dihapus sehingga import ulang data siswa bisa memanfaatkan koordinat yang sudah tersimpan.", indent=1.27)
    para(doc, "Peringatan: Tindakan reset tidak dapat dibatalkan. Pastikan semua laporan yang diperlukan sudah dicetak dan diarsipkan sebelum melakukan reset.", bold=True, indent=1.27)

    # BAB 5: Troubleshooting
    heading(doc, "BAB 5 — TROUBLESHOOTING", 1)
    add_table(doc,
        ["Masalah", "Solusi"],
        [
            ("Buka link langsung masuk ke akun", "Logout dulu. Jangan centang 'Ingat Saya' untuk HP bersama."),
            ("Absen tidak bisa — GPS tidak akurat", "Tunggu GPS stabil, aktifkan mode akurasi tinggi."),
            ("Kamera tidak terbuka", "Berikan izin kamera di pengaturan browser/HP."),
            ("Status selalu Luar Radius padahal di PKL", "Minta admin cek dan koreksi koordinat lokasi PKL."),
            ("Cetak laporan sangat lambat", "Filter per guru pembimbing, bukan cetak semua sekaligus."),
            ("Peta tidak muncul di cetak", "Aktifkan koneksi internet saat membuka laporan."),
            ("TTD di laporan garis kosong", "Admin isi Pengaturan Sekolah: nama Kepsek, Waka, Pokja."),
            ("Import CSV gagal", "Cek format: 9 kolom, role harus siswa/guru, username unik."),
            ("Koordinat PKL semua sama", "Tunggu geocoding selesai (1.2 detik/lokasi)."),
        ],
        [5.5, 9.5]
    )

    path = BASE_DIR + r"\SIGAP_PKL_PUBLIC_MANUAL.docx"
    doc.save(path)
    print(f"[OK] {path}")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("Generating DOCX files...")
    make_flowchart()
    make_storyboard()
    make_full_documentation()
    make_public_manual()
    print("\nSemua file berhasil dibuat!")

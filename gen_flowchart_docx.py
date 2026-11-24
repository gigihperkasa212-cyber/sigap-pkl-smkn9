# -*- coding: utf-8 -*-
"""
Generate FLOWCHART_SIGAP_PKL.docx
Setiap flowchart dibuat sebagai gambar PNG dengan Pillow,
lalu di-embed ke file DOCX bersama tabel keterangan.
Standar: Times New Roman 12pt, A4, margin 4-4-3-3, spasi 1.5, justify
"""
from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.shared import Cm, Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os, io

BASE   = r"d:\absen pkl update"
ARIAL  = "C:/Windows/Fonts/Arial.ttf"
TIMES  = "C:/Windows/Fonts/times.ttf"

# ─── Warna ────────────────────────────────────────────────────────────────────
C_BG      = (248,250,252)   # background canvas
C_START   = (15,23,42)      # terminal / mulai-selesai  (navy)
C_PROC    = (239,246,255)   # proses  (biru muda)
C_PROC_B  = (59,130,246)    # border proses
C_DEC     = (255,251,235)   # keputusan  (kuning muda)
C_DEC_B   = (245,158,11)    # border keputusan
C_OK      = (220,252,231)   # hasil OK  (hijau)
C_OK_B    = (22,163,74)
C_ERR     = (254,226,226)   # error  (merah)
C_ERR_B   = (220,38,38)
C_GRAY    = (248,250,252)   # abu
C_GRAY_B  = (148,163,184)
C_ARROW   = (100,116,139)   # warna panah
C_WHITE   = (255,255,255)
C_BLACK   = (15,23,42)
C_TITLE_BG= (8,145,178)     # header flowchart

# ─── Font helper ──────────────────────────────────────────────────────────────
def fnt(size=14, bold=False):
    try:
        path = "C:/Windows/Fonts/Calibri.ttf" if not bold else "C:/Windows/Fonts/Calibrib.ttf"
        if not os.path.exists(path):
            path = ARIAL
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

def fnt_b(size=14): return fnt(size, True)

# ─── Text wrapping helper ──────────────────────────────────────────────────────
def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines, line = [], ""
    for w in words:
        test = (line + " " + w).strip()
        bbox = draw.textbbox((0,0), test, font=font)
        if bbox[2] > max_width and line:
            lines.append(line)
            line = w
        else:
            line = test
    if line: lines.append(line)
    return lines

# ─── Node drawing functions ────────────────────────────────────────────────────
def node_h(draw, lines, font):
    """Tinggi node berdasar jumlah baris"""
    lh = font.size + 4
    return max(36, len(lines) * lh + 20)

def draw_rounded_rect(draw, x1,y1,x2,y2, r, fill, outline, width=2):
    draw.rectangle([x1+r, y1, x2-r, y2], fill=fill)
    draw.rectangle([x1, y1+r, x2, y2-r], fill=fill)
    draw.ellipse([x1, y1, x1+2*r, y1+2*r], fill=fill, outline=None)
    draw.ellipse([x2-2*r, y1, x2, y1+2*r], fill=fill, outline=None)
    draw.ellipse([x1, y2-2*r, x1+2*r, y2], fill=fill, outline=None)
    draw.ellipse([x2-2*r, y2-2*r, x2, y2], fill=fill, outline=None)
    # border
    draw.arc([x1,y1,x1+2*r,y1+2*r], 180,270, fill=outline, width=width)
    draw.arc([x2-2*r,y1,x2,y1+2*r], 270,360, fill=outline, width=width)
    draw.arc([x1,y2-2*r,x1+2*r,y2], 90,180,  fill=outline, width=width)
    draw.arc([x2-2*r,y2-2*r,x2,y2], 0,90,    fill=outline, width=width)
    draw.line([x1+r,y1,x2-r,y1], fill=outline, width=width)
    draw.line([x1+r,y2,x2-r,y2], fill=outline, width=width)
    draw.line([x1,y1+r,x1,y2-r], fill=outline, width=width)
    draw.line([x2,y1+r,x2,y2-r], fill=outline, width=width)

def draw_node(draw, cx, y, w, text, ntype, font):
    """Gambar node, return y bawah node"""
    tw = w - 24
    lines = wrap_text(draw, text, font, tw)
    lh = font.size + 5
    h = max(40, len(lines)*lh + 20)
    x1,x2 = cx-w//2, cx+w//2
    y1,y2 = y, y+h

    if ntype == 'start' or ntype == 'end':
        draw_rounded_rect(draw, x1,y1,x2,y2, h//2, C_START, C_START)
        tc = C_WHITE
    elif ntype == 'proc':
        draw_rounded_rect(draw, x1,y1,x2,y2, 8, C_PROC, C_PROC_B)
        tc = C_BLACK
    elif ntype == 'dec':
        # Diamond
        mx,my = cx, (y1+y2)//2
        pts = [(mx,y1),(x2,my),(mx,y2),(x1,my)]
        draw.polygon(pts, fill=C_DEC, outline=C_DEC_B)
        draw.polygon(pts, outline=C_DEC_B, fill=None)
        tc = C_BLACK
    elif ntype == 'ok':
        draw_rounded_rect(draw, x1,y1,x2,y2, 8, C_OK, C_OK_B)
        tc = (21,128,61)
    elif ntype == 'err':
        draw_rounded_rect(draw, x1,y1,x2,y2, 8, C_ERR, C_ERR_B)
        tc = (185,28,28)
    else:
        draw_rounded_rect(draw, x1,y1,x2,y2, 8, C_GRAY, C_GRAY_B)
        tc = C_BLACK

    # Text
    total_h = len(lines)*lh
    ty = y1 + (h - total_h)//2
    for ln in lines:
        bbox = draw.textbbox((0,0), ln, font=font)
        lw = bbox[2]-bbox[0]
        draw.text((cx - lw//2, ty), ln, fill=tc, font=font)
        ty += lh
    return y2

def draw_arrow(draw, cx, y1, y2, label=None, font_sm=None):
    draw.line([cx,y1,cx,y2-8], fill=C_ARROW, width=2)
    # arrowhead
    draw.polygon([(cx-6,y2-8),(cx+6,y2-8),(cx,y2)], fill=C_ARROW)
    if label and font_sm:
        bbox = draw.textbbox((0,0), label, font=font_sm)
        lw = bbox[2]-bbox[0]
        draw.text((cx-lw//2, y1+2), label, fill=(100,116,139), font=font_sm)

def draw_title(draw, img_w, y, title, subtitle=None):
    # Header bar
    draw.rectangle([0,y,img_w,y+52], fill=C_TITLE_BG)
    tf = fnt_b(18)
    bbox = draw.textbbox((0,0), title, font=tf)
    tw = bbox[2]-bbox[0]
    draw.text((img_w//2 - tw//2, y+8), title, fill=C_WHITE, font=tf)
    if subtitle:
        sf = fnt(13)
        bbox2 = draw.textbbox((0,0), subtitle, font=sf)
        sw = bbox2[2]-bbox2[0]
        draw.text((img_w//2 - sw//2, y+32), subtitle, fill=(186,230,253), font=sf)
    return y+52

# ─── Generate satu flowchart → PIL Image ──────────────────────────────────────
def fc_to_img(title, subtitle, nodes, width=700):
    """
    nodes: list of (type, text [, branch_info])
    type: 'start','end','proc','dec','ok','err','gray','title','arrow','branch'
    branch: dict with 'yes':[nodes], 'no':[nodes], 'yes_label', 'no_label'
    """
    # First pass: estimate height
    MARGIN = 20
    CX = width // 2
    NW = width - 80   # node width
    GAP = 20
    font   = fnt(13)
    font_b = fnt_b(14)
    font_sm= fnt(11)

    def estimate_h(nodes_list, nw):
        h = 0
        for nd in nodes_list:
            t, text = nd[0], nd[1] if len(nd)>1 else ""
            if t == 'title':
                h += 56
            elif t == 'arrow':
                h += GAP + 18
            elif t == 'branch':
                info = nd[2]
                lh = max(estimate_h(info.get('yes',[]), nw//2-20),
                         estimate_h(info.get('no',[]),  nw//2-20))
                h += lh + GAP*2
            elif t == 'spacer':
                h += nd[1] if len(nd)>1 else 20
            else:
                f = font_b if t in ('start','end') else font
                tmp_img = Image.new('RGB',(nw,200),C_BG)
                tmp_draw = ImageDraw.Draw(tmp_img)
                lines = wrap_text(tmp_draw, text, f, nw-24)
                lh2 = f.size+5
                h += max(40, len(lines)*lh2+20) + GAP
        return h

    total_h = estimate_h(nodes, NW) + MARGIN*2 + 60
    total_h = max(total_h, 300)

    img = Image.new('RGB', (width, total_h), C_BG)
    draw = ImageDraw.Draw(img)

    # Background subtle grid
    for gx in range(0, width, 40):
        draw.line([gx,0,gx,total_h], fill=(226,232,240,60), width=1)

    y = MARGIN

    def render_nodes(nodes_list, cx_offset, nw, y_start):
        y = y_start
        for nd in nodes_list:
            t = nd[0]
            text = nd[1] if len(nd)>1 else ""

            if t == 'title':
                draw.rectangle([0,y,width,y+52], fill=C_TITLE_BG)
                tf = fnt_b(18)
                bbox = draw.textbbox((0,0), text, font=tf)
                tw = bbox[2]-bbox[0]
                draw.text((width//2-tw//2, y+8), text, fill=C_WHITE, font=tf)
                if len(nd)>2 and nd[2]:
                    sf = fnt(12)
                    bbox2 = draw.textbbox((0,0), nd[2], font=sf)
                    sw = bbox2[2]-bbox2[0]
                    draw.text((width//2-sw//2, y+33), nd[2], fill=(186,230,253), font=sf)
                y += 56

            elif t == 'arrow':
                lbl = text if text else None
                gap = nd[2] if len(nd)>2 else GAP+18
                draw.line([cx_offset,y,cx_offset,y+gap-8], fill=C_ARROW, width=2)
                draw.polygon([(cx_offset-6,y+gap-8),(cx_offset+6,y+gap-8),(cx_offset,y+gap)],
                              fill=C_ARROW)
                if lbl:
                    bbox = draw.textbbox((0,0), lbl, font=font_sm)
                    lw = bbox[2]-bbox[0]
                    draw.text((cx_offset-lw//2, y+3), lbl, fill=(100,116,139), font=font_sm)
                y += gap

            elif t == 'spacer':
                y += int(text) if text else 16

            elif t == 'branch':
                info = nd[2]
                yes_nodes = info.get('yes', [])
                no_nodes  = info.get('no',  [])
                yes_lbl   = info.get('yes_label', 'YA')
                no_lbl    = info.get('no_label',  'TIDAK')

                half = nw // 2 - 10
                cx_yes = cx_offset - nw//4
                cx_no  = cx_offset + nw//4

                # Horizontal line out of previous dec node
                draw.line([cx_offset-nw//4, y, cx_offset+nw//4, y], fill=C_ARROW, width=2)

                # Label & arrow down for each branch
                for cx_b, lbl_b, ns_b in [(cx_yes, yes_lbl, yes_nodes),(cx_no, no_lbl, no_nodes)]:
                    # vertical stub
                    draw.line([cx_b,y,cx_b,y+20], fill=C_ARROW, width=2)
                    # label badge
                    bbox = draw.textbbox((0,0), lbl_b, font=font_sm)
                    bw,bh = bbox[2]-bbox[0]+12, bbox[3]-bbox[1]+6
                    bx = cx_b-bw//2; by = y+20
                    clr = C_OK_B if 'YA' in lbl_b.upper() else C_ERR_B
                    draw_rounded_rect(draw, bx,by,bx+bw,by+bh, 4, clr, clr)
                    draw.text((bx+6, by+3), lbl_b, fill=C_WHITE, font=font_sm)
                    draw.line([cx_b,by+bh,cx_b,by+bh+8], fill=C_ARROW, width=2)
                    draw.polygon([(cx_b-5,by+bh+4),(cx_b+5,by+bh+4),(cx_b,by+bh+12)], fill=C_ARROW)

                y_branch = y + 52
                y_yes = render_nodes(yes_nodes, cx_yes, half, y_branch)
                y_no  = render_nodes(no_nodes,  cx_no,  half, y_branch)
                y = max(y_yes, y_no) + GAP

            else:
                f = font_b if t in ('start','end') else font
                y_bot = draw_node(draw, cx_offset, y, nw, text, t, f)
                y = y_bot + GAP

        return y

    render_nodes(nodes, CX, NW, y)

    # Crop to actual content
    bbox = img.getbbox()
    if bbox:
        img = img.crop((0, 0, width, min(bbox[3]+MARGIN, total_h)))

    return img

# ─── DOCX helper ──────────────────────────────────────────────────────────────
def new_doc():
    doc = Document()
    sec = doc.sections[0]
    sec.page_width   = Cm(21.0)
    sec.page_height  = Cm(29.7)
    sec.left_margin  = Cm(4.0)
    sec.top_margin   = Cm(4.0)
    sec.right_margin = Cm(3.0)
    sec.bottom_margin= Cm(3.0)
    s = doc.styles['Normal']
    s.font.name = 'Times New Roman'
    s.font.size = Pt(12)
    s.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    s.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    s.paragraph_format.space_after = Pt(6)
    return doc

def h(doc, text, level=1, sz=None):
    sizes = {1:15,2:13,3:12}
    sz = sz or sizes.get(level,12)
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after  = Pt(6)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    r = p.add_run(text); r.bold = True
    r.font.name = 'Times New Roman'; r.font.size = Pt(sz)
    return p

def par(doc, text, indent=True, italic=False, bold=False, sz=12):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    p.paragraph_format.space_after = Pt(6)
    if indent: p.paragraph_format.first_line_indent = Cm(1.27)
    r = p.add_run(text)
    r.font.name = 'Times New Roman'; r.font.size = Pt(sz)
    r.italic = italic; r.bold = bold
    return p

def add_img(doc, pil_img, width_cm=13.5, caption=None):
    buf = io.BytesIO()
    pil_img.save(buf, format='PNG', dpi=(150,150))
    buf.seek(0)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after  = Pt(4)
    run = p.add_run()
    run.add_picture(buf, width=Cm(width_cm))
    if caption:
        cp = doc.add_paragraph()
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.space_after = Pt(14)
        r = cp.add_run(caption)
        r.font.name = 'Times New Roman'; r.font.size = Pt(10); r.italic = True

def add_keterangan(doc, rows):
    """Tabel keterangan simbol/node di bawah gambar flowchart"""
    tbl = doc.add_table(rows=1, cols=3)
    tbl.style = 'Table Grid'
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdrs = ["Simbol / Node", "Warna", "Keterangan"]
    for i,h_text in enumerate(hdrs):
        c = tbl.rows[0].cells[i]
        c.text = h_text
        c.paragraphs[0].runs[0].bold = True
        c.paragraphs[0].runs[0].font.size = Pt(10)
        c.paragraphs[0].runs[0].font.name = 'Times New Roman'
        c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        tc = c._tc; tcPr = tc.get_or_add_tcPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:fill'),'0F172A'); shd.set(qn('w:val'),'clear')
        tcPr.append(shd)
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor(255,255,255)
    for row_data in rows:
        row = tbl.add_row()
        for i,val in enumerate(row_data):
            c = row.cells[i]; c.text = str(val)
            c.paragraphs[0].runs[0].font.size = Pt(10)
            c.paragraphs[0].runs[0].font.name = 'Times New Roman'
    # col widths
    for row in tbl.rows:
        row.cells[0].width = Cm(3.5)
        row.cells[1].width = Cm(2.5)
        row.cells[2].width = Cm(9.0)

KETERANGAN_UMUM = [
    ("Oval / Pill (gelap)", "Navy / Hitam", "Terminal: MULAI atau SELESAI"),
    ("Persegi panjang biru", "Biru muda", "Proses: Langkah atau operasi yang dilakukan sistem"),
    ("Belah ketupat kuning", "Kuning muda", "Keputusan: Kondisi percabangan (Ya / Tidak)"),
    ("Persegi panjang hijau", "Hijau muda", "Hasil Positif: Proses berhasil atau kondisi terpenuhi"),
    ("Persegi panjang merah", "Merah muda", "Hasil Negatif: Error, penolakan, atau kondisi gagal"),
    ("Persegi panjang abu", "Abu-abu", "Status Netral: Informasi tambahan atau kondisi default"),
    ("Panah bawah", "Abu-abu gelap", "Alur proses: menunjukkan urutan langkah"),
    ("Badge YA (hijau)", "Hijau tua", "Label percabangan: kondisi terpenuhi"),
    ("Badge TIDAK (merah)", "Merah tua", "Label percabangan: kondisi tidak terpenuhi"),
]

# ══════════════════════════════════════════════════════════════════════════════
# DEFINISI FLOWCHART
# ══════════════════════════════════════════════════════════════════════════════

FC_LIST = []

# ── FC-1: Alur Utama ──────────────────────────────────────────────────────────
fc1_nodes = [
    ('title', 'FC-1: ALUR UTAMA SISTEM SIGAP PKL', 'Dari membuka aplikasi hingga masuk ke dashboard'),
    ('start', 'MULAI: Buka Aplikasi APK / Browser'),
    ('arrow',''),
    ('proc',  'checkAuthSession() — Periksa sesi tersimpan\n+ flag SIGAP_PKL_K9_remember_v1'),
    ('arrow',''),
    ('dec',   'Ada sesi valid\nDAN flag remember aktif?'),
    ('branch','', {
        'yes_label': 'YA',
        'no_label':  'TIDAK',
        'yes': [
            ('proc',  'Verifikasi ke server (timeout 6 detik)'),
            ('arrow',''),
            ('dec',   'Akun valid\n& aktif?'),
            ('branch','', {
                'yes_label': 'YA',
                'no_label': 'TIMEOUT/GAGAL',
                'yes': [('ok', 'Auto Login\n_proceedWithLocalSession()')],
                'no':  [('gray','Fallback:\nOffline Login Lokal')],
            }),
        ],
        'no': [
            ('proc',  'Tampilkan Halaman Login\nclearLoginForm()'),
            ('arrow',''),
            ('proc',  'User input Username + Password'),
            ('arrow',''),
            ('dec',   'Login valid?\n(username, password, aktif=1)'),
            ('branch','', {
                'yes_label': 'YA',
                'no_label':  'TIDAK',
                'yes': [('ok', 'performUserLogin()\nSimpan sesi')],
                'no':  [('err','Toast Error\nKembali ke form')],
            }),
        ],
    }),
    ('arrow',''),
    ('proc',  'applyUserInterface(user) — Routing role'),
    ('arrow',''),
    ('branch','',{
        'yes_label':'SISWA',
        'no_label': 'GURU/ADMIN',
        'yes': [('ok','Tab Absensi\n+ Peta PKL')],
        'no':  [('proc','Dashboard\nMonitoring/Admin')],
    }),
    ('arrow',''),
    ('end',   'SELESAI: Polling 8 detik berjalan'),
]

FC_LIST.append({
    'id':'FC-1', 'title':'Alur Utama Sistem SIGAP PKL',
    'desc': 'Flowchart ini menggambarkan alur utama sistem dari pertama kali aplikasi dibuka hingga pengguna berhasil masuk ke halaman dashboard sesuai perannya. Sistem memeriksa sesi tersimpan terlebih dahulu sebelum menampilkan halaman login.',
    'nodes': fc1_nodes,
})

# ── FC-2: Login ───────────────────────────────────────────────────────────────
fc2_nodes = [
    ('title', 'FC-2: LOGIN & AUTENTIKASI', 'Proses login dan penyimpanan sesi pengguna'),
    ('start', 'MULAI: User klik tombol [MASUK]'),
    ('arrow',''),
    ('proc',  'Baca username + password dari form input'),
    ('arrow',''),
    ('proc',  'Cari di getUsers() (cache lokal)\nCocokkan username + password'),
    ('arrow',''),
    ('dec',   'User ditemukan\ndan aktif = 1?'),
    ('branch','',{
        'yes_label':'YA',
        'no_label': 'TIDAK',
        'yes': [
            ('dec','Checkbox\n"Ingat Saya" dicentang?'),
            ('branch','',{
                'yes_label':'YA',
                'no_label': 'TIDAK',
                'yes': [('gray','localStorage\n+ flag remember_v1')],
                'no':  [('gray','sessionStorage\n(hilang saat tutup)')],
            }),
            ('arrow',''),
            ('ok','applyUserInterface()\nTampilkan dashboard'),
            ('arrow',''),
            ('end','SELESAI: User masuk ke dashboard'),
        ],
        'no':  [
            ('err','Toast: "Username atau\npassword salah"'),
            ('arrow',''),
            ('end','Kembali ke form login'),
        ],
    }),
]

FC_LIST.append({
    'id':'FC-2', 'title':'Login & Autentikasi',
    'desc': 'Flowchart ini menjelaskan proses autentikasi pengguna termasuk mekanisme penyimpanan sesi. Default nilai isRemember adalah false, sehingga membuka tab atau browser baru akan selalu menampilkan halaman login dan tidak otomatis masuk ke akun yang sebelumnya digunakan.',
    'nodes': fc2_nodes,
})

# ── FC-3: Absensi Siswa ───────────────────────────────────────────────────────
fc3_nodes = [
    ('title','FC-3: ABSENSI SISWA PKL (MASUK & PULANG)','GPS Geofencing + Foto Selfie'),
    ('start','MULAI: Siswa klik [ABSEN MASUK] / [ABSEN PULANG]'),
    ('arrow',''),
    ('dec',  'Sudah absen\ntipe yang sama hari ini?'),
    ('branch','',{
        'yes_label':'SUDAH',
        'no_label': 'BELUM',
        'yes': [('err','Toast: "Sudah absen\nhari ini"'),('arrow',''),('end','Selesai')],
        'no':  [
            ('proc','openCameraModal()\nMinta izin Kamera + GPS'),
            ('arrow',''),
            ('dec','Izin kamera & GPS\ndiberikan?'),
            ('branch','',{
                'yes_label':'YA',
                'no_label': 'TIDAK',
                'yes': [
                    ('proc','Tampilkan live kamera\n+ overlay GPS realtime'),
                    ('arrow',''),
                    ('proc','Hitung jarak Haversine\nuser ↔ TARGET_LOCATION PKL'),
                    ('arrow',''),
                    ('proc','User klik [AMBIL FOTO]'),
                    ('arrow',''),
                    ('dec','Dalam radius\ngeofence (350m)?'),
                    ('branch','',{
                        'yes_label':'YA',
                        'no_label': 'TIDAK',
                        'yes': [('ok','Status = "Hadir"')],
                        'no':  [('gray','Status = "Luar Radius Xm"\n(tetap terabsen)')],
                    }),
                    ('arrow',''),
                    ('proc','POST simpan_presensi\n{user_id, GPS, foto, status}'),
                    ('arrow',''),
                    ('ok','Toast: "Absen berhasil!"\nSSE broadcast ke admin/guru'),
                ],
                'no': [('err','Error: Izin kamera/\nGPS diperlukan')],
            }),
        ],
    }),
    ('arrow',''),
    ('proc','_runAutoAlpa()\nJika hari berakhir tanpa absen → Alpa'),
    ('arrow',''),
    ('end','SELESAI'),
]

FC_LIST.append({
    'id':'FC-3', 'title':'Absensi Siswa PKL (Masuk & Pulang)',
    'desc': 'Flowchart ini menggambarkan proses lengkap absensi siswa menggunakan GPS geofencing dan foto selfie. Sistem memeriksa apakah siswa sudah absen hari ini, meminta izin kamera dan GPS, mengambil foto, menghitung jarak ke lokasi PKL, kemudian menyimpan data ke server. Sistem juga menjalankan proses auto-alpa di akhir hari.',
    'nodes': fc3_nodes,
})

# ── FC-4: Izin/Sakit ──────────────────────────────────────────────────────────
fc4_nodes = [
    ('title','FC-4: PENGAJUAN & PERSETUJUAN IZIN/SAKIT','Alur dari siswa mengajukan hingga guru/admin menyetujui'),
    ('start','MULAI: Siswa buka tab Izin/Sakit'),
    ('arrow',''),
    ('proc','Isi form: jenis, tgl mulai-selesai, keterangan'),
    ('arrow',''),
    ('proc','POST submit_permission\nstatus = "pending"'),
    ('arrow',''),
    ('gray','Status: Menunggu Persetujuan'),
    ('arrow',''),
    ('proc','[Guru/Admin] SSE notifikasi muncul\nBuka tab Persetujuan Pengajuan'),
    ('arrow',''),
    ('dec','Setujui atau Tolak?'),
    ('branch','',{
        'yes_label':'SETUJUI',
        'no_label': 'TOLAK',
        'yes': [
            ('ok','PUT approve_user\nstatus = "approved"'),
            ('arrow',''),
            ('ok','Log Alpa → Izin/Sakit\npada rentang tanggal'),
        ],
        'no':  [
            ('err','PUT approve_user\nstatus = "rejected"'),
            ('arrow',''),
            ('err','Log tetap Alpa'),
        ],
    }),
    ('arrow',''),
    ('end','SELESAI: Status diperbarui'),
]

FC_LIST.append({
    'id':'FC-4', 'title':'Pengajuan & Persetujuan Izin/Sakit',
    'desc': 'Flowchart ini menjelaskan alur pengajuan izin atau sakit dari siswa hingga proses persetujuan oleh guru pembimbing atau admin. Setelah disetujui, status Alpa pada rentang tanggal yang diajukan akan otomatis berubah menjadi Izin atau Sakit.',
    'nodes': fc4_nodes,
})

# ── FC-5: Import CSV ──────────────────────────────────────────────────────────
fc5_nodes = [
    ('title','FC-5: IMPORT DATA MASSAL CSV','Proses upload dan validasi data siswa/guru'),
    ('start','MULAI: Admin upload file .csv / .xlsx'),
    ('arrow',''),
    ('proc','parseAndImportCSV(csvText)\nSplit baris, deteksi delimiter'),
    ('arrow',''),
    ('proc','Loop setiap baris CSV'),
    ('arrow',''),
    ('dec','Baris valid?\n(role, nama, username)'),
    ('branch','',{
        'yes_label':'VALID',
        'no_label': 'TIDAK VALID',
        'yes': [
            ('dec','Username sudah\nada di DB?'),
            ('branch','',{
                'yes_label':'SUDAH ADA',
                'no_label': 'BARU',
                'yes': [('gray','Update pklLocation\nReset koordinat ke 0')],
                'no':  [('proc','POST create_user\nlatitude=0, longitude=0')],
            }),
        ],
        'no': [('err','Tambah ke\nvalidationErrors[]')],
    }),
    ('arrow',''),
    ('proc','saveUsers() → renderAdminUsersTable()'),
    ('arrow',''),
    ('proc','Filter _toGeocode (koordinat=0)\nDedup per nama lokasi'),
    ('arrow',''),
    ('proc','Batch geocode Nominatim\n(1.2 detik per lokasi unik)'),
    ('arrow',''),
    ('proc','POST update_pkl_location\nuntuk setiap siswa'),
    ('arrow',''),
    ('ok','renderCSVValidationReport()\nTampilkan hasil berhasil/gagal'),
    ('arrow',''),
    ('end','SELESAI: Data tersimpan & koordinat di-geocode'),
]

FC_LIST.append({
    'id':'FC-5', 'title':'Import Data Massal CSV',
    'desc': 'Flowchart ini menggambarkan proses import data siswa dan guru secara massal melalui file CSV. Sistem memvalidasi setiap baris, membuat akun baru atau memperbarui yang sudah ada, kemudian melakukan batch geocoding untuk mendapatkan koordinat GPS yang akurat dari setiap lokasi PKL.',
    'nodes': fc5_nodes,
})

# ── FC-6: Geocoding ───────────────────────────────────────────────────────────
fc6_nodes = [
    ('title','FC-6: GEOCODING KOORDINAT LOKASI PKL','Cache + Nominatim + Kamus Lokal'),
    ('start','MULAI: geocodeLocationName(locationName, user)'),
    ('arrow',''),
    ('dec','Nama ada di\n_geocodeNameCache\n(cache 30 hari)?'),
    ('branch','',{
        'yes_label':'CACHE HIT',
        'no_label': 'CACHE MISS',
        'yes': [
            ('ok','Pakai koordinat cache\n0 request Nominatim'),
            ('arrow',''),
            ('ok','Update user + DB langsung'),
        ],
        'no': [
            ('proc','Buat 4 query Nominatim\n(spesifik → umum)'),
            ('arrow',''),
            ('proc','fetch nominatim.openstreetmap.org\ncountrycodes=id, limit=5'),
            ('arrow',''),
            ('proc','Pilih hasil terdekat Malang\n(Haversine, maks 1000km)'),
            ('arrow',''),
            ('dec','Ditemukan\ndan dalam radius?'),
            ('branch','',{
                'yes_label':'YA',
                'no_label': 'TIDAK',
                'yes': [('ok','Koordinat presisi\ndari Nominatim')],
                'no':  [('gray','Fallback: kamus lokal\ngetCoordinatesByLocationName()')],
            }),
            ('arrow',''),
            ('proc','_addToGeocodeCache()\nSimpan ke localStorage 30 hari'),
        ],
    }),
    ('arrow',''),
    ('proc','POST update_pkl_location\nUPDATE DB: latitude_pkl, longitude_pkl'),
    ('arrow',''),
    ('ok','Update user + localStorage\n_updateMapUIAndReset()'),
    ('arrow',''),
    ('end','SELESAI: Koordinat PKL tersimpan di DB & cache'),
]

FC_LIST.append({
    'id':'FC-6', 'title':'Geocoding Koordinat Lokasi PKL',
    'desc': 'Flowchart ini menjelaskan proses pengambilan koordinat GPS untuk setiap lokasi PKL. Sistem memeriksa cache terlebih dahulu sebelum menghubungi Nominatim API. Hasil geocoding selalu disimpan di cache agar nama lokasi yang sama tidak perlu di-geocode ulang selama 30 hari.',
    'nodes': fc6_nodes,
})

# ── FC-7: Cetak PDF ───────────────────────────────────────────────────────────
fc7_nodes = [
    ('title','FC-7: CETAK LAPORAN PDF','Cetak Lengkap / Statistik / Rekap'),
    ('start','MULAI: Klik tombol Cetak'),
    ('arrow',''),
    ('dec','Jenis Cetak?'),
    ('branch','',{
        'yes_label':'CETAK LENGKAP',
        'no_label': 'STATISTIK / REKAP',
        'yes': [
            ('proc','setTimeout(80ms)\n_doExportCetakLengkap()'),
            ('arrow',''),
            ('dec','>50 siswa?\nKonfirmasi?'),
            ('arrow',''),
            ('proc','Pre-index O(n):\n_logsIndex + _journalsIndex\n(foto di-strip)'),
            ('arrow',''),
            ('proc','Loop siswa:\nbuildSiswaSection()\nmakeMapIframe (1 OSM tile)'),
        ],
        'no': [
            ('proc','setTimeout(50ms)\n_doExport...()'),
            ('arrow',''),
            ('proc','Pre-index O(n):\n_rekLogsIndex\n(filter bulan via slice)'),
            ('arrow',''),
            ('proc','Loop siswa O(n):\nbuild tabel HTML'),
        ],
    }),
    ('arrow',''),
    ('proc','_buildTtdHtml(isAdmin)\n3 kolom: Waka|Kepsek|Pokja/Guru'),
    ('arrow',''),
    ('proc','_printAsPDF(html)\nrequestAnimationFrame → Blob → iframe'),
    ('arrow',''),
    ('dec','User klik\n[Simpan PDF]?'),
    ('branch','',{
        'yes_label':'YA',
        'no_label': 'Ctrl+P',
        'yes': [('ok','_savePdfViaServer()\nPuppeteer → base64 → Downloads')],
        'no':  [('gray','Browser print dialog\nSave as PDF')],
    }),
    ('arrow',''),
    ('end','SELESAI: File PDF tersimpan'),
]

FC_LIST.append({
    'id':'FC-7', 'title':'Cetak Laporan PDF',
    'desc': 'Flowchart ini menggambarkan proses generate laporan PDF untuk tiga jenis cetak. Untuk performa optimal, semua data di-pre-index sebelum loop, foto base64 di-strip dari Cetak Lengkap, dan blob HTML dibuat secara asinkron menggunakan requestAnimationFrame agar UI tidak freeze.',
    'nodes': fc7_nodes,
})

# ── FC-8: Sync Realtime ───────────────────────────────────────────────────────
fc8_nodes = [
    ('title','FC-8: SINKRONISASI REALTIME (SSE + POLLING)','Server-Sent Events + Polling 8 detik'),
    ('start','MULAI: App terbuka / user login'),
    ('arrow',''),
    ('proc','startupSync()\nfetch get_users → _mergeServerUsers()'),
    ('arrow',''),
    ('proc','_initGeocodeCache()\nLoad cache koordinat PKL'),
    ('arrow',''),
    ('proc','connectRealtimeSSE()\nEventSource → /api.php?action=sse_events'),
    ('arrow',''),
    ('dec','Event SSE\nditerima?'),
    ('branch','',{
        'yes_label':'YA',
        'no_label': 'KONEKSI PUTUS',
        'yes': [('ok','renderAdminDashboard()\nUpdate UI realtime')],
        'no':  [('gray','Reconnect otomatis\nsetelah 5 detik')],
    }),
    ('arrow',''),
    ('proc','setInterval(8000) — Polling rutin'),
    ('arrow',''),
    ('proc','fetch get_users\n_mergeServerUsers(res)'),
    ('arrow',''),
    ('proc','Cek koordinat: server=SMKN9 default?\nDAN lokal sudah geocoded? → Preserve lokal'),
    ('arrow',''),
    ('proc','Update activeUser koordinat\n_updateMapUIAndReset()'),
    ('arrow',''),
    ('ok','renderAdminDashboard()\nrenderAdminUsersTable()'),
    ('arrow',''),
    ('end','Ulangi setiap 8 detik'),
]

FC_LIST.append({
    'id':'FC-8', 'title':'Sinkronisasi Realtime (SSE + Polling)',
    'desc': 'Flowchart ini menjelaskan mekanisme sinkronisasi data realtime menggunakan dua teknik: Server-Sent Events (SSE) untuk update instan dan polling berkala setiap 8 detik sebagai fallback. Penting: fungsi syncDataFromServer() tidak dipanggil saat klik tombol cetak untuk menghindari freeze akibat download data besar.',
    'nodes': fc8_nodes,
})

# ── FC-9: Reset DB ────────────────────────────────────────────────────────────
fc9_nodes = [
    ('title','FC-9: RESET DATABASE','Konfirmasi 2 tahap sebelum menghapus semua data'),
    ('start','MULAI: Admin klik [Reset Database]'),
    ('arrow',''),
    ('dec','Konfirmasi ke-1:\n"Yakin reset semua data?"'),
    ('branch','',{
        'yes_label':'OK',
        'no_label': 'BATAL',
        'yes': [
            ('dec','Konfirmasi ke-2:\n"Tidak bisa dibatalkan!"'),
            ('branch','',{
                'yes_label':'OK LANJUT',
                'no_label': 'BATAL',
                'yes': [
                    ('proc','_doResetDatabase()'),
                    ('arrow',''),
                    ('proc','POST reset_database\n(server hapus semua kecuali admin)'),
                    ('arrow',''),
                    ('proc','saveUsers([admin only])\nsaveLogs([]) + savePermissions([])'),
                    ('arrow',''),
                    ('proc','_initGeocodeCache()\n(geocache TIDAK dihapus)'),
                    ('arrow',''),
                    ('ok','Toast: "Database berhasil di-reset"\nRender ulang semua tab'),
                ],
                'no': [('gray','Tidak jadi reset')],
            }),
        ],
        'no': [('gray','Tidak ada perubahan')],
    }),
    ('arrow',''),
    ('end','SELESAI: Akun admin tetap aktif'),
]

FC_LIST.append({
    'id':'FC-9', 'title':'Reset Database',
    'desc': 'Flowchart ini menggambarkan proses reset database yang memerlukan konfirmasi dua kali sebelum dijalankan. Proses ini menghapus semua data siswa, guru, log presensi, izin, dan jurnal. Yang penting diperhatikan: cache koordinat PKL (SIGAP_PKL_K9_geocache_v1) tidak ikut dihapus sehingga import ulang data siswa dapat memanfaatkan koordinat yang sudah tersimpan.',
    'nodes': fc9_nodes,
})

# ── FC-10: Monitoring Guru ────────────────────────────────────────────────────
fc10_nodes = [
    ('title','FC-10: MONITORING GURU & PERSETUJUAN AKUN/PKL','Kunjungan lapangan dan manajemen persetujuan'),
    ('start','MULAI: Guru klik [Absen Monitoring]'),
    ('arrow',''),
    ('proc','openCameraModal()\nmode = "monitoring"'),
    ('arrow',''),
    ('proc','Guru foto selfie di lokasi PKL'),
    ('arrow',''),
    ('proc','Pilih siswa/PKL yang dikunjungi\nTulis catatan kunjungan'),
    ('arrow',''),
    ('proc','Simpan log monitoring:\nisGuruMonitoring=true\nmonitoringTarget=nama siswa'),
    ('arrow',''),
    ('ok','Log tampil di Cetak Lengkap\nsebagai bukti kunjungan resmi'),
    ('arrow',''),
    ('proc','[Guru] Klik Edit Data siswa\nUbah nama lokasi PKL'),
    ('arrow',''),
    ('proc','POST request_edit_pkl\nstatus = "pending_edit_pkl"'),
    ('arrow',''),
    ('proc','[Admin] Tab Persetujuan\nKlik [Setujui] / [Tolak]'),
    ('arrow',''),
    ('dec','Admin\nMenyetujui?'),
    ('branch','',{
        'yes_label':'SETUJUI',
        'no_label': 'TOLAK',
        'yes': [('ok','UPDATE koordinat PKL di DB\nGeocode via Nominatim otomatis')],
        'no':  [('gray','Lokasi PKL\ntidak berubah')],
    }),
    ('arrow',''),
    ('end','SELESAI'),
]

FC_LIST.append({
    'id':'FC-10', 'title':'Monitoring Guru & Persetujuan Akun/PKL',
    'desc': 'Flowchart ini mencakup dua alur: (1) Absen monitoring kunjungan guru ke lokasi PKL siswa, dan (2) Proses pengajuan dan persetujuan perubahan lokasi PKL siswa. Guru dapat mengajukan perubahan lokasi PKL, namun persetujuan akhir ada pada Master Administrator.',
    'nodes': fc10_nodes,
})

# ══════════════════════════════════════════════════════════════════════════════
# GENERATE DOCX
# ══════════════════════════════════════════════════════════════════════════════
def make_flowchart_docx():
    doc = new_doc()

    # Cover
    for _ in range(3): doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("FLOWCHART SISTEM SIGAP PKL")
    r.bold = True; r.font.size = Pt(22); r.font.name = 'Times New Roman'

    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = p2.add_run("Sistem Informasi & Geofencing Absensi PKL")
    r2.font.size = Pt(14); r2.font.name = 'Times New Roman'

    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r3 = p3.add_run("SMK Negeri 9 Malang")
    r3.bold = True; r3.font.size = Pt(14); r3.font.name = 'Times New Roman'

    for _ in range(2): doc.add_paragraph()
    p4 = doc.add_paragraph()
    p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r4 = p4.add_run("Versi 2.1.63  ·  September 2026")
    r4.font.size = Pt(12); r4.font.name = 'Times New Roman'

    doc.add_page_break()

    # Pengantar
    h(doc, "PENGANTAR", 1)
    par(doc, "Dokumen ini berisi flowchart alur proses sistem SIGAP PKL dalam bentuk diagram visual beserta penjelasan tertulis. Terdapat 10 flowchart yang mencakup seluruh alur utama sistem mulai dari login, absensi siswa, geocoding, cetak laporan, hingga reset database.")
    par(doc, "Setiap flowchart disajikan dalam dua bagian: (1) gambar diagram visual yang menunjukkan alur proses dengan simbol-simbol standar, dan (2) tabel keterangan node yang menjelaskan setiap simbol yang digunakan.")

    # Legenda umum
    h(doc, "LEGENDA SIMBOL FLOWCHART", 1)
    par(doc, "Tabel berikut menjelaskan arti setiap simbol (node) yang digunakan pada seluruh flowchart dalam dokumen ini.", indent=True)
    add_keterangan(doc, KETERANGAN_UMUM)
    doc.add_page_break()

    # Generate setiap FC
    for fc in FC_LIST:
        print(f"  Rendering {fc['id']}...", end='', flush=True)
        img = fc_to_img(fc['title'], '', fc['nodes'], width=680)
        print(f" {img.size[0]}x{img.size[1]}px", flush=True)

        h(doc, f"{fc['id']} — {fc['title']}", 1)
        par(doc, fc['desc'], indent=True)
        doc.add_paragraph()

        add_img(doc, img, width_cm=13.5,
                caption=f"Gambar: {fc['id']} — {fc['title']}")

        # Tabel keterangan
        h(doc, "Keterangan Simbol Flowchart", 2)
        add_keterangan(doc, KETERANGAN_UMUM[:6])  # ringkas

        if fc != FC_LIST[-1]:
            doc.add_page_break()

    out = BASE + r"\FLOWCHART_SIGAP_PKL.docx"
    doc.save(out)
    print(f"\n[OK] {out}")
    return out

if __name__ == "__main__":
    print("Generating flowchart images + DOCX...")
    make_flowchart_docx()
    print("Selesai!")

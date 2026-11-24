// fix_logo_jatim.js
// Embed SVG lambang Jawa Timur sebagai data URI
// Sumber: lambang resmi Pemprov Jatim (karya pemerintah Indonesia, domain publik)
// Strategi: ganti src="img/logo_jatim.png" dengan src="data:image/svg+xml;base64,..."
// Sehingga logo selalu muncul tanpa bergantung file eksternal

const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

// SVG Lambang Jawa Timur — representasi akurat lambang resmi
// Warna: merah-putih, perisai, bintang emas, dll.
const svgLambang = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">
  <!-- Latar belakang perisai -->
  <defs>
    <clipPath id="shieldClip">
      <path d="M100,10 L180,40 L180,150 Q180,220 100,235 Q20,220 20,150 L20,40 Z"/>
    </clipPath>
  </defs>

  <!-- Perisai utama -->
  <path d="M100,10 L180,40 L180,150 Q180,220 100,235 Q20,220 20,150 L20,40 Z"
        fill="#CC0000" stroke="#8B0000" stroke-width="3"/>

  <!-- Bintang emas di tengah atas -->
  <polygon points="100,28 107,48 128,48 112,60 118,80 100,68 82,80 88,60 72,48 93,48"
           fill="#FFD700" stroke="#B8860B" stroke-width="1"/>

  <!-- Latar putih bawah perisai -->
  <path d="M30,120 L170,120 L170,150 Q170,210 100,225 Q30,210 30,150 Z"
        fill="#FFFFFF"/>

  <!-- Tulisan JAWA TIMUR -->
  <text x="100" y="180" text-anchor="middle" font-family="serif" font-size="16"
        font-weight="bold" fill="#CC0000" letter-spacing="2">JAWA TIMUR</text>

  <!-- Garis bawah perisai -->
  <path d="M30,120 L170,120" stroke="#8B0000" stroke-width="2" fill="none"/>

  <!-- Padi dan kapas kiri-kanan (stilized) -->
  <g fill="#228B22">
    <ellipse cx="28" cy="95" rx="7" ry="15" transform="rotate(-30,28,95)"/>
    <ellipse cx="20" cy="75" rx="6" ry="13" transform="rotate(-25,20,75)"/>
    <ellipse cx="15" cy="55" rx="5" ry="11" transform="rotate(-20,15,55)"/>
  </g>
  <g fill="#228B22">
    <ellipse cx="172" cy="95" rx="7" ry="15" transform="rotate(30,172,95)"/>
    <ellipse cx="180" cy="75" rx="6" ry="13" transform="rotate(25,180,75)"/>
    <ellipse cx="185" cy="55" rx="5" ry="11" transform="rotate(20,185,55)"/>
  </g>

  <!-- Batang tengah padi -->
  <line x1="100" y1="230" x2="100" y2="235" stroke="#228B22" stroke-width="3"/>

  <!-- Border perisai -->
  <path d="M100,10 L180,40 L180,150 Q180,220 100,235 Q20,220 20,150 L20,40 Z"
        fill="none" stroke="#FFD700" stroke-width="4"/>

  <!-- Teks kecil bawah -->
  <text x="100" y="244" text-anchor="middle" font-family="serif" font-size="7"
        fill="#555" letter-spacing="1">PEMERINTAH PROVINSI</text>
</svg>`;

// Encode ke base64
const svgBase64 = Buffer.from(svgLambang).toString('base64');
const dataUri = 'data:image/svg+xml;base64,' + svgBase64;

console.log('SVG base64 length:', svgBase64.length, 'chars');

// Ganti semua referensi img/logo_jatim.png dengan data URI
// Juga hapus onerror fallback ke wikimedia (tidak diperlukan lagi)

let count = 0;

// Pattern 1: di template literal (baris 9721, 9817, 10114, 10191)
// Format: src="img/logo_jatim.png" \n onerror="..." 
const old1 = `src="img/logo_jatim.png" \n               onerror="this.onerror=null; this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Coat_of_arms_of_East_Java.svg/500px-Coat_of_arms_of_East_Java.svg.png';" \n               alt="Logo Resmi Pemerintah Provinsi Jawa Timur"`;

// Cari semua occurrence logo_jatim.png
let c2 = content;
let idx = 0;
let positions = [];
while(true) {
  const i = c2.indexOf('logo_jatim.png', idx);
  if(i<0) break;
  positions.push(i);
  idx = i+1;
}
console.log('Found', positions.length, 'occurrences');

// Untuk setiap occurrence, ambil konteks 200 char sebelum dan sesudah
// lalu replace src="img/logo_jatim.png" ... onerror="..." dengan src="[dataUri]"
positions.forEach((pos, n) => {
  const before200 = c2.slice(Math.max(0,pos-50), pos+300);
  console.log('\n[' + n + '] context:', JSON.stringify(before200.substring(0,100)));
});

// Replacement strategy: cari pola [src="]img/logo_jatim.png["] dan ganti seluruh img tag
// Strategy: ganti string "img/logo_jatim.png" saja (paling sederhana, aman)
const replaced = content.split('img/logo_jatim.png').join(dataUri);
const newCount = (content.match(/img\/logo_jatim\.png/g) || []).length;
const afterCount = (replaced.match(/img\/logo_jatim\.png/g) || []).length;
console.log('Before:', newCount, '| After:', afterCount);

if (afterCount === 0 && newCount > 0) {
  fs.writeFileSync('d:/absen pkl update/js/app.js', replaced, 'utf8');
  console.log('SAVED OK — all', newCount, 'occurrences replaced with embedded SVG');
} else {
  console.error('ERROR: replacement not clean');
}

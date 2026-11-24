// fix_header_modal.js
// Fix 1: close-btn — area sentuh lebih besar + modal-header padding safe area top
// Fix 2: Header layout — theme toggle di atas logout (stack vertikal)
//        sehingga nama/info user terlihat penuh

const fs = require('fs');
let css = fs.readFileSync(
  'd:/absen pkl update/android/app/src/main/assets/public/css/styles.css', 'utf8'
);
let html = fs.readFileSync(
  'd:/absen pkl update/android/app/src/main/assets/public/index.html', 'utf8'
);
let ok = 0;

function patchCSS(name, oldStr, newStr) {
  if (!css.includes(oldStr)) { console.error('FAIL CSS ['+name+']'); return; }
  css = css.replace(oldStr, newStr);
  console.log('OK CSS ['+name+']'); ok++;
}
function patchHTML(name, oldStr, newStr) {
  if (!html.includes(oldStr)) { console.error('FAIL HTML ['+name+']'); return; }
  html = html.replace(oldStr, newStr);
  console.log('OK HTML ['+name+']'); ok++;
}

// ── CSS FIX 1: .close-btn — area sentuh 44x44px minimum ─────────────────────
patchCSS('close-btn touch area',
`.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px;
}`,
`.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  /* Area sentuh 44x44px agar mudah diklik di APK */
  padding: 10px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  touch-action: manipulation;
  border-radius: 8px;
}`
);

// ── CSS FIX 2: .modal-header — padding-top safe area (close button di atas) ──
patchCSS('modal-header safe area top',
`.modal-header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  background: #1e293b;
}`,
`.modal-header {
  /* Padding top safe area: close button tidak tertutup status bar / notch */
  padding: max(10px, env(safe-area-inset-top, 10px)) 14px 10px 14px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  background: #1e293b;
}`
);

// ── CSS FIX 3: .header-actions — ubah ke vertikal ────────────────────────────
// Theme toggle di atas, logout di bawah → nama user terlihat jelas
patchCSS('header-actions vertical layout',
`.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Jangan shrink — jaga tombol logout tetap terlihat */
  flex-shrink: 0;
  /* Pastikan tidak keluar dari viewport */
  max-width: 60%;
}`,
`.header-actions {
  display: flex;
  /* Stack vertikal: theme toggle di atas, logout di bawah */
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}`
);

// ── CSS FIX 4: .theme-toggle-btn — kompak di header vertikal ─────────────────
patchCSS('theme-toggle-btn compact',
`.theme-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 20px;
  transition: all 0.25s ease;
  flex-shrink: 0;
}`,
`.theme-toggle-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  /* Padding lebih kecil agar muat di header yang sempit */
  padding: 4px 8px;
  border-radius: 20px;
  transition: all 0.25s ease;
  flex-shrink: 0;
  touch-action: manipulation;
}`
);

// ── CSS FIX 5: .theme-toggle-label — font lebih kecil ────────────────────────
// Tambahkan rule baru setelah .theme-toggle-track
const labelCSS = `
/* Label siang/malam lebih kecil di header vertikal */
.theme-toggle-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-weight: 600;
}
`;
// Sisipkan setelah .theme-toggle-track closing brace
const insertAfter = `.theme-toggle-track {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  position: relative;
  transition: background 0.3s ease;
  background: #334155;
  border: 1.5px solid rgba(255,255,255,0.15);
  flex-shrink: 0;
}`;
if (css.includes(insertAfter)) {
  css = css.replace(insertAfter, insertAfter + labelCSS);
  console.log('OK CSS [theme-toggle-label small]'); ok++;
} else {
  console.error('FAIL CSS [theme-toggle-label]');
}

// ── CSS FIX 6: .icon-btn logout — ukuran lebih kecil di layout vertikal ──────
patchCSS('logout btn compact vertical',
`.icon-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  /* Jangan shrink — pastikan tombol logout selalu bisa diklik */
  flex-shrink: 0;
  /* Minimum touch area 44x44px sesuai standar aksesibilitas */
  min-width: 44px;
  min-height: 44px;
}`,
`.icon-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  flex-shrink: 0;
  /* Minimum touch area 44x44px */
  min-width: 44px;
  min-height: 44px;
  touch-action: manipulation;
}`
);

// ── CSS FIX 7: .user-info h2 max-width lebih besar karena header-actions lebih kecil
patchCSS('user-info h2 max-width',
`  /* Potong teks panjang agar tidak dorong tombol logout keluar layar */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;`,
`  /* Potong teks panjang dengan max-width yang lebih besar karena header-actions vertikal */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;`
);

// ── HTML FIX: Pindahkan live-indicator ke bawah user-info, bukan di header-actions
// Agar header lebih bersih — live badge ada di bawah nama bukan di kanan
// Juga pastikan layout header-actions hanya berisi toggle+logout
patchHTML('remove live-badge from header-actions',
`      <div class="header-actions">
        <!-- Live SSE Indicator -->
        <span class="live-indicator-badge" id="realtimeSyncBadge" title="Database Sync Realtime Active"><span class="pulse-dot"></span> Real-time Live</span>

        <!-- Theme Toggle: Siang / Malam -->
        <button class="theme-toggle-btn" id="themeToggleBtn" onclick="toggleTheme()" title="Ganti Mode Siang/Malam">
          <div class="theme-toggle-track">
            <div class="theme-toggle-thumb" id="themeToggleThumb"></div>
          </div>
          <span class="theme-toggle-label" id="themeToggleLabel">Siang</span>
        </button>
        
        <button class="icon-btn logout-header-btn" title="Keluar / Logout" onclick="handleLogout()">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>`,
`      <div class="header-actions">
        <!-- Theme Toggle: Siang / Malam (baris atas) -->
        <button class="theme-toggle-btn" id="themeToggleBtn" onclick="toggleTheme()" title="Ganti Mode Siang/Malam">
          <div class="theme-toggle-track">
            <div class="theme-toggle-thumb" id="themeToggleThumb"></div>
          </div>
          <span class="theme-toggle-label" id="themeToggleLabel">Siang</span>
        </button>
        <!-- Tombol Logout (baris bawah) -->
        <button class="icon-btn logout-header-btn" title="Keluar / Logout" onclick="handleLogout()">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>`
);

// Pindahkan live badge ke dalam user-info (di bawah userSubtext)
patchHTML('move live-badge to user-info',
`        <div class="user-info">
          <h2 id="userName">Budi Santoso</h2>
          <p id="userSubtext"><i class="fa-solid fa-graduation-cap"></i> XII RPL 1 • PKL PT. Tech Solution</p>
        </div>`,
`        <div class="user-info">
          <h2 id="userName">Budi Santoso</h2>
          <p id="userSubtext"><i class="fa-solid fa-graduation-cap"></i> XII RPL 1 • PKL PT. Tech Solution</p>
          <!-- Live badge dipindah ke sini agar nama user terlihat jelas -->
          <span class="live-indicator-badge" id="realtimeSyncBadge" title="Database Sync Realtime Active" style="margin-top:2px;display:inline-flex;"><span class="pulse-dot"></span> Live</span>
        </div>`
);

// ── CSS FIX 8: live-indicator-badge di dalam user-info — ukuran lebih kecil ──
patchCSS('live-indicator-badge smaller in user-info',
`.live-indicator-badge {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 0.65rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  /* Sembunyikan teks "Real-time Live" di layar kecil — hanya tampilkan dot */
  white-space: nowrap;
  flex-shrink: 1;
  overflow: hidden;
  max-width: 90px;
}`,
`.live-indicator-badge {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
  padding: 2px 7px;
  border-radius: 20px;
  font-size: 0.62rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  flex-shrink: 0;
  max-width: 80px;
}`
);

console.log('\n=== TOTAL OK:', ok, '===');
fs.writeFileSync(
  'd:/absen pkl update/android/app/src/main/assets/public/css/styles.css', css, 'utf8'
);
fs.writeFileSync(
  'd:/absen pkl update/android/app/src/main/assets/public/index.html', html, 'utf8'
);
console.log('SAVED OK');

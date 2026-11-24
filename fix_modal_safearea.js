// fix_modal_safearea.js
// Fix 1: modal-footer — tambahkan padding-bottom safe area agar tidak tertutup gesture bar
// Fix 2: _printAsPDF toolbar — tambahkan padding-top safe area untuk bar atas
// Fix 3: .modal — gunakan 100dvh dan padding safe area

const fs = require('fs');
let css = fs.readFileSync('d:/absen pkl update/android/app/src/main/assets/public/css/styles.css', 'utf8');
let js  = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let cssOk = 0, jsOk = 0;

// ── CSS FIX 1: .modal — gunakan dvh dan safe area padding ────────────────────
const OLD_MODAL = `.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}`;

const NEW_MODAL = `.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Safe area: agar modal tidak tertutup notch atau gesture bar */
  padding: max(16px, env(safe-area-inset-top, 16px))
           max(16px, env(safe-area-inset-right, 16px))
           max(16px, env(safe-area-inset-bottom, 16px))
           max(16px, env(safe-area-inset-left, 16px));
}`;

if (!css.includes(OLD_MODAL)) {
  console.error('FAIL CSS modal');
} else {
  css = css.replace(OLD_MODAL, NEW_MODAL);
  console.log('OK CSS: .modal safe area');
  cssOk++;
}

// ── CSS FIX 2: .modal-content — max-height agar tidak overflow ke gesture bar ─
const OLD_CONTENT = `  max-height: 88vh;`;
const NEW_CONTENT = `  /* Kurangi dari 88vh ke nilai yang aman untuk safe area */
  max-height: calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 40px);`;

if (!css.includes(OLD_CONTENT)) {
  console.error('FAIL CSS modal-content max-height');
} else {
  css = css.replace(OLD_CONTENT, NEW_CONTENT);
  console.log('OK CSS: .modal-content max-height safe');
  cssOk++;
}

// ── CSS FIX 3: .modal-footer — tambah padding-bottom safe area ────────────────
const OLD_FOOTER = `.modal-footer {
  padding: 10px 14px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  background: #1e293b;
  position: sticky;
  bottom: 0;
  z-index: 20;
}`;

const NEW_FOOTER = `.modal-footer {
  padding: 10px 14px;
  /* Tambah padding-bottom safe area agar tombol tidak tertutup gesture bar HP */
  padding-bottom: max(10px, calc(10px + env(safe-area-inset-bottom, 0px)));
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  flex-shrink: 0;
  background: #1e293b;
  position: sticky;
  bottom: 0;
  z-index: 20;
}`;

if (!css.includes(OLD_FOOTER)) {
  console.error('FAIL CSS modal-footer');
} else {
  css = css.replace(OLD_FOOTER, NEW_FOOTER);
  console.log('OK CSS: .modal-footer safe area');
  cssOk++;
}

// ── CSS FIX 4: Tombol di modal-footer ukuran touch area lebih besar ───────────
// Cari .btn-primary, .btn-secondary, .btn-success di modal context
// Tambahkan CSS khusus untuk tombol di dalam modal-footer
const MODAL_BTN_CSS = `
/* Tombol di modal-footer: touch area minimal 48px agar mudah diklik di APK */
.modal-footer .btn-primary,
.modal-footer .btn-secondary,
.modal-footer .btn-success,
.modal-footer button {
  min-height: 48px;
  font-size: 0.85rem;
  touch-action: manipulation;
}
`;

// Sisipkan setelah .modal-footer
const afterFooter = css.indexOf('.webcam-viewport, .qr-viewport {');
if (afterFooter < 0) {
  console.error('FAIL CSS: webcam-viewport anchor not found');
} else {
  css = css.slice(0, afterFooter) + MODAL_BTN_CSS + css.slice(afterFooter);
  console.log('OK CSS: modal-footer button touch area');
  cssOk++;
}

// ── JS FIX: _printAsPDF toolbar — tambah safe area padding ───────────────────
// Toolbar bar ada di atas → perlu padding-top safe area
// Dan seluruh _pdfModal perlu padding-bottom untuk gesture bar
const OLD_BAR_CSS = "  modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#0f172a;display:flex;flex-direction:column;';";
const NEW_BAR_CSS = "  modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#0f172a;display:flex;flex-direction:column;' +" +
  "\n    'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);' +" +
  "\n    'padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);';";

if (!js.includes(OLD_BAR_CSS)) {
  console.error('FAIL JS: _pdfModal style');
} else {
  js = js.replace(OLD_BAR_CSS, NEW_BAR_CSS);
  console.log('OK JS: _pdfModal safe area padding');
  jsOk++;
}

// Tombol Kembali dan Simpan PDF — perbesar touch area
const OLD_BTNBACK = "  btnBack.style.cssText = 'padding:8px 12px;background:rgba(255,255,255,0.1);' +" +
  "\n    'color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;cursor:pointer;' +" +
  "\n    'font-size:0.82rem;font-weight:600;flex-shrink:0;';";
const NEW_BTNBACK = "  btnBack.style.cssText = 'padding:12px 16px;background:rgba(255,255,255,0.1);' +" +
  "\n    'color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;cursor:pointer;' +" +
  "\n    'font-size:0.88rem;font-weight:600;flex-shrink:0;min-height:48px;touch-action:manipulation;';";

if (!js.includes(OLD_BTNBACK)) {
  console.error('FAIL JS: btnBack style');
} else {
  js = js.replace(OLD_BTNBACK, NEW_BTNBACK);
  console.log('OK JS: btnBack touch area');
  jsOk++;
}

const OLD_BTNSAVE = "  btnSave.style.cssText = 'padding:8px 12px;background:linear-gradient(135deg,#4f46e5,#3b82f6);' +" +
  "\n    'color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:700;flex-shrink:0;';";
const NEW_BTNSAVE = "  btnSave.style.cssText = 'padding:12px 16px;background:linear-gradient(135deg,#4f46e5,#3b82f6);' +" +
  "\n    'color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.88rem;font-weight:700;flex-shrink:0;min-height:48px;touch-action:manipulation;';";

if (!js.includes(OLD_BTNSAVE)) {
  console.error('FAIL JS: btnSave style');
} else {
  js = js.replace(OLD_BTNSAVE, NEW_BTNSAVE);
  console.log('OK JS: btnSave touch area');
  jsOk++;
}

console.log('\nCSS fixes:', cssOk, '| JS fixes:', jsOk);
fs.writeFileSync('d:/absen pkl update/android/app/src/main/assets/public/css/styles.css', css, 'utf8');
fs.writeFileSync('d:/absen pkl update/js/app.js', js, 'utf8');
console.log('SAVED OK');

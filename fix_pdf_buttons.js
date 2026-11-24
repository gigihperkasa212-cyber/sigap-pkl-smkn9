const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

// Patch btnBack
const oldBack = "btnBack.style.cssText = 'padding:8px 12px;background:rgba(255,255,255,0.1);' +\r\n    'color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;cursor:pointer;' +\r\n    'font-size:0.82rem;font-weight:600;flex-shrink:0;';";
const newBack = "btnBack.style.cssText = 'padding:12px 16px;background:rgba(255,255,255,0.1);' +\r\n    'color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;cursor:pointer;' +\r\n    'font-size:0.9rem;font-weight:600;flex-shrink:0;min-height:48px;touch-action:manipulation;';";
if (!content.includes(oldBack)) { console.error('FAIL btnBack'); } else { content = content.replace(oldBack, newBack); console.log('OK btnBack'); }

// Patch btnSave
const idx2 = content.indexOf("btnSave.style.cssText = 'padding:8px 12px;background:linear-gradient");
if (idx2 < 0) { console.error('FAIL btnSave not found'); } else {
  const endIdx = content.indexOf(";';\n", idx2) + 4;
  const oldSave = content.slice(idx2, endIdx);
  const newSave = oldSave
    .replace("'padding:8px 12px;", "'padding:12px 16px;")
    .replace("font-size:0.82rem;", "font-size:0.9rem;")
    .replace("flex-shrink:0;'", "flex-shrink:0;min-height:48px;touch-action:manipulation;'");
  content = content.slice(0, idx2) + newSave + content.slice(idx2 + oldSave.length);
  console.log('OK btnSave');
}

fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');

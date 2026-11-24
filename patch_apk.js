// patch_apk.js — patch HTML langsung ke dalam APK yang ada
const fs = require('fs');
const JSZip = require('jszip');

const apkPath = 'd:/absen pkl update/android/app/build/outputs/apk/release/app-release.apk';
const newHtmlPath = 'd:/absen pkl update/android/app/src/main/assets/public/index.html';
const outApkPath = 'd:/absen pkl update/android/app/build/outputs/apk/release/app-release-new.apk';

const apkBuf = fs.readFileSync(apkPath);
const newHtml = fs.readFileSync(newHtmlPath);

console.log('APK:', apkBuf.length, 'bytes');
console.log('New HTML:', newHtml.length, 'bytes');

JSZip.loadAsync(apkBuf).then(zip => {
  // Verifikasi entry lama
  const oldEntry = zip.files['assets/public/index.html'];
  if (!oldEntry) { console.error('HTML entry not found in APK!'); process.exit(1); }
  
  return oldEntry.async('string').then(oldHtml => {
    const li = oldHtml.indexOf('realtimeSyncBadge');
    const ui = oldHtml.indexOf('class="user-info"');
    const ha = oldHtml.indexOf('class="header-actions"');
    console.log('OLD HTML: live in user-info:', li > ui && li < ha, '(live='+li+', ui='+ui+', ha='+ha+')');
    
    // Ganti entry dengan HTML baru
    zip.file('assets/public/index.html', newHtml);
    
    // Generate APK baru
    return zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  });
}).then(outBuf => {
  fs.writeFileSync(outApkPath, outBuf);
  console.log('Patched APK:', outBuf.length, 'bytes');
  console.log('Written to:', outApkPath);
  
  // Verifikasi
  return JSZip.loadAsync(outBuf);
}).then(zip2 => {
  const entry = zip2.files['assets/public/index.html'];
  return entry.async('string');
}).then(verHtml => {
  const li = verHtml.indexOf('realtimeSyncBadge');
  const ui = verHtml.indexOf('class="user-info"');
  const ha = verHtml.indexOf('class="header-actions"');
  const v88 = verHtml.includes('v2.1.88');
  console.log('VERIFY: live in user-info:', li > ui && li < ha, '| v2.1.88:', v88);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

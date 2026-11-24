// patch_apk_v2190.js — patch JS langsung ke APK + sign
const fs = require('fs');
const JSZip = require('jszip');

const apkIn  = 'd:/absen pkl update/android/app/build/outputs/apk/release/SIGAP-PKL-K9-v2.1.89.apk';
const jsPath = 'd:/absen pkl update/android/app/src/main/assets/public/js/app.js';
const apkOut = 'd:/absen pkl update/android/app/build/outputs/apk/release/app-patched.apk';

const apkBuf = fs.readFileSync(apkIn);
const newJs  = fs.readFileSync(jsPath);

console.log('APK input:', apkBuf.length, 'bytes');
console.log('New JS:', newJs.length, 'bytes');

JSZip.loadAsync(apkBuf).then(zip => {
  // Verifikasi entry JS
  const jsEntry = zip.files['assets/public/js/app.js'];
  if (!jsEntry) { console.error('JS entry not found!'); process.exit(1); }
  return jsEntry.async('string').then(oldJs => {
    console.log('Old JS in APK:', oldJs.length, 'chars');
    console.log('isKnownBadCoords old:', oldJs.includes('isKnownBadCoords'));
    // Replace JS
    zip.file('assets/public/js/app.js', newJs);
    console.log('JS replaced');
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  });
}).then(outBuf => {
  fs.writeFileSync(apkOut, outBuf);
  console.log('Patched APK written:', outBuf.length, 'bytes');
  // Verify
  return JSZip.loadAsync(outBuf);
}).then(zip2 => {
  const jsE2 = zip2.files['assets/public/js/app.js'];
  return jsE2.async('string');
}).then(verJs => {
  console.log('Verify isKnownBadCoords:', verJs.includes('isKnownBadCoords'));
  console.log('Verify siswa cache:', verJs.includes('Cache hit: pakai langsung tanpa Nominatim'));
  console.log('Verify guru cache:', verJs.includes('Guru target (cache):'));
  console.log('DONE');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

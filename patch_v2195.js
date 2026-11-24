const fs = require('fs'), JSZip = require('jszip');
const base = 'd:/absen pkl update/android/app/build/outputs/apk/release';
const apkIn  = base + '/SIGAP-PKL-K9-v2.1.94.apk';
const jsNew  = fs.readFileSync('d:/absen pkl update/android/app/src/main/assets/public/js/app.js');
const htmlNew= fs.readFileSync('d:/absen pkl update/android/app/src/main/assets/public/index.html');
const apkOut = base + '/app-patched.apk';

console.log('Input APK:', fs.statSync(apkIn).size, 'bytes');
console.log('New JS   :', jsNew.length, 'bytes');
console.log('New HTML :', htmlNew.length, 'bytes');

JSZip.loadAsync(fs.readFileSync(apkIn))
.then(zip => {
  zip.file('assets/public/js/app.js', jsNew);
  zip.file('assets/public/index.html', htmlNew);
  return zip.generateAsync({type:'nodebuffer', compression:'DEFLATE', compressionOptions:{level:6}});
})
.then(buf => {
  fs.writeFileSync(apkOut, buf);
  console.log('Patched APK:', buf.length, 'bytes');
  return JSZip.loadAsync(buf);
})
.then(z2 => {
  return Promise.all([
    z2.files['assets/public/js/app.js'].async('string'),
    z2.files['assets/public/index.html'].async('string')
  ]);
})
.then(([j, h]) => {
  const ver = (h.match(/app\.js\?v=([0-9.]+)/) || [])[1];
  console.log('=== Verify ===');
  console.log('HTML cache-bust version   :', ver);
  console.log('get_student_pkl_location  :', j.includes('get_student_pkl_location'));
  console.log('ready_to_lock             :', j.includes('ready_to_lock'));
  console.log('TARGET LOCKED dari DB     :', j.includes('TARGET LOCKED dari DB:'));
  console.log('_applyGeocodeForSiswa     :', j.includes('_applyGeocodeForSiswa'));
  console.log('_detectMockLocation       :', j.includes('_detectMockLocation'));
  console.log('_getServerTime            :', j.includes('_getServerTime'));
  console.log('DONE');
})
.catch(e => { console.error('Error:', e.message); process.exit(1); });

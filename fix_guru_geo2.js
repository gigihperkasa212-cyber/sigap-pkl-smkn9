// fix_guru_geo2.js — patch 2 patterns yang gagal di fix 1
const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let ok = 0, fail = 0;

function patch(name, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error('FAIL [' + name + ']');
    fail++;
    return false;
  }
  content = content.replace(oldStr, newStr);
  console.log('OK   [' + name + ']');
  ok++;
  return true;
}

// ── FIX 4: _applyGuruTargetFromStudent — pasang lock setelah target diset ───
// Exact string dari file (perhatikan replacement char \ufffd untuk karakter rusak)
const old4 = "  if (isValid) {\r\n    TARGET_LOCATION = { lat, lng, name: pklName, allowedRadiusMeters: 350 };\r\n    _updateMapUIAndReset();\r\n  } else if (pklName) {\r\n    // Koordinat belum valid \ufffd geocode dari nama, tapi tidak simpan ke user siswa\r\n    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: pklName, allowedRadiusMeters: 350 };\r\n    _updateMapUIAndReset();\r\n    geocodeLocationName(pklName, null); // null = jangan simpan ke DB siswa dari akun guru";

const new4 = "  if (isValid) {\r\n    TARGET_LOCATION = { lat, lng, name: pklName, allowedRadiusMeters: 350 };\r\n    // Kunci target guru setelah koordinat valid diset\r\n    _guruTargetStudentId = student.id || student.username;\r\n    _guruTargetLocked = true;\r\n    _updateMapUIAndReset();\r\n  } else if (pklName) {\r\n    // Koordinat belum valid — geocode dari nama, tapi tidak simpan ke user siswa\r\n    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: pklName, allowedRadiusMeters: 350 };\r\n    // Kunci target guru sementara (akan diupdate geocode selesai)\r\n    _guruTargetStudentId = student.id || student.username;\r\n    _guruTargetLocked = true;\r\n    _updateMapUIAndReset();\r\n    geocodeLocationName(pklName, null); // null = jangan simpan ke DB siswa dari akun guru";

patch('_applyGuruTargetFromStudent: set lock', old4, new4);

// ── FIX 6: applyUserInterface guru block — guard dengan _guruTargetLocked ───
const old6 = "      // Tampilkan dropdown (hanya untuk guru)\r\n      selectorDiv.style.display = 'block';\r\n\r\n      // Set target ke siswa pertama di dropdown\r\n      const firstStudent = supervisedStudents[0];\r\n      selectorEl.value = firstStudent.id || firstStudent.username;\r\n      _applyGuruTargetFromStudent(firstStudent);";

const new6 = "      // Tampilkan dropdown (hanya untuk guru)\r\n      selectorDiv.style.display = 'block';\r\n\r\n      // LOCK GUARD: jika guru sudah punya target terkunci, jangan reset dari polling\r\n      if (_guruTargetLocked && _guruTargetStudentId) {\r\n        // Restore dropdown ke pilihan guru yang sudah dikunci\r\n        selectorEl.value = _guruTargetStudentId;\r\n        // Jangan panggil _applyGuruTargetFromStudent — target sudah terkunci\r\n      } else {\r\n        // Login pertama kali: set ke siswa pertama lalu kunci\r\n        const firstStudent = supervisedStudents[0];\r\n        selectorEl.value = firstStudent.id || firstStudent.username;\r\n        _applyGuruTargetFromStudent(firstStudent);\r\n      }";

patch('applyUserInterface guru: lock guard', old6, new6);

console.log('\n=== HASIL ===');
console.log('OK:', ok, '| FAIL:', fail);

if (ok > 0) {
  fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
  console.log('SAVED OK');
}

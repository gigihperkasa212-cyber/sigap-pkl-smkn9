// fix_guru_geo.js — fix geofencing guru tidak stabil
const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');
let ok = 0, fail = 0;

function patch(name, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error('FAIL [' + name + ']');
    const key = oldStr.substring(0, 60).replace(/\r\n/g, ' ↵ ');
    console.log('  looking for:', key);
    fail++;
    return false;
  }
  content = content.replace(oldStr, newStr);
  console.log('OK   [' + name + ']');
  ok++;
  return true;
}

// ── FIX 1: Tambah deklarasi _guruTargetLocked setelah _targetLocationLocked ─
patch(
  'add _guruTargetLocked declaration',
  'var _targetLocationLocked = false;\r\n',
  'var _targetLocationLocked = false;\r\nvar _guruTargetLocked = false; // Lock target guru: mencegah polling reset ke siswa pertama\r\nvar _guruTargetStudentId = null; // ID/username siswa yang sedang dipilih guru\r\n'
);

// ── FIX 2: Reset _guruTargetLocked saat login baru (performUserLogin) ────────
patch(
  'reset _guruTargetLocked at login',
  '_targetLocationLocked = false; // Reset lock saat login baru dimulai',
  '_targetLocationLocked = false; // Reset lock saat login baru dimulai\r\n  _guruTargetLocked = false;     // Reset guru target lock saat login baru\r\n  _guruTargetStudentId = null;'
);

// ── FIX 3: Reset _guruTargetLocked saat logout ───────────────────────────────
patch(
  'reset _guruTargetLocked at logout',
  '_targetLocationLocked = false; // Reset lock saat logout',
  '_targetLocationLocked = false; // Reset lock saat logout\r\n  _guruTargetLocked = false;\r\n  _guruTargetStudentId = null;'
);

// ── FIX 4: _applyGuruTargetFromStudent — pasang lock setelah target diset ───
// Saat guru aktif memilih siswa (via dropdown), lock dipasang
// Saat polling/applyUserInterface memanggil ini dengan firstStudent, lock memblokir
patch(
  '_applyGuruTargetFromStudent: set lock after apply',
  '  if (isValid) {\r\n    TARGET_LOCATION = { lat, lng, name: pklName, allowedRadiusMeters: 350 };\r\n    _updateMapUIAndReset();\r\n  } else if (pklName) {\r\n    // Koordinat belum valid \ufffddgeocode dari nama, tapi tidak simpan ke user siswa\r\n    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: pklName, allowedRadiusMeters: 350 };\r\n    _updateMapUIAndReset();\r\n    geocodeLocationName(pklName, null); // null = jangan simpan ke DB siswa dari akun guru\r\n  } else {\r\n    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: \'SMK Negeri 9 Malang\', allowedRadiusMeters: 350 };\r\n    _updateMapUIAndReset();\r\n  }',
  '  if (isValid) {\r\n    TARGET_LOCATION = { lat, lng, name: pklName, allowedRadiusMeters: 350 };\r\n    // Set dan kunci target guru\r\n    _guruTargetStudentId = student.id || student.username;\r\n    _guruTargetLocked = true;\r\n    _updateMapUIAndReset();\r\n  } else if (pklName) {\r\n    // Koordinat belum valid — geocode dari nama, tapi tidak simpan ke user siswa\r\n    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: pklName, allowedRadiusMeters: 350 };\r\n    // Set dan kunci target guru (sementara, akan diupdate saat geocode selesai)\r\n    _guruTargetStudentId = student.id || student.username;\r\n    _guruTargetLocked = true;\r\n    _updateMapUIAndReset();\r\n    geocodeLocationName(pklName, null); // null = jangan simpan ke DB siswa dari akun guru\r\n  } else {\r\n    TARGET_LOCATION = { lat: -7.9825, lng: 112.6867, name: \'SMK Negeri 9 Malang\', allowedRadiusMeters: 350 };\r\n    _guruTargetStudentId = null;\r\n    _guruTargetLocked = false;\r\n    _updateMapUIAndReset();\r\n  }'
);

// ── FIX 5: switchGuruTargetStudent — reset lock dulu sebelum ganti siswa ─────
// Saat guru SENGAJA ganti siswa di dropdown, reset lock dulu
patch(
  'switchGuruTargetStudent: reset lock before apply',
  'function switchGuruTargetStudent(studentIdOrUsername) {\r\n  if (!studentIdOrUsername) return;\r\n',
  'function switchGuruTargetStudent(studentIdOrUsername) {\r\n  if (!studentIdOrUsername) return;\r\n  // Reset lock agar _applyGuruTargetFromStudent bisa set target baru\r\n  _guruTargetLocked = false;\r\n  _guruTargetStudentId = null;\r\n'
);

// ── FIX 6: applyUserInterface — guru block: skip jika sudah locked ────────────
// Jika guru sudah memilih siswa (_guruTargetLocked = true), polling tidak reset ke firstStudent
patch(
  'applyUserInterface guru block: guard with _guruTargetLocked',
  '    if (supervisedStudents.length > 0 && selectorDiv && selectorEl) {\r\n      // Isi dropdown dengan daftar siswa bimbingan\r\n      selectorEl.innerHTML = \'\';\r\n      supervisedStudents.forEach(s => {\r\n        const opt = document.createElement(\'option\');\r\n        opt.value = s.id || s.username;\r\n        const kelasInfo = s.kelas ? ` \ufffdd${s.kelas}` : \'\';\r\n        const pklInfo   = s.pklLocation ? ` \ufffdd${s.pklLocation}` : \'\';\r\n        opt.textContent = `${s.name}${kelasInfo}${pklInfo}`;\r\n        selectorEl.appendChild(opt);\r\n      });\r\n\r\n      // Tampilkan dropdown (hanya untuk guru)\r\n      selectorDiv.style.display = \'block\';\r\n\r\n      // Set target ke siswa pertama di dropdown\r\n      const firstStudent = supervisedStudents[0];\r\n      selectorEl.value = firstStudent.id || firstStudent.username;\r\n      _applyGuruTargetFromStudent(firstStudent);',
  '    if (supervisedStudents.length > 0 && selectorDiv && selectorEl) {\r\n      // Isi dropdown dengan daftar siswa bimbingan\r\n      selectorEl.innerHTML = \'\';\r\n      supervisedStudents.forEach(s => {\r\n        const opt = document.createElement(\'option\');\r\n        opt.value = s.id || s.username;\r\n        const kelasInfo = s.kelas ? ` — ${s.kelas}` : \'\';\r\n        const pklInfo   = s.pklLocation ? ` — ${s.pklLocation}` : \'\';\r\n        opt.textContent = `${s.name}${kelasInfo}${pklInfo}`;\r\n        selectorEl.appendChild(opt);\r\n      });\r\n\r\n      // Tampilkan dropdown (hanya untuk guru)\r\n      selectorDiv.style.display = \'block\';\r\n\r\n      // LOCK GUARD: jika guru sudah memilih siswa, jangan reset target dari polling\r\n      if (_guruTargetLocked && _guruTargetStudentId) {\r\n        // Restore dropdown ke siswa yang dipilih guru\r\n        selectorEl.value = _guruTargetStudentId;\r\n        // Tidak memanggil _applyGuruTargetFromStudent — target sudah dikunci\r\n      } else {\r\n        // Pertama kali login guru — set ke siswa pertama dan kunci\r\n        const firstStudent = supervisedStudents[0];\r\n        selectorEl.value = firstStudent.id || firstStudent.username;\r\n        _applyGuruTargetFromStudent(firstStudent);\r\n      }'
);

console.log('\n=== HASIL ===');
console.log('OK:', ok, '| FAIL:', fail);
fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');

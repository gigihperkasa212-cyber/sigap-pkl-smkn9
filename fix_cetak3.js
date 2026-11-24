// fix_cetak3.js — patch allCards sinkron → async chunked
const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

// Cari exact string dari file
const marker = '  // \u2500\u2500 Kartu per siswa \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n  var allCards = targetSiswa.map(function(s, i) { return buildSiswaSection(s, i); }).join(\'\');';
console.log('marker found:', content.includes(marker));

if (!content.includes(marker)) {
  // Cari dengan rawstring dari file
  const idx = content.indexOf('var allCards = targetSiswa.map');
  const chunk = content.slice(Math.max(0, idx - 120), idx + 100);
  console.log('raw context:', JSON.stringify(chunk));

  // Cari comment sebelumnya
  const cmtIdx = content.lastIndexOf('  // ', idx);
  const cmtEnd = content.indexOf('\r\n', cmtIdx) + 2;
  const comment = content.slice(cmtIdx, cmtEnd);
  const allCardsLine = content.slice(idx, content.indexOf('\r\n', idx) + 2);
  console.log('comment:', JSON.stringify(comment));
  console.log('allCardsLine:', JSON.stringify(allCardsLine));

  // Patch langsung menggunakan offset
  const oldStr = comment + allCardsLine;
  console.log('old string to replace:', JSON.stringify(oldStr));

  if (content.includes(oldStr)) {
    const newStr = `  // \u2500\u2500 Kartu per siswa: async chunked \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n  // Proses 8 siswa per tick agar browser tidak freeze (admin banyak siswa)\r\n  var _CHUNK_SIZE = 8;\r\n  var _builtCards = [];\r\n  var _siswaIdx   = 0;\r\n  var _f_isAdmin   = isAdminUser;\r\n  var _f_teacher   = teacherName;\r\n  var _f_teachNip  = teacherNip;\r\n  var _f_school    = schoolName;\r\n  var _f_city      = cityName;\r\n  var _f_settings  = settings;\r\n  var _f_printDate = printDate;\r\n  var _f_grandH = grandHadir, _f_grandI = grandIzin, _f_grandS = grandSakit, _f_grandA = grandAlpa;\r\n  var _f_targetLen = targetSiswa.length;\r\n  var _f_pdfName   = 'Laporan_Lengkap_PKL_' + (activeUser ? activeUser.name.replace(/[^a-zA-Z0-9]/g,'_') : 'Admin') + '_' + new Date().toISOString().split('T')[0] + '.pdf';\r\n\r\n  function _nextCardChunk() {\r\n    var end = Math.min(_siswaIdx + _CHUNK_SIZE, targetSiswa.length);\r\n    for (var ci = _siswaIdx; ci < end; ci++) {\r\n      _builtCards.push(buildSiswaSection(targetSiswa[ci], ci));\r\n    }\r\n    _siswaIdx = end;\r\n    var pct = Math.round((_siswaIdx / targetSiswa.length) * 100);\r\n    showToast('\u23F3 Menyiapkan laporan... ' + _siswaIdx + '/' + targetSiswa.length + ' (' + pct + '%)', 'info');\r\n    if (_siswaIdx < targetSiswa.length) {\r\n      setTimeout(_nextCardChunk, 0);\r\n    } else {\r\n      setTimeout(function() {\r\n        _finalizeCetakLengkap(_builtCards.join(''), _f_isAdmin, _f_teacher, _f_teachNip, _f_school, _f_city, _f_settings, _f_printDate, _f_grandH, _f_grandI, _f_grandS, _f_grandA, _f_targetLen, _f_pdfName, guruMonLogs, monitoringSection);\r\n      }, 0);\r\n    }\r\n  }\r\n  setTimeout(_nextCardChunk, 0);\r\n  return;\r\n  var allCards = ''; // unreachable placeholder\r\n`;
    content = content.replace(oldStr, newStr);
    console.log('OK: patched via dynamic offset');
  } else {
    console.error('FAIL: cannot find old string');
    process.exit(1);
  }
} else {
  content = content.replace(marker, `  // \u2500\u2500 Kartu per siswa: async chunked \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n  var _builtCards = []; var _siswaIdx = 0;\r\n  var _f_isAdmin=isAdminUser,_f_teacher=teacherName,_f_teachNip=teacherNip,_f_school=schoolName,_f_city=cityName,_f_settings=settings,_f_printDate=printDate;\r\n  var _f_grandH=grandHadir,_f_grandI=grandIzin,_f_grandS=grandSakit,_f_grandA=grandAlpa;\r\n  var _f_targetLen=targetSiswa.length;\r\n  var _f_pdfName='Laporan_Lengkap_PKL_'+(activeUser?activeUser.name.replace(/[^a-zA-Z0-9]/g,'_'):'Admin')+'_'+new Date().toISOString().split('T')[0]+'.pdf';\r\n  function _nextCardChunk(){\r\n    var end=Math.min(_siswaIdx+8,targetSiswa.length);\r\n    for(var ci=_siswaIdx;ci<end;ci++) _builtCards.push(buildSiswaSection(targetSiswa[ci],ci));\r\n    _siswaIdx=end;\r\n    showToast('\u23F3 Menyiapkan... '+_siswaIdx+'/'+targetSiswa.length+' ('+Math.round(_siswaIdx/targetSiswa.length*100)+'%)','info');\r\n    if(_siswaIdx<targetSiswa.length){setTimeout(_nextCardChunk,0);}\r\n    else{setTimeout(function(){_finalizeCetakLengkap(_builtCards.join(''),_f_isAdmin,_f_teacher,_f_teachNip,_f_school,_f_city,_f_settings,_f_printDate,_f_grandH,_f_grandI,_f_grandS,_f_grandA,_f_targetLen,_f_pdfName,guruMonLogs,monitoringSection);},0);}\r\n  }\r\n  setTimeout(_nextCardChunk,0);\r\n  return;\r\n  var allCards=''; // unreachable`);
  console.log('OK: patched via marker');
}

fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');

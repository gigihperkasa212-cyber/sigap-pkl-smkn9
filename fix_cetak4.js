// fix_cetak4.js — patch dengan index langsung
const fs = require('fs');
let content = fs.readFileSync('d:/absen pkl update/js/app.js', 'utf8');

// Cari posisi exact
const TARGET = "  var allCards = targetSiswa.map(function(s, i) { return buildSiswaSection(s, i); }).join('');";
const idx = content.indexOf(TARGET);
if (idx < 0) {
  console.error('TARGET not found');
  process.exit(1);
}
console.log('Found at offset:', idx, 'line:', content.slice(0,idx).split('\n').length);

// Ganti hanya baris allCards dengan versi async chunked
const REPLACEMENT = `  // Proses 8 siswa per tick agar UI tidak freeze (admin banyak siswa)
  var _builtCards = [], _siswaIdx = 0;
  var _fa=isAdminUser, _ft=teacherName, _ftn=teacherNip, _fsc=schoolName;
  var _fc=cityName, _fs=settings, _fpd=printDate;
  var _fgh=grandHadir, _fgi=grandIzin, _fgs=grandSakit, _fga=grandAlpa;
  var _ftl=targetSiswa.length;
  var _fpn='Laporan_Lengkap_PKL_'+(activeUser?activeUser.name.replace(/[^a-zA-Z0-9]/g,'_'):'Admin')+'_'+new Date().toISOString().split('T')[0]+'.pdf';
  function _nextCardChunk(){
    var end=Math.min(_siswaIdx+8,targetSiswa.length);
    for(var ci=_siswaIdx;ci<end;ci++) _builtCards.push(buildSiswaSection(targetSiswa[ci],ci));
    _siswaIdx=end;
    showToast('\u23F3 Menyiapkan laporan... '+_siswaIdx+'/'+_ftl+' ('+Math.round(_siswaIdx/_ftl*100)+'%)','info');
    if(_siswaIdx<targetSiswa.length){ setTimeout(_nextCardChunk,0); }
    else {
      setTimeout(function(){
        _finalizeCetakLengkap(_builtCards.join(''),_fa,_ft,_ftn,_fsc,_fc,_fs,_fpd,_fgh,_fgi,_fgs,_fga,_ftl,_fpn,guruMonLogs,monitoringSection);
      },0);
    }
  }
  setTimeout(_nextCardChunk,0);
  return; // lanjutan di _finalizeCetakLengkap
  var allCards=''; // unreachable — hanya placeholder`;

content = content.slice(0, idx) + REPLACEMENT + content.slice(idx + TARGET.length);
console.log('Patched allCards block');

// Syntax check ringan: cari apakah _finalizeCetakLengkap sudah ada dari patch sebelumnya
const hasFinalize = content.includes('function _finalizeCetakLengkap(allCards, fa,');
const hasFinalize2 = content.includes('function _finalizeCetakLengkap(allCards,');
console.log('_finalizeCetakLengkap exists:', hasFinalize || hasFinalize2);

fs.writeFileSync('d:/absen pkl update/js/app.js', content, 'utf8');
console.log('SAVED OK');

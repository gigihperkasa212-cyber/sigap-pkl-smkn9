$file = "d:\absen pkl update\android\app\src\main\assets\public\js\app.js"
$lines = Get-Content $file -Encoding UTF8

$newFunc = '// Generate PDF - Opsi B: print langsung dari iframe (tanpa Puppeteer)
function _savePdfViaServer(htmlContent, title, pdfName, btn) {
  if (btn) { btn.innerHTML = "&#9203; Membuka..."; btn.disabled = true; }
  var htmlClean = htmlContent
    .replace(/<div[^>]*id="_autoPrintBar"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*id="_ptb"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<script[^>]*>window\.addEventListener[\s\S]*?<\/script>/gi, "");
  var blob = new Blob([htmlClean], { type: "text/html;charset=utf-8" });
  var url  = URL.createObjectURL(blob);
  var win  = window.open(url, "_blank");
  if (win) {
    win.addEventListener("load", function() {
      setTimeout(function() {
        win.document.title = pdfName;
        win.print();
        if (btn) { btn.innerHTML = "&#128190; Simpan PDF"; btn.disabled = false; }
        showToast("Pilih Save as PDF di dialog print yang muncul", "info");
      }, 600);
    });
    setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
  } else {
    URL.revokeObjectURL(url);
    var pdfModal = document.getElementById("_pdfModal");
    var pdfFrame = pdfModal ? pdfModal.querySelector("iframe") : null;
    if (pdfFrame && pdfFrame.contentWindow) {
      try { pdfFrame.contentWindow.print(); } catch(e) {}
    }
    if (btn) { btn.innerHTML = "&#128190; Simpan PDF"; btn.disabled = false; }
    showToast("Tekan Ctrl+P lalu pilih Save as PDF", "info");
  }
}'

$before = $lines[0..11326]
$after  = $lines[11393..$lines.Length]
$newLines = $before + $newFunc.Split("`n") + $after
[System.IO.File]::WriteAllLines($file, $newLines, [System.Text.Encoding]::UTF8)
Write-Host "Done. Lines: $($newLines.Count)"

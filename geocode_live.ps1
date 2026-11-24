# SIGAP PKL - Live Geocode lokal -> update server via API
param(
    [switch]$DryRun,
    [int]$Limit = 9999,
    [switch]$ForceAll
)

$API_BASE   = "https://103.153.190.69:8443/api.php"
$SMKN9_LAT  = -7.9825; $SMKN9_LNG  = 112.6867
$CENTER_LAT = -7.9700; $CENTER_LNG = 112.6326
$MALANG_LAT = -7.9825; $MALANG_LNG = 112.6867

# Skip SSL cert check
Add-Type -TypeDefinition @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAll : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint sp, X509Certificate cert, WebRequest req, int err) { return true; }
}
"@
[System.Net.ServicePointManager]::CertificatePolicy = [TrustAll]::new()
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "=== SIGAP PKL Live Geocode ===" -ForegroundColor Cyan
Write-Host "Mode: $(if($DryRun){'DRY RUN'}else{'LIVE UPDATE'})"

# Fetch users dari server via WebClient (handle self-signed SSL + port 8443)
Write-Host "Fetch users dari server..." -ForegroundColor Gray
$wc = New-Object System.Net.WebClient
$wc.Headers.Add("Accept", "application/json")
$getUrl    = [System.Uri]("${API_BASE}?action=get_users")
$resp      = $wc.DownloadString($getUrl)
$usersData = $resp | ConvertFrom-Json
$allUsers  = $usersData.users
Write-Host "Total users: $($allUsers.Count)"

$siswa = $allUsers | Where-Object { $_.role -eq 'siswa' -and $_.pklLocation }

if (-not $ForceAll) {
    $siswa = $siswa | Where-Object {
        $lat      = [double]($_.latitude_pkl)
        $lng      = [double]($_.longitude_pkl)
        $isZero   = ($lat -eq 0 -or $lng -eq 0)
        $isSMKN9  = ([Math]::Abs($lat - $SMKN9_LAT) -lt 0.001 -and [Math]::Abs($lng - $SMKN9_LNG) -lt 0.001)
        $isCtr    = ([Math]::Abs($lat - $CENTER_LAT) -lt 0.001 -and [Math]::Abs($lng - $CENTER_LNG) -lt 0.001)
        $isZero -or $isSMKN9 -or $isCtr
    }
}

Write-Host "Siswa perlu geocode: $($siswa.Count)"

$groups = $siswa | Group-Object -Property pklLocation | Sort-Object Count -Descending
if ($Limit -lt $groups.Count) { $groups = $groups | Select-Object -First $Limit }
Write-Host "Lokasi unik: $($groups.Count)`n"

function Get-HaversineKm {
    param($lat1, $lng1, $lat2, $lng2)
    $R    = 6371
    $dLat = ($lat2 - $lat1) * [Math]::PI / 180
    $dLng = ($lng2 - $lng1) * [Math]::PI / 180
    $a    = [Math]::Sin($dLat/2)*[Math]::Sin($dLat/2) + [Math]::Cos($lat1*[Math]::PI/180)*[Math]::Cos($lat2*[Math]::PI/180)*[Math]::Sin($dLng/2)*[Math]::Sin($dLng/2)
    return $R * 2 * [Math]::Atan2([Math]::Sqrt($a), [Math]::Sqrt(1-$a))
}

function Get-NominatimCoords {
    param([string]$locName)

    $stripped = $locName -replace '\b(pt\.?|cv\.?|ud\.?|tb\.?|toko|kantor|dinas|pusat)\b','' -replace '\b(malang|kota|kabupaten|jawa timur|jatim|indonesia)\b',''
    $stripped = ($stripped -replace '\s+',' ').Trim()

    $hasMalang  = $locName -match '(?i)malang'
    $hasJakarta = $locName -match '(?i)jakarta|kemayoran|jkt'

    if ($hasJakarta) {
        $queries = @("$locName, Jakarta, Indonesia", "$locName, Indonesia")
    } elseif ($hasMalang) {
        $queries = @("$locName, Jawa Timur, Indonesia", "$locName, Indonesia")
    } else {
        $queries = [System.Collections.ArrayList]@(
            "$locName, Malang, Jawa Timur, Indonesia",
            "$locName, Jawa Timur, Indonesia",
            "$locName, Indonesia"
        )
        if ($stripped -and $stripped -ne $locName) {
            [void]$queries.Add("$stripped, Malang")
        }
    }

    $bestResult = $null
    $bestDist   = [double]::MaxValue

    foreach ($q in $queries) {
        if (-not $q.Trim()) { continue }
        Start-Sleep -Milliseconds 600

        $encoded = [Uri]::EscapeDataString($q)
        $url     = "https://nominatim.openstreetmap.org/search?q=$encoded&format=json&limit=5&addressdetails=1&countrycodes=id"
        $hdrs    = @{ 'User-Agent' = 'SIGAP-PKL-LiveGeocode/2.0'; 'Accept-Language' = 'id' }

        try {
            $resp    = Invoke-WebRequest $url -UseBasicParsing -Headers $hdrs -TimeoutSec 12
            $results = $resp.Content | ConvertFrom-Json

            if ($results -and $results.Count -gt 0) {
                foreach ($r in $results) {
                    $rlat = [double]$r.lat
                    $rlng = [double]$r.lon
                    $dist = Get-HaversineKm $MALANG_LAT $MALANG_LNG $rlat $rlng
                    if ($dist -lt $bestDist) {
                        $bestDist   = $dist
                        $bestResult = @{ lat=$rlat; lng=$rlng; dist=[Math]::Round($dist,1); display=$r.display_name; query=$q }
                    }
                }
                if ($bestResult -and $bestDist -le 700) { break }
            }
        } catch {
            Write-Host "   WARN query fail: $q" -ForegroundColor DarkYellow
        }
    }
    return $bestResult
}

$updated  = 0
$notFound = 0
$locIdx   = 0

foreach ($grp in $groups) {
    $locIdx++
    $locName = $grp.Name
    $members = $grp.Group
    $jml     = $members.Count
    $shortName = if ($locName.Length -gt 50) { $locName.Substring(0,50) } else { $locName }

    Write-Host "[$locIdx/$($groups.Count)] `"$shortName`" ($jml siswa)" -ForegroundColor White

    if ($locIdx -gt 1) { Start-Sleep -Milliseconds 1300 }

    $coords = Get-NominatimCoords $locName

    if ($coords) {
        $lat  = $coords.lat
        $lng  = $coords.lng
        $dist = $coords.dist
        $disp = if ($coords.display.Length -gt 70) { $coords.display.Substring(0,70) } else { $coords.display }

        Write-Host "   OK [$dist km] lat=$lat lng=$lng" -ForegroundColor Green
        Write-Host "   $disp" -ForegroundColor DarkGray

        if (-not $DryRun) {
            foreach ($u in $members) {
                $body = @{
                    id            = $u.id
                    user_id       = $u.id
                    pklLocation   = $locName
                    latitude_pkl  = $lat
                    longitude_pkl = $lng
                } | ConvertTo-Json -Compress

                try {
                    $wc2 = New-Object System.Net.WebClient
                    $wc2.Headers.Add("Content-Type", "application/json")
                    $updateUrl = [System.Uri]("${API_BASE}?action=update_pkl_location")
                    $r  = $wc2.UploadString($updateUrl, "POST", $body)
                    $rd = $r | ConvertFrom-Json
                    if (-not $rd.success) {
                        Write-Host "   WARN: $($u.name) - $($rd.message)" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "   ERR: $($u.name) - $_" -ForegroundColor Red
                }
            }
        }
        $updated += $jml
    } else {
        Write-Host "   TIDAK DITEMUKAN" -ForegroundColor Red
        $notFound += $jml
    }
    Write-Host ""
}

Write-Host "=== SELESAI ===" -ForegroundColor Cyan
Write-Host "Updated     : $updated siswa" -ForegroundColor Green
Write-Host "Tidak ditemukan: $notFound siswa"
if ($DryRun) { Write-Host "(DRY RUN - tidak ada perubahan)" -ForegroundColor Yellow }

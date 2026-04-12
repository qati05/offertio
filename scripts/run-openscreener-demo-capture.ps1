param(
  [switch]$OpenBrowser,
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")),
  [string]$OpenScreenRoot = "D:\Kai\openscreen-source"
)

$offertioUrl = "http://localhost:3000"
$tryModeUrl = "https://offertio-trymode.vercel.app/dokument/neu?demo=1"

Write-Host "[1/4] Starting Offertio local dev server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; npm run dev"

Write-Host "[2/4] Starting OpenScreen dev app..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$OpenScreenRoot'; npm run dev"

Start-Sleep -Seconds 8

Write-Host "[3/4] Demo targets"
Write-Host "Local app: $offertioUrl"
Write-Host "Try mode:  $tryModeUrl"
Write-Host "Recordings: C:\Users\resha\AppData\Roaming\openscreen\recordings"

if ($OpenBrowser) {
  Write-Host "[4/4] Opening Offertio demo target in browser..."
  Start-Process $tryModeUrl
}

Write-Host "Done. Use OpenScreen to record the Offertio flow."
Write-Host "Suggested target: Try-mode URL first, local dev as fallback."

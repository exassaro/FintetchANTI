# start_services.ps1
# Launches all 4 backend microservices using the 'exassaro' conda environment.
# Run this from the FintechAnti root directory.
# The frontend (npm run dev) runs separately in its own terminal.

$root = $PSScriptRoot
$condaEnv = "exassaro"

# Find conda.bat (works with Anaconda/Miniconda on Windows)
$condaBase = (conda info --base 2>$null).Trim()
if (-not $condaBase) {
    $condaBase = "C:\ProgramData\anaconda3"
}
$condaHook = "$condaBase\shell\condabin\conda-hook.ps1"

Write-Host "=== Auditron: Starting Backend Microservices ===" -ForegroundColor Cyan
Write-Host "Conda env : $condaEnv" -ForegroundColor DarkCyan
Write-Host "Conda base: $condaBase" -ForegroundColor DarkGray
Write-Host ""

# Helper: build the command string for each service window
function Start-Service($name, $port, $folder, $color) {
    $cmd = @"
[console]::title = '$name ($folder) - Port $port'
try { & '$condaHook' } catch {}
conda activate $condaEnv
Set-Location '$root\$folder'
Write-Host '[$name] Starting on port $port ...' -ForegroundColor $color
uvicorn app.main:app --host 0.0.0.0 --port $port --reload
"@
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd
    Write-Host "  [$name] -> http://localhost:$port" -ForegroundColor $color
    Start-Sleep -Seconds 1
}

Start-Service "Classification" 8001 "classification_service" "Green"
Start-Service "Anomaly"        8002 "anomaly_service"        "Yellow"
Start-Service "Analytics"      8003 "analytics_service"      "Blue"
Start-Service "Auth"           8004 "auth_service"           "Magenta"

Write-Host ""
Write-Host "All 4 services launched." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Classification : http://localhost:8001/docs" -ForegroundColor Green
Write-Host "  Anomaly        : http://localhost:8002/docs" -ForegroundColor Yellow
Write-Host "  Analytics      : http://localhost:8003/docs" -ForegroundColor Blue
Write-Host "  Auth           : http://localhost:8004/docs" -ForegroundColor Magenta
Write-Host "  Frontend (run separately): cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Make sure PostgreSQL is running with database: gst_db" -ForegroundColor DarkYellow


# ====================================================================
# Script: run_all_tests.ps1
# Purpose: Runs pytest and ruff for all Python microservices locally, 
#          and runs eslint for frontend.
# ====================================================================

$ErrorActionPreference = "Stop"

$services = @(
    "analytics_service",
    "anomaly_service",
    "auth_service",
    "classification_service",
    "retraining_service"
)

$HasErrors = $false

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Starting Local CI / Test Suite Runner   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

foreach ($service in $services) {
    if (Test-Path "$service") {
        Write-Host "`n>> Processing Microservice: $service..." -ForegroundColor Yellow
        Push-Location $service
        
        # 1. Formatting & Linting
        Write-Host " [1] Linting with ruff..." -ForegroundColor DarkGray
        try {
            ruff check .
            Write-Host "     [+] Ruff Linting Passed" -ForegroundColor Green
        }
        catch {
            Write-Host "     [-] Ruff Linting Failed" -ForegroundColor Red
            $HasErrors = $true
        }

        # 2. Testing
        Write-Host " [2] Running tests with pytest..." -ForegroundColor DarkGray
        $env:PYTHONPATH = "."
        try {
            # Let it run; if there are zero tests collected, pytest exits with code 5. 
            # We don't want to show 'failed' if it's just exit code 5.
            $process = Start-Process -FilePath "pytest" -Wait -NoNewWindow -PassThru
            if ($process.ExitCode -eq 0) {
                Write-Host "     [+] Pytest Passed" -ForegroundColor Green
            }
            elseif ($process.ExitCode -eq 5) {
                Write-Host "     [~] No tests were found for $service" -ForegroundColor DarkYellow
            }
            else {
                Write-Host "     [-] Pytest Failed (Exit Code: $($process.ExitCode))" -ForegroundColor Red
                $HasErrors = $true
            }
        }
        catch {
            Write-Host "     [-] Pytest command error" -ForegroundColor Red
            $HasErrors = $true
        }

        Pop-Location
    }
    else {
        Write-Host "`n>> directory '$service' not found!" -ForegroundColor Red
    }
}

Write-Host "`n>> Processing Frontend..." -ForegroundColor Yellow
if (Test-Path "frontend") {
    Push-Location "frontend"
    Write-Host " [1] Linting with eslint..." -ForegroundColor DarkGray
    try {
        npm run lint --if-present
        Write-Host "     [+] Frontend Linting (if any) Passed" -ForegroundColor Green
    }
    catch {
        Write-Host "     [-] Frontend Linting Failed" -ForegroundColor Red
        $HasErrors = $true
    }
    Pop-Location
}

if ($HasErrors) {
    Write-Host "`n[ FAIL ] Local tests finished with errors. Please fix them prior to pushing to CI." -ForegroundColor Red
    exit 1
}
else {
    Write-Host "`n[ PASS ] All local checks passed successfully!" -ForegroundColor Green
}

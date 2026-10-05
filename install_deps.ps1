# install_deps.ps1
# Installs ALL backend service dependencies into the exassaro conda env.
# Run once from the FintechAnti root directory (as normal user — conda has write access).
# This avoids the "Defaulting to user installation" pip fallback issue.

$env = "exassaro"

Write-Host "=== Installing all dependencies into conda env: $env ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install binary/system-level packages via conda (these need write access to conda env)
Write-Host "[1/3] Installing system packages via conda-forge..." -ForegroundColor Yellow
conda install -n $env -c conda-forge -y `
    psycopg2 `
    pydantic `
    cryptography `
    bcrypt `
    passlib `
    apscheduler `
    prophet `
    statsmodels `
    plotly `
    2>&1

Write-Host ""
Write-Host "[2/3] Installing pip packages into conda env via conda run..." -ForegroundColor Yellow

# Step 2: Use 'conda run' with --no-capture-output and a requirements file approach
# by passing the exassaro python directly (guaranteed to write to conda env)
$python = "C:\ProgramData\anaconda3\envs\$env\python.exe"

# All unique pip-only packages across all services
$packages = @(
    "fastapi==0.115.6",
    "uvicorn[standard]==0.34.0",
    "sqlalchemy==2.0.37",
    "pandas==2.2.3",
    "numpy==2.0.1",
    "scikit-learn==1.5.2",
    "mlflow==2.20.2",
    "python-dotenv==1.0.1",
    "python-multipart==0.0.20",
    "pydantic-settings>=2.1",
    "python-jose[cryptography]>=3.3.0",
    "groq==1.0.0",
    "httpx",
    "sentence-transformers==3.0.1",
    "transformers==4.43.3",
    "protobuf>=5.26.0"
)

foreach ($pkg in $packages) {
    Write-Host "  Installing: $pkg" -ForegroundColor DarkCyan
    & $python -m pip install $pkg --quiet 2>&1
}

Write-Host ""
Write-Host "[3/3] Verifying key packages..." -ForegroundColor Yellow
& $python -c "import psycopg2; print('  psycopg2:', psycopg2.__version__)"
& $python -c "import fastapi; print('  fastapi:', fastapi.__version__)"
& $python -c "import sqlalchemy; print('  sqlalchemy:', sqlalchemy.__version__)"
& $python -c "import google.protobuf; print('  protobuf:', google.protobuf.__version__)"
& $python -c "import pydantic; print('  pydantic:', pydantic.__version__)"

Write-Host ""
Write-Host "=== Done! You can now run .\start_services.ps1 ===" -ForegroundColor Green

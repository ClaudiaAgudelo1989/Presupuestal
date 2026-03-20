@echo off
setlocal

cd /d "%~dp0"

echo ==========================================
echo Instalacion y arranque - Presupuesto 2026
echo ==========================================

where py >nul 2>&1
if errorlevel 1 (
  echo [ERROR] No se encontro el launcher 'py'.
  echo Instala Python 3.10+ y habilita Add Python to PATH.
  pause
  exit /b 1
)

if not exist ".env" (
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo [INFO] Se creo .env desde .env.example. Revisa credenciales de MySQL.
  ) else (
    echo [WARN] No existe .env ni .env.example.
  )
)

if not exist ".venv\Scripts\python.exe" (
  echo [INFO] Creando entorno virtual...
  py -3 -m venv .venv
  if errorlevel 1 (
    echo [ERROR] No se pudo crear el entorno virtual.
    pause
    exit /b 1
  )
)

echo [INFO] Instalando dependencias...
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo [ERROR] Fallo la instalacion de dependencias.
  pause
  exit /b 1
)

echo [INFO] Iniciando API y abriendo navegador...
call iniciar_entorno_excel.bat

endlocal

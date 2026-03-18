@echo off
setlocal

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo No se encontro el entorno virtual en .venv
  echo Crea el entorno primero y vuelve a intentar.
  pause
  exit /b 1
)

echo Iniciando API en http://127.0.0.1:8000 ...
start "API Presupuesto" cmd /k "cd /d %~dp0 && .venv\Scripts\python.exe -m uvicorn backend_workbench_api:app --host 127.0.0.1 --port 8000"

timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8000/upload"

echo Entorno listo. Se abrio la pantalla de carga de Excel.
endlocal

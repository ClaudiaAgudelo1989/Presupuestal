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
echo.

if not exist "consolidar_apropiacion_vigente.py" (
  echo No se encontro consolidar_apropiacion_vigente.py. Se omite consolidado automatico.
  endlocal
  exit /b 0
)

set "RUN_CONSOLIDADO="
set /p RUN_CONSOLIDADO=Quieres generar consolidado de APROPIACION VIGENTE ahora? (S/N) [S]: 
if /I "%RUN_CONSOLIDADO%"=="N" (
  endlocal
  exit /b 0
)

set "DEFAULT_XLSX="
for %%F in ("%~dp0*.xlsx") do (
  set "DEFAULT_XLSX=%%~fF"
  goto :found_xlsx
)

:found_xlsx
if defined DEFAULT_XLSX (
  echo Excel sugerido: %DEFAULT_XLSX%
)

set "EXCEL_PATH="
set /p EXCEL_PATH=Ruta del archivo EJE (.xlsx) [Enter = sugerido]: 
if "%EXCEL_PATH%"=="" set "EXCEL_PATH=%DEFAULT_XLSX%"

if "%EXCEL_PATH%"=="" (
  echo No se indico archivo Excel y no se encontro sugerido. Cancelado.
  endlocal
  exit /b 1
)

if not exist "%EXCEL_PATH%" (
  echo No existe el archivo: %EXCEL_PATH%
  endlocal
  exit /b 1
)

echo.
echo Generando consolidado...
".venv\Scripts\python.exe" "consolidar_apropiacion_vigente.py" --input "%EXCEL_PATH%" --output "consolidado_apropiacion_vigente" --format both
if errorlevel 1 (
  echo Error al generar consolidado.
  pause
  endlocal
  exit /b 1
)

echo Consolidado generado en:
echo - consolidado_apropiacion_vigente.csv
echo - consolidado_apropiacion_vigente.xlsx
endlocal

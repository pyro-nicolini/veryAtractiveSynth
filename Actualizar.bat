@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Very Atractive Synth - Actualizar main
rem Ejecutar con doble clic para traer la ultima version de main.
pushd "%~dp0"
if errorlevel 1 goto folder_error
where git.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Instala Git desde https://git-scm.com/downloads
  goto error
)
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERROR] La carpeta no es un clon Git.
  echo Debes descargar con git clone, no con Download ZIP.
  goto error
)
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Falta el remoto origin.
  goto error
)
rem No cambiar de rama ni descargar sobre trabajo sin guardar.
set "DIRTY="
for /f "delims=" %%S in ('git status --porcelain --untracked-files=normal 2^>nul') do set "DIRTY=1"
if defined DIRTY (
  echo [PROTECCION] Hay archivos modificados o nuevos.
  echo Guarda tus cambios o haz una copia antes de actualizar.
  git status --short
  goto error
)
echo.
echo =========================================
echo    ACTUALIZAR VERY ATRACTIVE SYNTH
echo =========================================
echo Consultando la ultima version de origin/main...
git fetch origin main
if errorlevel 1 goto git_error
rem Se actualiza siempre la rama estable main.
git switch main
if errorlevel 1 goto git_error
rem Nunca hacer reset, force ni sobrescribir commits propios.
git pull --ff-only origin main
if errorlevel 1 (
  echo [PROTECCION] No se puede avanzar main sin conflictos.
  echo Tus archivos y commits locales se conservaron.
  goto error
)
echo.
echo [OK] Very Atractive Synth actualizado desde main.
echo Commit actual:
git rev-parse --short HEAD
echo.
echo Si estaba abierto, reinicia el servidor desde Iniciar.bat.
echo Los audios y samples guardados en el navegador no se borran.
pause
popd
exit /b 0
:git_error
echo [ERROR] Git no pudo actualizar. Comprueba la conexion o permisos.
:error
echo.
echo La actualizacion no pudo completarse; no se forzo ningun cambio.
pause
popd
exit /b 1
:folder_error
echo [ERROR] No se pudo abrir la carpeta de Actualizar.bat.
pause
exit /b 1

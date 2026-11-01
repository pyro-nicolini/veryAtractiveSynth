@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Very Atractive Synth - Iniciar
rem El proyecto arranca desde la carpeta donde se encuentra este BAT.
pushd "%~dp0"
if errorlevel 1 goto folder_error
if not exist "server.js" (
  echo [ERROR] Falta server.js junto a Iniciar.bat.
  goto error
)
where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Instala Node.js desde https://nodejs.org/
  goto error
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] No se encuentra npm. Reinstala Node.js.
  goto error
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Necesitas Node.js version 20 o superior.
  goto error
)
echo.
echo =========================================
echo    VERY ATRACTIVE SYNTH - ESTUDIO LOCAL
echo =========================================
echo Abriendo servidor y navegador...
echo Cierra la ventana del servidor o pulsa Ctrl+C para detenerlo.
echo.
start "Very Atractive Synth - Servidor" /D "%CD%" cmd.exe /k "npm.cmd start"
if errorlevel 1 goto error
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4173/"
popd
exit /b 0
:folder_error
echo [ERROR] No se puede abrir la carpeta del proyecto.
pause
exit /b 1
:error
echo.
echo No se pudo iniciar. Revisa los mensajes anteriores.
pause
popd
exit /b 1

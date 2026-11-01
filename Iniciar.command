#!/bin/bash
# Very Atractive Synth — doble clic desde Finder (macOS).
set -u
cd "$(dirname "$0")" || { echo "[ERROR] No se pudo abrir la carpeta del estudio."; exit 1; }

# Finder/Terminal puede iniciar con un PATH reducido. Homebrew Apple Silicon/Intel.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
fi

if [ "$(uname -s)" != "Darwin" ]; then
  echo "[ERROR] Este archivo es para macOS. En Windows usa Iniciar.bat."
  read -r -p "Pulsa Enter para salir..." _
  exit 1
fi
if [ ! -f "server.js" ]; then
  echo "[ERROR] No se encontró server.js junto a Iniciar.command."
  read -r -p "Pulsa Enter para salir..." _
  exit 1
fi
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] Instala Node.js 20 o superior desde https://nodejs.org/"
  echo "Después cierra y vuelve a abrir Terminal."
  read -r -p "Pulsa Enter para salir..." _
  exit 1
fi
if ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"; then
  echo "[ERROR] Se requiere Node.js 20 o superior."
  read -r -p "Pulsa Enter para salir..." _
  exit 1
fi

echo ""
echo "==============================================="
echo "         VERY ATRACTIVE SYNTH — MAC"
echo "==============================================="
echo "Abriendo el estudio en http://127.0.0.1:4173/"
echo "Para detenerlo, vuelve a esta ventana y pulsa Ctrl+C."
echo ""

# Abre el navegador únicamente cuando el servidor ya responda.
(
  for attempt in $(seq 1 48); do
    if curl --silent --fail --max-time 1 "http://127.0.0.1:4173/" >/dev/null 2>&1; then
      open "http://127.0.0.1:4173/"
      exit 0
    fi
    sleep 0.25
  done
) &

npm start
result=$?
if [ "$result" -ne 0 ]; then
  echo ""
  echo "[ERROR] El servidor no pudo iniciarse (código $result)."
  echo "Revisa si el puerto 4173 está ocupado o si falta Node.js."
  read -r -p "Pulsa Enter para salir..." _
fi
exit "$result"

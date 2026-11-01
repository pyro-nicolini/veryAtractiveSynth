#!/bin/bash
# Very Atractive Synth — actualización segura de main desde Finder (macOS).
set -u
cd "$(dirname "$0")" || { echo "[ERROR] No se pudo abrir la carpeta del estudio."; exit 1; }
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

fail() {
  echo ""
  echo "[ERROR] No se completó la actualización. No se hizo reset ni se borraron archivos."
  read -r -p "Pulsa Enter para cerrar..." _
  exit 1
}

if [ "$(uname -s)" != "Darwin" ]; then
  echo "Este archivo es solo para Mac. En Windows usa Actualizar.bat."
  fail
fi
if ! command -v git >/dev/null 2>&1; then
  echo "No se encontró Git. Instala las herramientas de desarrollo de Apple o Git:"
  echo "https://git-scm.com/downloads/mac"
  fail
fi
if [ "$(git rev-parse --is-inside-work-tree 2>/dev/null)" != "true" ]; then
  echo "Esta carpeta no es un clon Git. Necesitas git clone, no Download ZIP."
  fail
fi
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "No existe el remoto origin para consultar las nuevas versiones."
  fail
fi

# Se protege también el trabajo que todavía no está agregado a Git.
if [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
  echo ""
  echo "[PROTECCIÓN] Hay archivos nuevos o cambios locales."
  echo "Guarda, confirma o respalda tus cambios antes de actualizar."
  git status --short
  fail
fi

echo ""
echo "==============================================="
echo "    ACTUALIZAR VERY ATRACTIVE SYNTH — MAC"
echo "==============================================="
echo "Buscando la versión más reciente de origin/main..."
git fetch origin main || fail

# Siempre instalamos la versión estable y nunca forzamos commits locales.
git switch main || fail
git pull --ff-only origin main || {
  echo "Tu rama main contiene cambios propios o ha divergido; se conservó intacta."
  fail
}

echo ""
echo "[OK] Actualizado a la última versión de main."
git rev-parse --short HEAD
echo ""
echo "Cierra el servidor si está abierto y usa Iniciar.command para arrancar."
echo "Tus proyectos y samples del navegador permanecen en ese dispositivo."
read -r -p "Pulsa Enter para cerrar..." _
exit 0

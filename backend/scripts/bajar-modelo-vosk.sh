#!/usr/bin/env bash
# Baja el modelo chico de Vosk en español a backend/models/, si no está.
# Lo usa el build de Render; en local sirve igual.
set -euo pipefail
cd "$(dirname "$0")/.."
MODELO=vosk-model-small-es-0.42
if [ -d "models/$MODELO" ]; then
  echo "Modelo $MODELO ya está."
  exit 0
fi
mkdir -p models
curl -fsSL -o "models/$MODELO.zip" "https://alphacephei.com/vosk/models/$MODELO.zip"
# python3 en vez de unzip: está en cualquier imagen de build.
python3 -m zipfile -e "models/$MODELO.zip" models/
rm "models/$MODELO.zip"
echo "Modelo $MODELO listo."

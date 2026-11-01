# 🎵 Very Atractive Synth

**Un estudio musical creativo que funciona en tu navegador.** Graba voces, crea ritmos, edita pistas y juega con efectos sin subir tus audios a internet.

## ✨ ¿Qué puedes hacer?

- 🎙️ **Grabar tu voz:** permite el micrófono, mira el nivel de entrada y graba. Si no llega audio, evita crear pistas vacías.
- 🎼 **Afinar y experimentar:** notas DO–RE–MI en vivo, autoafinación experimental, personajes vocales y correcciones por fragmentos.
- 🥁 **Crear música:** ritmos originales, varias pistas, volumen, mezcla y efectos.
- ◫ **Sample Deck:** 12 pads de vidrio para cargar sonidos, cortarlos, nombrarlos, guardarlos y tocarlos en vivo. Cada pad tiene su minionda real.
- ✂️ **Editar libremente:** mover, recortar, repetir, duplicar y cambiar la velocidad de clips; zoom en la línea de tiempo.
- 🪐 **Flow Studio:** conecta/desconecta pistas y arrastra efectos.
- 💾 **Exportar:** WAV, pistas separadas y proyectos editables `.vasproject`.

## 🚀 Instalar y ejecutar

Necesitas **Node.js 20 o superior** (recomendamos Node 22), Git y un navegador moderno. No necesitas base de datos ni claves.

### 🪟 Windows — PowerShell

```powershell
git clone https://github.com/pyro-nicolini/veryAtractiveSynth.git
cd veryAtractiveSynth
npm start
```

### 🍎 macOS — Terminal

```bash
git clone https://github.com/pyro-nicolini/veryAtractiveSynth.git
cd veryAtractiveSynth
npm start
```

Abre **http://127.0.0.1:4173/**. Para detener el servidor, pulsa **Ctrl + C**.

### 🔄 Actualizar una instalación existente

```bash
git switch main
git pull --ff-only origin main
npm test
npm start
```

Si trabajabas en `DesignPhase`, cambia a `main` para recibir la versión integrada. Si tienes cambios locales sin guardar, consérvalos antes de actualizar.

## 🎤 Primeros pasos

1. Presiona **Grabar mi voz** → **PERMITIR MICRÓFONO** y acepta el permiso del navegador.
2. Habla y comprueba que la onda y el medidor se muevan. Después pulsa **GRABAR**.
3. Para usar el sampler, abre **SAMPLES**, pulsa ✎ en un pad, carga audio o corta desde la pista seleccionada y pulsa **Guardar pad**.
4. Pulsa un pad para tocarlo; usa **Enviar a pistas** para colocarlo en la mezcla.
5. Ajusta la canción y elige **EXPORTAR**.

## 🔒 Privacidad y límites

Todos los sonidos, proyectos y samples se manejan **en tu dispositivo**. El Sample Deck se guarda en el almacenamiento local de **este navegador y dirección web**; por ahora los pads no están dentro del respaldo `.vasproject`. Exporta tus originales si cambias de equipo. El navegador debe conceder permisos para el micrófono; en internet necesitas HTTPS.

El detector de notas y el autotune son **experimentales y monofónicos**; no sustituyen afinación de estudio. Las pruebas automatizadas no garantizan funcionamiento con todos los micrófonos y teléfonos.

## 🛠️ Desarrollo y despliegue

`npm test` comprueba funciones básicas y `npm run build:pages` prepara el sitio estático. Consulta [DESPLIEGUE](docs/DESPLIEGUE.md) para GitHub Pages.

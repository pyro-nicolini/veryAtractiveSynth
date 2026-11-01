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

## ❤️ Red Velvet · edición en rama de revisión

- **WAV por pista:** botón «↓ WAV» en cada canal. Descarga la pista con o sin sus efectos, o crea una nueva pista renderizada dentro del proyecto sin borrar la fuente. Se preservan los cortes y la posición temporal.
- **WAV por pad:** el editor de Sample Deck permite guardar localmente el color elegido y exportar WAV original o procesado. La biblioteca conserva sus 12 pads en IndexedDB, como antes.
- **Rutas reales de audio:** Flow Studio representa tres buses existentes (VOCES, MÚSICA y EFECTOS); cada pista se conecta al bus elegido y cada bus al master. Usa «A BUS» para cambiar el destino y «AUTOORDENAR» para restaurar líneas organizadas. Por seguridad no se simula conexión arbitraria pista → pista sin DSP real.
- **Voice Playground:** más personajes creativos y variaciones femeninas, masculinas, rap y caricatura mediante afinación, desplazamiento de tono, saturación y EQ. Son transformaciones **estilizadas**, no síntesis vocal con preservación de formantes ni imitaciones de identidades reales.
- **Interfaz Red Velvet:** tema burdeos con vidrio, relieve y acentos rosados; animación «Bienvenue» de ~2,7 s, saltable y adaptada a movimiento reducido. Los dos assets nuevos están incluidos en el empaquetado offline.

Estas mejoras no alteran el contenido guardado en tus proyectos y mantienen los originales. Para publicar, revisar el pull request y validar la prueba manual de sonido/exportación en Chrome/Edge con una sesión de prueba.

## 🚀 Instalar y ejecutar

Necesitas **Node.js 20 o superior**, **Git** y un navegador moderno. No necesitas base de datos ni instalar paquetes adicionales.

### 🪟 Windows — dos archivos, doble clic

Instala [Git](https://git-scm.com/downloads) y [Node.js](https://nodejs.org/) una sola vez. Descarga el proyecto con Git (no con *Download ZIP*):

```powershell
git clone https://github.com/pyro-nicolini/veryAtractiveSynth.git
```

Dentro de la carpeta **veryAtractiveSynth**, junto a este README:

- ▶️ **[Iniciar.bat](Iniciar.bat):** abre el servidor local y el estudio en tu navegador. No requiere abrir PowerShell.
- 🔄 **[Actualizar.bat](Actualizar.bat):** al hacer doble clic descarga y aplica la **última versión de `main`**, siempre que pueda hacerlo sin perder cambios. Luego vuelve a abrir `Iniciar.bat`.

**Para usuarios que ya tienen el proyecto:** después de cada actualización publicada en `main`, cierra el servidor, ejecuta **Actualizar.bat** y luego **Iniciar.bat**. Las actualizaciones se comprueban **cuando ejecutas el BAT**, no automáticamente en segundo plano. Si hay modificaciones locales, el actualizador se detiene y no borra archivos.

El estudio abre en **http://127.0.0.1:4173/**. Para detenerlo, cierra la ventana del servidor o pulsa **Ctrl + C**.

### 🍎 macOS — dos archivos, doble clic

Instala [Node.js 20+](https://nodejs.org/) y Git (puedes usar las herramientas de desarrollo de Apple). Clona el repositorio **una sola vez** desde Terminal:

```bash
git clone https://github.com/pyro-nicolini/veryAtractiveSynth.git
```

Después abre la carpeta `veryAtractiveSynth` desde Finder:

- ▶️ **[Iniciar.command](Iniciar.command):** inicia el servidor de audio local y abre la app automáticamente en tu navegador.
- 🔄 **[Actualizar.command](Actualizar.command):** busca la última versión publicada en **`main`** y la descarga sin borrar cambios locales. Cierra el servidor antes de actualizar y vuelve a ejecutar `Iniciar.command`.

**Ambos archivos están marcados como ejecutables en Git.** Si macOS impide abrirlos, ejecuta una vez desde Terminal, dentro de la carpeta:

```bash
chmod +x Iniciar.command Actualizar.command
```

Si macOS solicita una autorización de seguridad para el archivo, revísala desde Finder (clic derecho → **Abrir**) o **Configuración del Sistema → Privacidad y seguridad**. No necesitas desactivar Gatekeeper.

Para detener el servidor, pulsa **Ctrl + C** en la ventana de Terminal que abrió el lanzador.

**Importante:** las actualizaciones se revisan *cuando haces doble clic* en `Actualizar.command`, no automáticamente en segundo plano. Los `.bat` siguen siendo exclusivos de Windows. Si antes usabas `DesignPhase`, el actualizador cambia a `main` solamente si no hay trabajo local sin guardar.

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

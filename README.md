# 🎵 Very Atractive Synth

**Un estudio musical creativo que funciona en tu navegador.** Graba voces, crea ritmos, edita pistas y juega con efectos sin subir tus audios a internet.

**Abrir la aplicación:** [veryAtractiveSynth en GitHub Pages](https://pyro-nicolini.github.io/veryAtractiveSynth/).

## ✨ ¿Qué puedes hacer?

- 🎙️ **Grabar tu voz:** permite el micrófono, mira el nivel de entrada y graba. Si no llega audio, evita crear pistas vacías.
- 🎼 **Afinar y experimentar:** notas DO–RE–MI en vivo, autoafinación experimental, personajes vocales y correcciones por fragmentos.
- 🥁 **Crear música:** ritmos originales, varias pistas, volumen, mezcla y efectos.
- ◫ **Sample Deck:** 12 pads de vidrio para cargar sonidos, cortarlos, nombrarlos, guardarlos y tocarlos en vivo. Cada pad tiene su minionda real.
- ✂️ **Editar libremente:** mover, recortar, repetir, duplicar y cambiar la velocidad de clips; zoom en la línea de tiempo.
- 🔗 **Signal Flow:** conecta la salida de una pista con la entrada de otra, usa buses reales y arrastra procesadores o samples al editor.
- 💾 **Exportar:** WAV, pistas separadas y proyectos editables `.vasproject`.

## 🧭 Flow V3 · canvas libre y FX flotantes

- **Pantalla completa desde FLOW:** el mapa ocupa el navegador como entorno de trabajo, no como una tarjeta dentro de la landing.
- **Navegación:** arrastra el fondo para desplazarte; usa + / −, Ctrl + rueda o **Ajustar** para ver el grafo. El zoom del mapa es independiente del timeline.
- **FX independientes:** pulsa FX en una voz o pista (o MASTER FX) para abrir una ventana flotante. Muévela por su encabezado, maximízala o ciérrala; los cables y nodos permanecen detrás.
- **Parámetros reales por pista:** ajusta afinación, retune, limpieza, brillo, calidez, saturación, eco o espacio. El DSP sigue siendo no destructivo.
- **Diseño más ligero:** una única superficie de grafo con barras compactas, mayor contraste y menos contenedores; los demás módulos mantienen su funcionalidad.
- **Sin migración a React Flow:** el editor actual está implementado con JavaScript, CSS y SVG nativos. Se entregó interacción similar sin incorporar React ni reescribir el motor de audio.

Checklist de validación para Codex: [docs/QA-FLOW-V3.md](docs/QA-FLOW-V3.md). La funcionalidad visual y auditiva requiere QA manual antes de aprobarla.

## 🎛️ Signal Flow V2 · editor modular

- **Canvas principal limpio:** VOICE SIGNAL y TRACK SIGNAL son las dos líneas de fuentes. Los buses de VOZ, MÚSICA y SAMPLES se muestran como destinos; FX RETURN solo aparece cuando se utiliza. Todos llegan a MASTER.
- **FX como subnodos:** los efectos están cerrados dentro de cada tarjeta. Abre **FX** en una voz o pista para activar/desactivar sus procesadores sin convertirlos en nodos principales ni modificar el archivo original. Los presets guardados se aplican a la pista desde la que se abrieron.
- **MASTER FX real:** EQ LOW/HIGH, DRIVE, COMP, DELAY y REVERB procesan la mezcla sumada. El mismo grafo se usa en reproducción y render WAV; BYPASS conserva los ajustes y el limitador de seguridad permanece activo. El fader MASTER actúa después de los efectos y del limitador, sin alterar su respuesta.
- **Sample Desk fullscreen:** conserva los 12 pads y añade una biblioteca local en IndexedDB, con preview, insertar y eliminar. Cada sample guardado y cada pad permite elegir destino: SAMPLE BUS, pista seleccionada o MASTER. Arrastra el asa ♫ de cualquier pista al dock SAMPLE DESK para guardar una copia; el diálogo permite elegir audio ORIGINAL o CON FX (FX de pista + Master). La pista de origen nunca se modifica.
- **Fullscreen Flow:** canvas ampliado y desplazable, nodos movibles, conectores IN/OUT, controles compactos de play/stop y volumen Master. Puedes conectar arrastrando un cable o seleccionando salida y entrada. Se bloquean los ciclos y las conexiones entre pistas de líneas distintas.
- **Feedback y aprendizaje:** las ondas, cables y buses responden a analizadores reales; los estados idle/playing/muted son distinguibles. El canvas vacío enseña los tres pasos básicos y Master FX tiene ayuda contextual.
- **Navegación simplificada:** abrir y guardar están agrupados en **PROYECTO**; Flow, Sample Desk, Mixer, Voice Lab y Exportar siguen accesibles. La dirección visual **Red Velvet** usa fondos vino profundos, superficies glassmorphism, controles rose-metal con volumen 3D CSS y acentos cian/magenta para distinguir señales, con contraste reforzado y menos contenedores.
- **Compatibilidad:** el bus SAMPLES tiene nivel por defecto 100 en proyectos antiguos. Master FX se guarda en opciones del proyecto y en archivos portables. La biblioteca de samples y los presets FX permanecen locales a este navegador; no se suben al archivo de proyecto ni a servidores.

Los tests automatizados de rutas, Master FX, subnodos, persistencia y sintaxis pasan en GitHub Actions. La escucha comparativa, el arrastre táctil y la comprobación visual final en Chrome/Edge siguen siendo QA manual antes de fusionar o desplegar.

Checklist de aceptación y handoff para continuar con Codex: [docs/QA-SIGNAL-FLOW-V2.md](docs/QA-SIGNAL-FLOW-V2.md).

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
3. Para usar el sampler, abre **SAMPLE DESK**, pulsa ✎ en un pad, carga audio o corta desde la pista seleccionada y pulsa **Guardar pad**. Pulsa **Guardar en biblioteca** para conservar recortes adicionales.
4. En **Signal Flow**, pulsa **AUTO CONECTAR** o conecta puertos de salida y entrada. Arrastra tus samples desde el lateral o usa **Enviar a pistas**.
5. Ajusta la canción y elige **EXPORTAR**.

## 🔒 Privacidad y límites

Todos los sonidos, proyectos y samples se manejan **en tu dispositivo**. Los respaldos `.vasproject` incluyen los 12 pads y hasta 500 samples de la biblioteca. Al abrirlos puedes elegir si reemplazar los pads y si añadir los samples a la biblioteca existente; volver a importarlos crea duplicados. El respaldo está limitado a 550 MB. El almacenamiento local pertenece a este navegador y dirección web. El navegador debe conceder permisos para el micrófono; en internet necesitas HTTPS.

El detector de notas y el autotune son **experimentales y monofónicos**; no sustituyen afinación de estudio. Las pruebas automatizadas no garantizan funcionamiento con todos los micrófonos y teléfonos.

## 🛠️ Desarrollo y despliegue

`npm test` comprueba funciones básicas y `npm run build:pages` prepara el sitio estático. Consulta [DESPLIEGUE](docs/DESPLIEGUE.md) para GitHub Pages.

# 🎵 Very Atractive Synth

**Un estudio musical creativo que funciona en tu navegador.** Graba voces, crea ritmos, edita pistas y juega con efectos sin subir tus audios a internet.

## ✨ ¿Qué puedes hacer?

- 🎙️ **Grabar tu voz:** permite el micrófono, mira el nivel de entrada y graba. Si no llega audio, evita crear pistas vacías.
- 🎼 **Afinar y experimentar:** notas DO–RE–MI en vivo, autoafinación experimental, personajes vocales y correcciones por fragmentos.
- 🥁 **Crear música:** ritmos originales, varias pistas, volumen, mezcla y efectos.
- ◫ **Sample Deck:** 12 pads de vidrio para cargar sonidos, cortarlos, nombrarlos, guardarlos y tocarlos en vivo. Cada pad tiene su minionda real.
- ✂️ **Editar libremente:** mover, recortar, repetir, duplicar y cambiar la velocidad de clips; zoom en la línea de tiempo.
- 🔗 **Signal Flow:** conecta la salida de una pista con la entrada de otra, usa buses reales y arrastra procesadores o samples al editor.
- 💾 **Exportar:** WAV, pistas separadas y proyectos editables `.vasproject`.

## 🎛️ Signal Flow 2.0 · edición en rama de revisión

- **Dos cadenas en paralelo:** VOICE SIGNAL para voces, TRACK SIGNAL para música y samples; cada línea desemboca en un bus y luego en MASTER. Pulsa **ENCADENAR** para organizar todos los canales existentes en serie o usa sus puertos circulares con clic/arrastre, así como el menú **SALIDA**.
- **Audio serial de verdad:** una conexión `Pista A → Pista B` envía la señal de A al **procesador de B**, donde se suma a su propio audio y pasa por los FX, volumen y paneo de B. Si silencias B, también se silencia lo que reciba de A. No se permiten ciclos ni conexiones entre las dos líneas de pistas.
- **Efectos como etapas visibles:** afinación, limpieza, EQ, drive, compresor, delay y reverb muestran su posición en el procesador real. Delay y reverb se encadenan con sus mezclas seco/húmedo. Puedes activar/desactivar FX, mantener sus parámetros y guardar el conjunto de ajustes con **▣ FX** para aplicarlo a otra pista. Por seguridad, el orden interno de los insertos sigue siendo fijo, no libremente reordenable.
- **Biblioteca reutilizable:** los 12 pads siguen con hotkeys; **Guardar en biblioteca** conserva nuevos recortes por separado en IndexedDB sin el límite de doce pads. Abre **MIS SAMPLES** en la barra del patchbay y arrastra un pad o recorte al canvas o a otra pista.
- **Exportación:** cada pista puede descargarse WAV seco/procesado 16/24/32-bit o convertirse en una pista nueva, sin sobrescribir la fuente. Cada pad tiene WAV original/con FX. El render de la mezcla utiliza las mismas rutas seriales del reproductor.
- **Diseño Synth Console:** grafito, relieve de equipo musical, naranja, cian y magenta; sustituye al burdeo de Red Velvet. Se conserva la entrada «Bienvenue» (salto permitido y compatibilidad con movimiento reducido).
- **Proyectos heredados:** los archivos anteriores mantienen su ruta de bus original hasta cambiarla. El respaldo `.vasproject` guarda `flowTo` de cada pista. Los presets FX y samples locales son **bibliotecas independientes del respaldo**: exporta WAV y guarda por separado tus presets si cambias de equipo.

Los presets vocales adicionales son transformaciones estilizadas, no conversión realista de formantes o identidades. Los tests JS automatizados comprueban rutas y persistencia; sigue pendiente validación auditiva y QA de puertos táctiles en Chrome/Edge antes de fusionar con `main`.

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
3. Para usar el sampler, abre **SAMPLES**, pulsa ✎ en un pad, carga audio o corta desde la pista seleccionada y pulsa **Guardar pad**. Pulsa **Guardar en biblioteca** para conservar recortes adicionales.
4. En **Signal Flow**, pulsa **ENCADENAR** o conecta puertos de salida y entrada. Arrastra tus samples desde el lateral o usa **Enviar a pistas**.
5. Ajusta la canción y elige **EXPORTAR**.

## 🔒 Privacidad y límites

Todos los sonidos, proyectos y samples se manejan **en tu dispositivo**. El Sample Deck se guarda en el almacenamiento local de **este navegador y dirección web**; por ahora los pads no están dentro del respaldo `.vasproject`. Exporta tus originales si cambias de equipo. El navegador debe conceder permisos para el micrófono; en internet necesitas HTTPS.

El detector de notas y el autotune son **experimentales y monofónicos**; no sustituyen afinación de estudio. Las pruebas automatizadas no garantizan funcionamiento con todos los micrófonos y teléfonos.

## 🛠️ Desarrollo y despliegue

`npm test` comprueba funciones básicas y `npm run build:pages` prepara el sitio estático. Consulta [DESPLIEGUE](docs/DESPLIEGUE.md) para GitHub Pages.

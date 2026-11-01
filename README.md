# VERY ATRACTIVE SYNTH 🎛️

**Un estudio de audio para crear canciones sin aprender producción musical.**

> **Estado actual: DesignPhase · MVP 0.4.** Implementación local-first con interfaz neón, grabación, capas y efectos. La corrección de tono es experimental; aún no es un autotune de calidad comercial.



## DesignPhase 0.4 — Proyectos múltiples y ajustes de voz

- **Tus proyectos:** entra a ABRIR. Puedes guardar una canción con nombre, verla en tu biblioteca local, volver a abrirla o eliminar esa copia. La sesión actual continúa teniendo autoguardado independiente; guarda un proyecto con nombre cuando quieras conservar una versión particular.
- **Almacenamiento incremental de audio:** IndexedDB v2 separa el PCM original de los parámetros. Modificar una perilla actualiza metadatos sin volver a almacenar las muestras de cada pista. La apertura de sesiones v1 mantiene compatibilidad con proyectos anteriores; se borran buffers huérfanos al eliminar proyectos.
- **Ajustar sincronía de voz:** dentro de GRABAR MI VOZ, un control de -300 a +300 ms permite compensar un desplazamiento perceptible al grabar sobre una base. La captura usa el reloj de AudioContext como referencia inicial. Este ajuste manual **no sustituye la medición automática de latencia de hardware**.
- **Escuchar original / comparar:** en cada capa puedes oír la fuente directa sin los efectos y volver a activarlos. Conserva volumen y panorámica; no modifica el original.
- **CAF PCM:** si el navegador no logra abrir un archivo CAF de Apple, el decodificador local intenta leer CAF sin compresión (LPCM mono/estéreo). **CAF comprimido (AAC/ALAC) y formatos AMR/3GP no quedan solucionados**.
- **Pruebas:** se añadieron pruebas del formato CAF y del almacenamiento incremental con un simulador de IndexedDB. Aún se necesitan pruebas E2E con navegador y micrófonos reales.

**Advertencia sobre privacidad y recuperación:** todos los archivos permanecen en este equipo. La biblioteca local está sujeta a cuotas y borrado del navegador. Para respaldar canciones valiosas usa EXPORTAR → Proyecto editable y guarda el archivo fuera del sitio.

## Compatibilidad WAV mejorada (0.3.1)

Se añadió un lector WAV PCM local: si la API de decodificación del navegador rechaza un archivo WAV, la aplicación intenta abrirlo directamente. Admite PCM 8/16/24/32-bit, float 32/64-bit y algunos WAV extensibles, mono o estéreo, según sus parámetros internos. Se comprueba el encabezado RIFF, los tamaños y la consistencia de canales antes de procesar los datos. No se utilizan servicios externos.

**No decodifica AMR, 3GP, CAF ni ciertos Opus/OGG que no admita el navegador.** La ampliación de esos códecs permanece pendiente.

## DesignPhase 0.3 — edición más directa y escucha controlada

Esta fase incorpora cambios utilizables, conservando la interfaz simple:

- **Mover clips directamente:** cada onda tiene un control ↔. Arrástralo para colocar la voz donde debe sonar, sin alterar el original. El botón ⌗ activa la alineación a pulsos; desactivado, el movimiento es libre.
- **BPM + metrónomo:** define la velocidad con el selector BPM y activa ♩ para escuchar una guía mientras la mezcla se reproduce. El metrónomo no se incluye en la exportación y **cambiar BPM no acelera ni desacelera las pistas existentes**.
- **Dividir sin destruir:** desplaza el cabezal verde al punto deseado, selecciona ⋯ en una pista y presiona ✂ DIVIDIR. Se crean dos clips editables como capas independientes que comparten la fuente original (sin copiar ni degradar audio).
- **Repetir mezcla:** ↺ en el transporte reproduce de nuevo al llegar al final. El cambio de ciclo puede contener una pequeña pausa y todavía no es un loop continuo a nivel de muestra.
- **Volumen de salida visible:** barra y advertencia ALTO para detectar señales cercanas al máximo. No sustituye medición profesional true peak ni LUFS.
- **Autoguardado local:** los cambios en pistas se guardan automáticamente en IndexedDB después de aproximadamente 4 segundos sin cambios. El estado se muestra en el transporte. El almacenamiento depende de la cuota del navegador y no reemplaza el respaldo portátil de EXPORTAR.
- **Preservar ajustes musicales:** BPM, metrónomo, alineación y repetición se incluyen también en los respaldos locales y en los proyectos .vasproject.
- **Mejoras de exportación:** la duración de render conserva un margen mayor al final para eco y reverberación; debe validarse con audios de referencia.

**Importante:** BPM y metrónomo son herramientas de edición inicial. La grabación sincronizada con cuenta regresiva, calibración de latencia, múltiples clips dentro de una misma pista, formatos telefónicos no admitidos y autotune de calidad comercial siguen pendientes.


## ACTUALIZACIÓN DesignPhase 0.2: grabar y recuperar pistas

**Selección de micrófono.** Abre GRABAR MI VOZ, elige un dispositivo en el desplegable MICRÓFONO y pulsa PROBAR ENTRADA. Concede permiso para mostrar los nombres disponibles. En móvil el navegador puede mostrar solo el micrófono predeterminado. Al conectar uno USB, vuelve a seleccionar/probar. Para grabar usa HTTPS o localhost; una IP http de la red no es un origen seguro.

**Comprobar audio antes de grabar.** Habla: la forma de onda y la barra de señal deben moverse. Verde indica señal; rosado con MUY ALTO indica que puede saturar. SIN SEÑAL pide revisar dispositivo y permisos. Usa auriculares para la opción Escucharme con efectos.

**Grabación sin códec intermedio.** Presiona GRABAR: se activa temporizador, REC y barras que se mueven mientras llega la señal. Detén para crear una capa. Las nuevas grabaciones se capturan como PCM mediante AudioWorklet, evitando el problema de capturar con MediaRecorder y luego no decodificar el mismo archivo en ciertos móviles. Límite de 5 minutos por toma.

**Importar audios del teléfono.** WAV PCM, MP3 y M4A AAC pueden abrirse si el navegador ofrece esos códecs. Formatos exportados desde mensajería como AMR, 3GP, CAF o ciertos OGG/Opus no están garantizados. Si un audio falla, se identifica qué archivo falló y cómo convertirlo localmente a WAV PCM o M4A AAC; no se envía a servidores.

**Mover el momento actual.** En la regla superior puedes tocar y arrastrar el marcador verde con mouse o dedo. Con teclado, flechas mueven 1 segundo, Mayús+flechas 5 segundos, Inicio/Fin saltan al extremo.

**Respaldos y exportación.** GUARDAR conserva la sesión de este navegador. EXPORTAR → Proyecto editable crea un respaldo portátil .vasproject (ZIP con manifiesto y WAV float originales por capa); ABRIR → ABRIR RESPALDO lo restaura. EXPORTAR → Pistas separadas crea un ZIP con un WAV procesado por cada capa. ↶ / ↷ y Ctrl+Z / Ctrl+Mayús+Z permiten deshacer o rehacer hasta 25 cambios recientes.

**Pendiente:** QA real Android/iOS y diferentes micrófonos, corrección de tono comercial, limpieza avanzada por IA/WASM, compensación automática de latencia, códecs telefónicos que no soporte el navegador y automatización por compases. Los respaldos grandes consumen memoria temporal; conserva copias externas.


## Inicio rápido

Requisitos: **Node.js 20+** y **Chrome o Edge moderno** (para el micrófono y el motor de efectos, HTTPS o localhost). No se requieren dependencias ni cuentas.

~~~bash
git clone https://github.com/pyro-nicolini/veryAtractiveSynth.git
cd veryAtractiveSynth
git switch DesignPhase
npm start
~~~

Abre **http://127.0.0.1:4173/** en el navegador. **No necesitas npm install.**

Alternativa con Python: ejecuta el servidor desde la raíz del repo.

~~~bash
python -m http.server 4173 --bind 127.0.0.1
~~~

Para pruebas automatizadas: **npm test**.

No abras el HTML directamente por doble clic: el proyecto utiliza módulos y AudioWorklet que deben servirse desde un origen válido.

## Tu primera canción: paso a paso

1. **PROBAR UN RITMO** carga una batería original de ocho compases (generada en tu equipo, sin descargar muestras).
2. **AGREGAR SONIDO** importa uno o varios MP3, WAV, M4A y otros archivos compatibles con el navegador. También puedes arrastrarlos sobre la ventana. Límite individual: 350 MB.
3. **GRABAR MI VOZ** pide permiso de micrófono. Reproduce tu base con auriculares, prueba la entrada y presiona ● GRABAR; DETENER Y AGREGAR incorpora una nueva capa. Opcionalmente puedes escucharte con afinación mientras grabas.
4. **SELECCIONA UNA CAPA** para aplicar tres ajustes esenciales: Volumen, Afinación y Limpieza.
5. **ESTILOS RÁPIDOS** cambia varios ajustes de golpe: Natural, Voz limpia, Pop brillante, Robot pop, Sueño espacial y Radio vintage.
6. **TONO / ESCALA** elige Do, Re, Mi, etc., y Mayor, Menor o Cromática. La afinación funciona mejor cuando la escala coincide con la base musical.
7. **MÁS EFECTOS** permite experimentar con velocidad de afinación, brillo, calidez, eco, espacio/reverb, distorsión y panorámica.
8. **AJUSTAR TIEMPOS** permite mover una grabación para sincronizarla, recortar su inicio/final y crear fades de entrada/salida. Son operaciones no destructivas.
9. **REPRODUCE** con ▶, pausa o detener; haz clic sobre la forma de onda para ir a otro punto. M silencia, S escucha solo esa capa; ⋯ permite renombrar, duplicar o eliminar.
10. **EXPORTAR** crea un WAV estéreo con efectos. Puedes elegir la mezcla o una sola capa, 44.1/48 kHz y PCM 16/24/32-bit float.
11. **GUARDAR / ABRIR** conserva y recupera una sesión local en IndexedDB con el audio original y los parámetros. Es una única sesión por navegador.

Los íconos **i** de cada función explican el control con palabras sencillas. Focus Mode abre herramientas adicionales en diálogos con ligero desenfoque, sin perder contexto del estudio.

## ¿Qué está implementado?

| Función | Estado | Nota |
|---|---|---|
| Audio multipista, importar, arrastrar | ✅ | Decodificación depende del navegador |
| Grabar micrófono y cantar sobre una base | ✅ | PCM en AudioWorklet, permiso explícito y medidor de entrada |
| Escucha opcional con efectos | ✅ | Recomendados auriculares cableados |
| Mezclar capas, mute, solo, duplicar | ✅ | Volumen independiente y paneo |
| Autotune por tono/escala | 🧪 Experimental | Pitch detection y pitch shifting granular en AudioWorklet |
| Limpiar grabaciones | 🟡 Básico | Puerta de ruido, EQ, filtros, compresión; no restauración IA |
| Eco, reverb, distorsión, tono y presets | ✅ | Por pista, no destructivos |
| Formas de onda, offset, recorte y fades | ✅ | Reproducción sincronizada con AudioContext |
| Exportar WAV 16/24/32 | ✅ / sujeto a navegador | Render offline con efectos; error explícito si el navegador no soporta AudioWorklet offline |
| Guardar y recuperar proyecto | ✅ | IndexedDB del navegador; sin servidor |
| PWA con cache local | ✅ / sujeto a origen | Instalación en HTTPS/localhost; cachea solo código |
| Autotune comercial, separación de ruido por IA | ❌ | Para fases siguientes |
| Undo/redo de cambios recientes | ✅ | 25 pasos en memoria |
| Metrónomo y grilla por compases | ❌ | Pendientes |

## Calidad del sonido: límites importantes

**Ningún cambio de frecuencia de muestreo o profundidad de bits reconstruye información perdida.** Exportar a 24-bit/48 kHz da un archivo útil para continuar produciendo, pero no convierte un micrófono malo o un MP3 muy comprimido en una fuente profesional. La limpieza inicial atenúa ruido en silencios y retira frecuencias indeseadas; no puede eliminar de forma fiable voces o música mezcladas con la grabación.

El algoritmo de afinación del MVP **es experimental**. Utiliza detección monofónica aproximada y síntesis granular, que pueden introducir artefactos, latencia y saltos en voces difíciles o material polifónico. Para producto comercial debe sustituirse o complementarse con un motor DSP probado (WASM, pitch tracking mejorado, validaciones auditivas).

Grabación: el audio se captura como PCM y se guarda original, sin procesamiento destructivo. El hardware puede introducir retraso; usa AJUSTAR TIEMPOS para alinear una toma con la base. El modo de monitoreo puede generar acoples si no usas auriculares. Bluetooth suele aumentar mucho la latencia.

**Los datos se quedan en tu dispositivo.** El audio nunca se envía a servidores ni se almacena en la nube. IndexedDB guarda una sesión, no un backup garantizado; si borras los datos del sitio, pierdes la sesión. Exporta los WAV importantes. La exportación se limita conservadoramente a 20 minutos por mezcla y a la memoria que permita el dispositivo.

## Teléfono y uso offline

Para el micrófono, el navegador necesita un **origen seguro**: localhost en el mismo dispositivo o HTTPS. El teléfono NO podrá abrir el micrófono desde un simple enlace HTTP a la IP local de otro computador. Puedes servir la aplicación como sitio estático HTTPS desde la rama DesignPhase, por ejemplo con GitHub Pages: Settings → Pages → Deploy from a branch → DesignPhase / (root). La URL habitual es https://pyro-nicolini.github.io/veryAtractiveSynth/ **solo después de habilitar Pages**. No se ha realizado ese despliegue.

El service worker cachea únicamente la interfaz/código. Después de la primera visita en un origen seguro, la app se puede abrir offline según políticas del navegador, pero **los permisos y la disponibilidad de almacenamiento** dependen del dispositivo.

## Arquitectura

~~~text
index.html                    interfaz semántica
src/styles.css                neón responsive, perillas, vinilos, Focus Mode
src/app.js                    UI, grabación, pistas, presets, edición
src/engine.js                 AudioContext, cadena DSP por capa, render offline
src/dsp.js                    cuantización de notas, demo, export WAV y tests
src/worklets/voice-processor.js
                              afinación/gate en el hilo de audio
src/project-store.js          biblioteca local + audio separado y reutilizado en IndexedDB
src/recording-utils.js         utilidad de captura PCM y diagnóstico de archivos
src/worklets/capture-processor.js
                              captura mono PCM en hilo de audio
src/portable-project.js        respaldo portable con pistas originales
src/zip-store.js               creador/lector local ZIP sin compresión
src/timeline.js                edición de clips, beat snapping y división
src/audio-import.js            decodificadores WAV y CAF PCM locales
server.js                     servidor sin dependencias, solo localhost
sw.js                         cache de aplicación estática, no audio
tests/dsp.test.js             test automatizados PCM y WAV
docs/PLAN.md                  roadmap, diseño y QA
~~~

Audio por capa: **AudioBuffer → AudioWorklet (pitch/gate) → filtros → EQ → saturación → compresión → eco/reverb → paneo → volumen de capa → master/limitador**. Exportación replica la cadena en OfflineAudioContext. Persistencia guarda PCM original y parámetros en IndexedDB. El servidor local no acepta uploads.

## Desarrollo y QA

1. Corre **npm test**.
2. Prueba un ritmo → play/pause/seek/stop → volumen, mute/solo.
3. Importa WAV mono y MP3 estéreo; graba 10 segundos de voz.
4. Mueve perillas durante reproducción y prueba efectos/fades/duplicación.
5. Exporta los tres WAV y reimpórtalos; verifica duración y efectos.
6. Guarda sesión, recarga y vuelve a abrirla.
7. Evalúa Safari iOS y Chrome Android usando HTTPS, auriculares y casos sin permisos.
8. Comprueba performance y latencia en dispositivos reales. Hasta completar esa auditoría, **no etiquetar como producción**.

Lee [el plan completo de fases y criterios de aceptación](docs/PLAN.md).

**main no se modifica; este trabajo permanece en DesignPhase.**

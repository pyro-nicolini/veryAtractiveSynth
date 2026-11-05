# FLOW STUDIO · Plan de diseño e implementación

## Objetivo
Crear una canción sin memorizar términos técnicos. La app debe ofrecer primero tres caminos: importar, grabar o probar un ritmo; después biblioteca, Flow Studio visual, línea de tiempo y mixer avanzado cuando se solicite. Evitar paneles de parámetros que dominen la primera vista.

## Flujo del usuario
1. Elegir una base desde una colección de ritmos originales, o importar archivo local.
2. Grabar una voz o agregar tomas. Cada pista es un planeta en el mapa.
3. Arrastrar efectos y estilos a un planeta. El mismo gesto debe tener alternativa táctil.
4. Escuchar la cadena y ajustar efectos; retirarlos sin pérdida de parámetros.
5. Desconectar o reconectar una pista sin borrar su audio ni su configuración.
6. Editar la posición de clips en la línea temporal. El cabezal se alinea con las ondas.
7. Grabar el master de una sesión o exportar WAV offline y proyecto editable.

## Arquitectura y límites de la primera entrega
- studio-library.js: 10 bases originales sintetizadas y deterministas, 10 tratamientos de voz y 5 transiciones que cambian fades reales.
- library-ui.js: tarjetas accesibles por click o arrastre.
- flow-studio.js: nodos por pista, conexiones basadas en AnalyserNode y geometría de curvas.
- studio-light.css: tema claro y soft 3D, adaptable a pantallas pequeñas.
- app.js: selección, drag/drop, manipulación de nodos, guardado de posiciones, biblioteca y corrección de regla.
- engine.js: las pistas muteadas permanecen programadas a gain 0 para poder reconectarlas durante playback.

Los cables NO representan aún patches arbitrarios entre procesadores. El flujo de audio mantiene una cadena de FX fija y buses conocidos, para no presentar rutas falsas.

## Implementado 1.1
- [x] Dirección de arte clara, tarjetas suaves y jerarquía simple.
- [x] Biblioteca local original de ritmos, estilos vocales y transiciones.
- [x] Nodos que representan pistas reales, cables con amplitud basada en medidores.
- [x] Desconexión/reconexión real sin borrar contenido.
- [x] Efectos por arrastre y tap; bypass reversible con estado persistente.
- [x] Posiciones de nodos guardadas por proyecto.
- [x] Cabezal y regla restringidos al área de forma de onda.
- [x] Corrección del foco del diálogo para navegación por teclado.
- [x] Tests de módulos, biblioteca, transiciones, grafo y smoke de interfaz.

## Prioridades pendientes

Nota de estado: esta sección conserva el plan histórico. Las versiones posteriores ya incluyen conexiones entre pistas y buses, rechazo de ciclos, pan/zoom del canvas y edición de múltiples clips. Sigue pendiente validar estas funciones en dispositivos reales; el orden de FX y las demás mejoras indicadas requieren trabajo adicional.
### P0 — Calidad y estabilidad
- [ ] QA real en Chromium/Edge, Firefox y Safari iOS/Android con micrófono, interfaces y auriculares.
- [ ] Comparar WAV offline contra playback con nuevos estilos y transiciones.
- [x] Microfundidos no destructivos en puntos interiores de loops finitos como mitigación de clics, sujetos a QA auditivo.
- [ ] Medir latencia y errores con audio real, completar crossfades verdaderos y recuperación tras interrupciones.
- [ ] Evaluar memoria, capturas largas, sincronización de pestañas y exportación local.

### P1 — Routing modular verdadero
- [ ] Esquema versionado de nodos, puertos y rutas.
- [ ] Reordenar FX, dry/wet y renders compatibles.
- [ ] Sends, buses auxiliares, niveles pre/post y detección de ciclos de feedback.
- [ ] Deshacer/rehacer cambios topológicos y transición sin cortes al conectar.
- [ ] Pan/zoom de canvas, cableado con teclado y pruebas touch.

### P1 — Live Loop y voz
- [ ] Loops indefinidos y comping. Overdub y cuantización de posición de clips ya están disponibles.
- [ ] Pitch shifting con preservación de formantes y denoising avanzado.
- [ ] Automatizar movimientos XY y exportar stems procesados aislados.

### P2 — Biblioteca
- [ ] Filtros de tempo, categorías, favoritos locales y preescucha sin crear pista.
- [ ] Packs offline opcionales con licencias claras.
- [ ] Presets propios compartibles y transiciones editables con curvas.

## Criterios de publicación
Implementar por commits pequeños en DesignPhase, tests de sintaxis/unidad, QA de navegador y sonido. No modificar main sin autorización. CI verde no equivale a DSP profesional validado.

## V1.2 — Primera corrección de edición y borrado seguro
- [x] Supr/Backspace con foco en un nodo: primero desconecta (mute real), luego lo retira del Flow, sin eliminar el audio.
- [x] Botón × en nodo con la misma lógica y ↗ en la pista para restaurar su nodo.
- [x] Supr/× en pista: solicita confirmación, borra solo esa pista y permite Ctrl+Z.
- [x] Editor visual de clips con agarres para mover y recortar inicio/final, sin alterar el PCM.
- [x] Velocidad por clip entre 0,5× y 2×; cambia duración y tono por resampling (NO time stretching con preservación de tono).
- [x] Zoom horizontal hasta 8× y unidades de segundos en regla, con scroll sincronizado.
- [x] Cabezal dibujado delante de la onda, no detrás de las tarjetas.
- [ ] QA real de manipulación táctil, zoom sincronizado, undo y reproducción con clips complejos.

## V1.3 — Edición vocal por regiones
- [x] Indicador de DO–SI, octava y desviación al cantar durante grabación.
- [x] Detección monofónica de tono local y análisis por segmentos.
- [x] Desplazamiento de tono por regiones no destructivo y exportable.
- [x] Tres modos de Auto Afinado aproximado: Natural, Estudio y Electrónico.
- [x] Ocho personajes creativos de voz con pitch/drive/EQ reales y XY.
- [x] Vibración amplificada azul del cable según RMS de pista.
- [ ] Editor visual de máscaras en la onda y un análisis automático con calidad de estudio.
- [ ] Preservación de formantes y detección de notas robusta en grabaciones ruidosas y polifónicas.
- [ ] QA E2E con micrófono físico, revisión de latencia y exportación browser por browser.

## V1.4 — Pulido de revisión y persistencia
- [x] Zoom sobre la forma de onda de la grabación 1–8×, selección visual por arrastre.
- [x] Máscaras de corrección visibles; conservar regiones exteriores al sobrescribir una máscara.
- [x] Desplazar la pista completa en el tiempo, manteniendo distancias internas entre clips.
- [x] Ctrl+X desconecta el nodo Flow seleccionado; Supr en dos fases con foco conservado.
- [x] 12 personajes de voz estilizados, incluyendo graves y agudos caricaturescos.
- [x] Guardar velocidad, máscaras, estado de nodo oculto y carácter en el proyecto portable.
- [ ] Calidad visual/sonora de estas interacciones comprobada manualmente en PC y móvil.

## 1.4.1 — Cables del Flow que vibran continuamente
- [x] Corrigió el error de runtime que trataba un único cabezal de pista como colección y detenía el bucle de reproducción.
- [x] El cable ya no depende del ticker del transporte ni de arrastrar un nodo; usa un requestAnimationFrame dedicado durante Play.
- [x] Frecuencia objetivo máxima de 60 FPS, con ondas suavizadas por RMS y resplandor azul por pista.
- [x] SVG y geometría cacheados: sin búsquedas del DOM ni lecturas de layout por cada cuadro.
- [x] Se invalidan coordenadas solamente al mover los nodos, cambiar tamaño o reconstruir el Flow.
- [x] Se pausa el ciclo al detener, ocultar el Flow, salir del viewport, minimizar la pestaña o preferir menos movimiento.
- [x] Pruebas de regresión de actualización continua, cacheo, mute/pausa y ticker desacoplado.
- [ ] QA visual/fps en Chrome y teléfonos con pistas reales (CI no mide FPS físicos).

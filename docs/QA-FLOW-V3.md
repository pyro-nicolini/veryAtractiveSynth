# Flow V3 · QA y handoff para Codex

## Objetivo
Rediseñar el **espacio de trabajo**, no los efectos de audio: Signal Flow se navega como un grafo amplio, con nodos libres y FX flotantes independientes de las tarjetas de pista.

El repositorio sigue usando **JavaScript nativo + SVG + Web Audio API**. React Flow no está instalado. No se añadió React ni una nueva dependencia al bundle; el comportamiento pan/zoom/FX se implementó sobre el grafo existente para proteger el motor y proyectos anteriores.

## Arquitectura V3
- `src/flow-viewport.js`: límites de zoom, ajuste al viewport y conversiones de coordenadas pantalla ↔ grafo.
- `src/flow-studio.js`: genera la superficie del grafo y ventanas FX en una capa flotante separada; geometría de cables en coordenadas sin escala.
- `src/app.js`: estado independiente `flowCanvasZoom`, `flowFxWindows`, `flowFxMaximized`, puntero y eventos de controles.
- `src/flow-canvas-v3.css`: tema sobrio y jerarquía visual. Solo modifica `#flowArea` para no destruir los demás módulos.
- `sw.js`: caché offline de CSS y lógica nuevas.

## QA obligatorio en Chrome/Edge
1. Pulsar **FLOW** → entra al canvas fullscreen. Escape y botón Volver cierran fullscreen.
2. Hacer zoom +/−; usar **Ajustar**; Ctrl + rueda sobre el canvas. El zoom del timeline NO debe cambiar.
3. Arrastrar el fondo del canvas y las zonas vacías exteriores para desplazarse, incluso con el grafo más pequeño que la ventana. Arrastrar pistas después de hacer zoom (50%, 100%, 150%). Comprobar que el nodo sigue al puntero sin saltos.
4. Conectar salida de voz a otra voz y salida de pista a otra pista a zoom distinto de 100%. Los cables deben encajar en ambos puertos. Los ciclos se rechazan.
5. Abrir FX de una pista → flotan por encima del grafo sin empujar ni mover otros nodos.
6. Mover la ventana FX por su cabecera; ampliarla y restaurarla; cerrarla. El canvas debe seguir visible detrás. MASTER FX usa la misma interacción. Probar que una ventana se reajusta al redimensionar el navegador.
7. Probar cada tarjeta FX: su botón ON/OFF y los sliders deben estar agrupados. Cambiar un slider reactiva ese efecto y actualiza su indicador y contador de FX sin interrumpir el gesto. Probar Tune, Retune, Clean, Brillo, Calidez, Drive, Eco y Reverb. Deben afectar la pista correcta sin modificar los buffers originales.
8. Con dos pistas, modificar FX de una. La otra no debe cambiar. Guardar y recuperar un preset.
9. Guardar proyecto, recargar la aplicación: recuperar zoom y posición flotante. Abrir proyecto anterior V2: FX y audio intactos.
10. Probar mínimo 360px de ancho, teclado y `prefers-reduced-motion`. En táctil, el fondo debe desplazarse de forma nativa sin bloquear botones, selectores ni sliders.
11. Mover un nodo hacia la derecha y hacia abajo hasta superar el tamaño inicial del canvas: el área de trabajo debe extenderse sin saltos y la posición debe persistir tras recargar.
12. Probar Sample Desk desde el canvas y cerrar, asegurando que el grafo vuelve a funcionar.

## Pruebas automáticas
```bash
npm test
node --check src/app.js
node --check src/flow-studio.js
node --check src/flow-viewport.js
```

## Limitaciones
- No es una migración a la biblioteca React Flow; el grafo es de implementación propia.
- No se certifica audio real, CSS renderizado ni drag/touch mediante pruebas unitarias Node. Se requiere QA de navegador.
- El motor mantiene el orden DSP existente; abrir o mover una ventana de FX no cambia su orden de procesamiento.
- No fusionar PR #20, #19 ni #18; no modificar `main` ni desplegar hasta que el usuario valide el diseño y los recorridos de audio.

## Para continuar con Codex
Reproducir primero fallos del checklist y registrar pasos, navegador y resultado. Priorizar errores de geometría/clicks y DSP antes de retoques estéticos. No reescribir el motor de audio ni incorporar una dependencia grande sin una especificación separada.

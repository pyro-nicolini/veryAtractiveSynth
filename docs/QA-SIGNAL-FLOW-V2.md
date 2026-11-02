# QA / handoff — Signal Flow V2

## Estado

- Rama de trabajo: `feat/signal-flow-rework-v2`
- PR: #19 — Signal Flow V2
- Rama base: `feat/red-velvet-flow-export` (PR #18)
- Ambos PR deben permanecer en Draft hasta completar este QA.
- `main` y producción no se han modificado.
- Último CI verificado: 122 tests aprobados, 0 fallidos; sintaxis JavaScript aprobada.

## Alcance entregado

- FX por pista como paneles/subnodos colapsados.
- MASTER FX real en reproducción y exportación offline.
- Buses separados para música, voces, samples y FX return.
- Samples one-shot en paralelo por defecto.
- Sample Desk fullscreen, biblioteca local IndexedDB y 12 pads.
- Destinos de inserción: SAMPLE BUS, pista seleccionada y MASTER.
- Guardado de una pista como sample ORIGINAL o CON FX.
- Canvas Flow fullscreen, cables IN/OUT, selección de puertos y control compacto de transporte.
- Red Velvet visual: vino profundo, glassmorphism y controles rose-metal.
- Persistencia local y respaldo portable de buses/rutas.

## QA manual obligatorio

### 1. Rutas de audio
- Crear dos pistas de música y conectarlas en serie.
- Crear dos voces y conectarlas en serie.
- Confirmar que las líneas no se mezclan accidentalmente.
- Enviar una pista directamente a MASTER.
- Enviar otra pista a un bus y comprobar que el bus llega a MASTER.
- Intentar crear un ciclo: debe rechazarse y el audio debe seguir funcionando.
- Ocultar y luego eliminar un nodo intermedio: las fuentes anteriores deben volver a su bus, sin quedar mudas ni desconectadas.

**Aceptación:** cada ruta visual coincide con el audio audible; no hay ciclos ni conexiones colgantes.

### 2. FX por pista
- Abrir FX de una voz y activar/desactivar Afinación, Limpieza, EQ, Drive, Compresor, Delay y Reverb.
- Confirmar que el panel solo afecta esa pista.
- Abrir dos paneles, aplicar un preset desde uno y comprobar que se aplica al nodo correcto.
- Activar BYPASS global de la pista y restaurarlo.

**Aceptación:** los toggles cambian el procesamiento real, preservan valores al desactivarse y no modifican el buffer original.

### 3. MASTER FX
- Probar LOW, HIGH, DRIVE, COMP, DELAY y REVERB por separado.
- Probar BYPASS y confirmar que no borra los valores.
- Probar el volumen Master desde el canvas.
- Reproducir una mezcla de voz + música + sample y comprobar que MASTER FX procesa la suma.

**Aceptación:** los efectos globales se escuchan después de sumar los buses; el limitador sigue activo.

### 4. Sample Desk
- Guardar una pista con ORIGINAL.
- Guardar la misma pista con CON FX.
- Confirmar que el sample guardado es una copia y la pista de origen no cambia.
- Insertar un sample guardado en SAMPLE BUS, pista seleccionada y MASTER.
- Repetir desde un pad.
- Exportar un pad como WAV original y WAV con FX, incluyendo Master FX activos.
- Cerrar y volver a abrir Sample Desk; verificar que pads y biblioteca local siguen disponibles.

**Aceptación:** las tres rutas de inserción funcionan, el sample mantiene su identidad visual incluso al entrar en una línea de voz/música y los WAV reflejan la opción elegida.

### 5. Proyectos y compatibilidad
- Abrir una sesión local antigua sin `samples` en sus buses.
- Guardar, cerrar y volver a abrir.
- Exportar un respaldo portable con un sample conectado a `bus:samples`.
- Importarlo y comprobar que se conserva la ruta y la identidad del nodo sample.
- Confirmar que Master FX, posiciones y expansión de subnodos sobreviven al guardado.

**Aceptación:** los proyectos antiguos siguen reproduciéndose y las nuevas rutas sobreviven al roundtrip portable.

### 6. Fullscreen, overlays y responsive
- Abrir Flow fullscreen y cerrarlo con Escape.
- Abrir Sample Desk desde Flow fullscreen; Escape debe cerrar primero Sample Desk y dejar Flow fullscreen activo.
- Abrir el diálogo de guardar sample desde Flow fullscreen; el modal debe quedar encima del canvas.
- Escape con un modal abierto debe cerrar primero el modal.
- Confirmar que toast/feedback queda visible.
- Cerrar Flow mientras estaba fullscreen y comprobar que la página recupera el scroll.
- Probar escritorio, tablet y móvil; verificar controles, scroll horizontal y pads.

**Aceptación:** no queda `overflow:hidden` atascado, los overlays siempre quedan encima y no hay controles inaccesibles.

### 7. PWA / offline
- Cargar la aplicación online con el nuevo service worker.
- Recargar una vez para que la nueva caché esté activa.
- Desconectar la red y comprobar el arranque de la aplicación y la carga de módulos/estilos.
- Confirmar que no se cachea audio de usuario ni datos de micrófono.

**Aceptación:** los assets de V2 cargan offline; el audio personal permanece local.

## Verificación automatizada

Desde la raíz del repositorio:

```bash
npm test
node --check src/app.js
node --check src/engine.js
node --check src/flow-studio.js
node --check src/sample-deck.js
node --check src/portable-project.js
```

GitHub Actions ya ejecutó el conjunto completo: 122/122 tests aprobados en el último commit verificado.

## Instrucciones para continuar con Codex

1. Abrir el repositorio en la rama `feat/signal-flow-rework-v2`.
2. Leer este documento y el PR #19 antes de editar.
3. Ejecutar el QA manual en Chrome/Edge y registrar los fallos reproducibles con pasos concretos.
4. Corregir solo fallos comprobados, con cambios pequeños y tests de regresión.
5. No fusionar PR #19 ni PR #18, no desplegar y no modificar `main` hasta que el usuario apruebe explícitamente.
6. Al terminar, dejar un resumen de QA con PASS/FAIL, evidencia y cualquier limitación restante.

## Fuera de alcance de este handoff

- No migrar la aplicación a un backend.
- No subir samples, audio, proyectos ni credenciales a servicios externos.
- No sustituir el motor DSP ni reescribir el editor de pistas.
- No convertir los one-shots en una cadena automática.
- No fusionar ni desplegar como parte del QA.

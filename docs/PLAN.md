# PLAN DE PRODUCTO · VERY ATRACTIVE SYNTH

## 1. Norte del producto

Un creador de canciones **sin curva de aprendizaje técnica**. El usuario abre la página, añade base, graba voz desde teléfono/PC, elige un estilo, ajusta tres controles y exporta. Toda la complejidad del audio vive detrás de una interfaz sencilla.

**Tres perfiles iniciales:** (1) principiante que quiere cantar y escuchar autotune, (2) creador para redes que necesita voces y efectos rápidos, (3) productor aficionado que mezcla capas y exporta WAV para otro estudio.

**Momento de valor:** que oiga su voz transformada con una base dentro de los primeros 2 minutos. Medir con usuarios reales, no asumir.

## 2. Experiencia UX/UI

- **Primer plano:** Agregar sonido / Grabar voz / Probar ritmo.
- **Estudio central:** cada pista muestra vinilo girando cuando reproduce, forma de onda, M (mute), S (solo), nombre y duración.
- **Inspector sin abrumar:** tres perillas claras: Volumen, Afinación, Limpieza; estilos de un clic; selección de tono/escala.
- **Focus Mode:** Más efectos, tiempos, exportación, ayuda y grabación usan diálogo de foco con blur ligero del fondo.
- **Información puntual:** el ícono i al lado de cada función explica sus beneficios, límites y uso.
- **Responsive:** sobre todo en teléfono; la interfaz no depende del hover.
- **Identidad:** negro profundo, líneas finas de neón verde/violeta/azul/rosado y números estilo laboratorio gamer.

## 3. Estado 0.1 implementado

Frontend estático sin dependencias, audio local-first, importación, grabación, monitoreo opcional, composición multicapas, AudioWorklet de pitch/gate experimental, WebAudio EQ/compresión/drive/eco/reverb/pan, presets, timeline y fades, exportación WAV offline, IndexedDB, cache de aplicación y pruebas puras de WAV/notas/duración.

El motor de afinación y los filtros iniciales NO equivalen a restauración por IA ni a una suite DSP de estudio. Los audios originales siempre se conservan.

## 4. Arquitectura

**I/O:** File API, AudioContext.decodeAudioData, getUserMedia/MediaRecorder.

**DSP:** AudioWorklet separado del hilo UI, parámetros escalables; WebAudio nodes dedicados para cada capa.

**Secuenciación:** AudioBufferSourceNode por capa, planificados por tiempo único sobre AudioContext con offsets, trims y envolventes.

**Salida:** mezcla estéreo OfflineAudioContext + WAV PCM 16/24-bit o 32-bit float, 44.1/48 kHz. Fallo explícito si el navegador no puede aplicar los efectos durante render.

**Persistencia:** IndexedDB local con buffers PCM por capa. PWA cachea interfaz y código, no muestras.

**Privacidad:** nunca subir audio, micrófono ni metadatos a un servicio; cualquier futura IA en nube requiere autorización separada.

## 5. Fases propuestas

### Fase 0 — MVP local (esta entrega)

- [x] Estudio neón responsive y panel de 3 perillas.
- [x] Importar varios audios, drag & drop y base demo original.
- [x] Grabar y escuchar micrófono con efectos si se activa.
- [x] Clonar, renombrar, mute/solo y volumen por capa.
- [x] Afinación experimental por nota/escala en AudioWorklet.
- [x] Limpiar silencios, EQ, eco, espacio, distorsión y presets.
- [x] Editar offset, trim, fade in/out sin destruir el original.
- [x] WAV offline con parámetros de exportación.
- [x] Sesión persistida local, ayuda i y README.
- [ ] QA manual en hardware y navegadores reales.
- [ ] Pruebas end-to-end de grabación, exportación y Focus Mode.

### Fase 1 — DSP de calidad profesional

- [ ] Sustituir motor de afinación por uno validado: detección robusta, corrección sin artefactos, vibrato natural y retune calibrado.
- [ ] Evaluar PSOLA, phase vocoder o motor WASM especializado, comparando CPU, latencia y licencias.
- [ ] Reducción de ruido real de mayor calidad (p. ej. RNNoise compilado a WASM) con A/B y protección de sílabas.
- [ ] Captura y calibración de latencia, nivel de entrada y clipping; medidores por pista/master.
- [ ] Suite de prueba de voices graves/agudas, falsete, consonantes, respiración, silencio, música polifónica.
- [ ] Ganancia automática opcional con límite y loudness coherente.

### Fase 2 — Producción creativa

- [ ] Metrónomo, tempo/BPM y grilla musical.
- [ ] Clips múltiples por pista, zoom de timeline y crossfade.
- [ ] Undo/redo y autosave en background no bloqueante.
- [ ] Proyecto portable (audio + parámetros) y exportación de stems.
- [ ] Packs de presets y ajuste A/B; control de panorámica estéreo avanzada.
- [ ] Pruebas visuales, QA automatizado y benchmark de exportaciones largas.

### Fase 3 — Móvil excelente

- [ ] Comparativa iOS Safari/Android Chrome: micrófonos, interrupciones, Bluetooth, permalinks HTTPS.
- [ ] Calibración simple con botón y guía de auriculares, compensación de desalineación.
- [ ] DSP WASM adaptativo por CPU; optimización de memoria/consumo.
- [ ] Instalación PWA con backups y cuota disponible.

## 6. Criterios de aceptación

| Criterio | Objetivo aspiracional |
|---|---|
| Facilidad | Primer audio reproducido o grabado en menos de 2 minutos |
| Latencia de monitoreo | Medir por dispositivo; apuntar <=30 ms con audio cableado moderno, sin prometerlo en Bluetooth/móvil |
| Estabilidad | 4 capas y micrófono sin glitches en equipo de referencia |
| UI | Controles reactivos, sin operaciones DSP en hilo principal |
| Afinación | Pruebas auditivas y medición de pitch antes de describirla como profesional |
| Calidad | WAV con efectos/fades/ganancia/pan consistente; límites sin clipping |
| Privacidad | Sin subida de muestras, ni telemetría, ni registro de voz remota |
| Recuperación | Backup portable antes de pasar a producción |
| Compatibilidad | Chrome/Edge + pruebas iOS/Android en HTTPS |
| Accesibilidad | Teclado, controles etiquetados y reduced motion |

## 7. Riesgos

1. **Latencia de hardware:** el software no elimina buffers de Bluetooth ni restricciones del SO. Mostrar expectativa clara y permitir ajuste fino.
2. **Pitch shifter experimental:** puede producir artefactos; requisito de reemplazo para una experiencia premium.
3. **Restauración imposible de prometer:** ecualización y gate no reparan pérdida de información. Nunca vender «calidad perfecta» falsa.
4. **Exportación y memoria:** OfflineAudioContext/WASM dependen del navegador y la RAM; limitar duración y mostrar errores.
5. **IndexedDB:** almacenamiento evictable y cuotas; incorporar copia externa del proyecto.
6. **Permisos móviles:** micrófono solo bajo secure context; HTTP por IP LAN no habilita grabación.

## 8. Checklist de QA para la rama antes del merge

1. Servir localhost y ejecutar npm test.
2. Demo: reproducir, pausar, reanudar, detener, buscar; verificar vinilos.
3. Importar WAV mono/estéreo, MP3, archivo no compatible y más de 350 MB.
4. Grabar 10 s con monitor apagado/encendido y confirmar que no hay acople usando auriculares.
5. Cambiar preset, tono/escala, 3 perillas principales, otros efectos.
6. Mute/solo por capa, duplicación, renombrado, eliminación.
7. Ajustar offset, trims, fades: corroborar lo escuchado y exportado.
8. Exportar tres formatos y reimportar; inspeccionar cabeceras WAV.
9. Guardar, recargar y recuperar la sesión.
10. Testear bajo HTTPS en teléfono, sin permisos, offline y con almacenamiento insuficiente.
11. Medir tiempo a primera creación, CPU y latencia; registrar issues antes de aprobar merge.

**Mantener main intacta. Publicar DesignPhase solo cuando el QA pase.**

# Criterios de QA — DesignPhase 0.3

Este documento describe pruebas que **todavía requieren un navegador y hardware reales**. Las pruebas de GitHub Actions cubren módulos y funciones puras, no prueban permisos de micrófono ni latencia de hardware.

## Escenario A: grabación

1. Abrir en HTTPS o localhost; conceder permiso y seleccionar entrada integrada y luego USB.
2. Probar entrada: el medidor responde a la voz y cambia ante niveles altos.
3. Importar una base, iniciar reproducción y grabar 10 segundos.
4. Detener: aparece capa de voz; reabrir proyecto y comparar duración y muestra.
5. Desconectar micrófono o denegar permisos y confirmar mensaje controlado.

## Escenario B: edición

1. Crear demo y grabar una voz.
2. Arrastrar el control ↔ de la voz, reproducir y verificar nueva posición.
3. Establecer BPM 120 y activar ⌗: mover capa, verificar que queda a medio segundo por pulso.
4. Arrastrar el cabezal al interior de una onda y usar ⋯ → ✂ DIVIDIR.
5. Cambiar efectos de cada mitad y confirmar independencia.
6. Deshacer y rehacer, comprobar mezcla intacta.
7. Activar ♩ y ↺: escuchar clics solo durante reproducción y vuelta al inicio.

## Escenario C: guardado y exportación

1. Editar una capa, dejar de interactuar ~4 segundos, confirmar estado guardado local.
2. Recargar; abrir última sesión y verificar BPM, capitas y ajustes.
3. Exportar WAV 16/24/32 y reimportar; escuchar reverberación al final.
4. Exportar stems ZIP y confirmar que la duración/offset de cada una coincide.
5. Exportar respaldo .vasproject, importarlo en otro navegador compatible y comparar pistas/ajustes.
6. Simular cuota llena, archivos grandes y offline y confirmar mensaje explícito.

## Dispositivos de referencia

| Entorno | Grabación | Edición | WAV | Estado |
| --- | --- | --- | --- | --- |
| Chrome escritorio + auriculares cableados | Pendiente | Pendiente | Pendiente | No validado |
| Edge escritorio + micrófono USB | Pendiente | Pendiente | Pendiente | No validado |
| Safari iPhone bajo HTTPS | Pendiente | Pendiente | Pendiente | No validado |
| Chrome Android bajo HTTPS | Pendiente | Pendiente | Pendiente | No validado |
| Bluetooth en móvil | Pendiente | Pendiente | Pendiente | Latencia esperablemente elevada |

**No marcar producción ni prometer baja latencia sin mediciones de ida y vuelta.**

# 🌐 Desplegar Very Atractive Synth en GitHub Pages

Esta aplicación usa archivos estáticos y Web Audio: no necesita backend ni Node en producción.

## Primera activación (una sola vez)

Abre https://github.com/pyro-nicolini/veryAtractiveSynth/settings/pages

En **Build and deployment → Source** elige **GitHub Actions** (no Deploy from a branch). El workflow de publicación está incluido en DesignPhase.

Si no se despliega inmediatamente al habilitar Pages, abre https://github.com/pyro-nicolini/veryAtractiveSynth/actions/workflows/publish-pages.yml y ejecuta **Run workflow → DesignPhase**.

La URL prevista tras confirmar GitHub la publicación es https://pyro-nicolini.github.io/veryAtractiveSynth/

## 🚀 Actualizaciones

Cada push a **DesignPhase** ejecuta tests, crea el paquete público y lo publica. **main no se cambia ni se publica**.

El paquete contiene solo la web, el service worker y assets declarados; no incluye server.js, pruebas, documentos ni archivos Git.

## 💻 Actualizar Windows

    cd C:\Users\thres\Desktop\veryatractivesynth\veryAtractiveSynth
    git switch DesignPhase
    git pull --ff-only origin DesignPhase
    npm test
    npm start

Abre http://127.0.0.1:4173/ . Para comprobar el paquete sin desplegarlo, usa npm run build:pages.

## 🔒 Privacidad y QA

- Los proyectos y audios permanecen en cada dispositivo, no se suben al hosting.
- HTTPS permite solicitar micrófono, sujeto a permisos del navegador.
- IndexedDB se separa por origen: los proyectos guardados en localhost no aparecen solos en github.io. Exporta un .vasproject e impórtalo en la web pública si deseas trasladarlo.
- Prueba micrófono, AudioWorklet, loops y exportación en navegadores reales; CI no valida la calidad sonora.
- El service worker trabaja bajo el subdirectorio del repositorio. Recarga tras publicar una nueva versión.

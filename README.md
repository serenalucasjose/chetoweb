# Cheto — web oficial

Landing de [cheto.tech](https://cheto.tech), publicada con GitHub Pages desde la rama `gh-pages`.

## Desarrollo

```bash
npm install
npm start        # servidor local con recarga
```

## Qué se edita dónde

- **Textos** (fecha, título del disco, descripción del remix): `src/index.html`
- **Links, videos, arte de tapa, presskit, paleta, efectos y stems**: `src/js/config.js`
  - Un link vacío (`''`) deshabilita ese elemento y muestra "Próximamente".
  - El botón Remix se habilita cuando `stemsUrl` tiene valor.
- **Archivos estáticos** (imágenes, videos, PDF, `CNAME`): `static/`, se copian tal cual al build.
- **Estilos**: `src/scss/style.scss`

## Modo 3D (easter egg)

Un clic en el símbolo de la banda (arriba a la izquierda) cambia los videos por un
gaussian splat del edificio con parallax 3D, y opcionalmente sigue la cara por webcam.

- Splat: `static/splat/cheto-full.spz`, generado con [SHARP](https://github.com/apple-aiml-research/ml-sharp)
  desde `1ST FULL.jpg` y comprimido con `@playcanvas/splat-transform`.
- Visor: [Spark](https://sparkjs.dev) (`src/js/splat-bg.js`). Cara: MediaPipe (`src/js/face-track.js`).
- Se activa/desactiva con `splatEasterEgg` y `faceTracking` en `src/js/config.js`.

## Publicar

```bash
npm run deploy
```

Compila en `dist/` y lo sube a la rama `gh-pages`. El dominio sale de `static/CNAME`;
no hace falta recrearlo a mano en GitHub después de cada deploy.

`dist/` no se versiona en `main`: se genera en cada build.

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

- Splats (`static/splat/`), generados con [SHARP](https://github.com/apple-aiml-research/ml-sharp)
  desde `1ST FULL.jpg`. SHARP crea dos capas por píxel que casi siempre coinciden: se fusionan
  los pares duplicados y se exporta a SOG con `@playcanvas/splat-transform`.
  - `cheto-full.sog`: desktop, 798 mil gaussianas (6,8 MB).
  - `cheto-mobile.sog`: pantallas táctiles, 350 mil (3,2 MB, `--decimate-adaptive`).
  - `cheto-mobile-lite.sog`: 200 mil (1,8 MB), si en mobile no alcanza bajando la resolución.
- Rendimiento: cada gaussiana se dibuja hasta 2,0 desvíos en desktop y 1,8 en mobile (Spark usa 2,83),
  la resolución interna se adapta sola a la fluidez, no se redibuja con la cámara quieta y la
  escena se congela con el modal abierto.
- Movimiento: mouse en desktop; en celulares, vaivén amplio o inclinación del teléfono; cara por webcam (opt-in).
- Pruebas: `?splat=full|mobile|lite|<archivo>`, `?dpr=`, `?fps=` (0 = sin tope) y `?std=` fuerzan versión y calidad.
- Visor: [Spark](https://sparkjs.dev) (`src/js/splat-bg.js`). Cara: MediaPipe (`src/js/face-track.js`).
- Se activa/desactiva con `splatEasterEgg` y `faceTracking` en `src/js/config.js`.

## Publicar

```bash
npm run deploy
```

Compila en `dist/` y lo sube a la rama `gh-pages`. El dominio sale de `static/CNAME`;
no hace falta recrearlo a mano en GitHub después de cada deploy.

`dist/` no se versiona en `main`: se genera en cada build.

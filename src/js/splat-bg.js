// Fondo experimental: gaussian splat generado desde la foto del edificio.
// Se carga aparte (import dinámico) recién cuando se activa el modo 3D desde el logo.
import * as THREE from 'three';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';

// Cámara de la foto original (SHARP la guarda en el .ply):
// 3333x5000 px con focal de 3333 px.
const PHOTO = { w: 3333, h: 5000, focal: 3333.23 };

export function startSplatBackground(container, opts) {
    const {
        url,
        focusDist = 25,  // distancia al edificio (unidades de la escena) hacia donde mira la cámara
        parallax = 1.2,  // cuánto se mueve la cámara con el mouse
        zoom = 1.08,     // margen para que el parallax no muestre los bordes del splat
        faceParallax = 6,  // modo cara: desplazamiento de cámara (bien exagerado)
        faceDolly = 10,    // modo cara: cuánto se acerca la cámara al acercar la cara
        faceZoom = 1.25,   // modo cara: zoom extra para tapar los bordes del splat
        onReady = () => {},
        onProgress = () => {},
        onError = () => {},
        lowPower = false,  // celulares: menos resolución, 30 fps y menos reordenamientos
        onSlow = null,     // se llama una vez si, ya cargado, va lento (para bajar de calidad)
    } = opts;

    const canvas = document.createElement('canvas');
    canvas.className = 'bg__splat';
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    // Los splats son difusos: en celulares renderizar a menos resolución casi no se nota
    renderer.setPixelRatio(lowPower ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0B0A0A);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    scene.add(new SparkRenderer({ renderer, ...(lowPower ? { minSortIntervalMs: 66 } : {}) }));

    // SHARP usa coordenadas OpenCV (y hacia abajo, z hacia adelante).
    // Girar 180° en X lo pasa a three.js: la escena queda delante de la cámara (-z).
    let splat = new SplatMesh({
        url,
        onProgress: e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); },
    });
    splat.quaternion.set(1, 0, 0, 0);
    scene.add(splat);

    // Medición de fluidez: después de cargar, mira ~2 s de frames; si la mediana
    // supera 45 ms (menos de ~22 fps) avisa una sola vez con onSlow.
    let perf = null;
    let slowCb = onSlow;
    function watchPerf() {
        if (!slowCb) return;
        perf = { start: performance.now() + 1000, deltas: [], last: null };
    }
    function trackPerf(t) {
        if (!perf || t < perf.start) return;
        if (perf.last !== null) perf.deltas.push(t - perf.last);
        perf.last = t;
        if (t - perf.start < 2000) return;
        const d = perf.deltas.sort((a, b) => a - b);
        const median = d[d.length >> 1] || 0;
        perf = null;
        if (median > 45 && slowCb) { const cb = slowCb; slowCb = null; cb(median); }
    }

    // Encuadre tipo "cover": la foto llena la pantalla sin deformarse, como object-fit: cover.
    const halfV = Math.atan(PHOTO.h / 2 / PHOTO.focal);
    const halfH = Math.atan(PHOTO.w / 2 / PHOTO.focal);
    let zoomCur = zoom;
    let aspect = 1;
    function updateFov() {
        const half = aspect > PHOTO.w / PHOTO.h
            ? Math.atan(Math.tan(halfH) / aspect)  // pantalla más ancha: manda el ancho
            : halfV;                               // pantalla más angosta: manda el alto
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) / zoomCur));
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
    }
    function resize() {
        const w = container.clientWidth, h = container.clientHeight;
        if (!w || !h) return;
        aspect = w / h;
        updateFov();
        renderer.setSize(w, h, false);
    }
    new ResizeObserver(resize).observe(container);
    resize();

    // Parallax: la cámara se desplaza con el mouse (suavizado) y sigue mirando al edificio.
    // En pantallas táctiles hace un vaivén lento.
    const target = new THREE.Vector3(0, 0, -focusDist);
    const pointer = { x: 0, y: 0 };
    const cur = { x: 0, y: 0, z: 0 };
    let head = null; // posición de la cara cuando el seguimiento por webcam está activo
    const touch = matchMedia('(hover: none)').matches;
    addEventListener('pointermove', e => {
        pointer.x = (e.clientX / innerWidth - .5) * 2;
        pointer.y = (e.clientY / innerHeight - .5) * 2;
    });

    // En celulares se dibuja como mucho a 30 fps: alcanza para un movimiento lento
    const frameMs = lowPower ? 1000 / 30 - 2 : 0;
    let lastFrame = -Infinity;
    const loop = t => {
        trackPerf(t);
        if (t - lastFrame < frameMs) return;
        lastFrame = t;
        let want;
        if (head) {
            // Efecto "ventana": la cámara sigue a la cabeza con mucha amplitud
            want = { x: head.x * faceParallax, y: head.y * faceParallax * .7, z: -head.z * faceDolly };
        } else {
            if (touch) {
                pointer.x = Math.sin(t / 4000) * .6;
                pointer.y = Math.cos(t / 5300) * .4;
            }
            want = { x: pointer.x * parallax, y: -pointer.y * parallax * .6, z: 0 };
        }
        const k = head ? .15 : .05;
        cur.x += (want.x - cur.x) * k;
        cur.y += (want.y - cur.y) * k;
        cur.z += (want.z - cur.z) * k;

        const wantZoom = head ? faceZoom : zoom;
        if (Math.abs(wantZoom - zoomCur) > .001) {
            zoomCur += (wantZoom - zoomCur) * .05;
            updateFov();
        }

        camera.position.set(cur.x, cur.y, cur.z);
        camera.lookAt(target);
        renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(loop);

    const ctl = {
        ready: false,
        // { x, y, z } desde face-track.js, o null para volver al mouse
        setHead(h) { head = h; },
        // Al salir del modo 3D se deja de renderizar (no consume GPU)
        pause() { renderer.setAnimationLoop(null); perf = null; },
        resume() { renderer.setAnimationLoop(loop); },
        // Reemplaza el splat por otro archivo (p. ej. uno más liviano) sin cortar el render
        async load(newUrl) {
            const next = new SplatMesh({ url: newUrl });
            next.quaternion.set(1, 0, 0, 0);
            await next.initialized;
            scene.add(next);
            scene.remove(splat);
            splat.dispose();
            splat = next;
        },
    };
    splat.initialized
        .then(() => { ctl.ready = true; onReady(); watchPerf(); })
        .catch(err => { console.error('Splat:', err); onError(err); });
    return ctl;
}

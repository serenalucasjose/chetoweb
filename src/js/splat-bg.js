// Fondo del modo 3D: gaussian splat generado desde la foto del edificio.
// Se carga aparte (import dinámico) recién cuando se activa el modo 3D desde el símbolo.
import * as THREE from 'three';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';

// Cámara de la foto original (SHARP la guarda en el .ply):
// 3333x5000 px con focal de 3333 px.
const PHOTO = { w: 3333, h: 5000, focal: 3333.23 };

export function startSplatBackground(container, opts) {
    const {
        url,
        focusDist = 25,      // distancia al edificio (unidades de la escena) hacia donde mira la cámara
        parallax = 1.2,      // desktop: cuánto se mueve la cámara con el mouse
        zoom = 1.08,         // desktop: margen para que el parallax no muestre los bordes del splat
        mobileParallax = 3.2, // celulares: amplitud del vaivén / inclinación (bien exagerada)
        mobileDolly = 4,     // celulares: cuánto se acerca y aleja la cámara en el vaivén
        mobileZoom = 1.22,   // celulares: zoom extra para tapar los bordes con tanto movimiento
        faceParallax = 6,    // modo cara: desplazamiento de cámara (bien exagerado)
        faceDolly = 10,      // modo cara: cuánto se acerca la cámara al acercar la cara
        faceZoom = 1.25,     // modo cara: zoom extra para tapar los bordes del splat
        onReady = () => {},
        onProgress = () => {},
        onError = () => {},
        lowPower = false,    // celulares: menos resolución, 30 fps y menos reordenamientos
        quality = {},        // ajustes finos (también se pueden forzar por URL para probar): dpr, fps, std
        onSlow = null,       // si ni bajando la resolución alcanza, se llama una vez (para usar un splat más liviano)
    } = opts;

    const canvas = document.createElement('canvas');
    canvas.className = 'bg__splat';
    container.appendChild(canvas);
    // iOS libera el contexto WebGL cuando le falta memoria: se avisa para volver a los videos
    canvas.addEventListener('webglcontextlost', e => {
        e.preventDefault();
        renderer.setAnimationLoop(null);
        onError('context-lost');
    });

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    const q = {
        dpr: lowPower ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 1.5),
        fps: lowPower ? 30 : 0,               // 0 = sin tope
        // Hasta cuántos desvíos se dibuja cada gaussiana. Spark usa 2,83 por defecto; con 2,0
        // se pinta la mitad de superficie sin diferencia visible (medido: +75% de fps en GPU).
        std: lowPower ? 1.8 : 2.0,
        ...quality,
    };
    const adaptive = quality.dpr === undefined; // con dpr forzado por URL no se adapta (para medir)
    renderer.setPixelRatio(q.dpr);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0B0A0A);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    const spark = new SparkRenderer({
        renderer,
        maxStdDev: q.std,
        ...(lowPower ? { minSortIntervalMs: 66 } : {}),
    });
    scene.add(spark);

    // SHARP usa coordenadas OpenCV (y hacia abajo, z hacia adelante).
    // Girar 180° en X lo pasa a three.js: la escena queda delante de la cámara (-z).
    let splat = new SplatMesh({
        url,
        onProgress: e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); },
    });
    splat.quaternion.set(1, 0, 0, 0);
    scene.add(splat);

    // Encuadre tipo "cover": la foto llena la pantalla sin deformarse, como object-fit: cover.
    const halfV = Math.atan(PHOTO.h / 2 / PHOTO.focal);
    const halfH = Math.atan(PHOTO.w / 2 / PHOTO.focal);
    const baseZoom = lowPower ? mobileZoom : zoom;
    let zoomCur = baseZoom;
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
        dirty = REDRAW_FRAMES;
    }
    const ro = new ResizeObserver(resize);

    /* ---------- Resolución adaptativa ---------- */

    // Si no llega a la fluidez esperada, baja la resolución interna de a un escalón
    // (los splats son difusos: casi no se nota). Si en el último escalón sigue lento,
    // avisa con onSlow (para pasar a un splat más liviano).
    const ladder = [q.dpr, ...(lowPower ? [.85, .7, .6] : [1.25, 1, .85]).filter(v => v < q.dpr - .01)];
    let level = 0;
    const slowMs = lowPower ? 40 : 28;      // mediana entre frames dibujados que se considera lenta
    let gov = null;
    let slowCb = onSlow;
    function startGovernor(delay = 1000) {
        if (!adaptive) return;
        gov = { from: performance.now() + delay, gaps: [], last: null };
    }
    function trackRender(t) {
        if (!gov || t < gov.from) return;
        if (gov.last !== null) gov.gaps.push(t - gov.last);
        gov.last = t;
        if (gov.gaps.length < 45) return;
        const g = gov.gaps.sort((a, b) => a - b);
        const median = g[g.length >> 1];
        gov = null;
        if (median <= slowMs) return;                 // va bien: deja de medir
        if (level < ladder.length - 1) {
            level++;
            renderer.setPixelRatio(ladder[level]);
            resize();
            console.info(`Modo 3D: ${Math.round(median)} ms por frame, resolución ${ladder[level]}x`);
            startGovernor(800);
        } else if (slowCb) {
            const cb = slowCb; slowCb = null;
            cb(median);
        }
    }
    function noteSkipped() { if (gov) gov.last = null; } // frames sin dibujar no cuentan

    /* ---------- Movimiento de cámara ---------- */

    // Desktop: la cámara sigue al mouse. Celulares: vaivén amplio automático, o la inclinación
    // del teléfono si hay permiso. Con la cámara web activa, sigue a la cabeza.
    const target = new THREE.Vector3(0, 0, -focusDist);
    const pointer = { x: 0, y: 0 };
    const cur = { x: 0, y: 0, z: 0 };
    let head = null;   // { x, y, z } desde face-track.js
    let tilt = null;   // { x, y } desde la inclinación del teléfono
    let frozen = false; // con el modal abierto la cámara se queda quieta (el desenfoque es caro)
    const touch = matchMedia('(hover: none)').matches;
    const onPointer = e => {
        pointer.x = (e.clientX / innerWidth - .5) * 2;
        pointer.y = (e.clientY / innerHeight - .5) * 2;
    };
    addEventListener('pointermove', onPointer);

    function wanted(t) {
        if (head) return { x: head.x * faceParallax, y: head.y * faceParallax * .7, z: -head.z * faceDolly };
        if (tilt) return { x: tilt.x * mobileParallax, y: tilt.y * mobileParallax * .8, z: Math.sin(t / 5100) * mobileDolly * .5 };
        if (touch || lowPower) {
            return {
                x: Math.sin(t / 2800) * mobileParallax,
                y: Math.cos(t / 3700) * mobileParallax * .7,
                z: Math.sin(t / 5100) * mobileDolly,
            };
        }
        return { x: pointer.x * parallax, y: -pointer.y * parallax * .6, z: 0 };
    }

    /* ---------- Loop: solo dibuja si algo cambió ---------- */

    // Con la cámara quieta no se redibuja (desktop con el mouse quieto: la GPU descansa).
    // Después de moverse se dibujan unos frames más para que Spark termine de ordenar.
    const REDRAW_FRAMES = 45;
    let dirty = REDRAW_FRAMES;
    const frameMs = q.fps ? 1000 / q.fps - 2 : 0;
    let lastFrame = -Infinity;
    let freezeT = 0;

    const loop = now => {
        // Con el modal abierto el tiempo del vaivén no avanza, así al cerrar sigue desde ahí
        const t = now - freezeT;
        if (frozen) { freezeT += now - (loop.prev ?? now); }
        loop.prev = now;

        if (!frozen) {
            const want = wanted(t);
            const k = head ? .15 : tilt ? .12 : .05;
            const dx = (want.x - cur.x) * k, dy = (want.y - cur.y) * k, dz = (want.z - cur.z) * k;
            cur.x += dx; cur.y += dy; cur.z += dz;
            // Menos de ~1/1000 de unidad por frame es menos de un décimo de píxel: cuenta como quieta
            if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 1e-3) dirty = REDRAW_FRAMES;
        }
        const wantZoom = head ? faceZoom : baseZoom;
        if (Math.abs(wantZoom - zoomCur) > .001) {
            zoomCur += (wantZoom - zoomCur) * .05;
            updateFov();
            dirty = REDRAW_FRAMES;
        }

        if (dirty <= 0 || now - lastFrame < frameMs) { if (dirty <= 0) noteSkipped(); return; }
        dirty--;
        lastFrame = now;
        trackRender(now);
        camera.position.set(cur.x, cur.y, cur.z);
        camera.lookAt(target);
        renderer.render(scene, camera);
    };

    ro.observe(container);
    resize();
    renderer.setAnimationLoop(loop);

    const ctl = {
        ready: false,
        setHead(h) { head = h; },
        setTilt(v) { tilt = v; },
        // Con el modal abierto: cámara quieta, así el fondo desenfocado no se recalcula cada frame
        freeze(on) { frozen = on; if (!on) dirty = REDRAW_FRAMES; },
        // Al salir del modo 3D se deja de renderizar (no consume GPU)
        pause() { renderer.setAnimationLoop(null); gov = null; },
        resume() { dirty = REDRAW_FRAMES; renderer.setAnimationLoop(loop); if (ctl.ready) startGovernor(); },
        // Libera todo (GPU, canvas, listeners) para poder empezar de cero
        destroy() {
            renderer.setAnimationLoop(null);
            ro.disconnect();
            removeEventListener('pointermove', onPointer);
            // Primero Spark: así descarta los ordenamientos que quedaron en curso
            try { spark.dispose(); } catch (e) { /* ya liberado */ }
            try { splat.dispose(); } catch (e) { /* ya liberado */ }
            renderer.dispose();
            canvas.remove();
        },
        // Reemplaza el splat por otro archivo (p. ej. uno más liviano) sin cortar el render
        async load(newUrl) {
            const next = new SplatMesh({ url: newUrl });
            next.quaternion.set(1, 0, 0, 0);
            await next.initialized;
            scene.add(next);
            scene.remove(splat);
            splat.dispose();
            splat = next;
            dirty = REDRAW_FRAMES;
        },
    };
    splat.initialized
        .then(() => { ctl.ready = true; dirty = REDRAW_FRAMES; onReady(); startGovernor(); })
        .catch(err => { console.error('Splat:', err); onError('load'); });
    return ctl;
}

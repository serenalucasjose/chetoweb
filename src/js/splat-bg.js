// Fondo experimental: gaussian splat generado desde la foto del edificio.
// Se carga aparte (import dinámico) solo si config.background === 'splat'.
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
        onReady = () => {},
    } = opts;

    const canvas = document.createElement('canvas');
    canvas.className = 'bg__splat';
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0B0A0A);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    scene.add(new SparkRenderer({ renderer }));

    // SHARP usa coordenadas OpenCV (y hacia abajo, z hacia adelante).
    // Girar 180° en X lo pasa a three.js: la escena queda delante de la cámara (-z).
    const splat = new SplatMesh({ url });
    splat.quaternion.set(1, 0, 0, 0);
    scene.add(splat);

    // Encuadre tipo "cover": la foto llena la pantalla sin deformarse, como object-fit: cover.
    const halfV = Math.atan(PHOTO.h / 2 / PHOTO.focal);
    const halfH = Math.atan(PHOTO.w / 2 / PHOTO.focal);
    function resize() {
        const w = container.clientWidth, h = container.clientHeight;
        if (!w || !h) return;
        const aspect = w / h;
        const photoAspect = PHOTO.w / PHOTO.h;
        const half = aspect > photoAspect
            ? Math.atan(Math.tan(halfH) / aspect)  // pantalla más ancha: manda el ancho
            : halfV;                               // pantalla más angosta: manda el alto
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) / zoom));
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }
    new ResizeObserver(resize).observe(container);
    resize();

    // Parallax: la cámara se desplaza con el mouse (suavizado) y sigue mirando al edificio.
    // En pantallas táctiles hace un vaivén lento.
    const target = new THREE.Vector3(0, 0, -focusDist);
    const pointer = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const touch = matchMedia('(hover: none)').matches;
    addEventListener('pointermove', e => {
        pointer.x = (e.clientX / innerWidth - .5) * 2;
        pointer.y = (e.clientY / innerHeight - .5) * 2;
    });

    renderer.setAnimationLoop(t => {
        if (touch) {
            pointer.x = Math.sin(t / 4000) * .6;
            pointer.y = Math.cos(t / 5300) * .4;
        }
        cur.x += (pointer.x - cur.x) * .05;
        cur.y += (pointer.y - cur.y) * .05;
        camera.position.set(cur.x * parallax, -cur.y * parallax * .6, 0);
        camera.lookAt(target);
        renderer.render(scene, camera);
    });

    splat.initialized.then(() => onReady()).catch(err => console.error('Splat:', err));
}

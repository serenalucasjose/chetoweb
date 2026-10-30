// Seguimiento de la cara por webcam (experimental, opt-in).
// Todo corre en el navegador con MediaPipe: el video de la cámara no se envía a ningún lado.
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

let detector = null;

async function getDetector() {
    if (detector) return detector;
    const fileset = await FilesetResolver.forVisionTasks('mediapipe/wasm');
    const create = delegate => FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: 'models/blaze_face_short_range.tflite', delegate },
        runningMode: 'VIDEO',
        minDetectionConfidence: .5,
    });
    // En algunos navegadores (Safari de iOS) la GPU puede fallar: se usa la CPU
    try {
        detector = await create('GPU');
    } catch (err) {
        console.warn('Detector de caras en GPU no disponible, uso CPU:', err);
        detector = await create('CPU');
    }
    return detector;
}

// Arranca la cámara y llama a onHead({ x, y, z }) en cada frame con la posición de la cabeza:
// x, y entre -1 y 1 desde el punto de vista de quien mira (derecha y arriba positivos);
// z > 0 cuando se acerca a la pantalla, < 0 cuando se aleja.
// Devuelve una función para detenerlo.
export async function startFaceTracking(onHead) {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
    });
    // Safari de iOS solo decodifica el video de la cámara si está en la página
    // y marcado como inline y mudo
    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.muted = true;
    video.srcObject = stream;
    Object.assign(video.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none', left: '0', top: '0' });
    document.body.appendChild(video);
    await video.play();

    let det;
    try {
        det = await getDetector();
    } catch (err) {
        // Sin detector no tiene sentido dejar la cámara prendida
        stream.getTracks().forEach(t => t.stop());
        video.remove();
        throw err;
    }
    let running = true;
    let refWidth = null; // tamaño de la cara al empezar: referencia para la distancia
    let lastTime = -1;

    const loop = () => {
        if (!running) return;
        if (video.readyState >= 2 && video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            const res = det.detectForVideo(video, performance.now());
            const face = res.detections[0];
            if (face) {
                const b = face.boundingBox;
                const vw = video.videoWidth, vh = video.videoHeight;
                const cx = (b.originX + b.width / 2) / vw;
                const cy = (b.originY + b.height / 2) / vh;
                const w = b.width / vw;
                if (!refWidth) refWidth = w;
                onHead({
                    // La imagen de la cámara está espejada respecto de quien mira
                    x: -(cx - .5) * 2,
                    y: -(cy - .5) * 2,
                    z: Math.log(w / refWidth),
                });
            }
        }
        requestAnimationFrame(loop);
    };
    loop();

    return () => {
        running = false;
        stream.getTracks().forEach(t => t.stop());
        video.srcObject = null;
        video.remove();
    };
}

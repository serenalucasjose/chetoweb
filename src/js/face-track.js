// Seguimiento de la cara por webcam (experimental, opt-in).
// Todo corre en el navegador con MediaPipe: el video de la cámara no se envía a ningún lado.
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

let detector = null;

async function getDetector() {
    if (detector) return detector;
    const fileset = await FilesetResolver.forVisionTasks('mediapipe/wasm');
    detector = await FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: 'models/blaze_face_short_range.tflite', delegate: 'GPU' },
        runningMode: 'VIDEO',
        minDetectionConfidence: .5,
    });
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
    const video = document.createElement('video');
    Object.assign(video, { srcObject: stream, muted: true, playsInline: true });
    await video.play();

    const det = await getDetector();
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
    };
}

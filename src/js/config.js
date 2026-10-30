// Contenido editable de la landing.
// Los valores marcados con "PLACEHOLDER" vienen del diseño y hay que reemplazarlos.

export default {
    // Look
    palette: 'violeta',      // 'violeta' | 'fuego' | 'noche' | 'ninguno'
    effects: 'medio',        // intensidad de grano/scanlines: 'suave' | 'medio' | 'fuerte'
    glitch: true,            // glitch periódico sobre el logo

    // Video de fondo
    videoLayout: 'single',   // 'single' (1 video 16:9) | 'triptych' (3 videos 9:16)
    videos: [
        'https://assets.mixkit.co/videos/4026/4026-720.mp4', // PLACEHOLDER
    ],

    // Disco
    albumArt: 'https://images.unsplash.com/photo-1770891948880-65950e82697d?w=800&h=800&fit=crop&q=70&auto=format', // PLACEHOLDER
    albumUrl: '#',           // PLACEHOLDER

    // Links
    dateUrl: '#',            // PLACEHOLDER — entradas de la próxima fecha
    presskitUrl: '#',        // PLACEHOLDER
    youtubeUrl: 'https://www.youtube.com/watch?v=ZG6v9lF_ZWk',
    spotifyUrl: 'https://spotify.link/yBlo0vKQHJb',
    instagramUrl: 'https://www.instagram.com/chetomusica',

    // Remix: pack completo + stems por tema
    stemsUrl: '#',           // PLACEHOLDER
    tracks: [                // PLACEHOLDER (títulos, BPM, tonalidad y archivos)
        { title: 'Lo que hay debajo', bpm: 122, key: '8A', vox: '#', back: '#' },
        { title: 'Superficie', bpm: 124, key: '5A', vox: '#', back: '#' },
        { title: 'Neón en la piel', bpm: 118, key: '11B', vox: '#', back: '#' },
        { title: 'Subsuelo', bpm: 126, key: '3A', vox: '#', back: '#' },
        { title: 'Marea baja', bpm: 110, key: '9A', vox: '#', back: '#' },
        { title: 'Hilo rojo', bpm: 124, key: '12A', vox: '#', back: '#' },
        { title: 'Fiebre lenta', bpm: 100, key: '6B', vox: '#', back: '#' },
        { title: 'Después del ruido', bpm: 120, key: '1A', vox: '#', back: '#' },
    ],
};

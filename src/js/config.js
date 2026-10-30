// Contenido editable de la landing.
// Un link vacío ('') deshabilita ese elemento y muestra "Próximamente" / "Pronto".

export default {
    // Look
    palette: 'violeta',      // degradé al pasar el mouse por links: 'violeta' | 'fuego' | 'noche' | 'ninguno'
    overlay: .65,            // opacidad de ese degradé (0 a 1)
    effects: 'suave',        // intensidad del ruido de TV (grano/scanlines): 'suave' | 'medio' | 'fuerte'
    glitch: true,            // glitch periódico sobre el logo

    // Video de fondo
    videoLayout: 'triptych', // 'single' (1 video 16:9) | 'triptych' (3 videos 9:16)
    videos: [                // en mobile se muestra solo el del medio
        'videos/cheto-green.mp4',
        'videos/cheto-purple.mp4',
        'videos/cheto-yellow.mp4',
    ],

    // Disco
    albumArt: 'img/lo-que-hay-debajo.webp',
    albumArtBlur: 'img/lo-que-hay-debajo-blur.webp', // versión chica ya difuminada para el fondo del hover ('' = difuminar en vivo, más pesado)
    albumUrl: '',            // link de Spotify del disco (todavía no está)

    // Links
    dateUrl: '',             // entradas de la próxima fecha (todavía no está)
    presskitUrl: 'files/Cheto-Dossier.pdf',
    youtubeUrl: 'https://www.youtube.com/watch?v=ZG6v9lF_ZWk',
    spotifyUrl: 'https://spotify.link/yBlo0vKQHJb',
    instagramUrl: 'https://www.instagram.com/chetomusica',

    // Remix: mientras stemsUrl esté vacío, el botón Remix queda deshabilitado.
    stemsUrl: '',
    tracks: [                // completar bpm, key, vox y back cuando estén los stems
        { title: 'Lo que hay debajo', vox: '', back: '' },
        { title: 'Electronacimiento', vox: '', back: '' },
        { title: 'El sistema', vox: '', back: '' },
        { title: 'Whats', vox: '', back: '' },
        { title: 'Una que me cueste', vox: '', back: '' },
        { title: 'Una pieza del rompecabezas', vox: '', back: '' },
        { title: 'Factos', vox: '', back: '' },
        { title: 'Bien chill', vox: '', back: '' },
    ],
};

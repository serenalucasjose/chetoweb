import '../scss/style.scss';
import config from './config.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const stage = $('#stage');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let hovering = false;

/* ---------- Contenido desde config ---------- */

function applyContent() {
    // Links: si el valor está vacío, el elemento queda sin link y se muestra "Próximamente"
    $$('[data-link]').forEach(a => {
        const url = config[a.dataset.link];
        if (url) a.href = url;
        else {
            a.removeAttribute('href');
            a.removeAttribute('download');
            a.setAttribute('aria-disabled', 'true');
        }
    });
    $$('[data-if-link]').forEach(el => { el.hidden = !config[el.dataset.ifLink]; });
    $$('[data-if-no-link]').forEach(el => { el.hidden = !!config[el.dataset.ifNoLink]; });

    if (!config.stemsUrl) {
        const btn = $('#remix-open');
        btn.disabled = true;
        btn.removeAttribute('data-hover');
        btn.title = 'Stems disponibles próximamente';
    }

    $$('[data-album-art]').forEach(img => { img.src = config.albumArt; });
    $$('[data-album-blur]').forEach(img => { img.src = config.albumArtBlur || config.albumArt; });

    const g = { suave: [.05, .25], medio: [.09, .5], fuerte: [.15, .85] }[config.effects] || [.09, .5];
    stage.style.setProperty('--grain', g[0]);
    stage.style.setProperty('--scan', g[1]);
    stage.style.setProperty('--overlay', config.overlay ?? 1);
}

function videoEl(src, label) {
    if (!src) {
        const ph = document.createElement('div');
        ph.className = 'placeholder';
        ph.innerHTML = `<span>${label}</span>`;
        return ph;
    }
    const v = document.createElement('video');
    v.className = 'bg__video';
    v.src = src;
    Object.assign(v, { autoplay: true, muted: true, defaultMuted: true, loop: true, playsInline: true });
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    return v;
}

function buildBackground() {
    const bg = $('#bg');
    const vids = config.videos || [];
    if (config.videoLayout === 'triptych') {
        const grid = document.createElement('div');
        grid.className = 'bg__tri';
        const drifts = [-14, 10, -6];
        for (let i = 0; i < 3; i++) {
            const panel = document.createElement('div');
            panel.className = 'bg__panel';
            const drift = document.createElement('div');
            drift.className = 'bg__drift';
            drift.style.setProperty('--drift', drifts[i]);
            drift.appendChild(videoEl(vids[i], `VIDEO VERTICAL ${i + 1} — 9:16`));
            panel.appendChild(drift);
            grid.appendChild(panel);
        }
        bg.appendChild(grid);
    } else {
        const single = document.createElement('div');
        single.className = 'bg__single';
        single.appendChild(videoEl(vids[0], 'VIDEO APAISADO 16:9 — loop, sin audio'));
        bg.appendChild(single);
    }
}

function buildTracks() {
    const list = $('#remix-list');
    list.innerHTML = '';
    (config.tracks || []).forEach((t, i) => {
        const row = document.createElement('div');
        row.className = 'track';
        row.innerHTML = `
            <span class="track__n">${String(i + 1).padStart(2, '0')}</span>
            <div class="track__info">
                <span class="track__title"></span>
                <span class="track__meta"></span>
            </div>
            <div class="track__dl">
                <a class="chip" download><span>Voces</span><span class="thin">↓</span></a>
                <a class="chip" download><span>Backing</span><span class="thin">↓</span></a>
            </div>`;
        $('.track__title', row).textContent = t.title;
        $('.track__meta', row).textContent = [t.bpm && `${t.bpm} BPM`, t.key].filter(Boolean).join(' · ');
        $$('.chip', row).forEach((a, j) => {
            const url = j === 0 ? t.vox : t.back;
            if (url) a.href = url;
            else a.setAttribute('aria-disabled', 'true');
        });
        list.appendChild(row);
    });
}

/* ---------- Video autoplay (iOS a veces lo pausa) ---------- */

function kickVideos() {
    $$('video', stage).forEach(v => {
        v.muted = true;
        if (v.paused) v.play().catch(() => {});
    });
}

/* ---------- Paletas ---------- */

// El degradé de color solo aparece mientras el mouse está sobre un link o botón;
// el resto del tiempo se ven los videos a color con el ruido encima.
function applyPalette(on) {
    const want = on ? config.palette : null;
    $$('[data-pal]', stage).forEach(el => el.classList.toggle('is-active', el.dataset.pal === want));
}

/* ---------- Hover ---------- */

function hoverOn() {
    hovering = true;
    stage.classList.add('is-hover');
    applyPalette(true);
}

function hoverOff() {
    hovering = false;
    stage.classList.remove('is-hover');
    applyPalette(false);
}

function albumOn() {
    hovering = true;
    stage.classList.add('is-album');
}

function albumOff() {
    hovering = false;
    stage.classList.remove('is-album');
}

/* ---------- Precarga del hover del disco ---------- */

// Decodifica las imágenes del fondo del disco cuando el navegador está libre,
// para que el primer hover no tenga que hacerlo en el momento (se trababa).
function warmAlbumHover() {
    const idle = window.requestIdleCallback || (cb => setTimeout(cb, 500));
    idle(() => {
        $$('.album-bg img').forEach(img => { if (img.decode) img.decode().catch(() => {}); });
        stage.classList.add('is-album-warm');
    });
}

/* ---------- Parallax ---------- */

// Se aplica como mucho una vez por frame y solo en las capas que se mueven,
// para no recalcular los estilos de toda la página en cada evento del mouse.
const parallaxEls = [$('#bg'), $('.hero')];
let pointer = null;

function onPointerMove(e) {
    if (!pointer) requestAnimationFrame(applyParallax);
    pointer = e;
}

function applyParallax() {
    const mx = (pointer.clientX / innerWidth - .5) * 2;
    const my = (pointer.clientY / innerHeight - .5) * 2;
    parallaxEls.forEach(el => {
        el.style.setProperty('--mx', mx);
        el.style.setProperty('--my', my);
    });
    pointer = null;
}

/* ---------- Grano ---------- */

// La textura de ruido se genera una sola vez. La animación (saltos de posición)
// la hace CSS sobre transform, que corre en la GPU y no depende del hilo de JS.
function makeGrain() {
    const c = document.createElement('canvas');
    const w = 220, h = 140;
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255 | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    stage.style.setProperty('--noise', `url(${c.toDataURL('image/png')})`);
}

/* ---------- Glitch del logo ---------- */

function glitch() {
    const red = $('#mark-red'), word = $('#mark-word'), fl = $('#flash');
    if (hovering) return;
    red.style.transition = 'none';
    word.style.transition = 'none';
    fl.style.transition = 'opacity .08s linear';
    const steps = 5 + (Math.random() * 4 | 0);
    let i = 0;
    const step = () => {
        if (i++ >= steps) {
            red.style.opacity = '';
            red.style.transform = '';
            word.style.transform = '';
            word.style.clipPath = '';
            fl.style.opacity = '';
            requestAnimationFrame(() => {
                red.style.transition = '';
                word.style.transition = '';
                fl.style.transition = '';
            });
            return;
        }
        const dx = (Math.random() - .5) * 26, top = Math.random() * 70, hgt = 8 + Math.random() * 30;
        red.style.opacity = 1;
        red.style.transform = `translateX(${dx}px)`;
        word.style.transform = `translateX(${-dx * .4}px)`;
        word.style.clipPath = Math.random() > .4
            ? `polygon(0 0,100% 0,100% ${top}%,0 ${top}%,0 ${top + hgt}%,100% ${top + hgt}%,100% 100%,0 100%)`
            : '';
        fl.style.opacity = Math.random() > .6 ? .35 : 0;
        setTimeout(step, 40 + Math.random() * 70);
    };
    step();
}

function scheduleGlitch(delay) {
    setTimeout(() => {
        glitch();
        scheduleGlitch(3500 + Math.random() * 4500);
    }, delay);
}

/* ---------- Modal Remix ---------- */

const remix = $('#remix');
let lastFocus = null;

function openRemix() {
    if (!config.stemsUrl) return;
    hoverOff();
    lastFocus = document.activeElement;
    remix.hidden = false;
    $('#remix-close').focus();
}

function closeRemix() {
    remix.hidden = true;
    if (lastFocus) lastFocus.focus();
}

/* ---------- Init ---------- */

function init() {
    applyContent();
    buildBackground();
    buildTracks();
    applyPalette(false);
    kickVideos();
    makeGrain();

    // Entrada del logo y del disco
    setTimeout(() => stage.classList.add('is-ready'), 250);
    setTimeout(() => stage.classList.add('is-album-shown'), 1800);
    addEventListener('load', warmAlbumHover);

    addEventListener('pointermove', onPointerMove);

    $$('[data-hover]').forEach(el => {
        el.addEventListener('mouseenter', hoverOn);
        el.addEventListener('mouseleave', hoverOff);
    });
    const albumDesk = $('#album-desk');
    albumDesk.addEventListener('mouseenter', albumOn);
    albumDesk.addEventListener('mouseleave', albumOff);

    $('#remix-open').addEventListener('click', openRemix);
    $('#remix-close').addEventListener('click', closeRemix);
    remix.addEventListener('click', e => { if (e.target === remix) closeRemix(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !remix.hidden) closeRemix(); });

    setInterval(kickVideos, 1500);

    if (config.glitch && !reduceMotion) scheduleGlitch(2600);
}

init();

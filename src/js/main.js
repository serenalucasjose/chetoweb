import '../scss/style.scss';
import config from './config.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const stage = $('#stage');
const mobileMQ = matchMedia('(max-width: 959.98px)');
const isTouch = matchMedia('(hover: none)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let hovering = false;
let cycAlt = false;

/* ---------- Contenido desde config ---------- */

function applyContent() {
    $$('[data-link]').forEach(a => { a.href = config[a.dataset.link] || '#'; });
    $$('[data-album-art]').forEach(img => { img.src = config.albumArt; });

    const g = { suave: [.05, .25], medio: [.09, .5], fuerte: [.15, .85] }[config.effects] || [.09, .5];
    stage.style.setProperty('--grain', g[0]);
    stage.style.setProperty('--scan', g[1]);
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
                <span class="track__meta">${t.bpm} BPM · ${t.key}</span>
            </div>
            <div class="track__dl">
                <a class="chip" download><span>Voces</span><span class="thin">↓</span></a>
                <a class="chip" download><span>Backing</span><span class="thin">↓</span></a>
            </div>`;
        $('.track__title', row).textContent = t.title;
        const [vox, back] = $$('.chip', row);
        vox.href = t.vox || '#';
        back.href = t.back || '#';
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

const basePal = () => config.palette || 'violeta';
const altPal = () => (basePal() === 'fuego' ? 'violeta' : 'fuego');

function applyPalette(alt) {
    const want = alt ? altPal() : basePal();
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

/* ---------- Parallax ---------- */

function onPointerMove(e) {
    stage.style.setProperty('--mx', (e.clientX / innerWidth - .5) * 2);
    stage.style.setProperty('--my', (e.clientY / innerHeight - .5) * 2);
}

/* ---------- Grano + blobs ---------- */

function startGrain() {
    const c = $('#grain');
    const w = 220, h = 140;
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const blobs = $$('[data-blob]', stage);
    let f = 0;

    const drawNoise = () => {
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            const v = Math.random() * 255 | 0;
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    };

    if (reduceMotion) { drawNoise(); return; }

    const tick = () => {
        const t = performance.now() / 1000;
        blobs.forEach(b => {
            const k = +b.dataset.blob + 1;
            b.style.transform = `translate3d(${Math.sin(t * .11 * k + k) * 12}vw, ${Math.cos(t * .08 * k + k * 2) * 10}vh, 0) scale(${1 + Math.sin(t * .2 + k) * .12})`;
        });
        if (f++ % 3 === 0) drawNoise();
        requestAnimationFrame(tick);
    };
    tick();
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
    startGrain();

    // Entrada del logo y del disco
    setTimeout(() => stage.classList.add('is-ready'), 250);
    setTimeout(() => stage.classList.add('is-album-shown'), 1800);

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

    // En touch / mobile no hay hover: la paleta alterna sola
    setInterval(() => {
        if (!(isTouch || mobileMQ.matches) || hovering) return;
        cycAlt = !cycAlt;
        applyPalette(cycAlt);
    }, 6000);

    setInterval(kickVideos, 1500);

    if (config.glitch && !reduceMotion) scheduleGlitch(2600);
}

init();

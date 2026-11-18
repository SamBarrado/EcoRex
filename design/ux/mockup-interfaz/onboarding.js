  /* =====================================================================
     ONBOARDING — flujo de entrada y primeros pasos
     Se inserta dentro del ámbito de variants.js (marcador @@ONBOARDING@@) para compartir sus utilidades.
     Flujo: entrada (auth) → [usuario] → bienvenida (onb) → primer sobre → primera carta → Inicio + primeros pasos (coach).
     Ejes: auth-N · onb-N · coach-N. «Actual» reproduce la app: registro, 3 diapositivas SIN «saltar», sobre, carta.
     ===================================================================== */
  const LIB = {}; $$('#lib img').forEach((i) => (LIB[i.dataset.k] = i.src));
  const flow = $('#flow'), coachEl = $('#coach');
  const FRACTAE = [['Alegría', 48], ['Tristeza', 215], ['Furia', 5], ['Miedo', 265], ['Confianza', 172], ['Asco', 82], ['Sorpresa', 32], ['Curiosidad', 292]];
  const draft = { name: '', av: 1, guest: false };
  let timers = [];
  const ot = (fn, ms) => { const t = setTimeout(fn, ms * S()); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const ICON = {
    mail: '<svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    user: '<svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke-linecap="round"/></svg>',
    lock: '<svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke-linecap="round"/></svg>',
  };
  const GOOGLE = '<a class="auth-google" href="#" data-google><svg viewBox="0 0 48 48" aria-hidden="true" width="20" height="20"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Continuar con Google</a><p class="auth-divider"><span>o</span></p>';
  const field = (icon, ph, type = 'text', id = '') => `<div class="auth-field">${ICON[icon]}<input ${id ? `id="${id}"` : ''} type="${type}" placeholder="${ph}" autocomplete="off" /></div>`;
  const avatarsRow = () => `<div class="mk-avatars" role="radiogroup" aria-label="Elige tu avatar">${[1, 2, 3].map((n) => `<button type="button" class="mk-av${draft.av === n ? ' on' : ''}" data-av="${n}" aria-label="Avatar ${n}" aria-checked="${draft.av === n}"><img src="${LIB['av' + n]}" alt="" /></button>`).join('')}</div>`;
  function wireAvatars(root, onPick) { $$('.mk-av', root).forEach((b) => b.addEventListener('click', () => { draft.av = +b.dataset.av; $$('.mk-av', root).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); onPick && onPick(); })); }
  function typeText(node, text, cb) {
    clearInterval(node._ti); if (S() < 0.1) { node.textContent = text; cb && cb(); return; }
    let i = 0; node.textContent = '';
    node._ti = setInterval(() => { i += 1; node.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(node._ti); cb && cb(); } }, 24 * S());
    node._full = text;
  }

  /* ---------- motor del flujo ---------- */
  function flowOpen(step, opts) { clearTimers(); onbDismissCoach(); flow.hidden = false; mk.classList.add('in-flow'); flow.dataset.step = step; flow.innerHTML = ''; R[step](opts || {}); }
  function flowClose() { clearTimers(); flow.hidden = true; flow.innerHTML = ''; mk.classList.remove('in-flow'); }
  const screen = (cls, html) => { const s = el(`<div class="mk-fscreen ${cls}">${html}</div>`); flow.appendChild(s); return s; };
  function flowFinish() { flowClose(); go('inicio'); ot(() => coachStart(), 500); }

  const R = {
    /* ===== Entrada ===== */
    auth() {
      const v = ax('auth');
      if (v === '1') return stepsAuth(1);
      if (v === '2') return landingAuth();
      if (v === '3') return carnetAuth();
      const s = screen('auth-page', `
        <div class="auth-badge-wrap"><div class="auth-badge"><img src="${LIB.logo}" alt="Ecorex" /></div></div>
        <form class="auth-card" onsubmit="return false"><h1 class="auth-title">Crear cuenta</h1>${GOOGLE}
          ${field('mail', 'Email', 'email')}${field('user', 'Nombre de usuario')}${field('lock', 'Contraseña', 'password')}
          <button type="submit" class="auth-submit">Registrarme</button>
          <p class="auth-switch">¿Ya tienes cuenta? <a href="#">Iniciar sesión</a></p>
          <p class="auth-switch">Al crear tu cuenta aceptas nuestra <a href="#">política de privacidad</a>.</p></form>`);
      $('[data-google]', s).addEventListener('click', (e) => { e.preventDefault(); flowOpen('username'); });
      $('form', s).addEventListener('submit', () => flowOpen('welcome'));
    },
    username() {
      const s = screen('auth-page', `
        <div class="auth-badge-wrap"><div class="auth-badge"><img src="${LIB.logo}" alt="Ecorex" /></div></div>
        <form class="auth-card" onsubmit="return false"><h1 class="auth-title">Elige tu nombre de usuario</h1>
          <p class="auth-switch" style="margin-top:0;margin-bottom:1rem">Tu cuenta necesita un nombre de usuario único para continuar.</p>
          ${field('user', 'Nombre de usuario')}<button type="submit" class="auth-submit">Continuar</button></form>`);
      $('form', s).addEventListener('submit', () => flowOpen('welcome'));
    },

    /* ===== Bienvenida (historia) ===== */
    welcome() {
      const v = ax('onb');
      if (v === '1') return storyA();
      if (v === '2') return guideB();
      if (v === '3') return wakeC();
      return storyActual();
    },

    /* ===== Primer sobre ===== */
    pack(o) {
      const s = screen('mk-first', `
        <p class="mk-first-hint" id="fh">${o.narr || 'Toca el sobre para abrirlo'}</p>
        <div class="mk-first-stage"><img class="mk-first-pack" src="${LIB.pack}" alt="Sobre de cartas Ecorex" /></div>
        <div class="mk-track2" id="tr2" hidden><div class="mk-track2-fill"></div><span class="mk-track2-txt">Desliza para rasgar el sobre</span><div class="mk-handle" role="slider" aria-label="Rasgar el sobre" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">↔</div></div>
        <p class="mk-sub mk-first-sub"><span class="mk-bolts">${'<i class="on"></i>'.repeat(3)}</span> Tu primer sobre es un regalo: no gasta energía</p>`);
      const pack = $('.mk-first-pack', s), tr = $('#tr2', s), h = $('.mk-handle', tr), fill = $('.mk-track2-fill', tr), hint = $('#fh', s);
      let armed = false, drag = false, p = 0;
      const arm = () => { if (armed) return; armed = true; hint.textContent = 'Desliza de izquierda a derecha para abrir'; tr.hidden = false; pack.classList.add('peek'); h.classList.add('pulse'); };
      pack.addEventListener('click', arm);
      const set = (np) => { p = Math.max(0, Math.min(1, np)); h.style.left = `calc(${p * 100}% - ${p * 52}px)`; fill.style.width = `${p * 100}%`; h.setAttribute('aria-valuenow', Math.round(p * 100)); };
      const move = (e) => { if (!drag) return; const r = tr.getBoundingClientRect(); set((e.clientX - r.left - 26 * Z) / ((r.width - 52 * Z) || 1)); if (p >= 0.92) open(); };
      h.addEventListener('pointerdown', (e) => { drag = true; h.classList.remove('pulse'); try { h.setPointerCapture(e.pointerId); } catch (_) { /* sintético */ } });
      h.addEventListener('pointermove', move);
      const up = () => { if (drag && p < 0.92) set(0); drag = false; };
      h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
      h.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { set(1); open(); } });
      let opened = false;
      function open() { if (opened) return; opened = true; drag = false; set(1); s.classList.add('opening'); hint.textContent = 'Percibiendo…'; ot(() => flowOpen('card'), 1100); }
    },

    /* ===== Primera carta ===== */
    card() {
      const s = screen('mk-reveal', `
        <div class="mk-flash"></div>
        <div class="mk-rays"></div>
        <div class="mk-newslot"><strong>¡Nueva especie registrada!</strong><span>Rex de Fuego (Furia)</span></div>
        <div class="mk-rwrap"><div class="ecodex-slot" style="--rc:#4fa9e0"><div class="ecodex-tile tile-r1">
          <div class="ecodex-tile-art"><img src="${LIB.rex}" alt="Rex de Fuego" /></div><span class="ecodex-tile-medal"><img src="${LIB.fx_furia}" alt="" /></span>
          <div class="ecodex-tile-info"><b class="ecodex-tile-name">Rex de Fuego</b><span class="ecodex-tile-rarity"><span class="ecodex-tile-pips"><i class="on"></i><i class="on"></i><i></i><i></i><i></i></span>Poco común</span></div><div class="ecodex-tile-fx"></div></div></div></div>
        <p class="mk-lore">«Donde pisa el Rex de Fuego, la tierra misma arde de una rabia que nunca se apaga.»</p>
        <button class="mk-primary" id="keep">Guardar en mi EcoDex</button>
        <p class="mk-sub">En la app: desliza la carta hacia arriba</p>`);
      for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, d = 90 + Math.random() * 150; s.appendChild(el(`<i class="mk-spark" style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;--dl:${(Math.random() * 300) | 0}ms"></i>`)); }
      $('#keep', s).addEventListener('click', () => (draft.guest ? saveSheet(s) : flowFinish()));
    },
  };
  function saveSheet(s) {
    const sh = el(`<div class="mk-save"><div class="mk-save-h"></div><h3>Guarda tu colección</h3><p>Crea tu cuenta para no perder a tu <b>Rex de Fuego</b> ni lo que consigas a partir de ahora.</p>${GOOGLE}<button class="mk-primary" id="svmail">Usar email y contraseña</button><button class="mk-ghost" id="svlater">Más tarde (se queda solo en este dispositivo)</button></div>`);
    s.appendChild(sh); draft.guest = false;
    $$('[data-google], #svmail', sh).forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); flowFinish(); }));
    $('#svlater', sh).addEventListener('click', flowFinish);
  }

  /* ---------- ENTRADA · variantes ---------- */
  function stepsAuth(n) {
    const s = screen('mk-steps' + (n === 2 ? ' fwd' : ''), n === 1 ? `
      <div class="mk-prog"><i class="on"></i><i></i></div>
      <div class="mk-spacer"></div>
      <h2 class="mk-h2">¿Cómo te llamas, explorador?</h2>
      <p class="mk-sub">Será tu nombre en Ecorex. Letras, números o _ (3 a 20).</p>
      ${field('user', 'Nombre de usuario', 'text', 'nm')}
      <p class="mk-sub" style="margin:.9rem 0 .5rem">Elige tu avatar</p>${avatarsRow()}
      <div class="mk-spacer"></div>
      <button class="mk-primary" id="nx" disabled>Siguiente</button>` : `
      <div class="mk-prog"><i class="on"></i><i class="on"></i></div>
      <button class="mk-back" aria-label="Volver">‹</button>
      <div class="mk-hello"><img src="${LIB['av' + draft.av]}" alt="" /><b>${draft.name || 'Explorador'}</b></div>
      <h2 class="mk-h2">Guarda tu aventura</h2>
      <p class="mk-sub">Así tu colección te espera en cualquier dispositivo.</p>
      ${GOOGLE}${field('mail', 'Email', 'email')}${field('lock', 'Contraseña', 'password')}
      <div class="mk-spacer"></div>
      <button class="mk-primary" id="nx">Crear mi cuenta</button>
      <p class="auth-switch">Al crear tu cuenta aceptas nuestra <a href="#">política de privacidad</a>.</p>`);
    if (n === 1) {
      const inp = $('#nm', s), nx = $('#nx', s); inp.value = draft.name;
      const ok = () => /^[A-Za-z0-9_]{3,20}$/.test(inp.value); const sync = () => { draft.name = inp.value; nx.disabled = !ok(); };
      inp.addEventListener('input', sync); sync(); wireAvatars(s);
      nx.addEventListener('click', () => { flow.innerHTML = ''; stepsAuth(2); });
    } else {
      $('.mk-back', s).addEventListener('click', () => { flow.innerHTML = ''; stepsAuth(1); });
      $$('[data-google], #nx', s).forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); flowOpen('welcome'); }));
    }
  }
  function landingAuth() {
    draft.guest = true;
    const s = screen('mk-landing', `
      <div class="mk-spacer"></div>
      <img class="mk-land-logo" src="${LIB.logo}" alt="Ecorex" />
      <h2 class="mk-h2 mk-center">Colecciona emociones en forma de dinosaurio</h2>
      <div class="mk-land-orbs">${FRACTAE.map(([, h], i) => `<i class="mk-orb8" style="--oh:${h};--k:${i}"></i>`).join('')}</div>
      <div class="mk-spacer"></div>
      <button class="mk-primary mk-big-cta" id="go">Abrir mi primer sobre</button>
      <p class="auth-switch">¿Ya tienes cuenta? <a href="#">Iniciar sesión</a></p>
      <p class="mk-sub mk-center" style="font-size:.72rem">Sin registro para empezar: tu cuenta se guarda después de tu primera carta.</p>`);
    $('#go', s).addEventListener('click', () => flowOpen('welcome'));
  }
  function carnetAuth() {
    const idc = () => 'DX-' + ((draft.name.length * 7919) % 900 + 100) + '-' + ((draft.name.charCodeAt(0) || 65) % 90 + 10);
    const s = screen('mk-carnet', `
      <h2 class="mk-h2" style="margin-top:.4rem">Tu carnet de explorador</h2>
      <div class="mk-id"><div class="mk-id-photo"><img id="idimg" src="${LIB['av' + draft.av]}" alt="" /></div>
        <div class="mk-id-body"><small>CARNET DE EXPLORADOR</small><b class="mk-id-name" id="idn">Tu nombre</b><span>Nivel 1 · Explorador Novato</span><em id="idc">DX-•••-••</em></div><i class="mk-id-foil"></i></div>
      ${avatarsRow()}
      ${field('user', 'Nombre de usuario', 'text', 'nm')}${GOOGLE.replace('<p class="auth-divider"><span>o</span></p>', '')}
      <p class="auth-divider"><span>o con email</span></p>
      ${field('mail', 'Email', 'email')}${field('lock', 'Contraseña', 'password')}
      <button class="mk-primary" id="nx" disabled>Crear mi carnet</button>`);
    const inp = $('#nm', s), nx = $('#nx', s), nm = $('#idn', s);
    inp.addEventListener('input', () => { draft.name = inp.value; nm.textContent = inp.value || 'Tu nombre'; $('#idc', s).textContent = inp.value ? idc() : 'DX-•••-••'; nx.disabled = !/^[A-Za-z0-9_]{3,20}$/.test(inp.value); nm.classList.remove('bump'); void nm.offsetWidth; nm.classList.add('bump'); });
    wireAvatars(s, () => { $('#idimg', s).src = LIB['av' + draft.av]; });
    $$('[data-google]', s).forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); flowOpen('welcome'); }));
    nx.addEventListener('click', () => flowOpen('welcome'));
  }

  /* ---------- BIENVENIDA · variantes ---------- */
  const SLIDES = [
    { img: 'logo', t: 'Hace 66 millones de años…', p: 'Cuando los dinosaurios desaparecieron, sus emociones no se fueron con ellos. Quedaron atrapadas y dormidas, como fósiles, pero de sentimientos.' },
    { img: 'tri', t: 'Los Fractae', p: 'Son ocho emociones puras: Alegría, Tristeza, Furia, Miedo, Confianza, Asco, Sorpresa y Curiosidad. Para mostrarse necesitan un cuerpo, y solo conocen uno: el de un dinosaurio.' },
    { img: 'pack', t: 'Tú puedes percibirlos', p: 'Algo ha agrietado la barrera y tú eres de los pocos que lo notan. Percibe para encontrar cartas, completa el EcoDex y fusiona las repetidas. Tu energía se recupera con el tiempo.' },
  ];
  // Actual: exactamente la WelcomeFlow de la app (3 diapositivas, un único botón; sin «Saltar»)
  function storyActual() {
    let i = 0; const s = screen('welcome-flow mk-actual-wf', ''); const draw = () => {
      const c = SLIDES[i], last = i === SLIDES.length - 1;
      s.innerHTML = `<div class="welcome-body"><img src="${LIB[c.img]}" alt="" class="welcome-image" draggable="false" /><h2 class="welcome-title">${c.t}</h2><p class="welcome-text">${c.p}</p></div>
        <div class="welcome-footer"><div class="welcome-dots" aria-hidden="true">${SLIDES.map((_, k) => `<span class="welcome-dot${k === i ? ' welcome-dot-active' : ''}"></span>`).join('')}</div><button id="nx">${last ? 'Percibir mi primera carta' : 'Siguiente'}</button></div>`;
      $('#nx', s).addEventListener('click', () => (last ? flowOpen('pack') : (i++, draw())));
    }; draw();
  }
  // A · Cuento animado: mismo texto, escenas con movimiento, progreso en segmentos y deslizamiento lateral
  function storyA() {
    let i = 0;
    const s = screen('mk-story', `
      <div class="mk-prog">${SLIDES.map(() => '<i></i>').join('')}</div>
      <div class="mk-scenes">
        <section class="mk-scene" data-i="0"><div class="mk-pulse"><i></i><i></i><i></i><img class="st" style="--k:0" src="${LIB.logo}" alt="" /></div><h2 class="mk-h2 st mk-center" style="--k:1">${SLIDES[0].t}</h2><p class="mk-p st" style="--k:2">${SLIDES[0].p}</p></section>
        <section class="mk-scene" data-i="1"><div class="mk-orbit-wrap st" style="--k:0"><div class="mk-orbit">${FRACTAE.map(([, h], k) => `<i class="mk-orb8" style="--oh:${h};--a:${k * 45}"></i>`).join('')}</div><img class="mk-orbit-img" src="${LIB.tri}" alt="" /></div><h2 class="mk-h2 st mk-center" style="--k:1">${SLIDES[1].t}</h2><p class="mk-p st" style="--k:2">${SLIDES[1].p}</p></section>
        <section class="mk-scene" data-i="2"><div class="st mk-packshine" style="--k:0"><img src="${LIB.pack}" alt="" /></div><div class="mk-bolts big st" style="--k:1">${'<i></i>'.repeat(3)}</div><h2 class="mk-h2 st mk-center" style="--k:2">${SLIDES[2].t}</h2><p class="mk-p st" style="--k:3">${SLIDES[2].p}</p></section>
      </div>
      <button class="mk-primary" id="nx">Siguiente</button>`);
    const scenes = $$('.mk-scene', s), segs = $$('.mk-prog i', s), nx = $('#nx', s);
    const show = (n) => {
      i = Math.max(0, Math.min(scenes.length - 1, n));
      scenes.forEach((c, k) => { c.classList.remove('active'); if (k === i) { void c.offsetWidth; c.classList.add('active'); } });
      segs.forEach((g, k) => g.classList.toggle('on', k <= i)); nx.textContent = i === scenes.length - 1 ? 'Percibir mi primera carta' : 'Siguiente';
      if (i === 2) ot(() => $$('.mk-bolts i', s).forEach((b, k) => ot(() => b.classList.add('on'), k * 260)), 900);
    };
    nx.addEventListener('click', () => (i === scenes.length - 1 ? flowOpen('pack') : show(i + 1)));
    let x0 = null; const sc = $('.mk-scenes', s);
    sc.addEventListener('pointerdown', (e) => (x0 = e.clientX));
    sc.addEventListener('pointerup', (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (dx < -40 * Z) show(i + 1); else if (dx > 40 * Z) show(i - 1); });
    show(0);
  }
  // B · Guía con burbujas: la Tricera de las Lágrimas (especie real) cuenta la historia en frases cortas
  const BUBBLES = [
    { vis: 'logo', t: '¡Hola, explorador! Soy la Tricera de las Lágrimas. Voy a contarte un secreto muy antiguo.' },
    { vis: 'fossil', t: 'Hace 66 millones de años los dinosaurios desaparecieron… pero sus emociones se quedaron dormidas, como fósiles.' },
    { vis: 'orbs', t: 'Son ocho: Alegría, Tristeza, Furia, Miedo, Confianza, Asco, Sorpresa y Curiosidad. Los llamamos Fractae.' },
    { vis: 'rex', t: 'Para mostrarse necesitan un cuerpo, y solo conocen uno: el de un dinosaurio.' },
    { vis: 'pack', t: 'Tú eres de los pocos que pueden percibirlos. ¿Abrimos tu primer sobre?' },
  ];
  function guideB() {
    let i = 0;
    const vis = { logo: `<img class="mk-gv-logo" src="${LIB.logo}" alt="" />`, fossil: '<div class="mk-fossil"><i></i><i></i><i></i></div>', orbs: `<div class="mk-ring8 small">${FRACTAE.map(([, h], k) => `<i class="mk-orb8" style="--oh:${h};--a:${k * 45}"></i>`).join('')}</div>`, rex: `<img class="mk-gv-art" src="${LIB.rex}" alt="" />`, pack: `<img class="mk-gv-pack" src="${LIB.pack}" alt="" />` };
    const s = screen('mk-guide', `
      <div class="mk-prog">${BUBBLES.map(() => '<i></i>').join('')}</div>
      <div class="mk-gstage" id="gs"></div>
      <div class="mk-guide-row"><div class="mk-guide-av"><img src="${LIB.tri}" alt="Tricera de las Lágrimas" /></div>
        <div class="mk-bubble" id="bb"><p></p><span class="mk-tapnext">Toca ▸</span></div></div>
      <button class="mk-primary" id="nx">Siguiente</button>`);
    const gs = $('#gs', s), bb = $('#bb', s), p = $('p', bb), nx = $('#nx', s), segs = $$('.mk-prog i', s);
    let typing = false;
    const show = (n) => {
      i = n; segs.forEach((g, k) => g.classList.toggle('on', k <= i));
      gs.innerHTML = `<div class="mk-gv" key="${i}">${vis[BUBBLES[i].vis]}</div>`; bb.classList.remove('say'); void bb.offsetWidth; bb.classList.add('say');
      typing = true; typeText(p, BUBBLES[i].t, () => (typing = false));
      nx.textContent = i === BUBBLES.length - 1 ? 'Abrir mi primer sobre' : 'Siguiente';
    };
    const next = () => { if (typing) { clearInterval(p._ti); p.textContent = BUBBLES[i].t; typing = false; return; } i === BUBBLES.length - 1 ? flowOpen('pack') : show(i + 1); };
    nx.addEventListener('click', next); bb.addEventListener('click', () => { if (typing) next(); });
    show(0);
  }
  // C · Despierta la Fractura: la bienvenida se juega (tocar el fósil, conocer los Fractae) y desemboca en el primer sobre
  function wakeC() {
    const s = screen('mk-wake', `
      <div class="mk-prog"><i class="on"></i><i></i><i></i></div>
      <div class="mk-wake-body" id="wb">
        <h2 class="mk-h2 mk-center">Algo duerme bajo el fósil</h2>
        <p class="mk-sub mk-center" id="wh">Toca para despertarlo</p>
        <button class="mk-egg" id="egg" aria-label="Fósil dormido: tócalo" data-taps="0"><svg viewBox="0 0 200 250" aria-hidden="true"><path class="c1" pathLength="1" d="M96 40 L84 78 L104 104 L90 140"/><path class="c2" pathLength="1" d="M110 62 L132 90 L122 124 L146 158"/><path class="c3" pathLength="1" d="M70 120 L98 150 L82 190 L104 222"/></svg><i class="mk-egg-glow"></i></button>
        <div class="mk-taps" id="tp"><i></i><i></i><i></i></div>
      </div>`);
    const egg = $('#egg', s), tp = $$('#tp i', s), segs = $$('.mk-prog i', s);
    let taps = 0, locked = false;
    egg.addEventListener('click', () => {
      if (locked) return; taps += 1; egg.dataset.taps = taps; tp.forEach((d, k) => d.classList.toggle('on', k < taps));
      egg.classList.remove('shake'); void egg.offsetWidth; egg.classList.add('shake'); bgHit('hsl(135 80% 60%)');
      if (taps >= 3) { locked = true; egg.classList.add('burst'); s.classList.add('flash'); ot(wakeOrbs, 1000); }
    });
    function wakeOrbs() {
      segs[1].classList.add('on'); const body = $('#wb', s); let met = new Set();
      body.innerHTML = `<h2 class="mk-h2 mk-center">Son ocho emociones</h2><p class="mk-sub mk-center" id="wh2">Toca tres para conocerlas</p>
        <div class="mk-ring8">${FRACTAE.map(([n, h], k) => `<button class="mk-fx" style="--oh:${h};--a:${k * 45};--k:${k}" data-n="${n}" aria-label="${n}"><i class="mk-orb8" style="--oh:${h}"></i><span class="l">${n}</span></button>`).join('')}<div class="mk-ring-c" id="rc">0/8</div></div>
        <button class="mk-primary" id="wk" disabled>Despertarlas</button>`;
      $$('.mk-fx', body).forEach((b) => b.addEventListener('click', () => { b.classList.add('touched'); met.add(b.dataset.n); $('#rc', body).textContent = met.size + '/8'; const k = $('#wk', body); k.disabled = met.size < 3; if (met.size >= 3) $('#wh2', body).textContent = '¡Se están despertando!'; }));
      $('#wk', body).addEventListener('click', () => { segs[2].classList.add('on'); flowOpen('pack', { narr: 'Un Fractae ha respondido. ¡Rasga el sobre!' }); });
    }
  }

  /* =====================================================================
     PRIMEROS PASOS (coach) — qué pasa al volver a Inicio tras la primera carta
     ===================================================================== */
  let coachVis = null, checkDone = new Set(), checkCard = null, mentorEl = null, mentorT, ecodexTipped = false;
  function onbDismissCoach() { coachVis = null; coachEl.hidden = true; coachEl.innerHTML = ''; if (mentorEl) { mentorEl.remove(); mentorEl = null; } clearTimeout(mentorT); }
  function onbReset() { clearTimers(); flowClose(); onbDismissCoach(); if (checkCard) { checkCard.remove(); checkCard = null; } checkDone = new Set(); ecodexTipped = false; draft.name = ''; draft.guest = false; }
  function coachStart() {
    onbDismissCoach(); const v = ax('coach');
    if (v === '1') spotlight(0); else if (v === '2') checklist(); else if (v === '3') mentor('welcome');
  }
  function coachHook(kind, key) {
    if (kind === 'go') {
      if (checkCard && key === 'coleccion') tick('ecodex');
      if (ax('coach') === '3' && key === 'coleccion' && !ecodexTipped && flow.hidden) { ecodexTipped = true; ot(() => mentor('ecodex'), 700); }
    }
    if (kind === 'reward' && checkCard && (key === 'mission' || key === 'bonus')) tick('mission');
  }
  // ---- A · Focos guiados
  const SPOTS = [
    { sel: () => $('.bottom-nav-tab[data-go="coleccion"]'), t: 'Aquí vive tu colección', p: 'Cada carta nueva que consigas aparece en tu EcoDex.' },
    { sel: () => energyTarget(), t: 'Tu energía', p: 'Percibir gasta energía. Se recupera sola: +1 cada 4 horas.' },
    { sel: () => missionsTarget(), t: 'Misiones diarias', p: 'Cada día tienes misiones fáciles: dan XP y un bonus.' },
  ];
  function firstVisible(sels) { for (const q of sels) { const e = $(q); if (e && e.getBoundingClientRect().width) return e.closest('.stat, .mk-chip, .card') || e; } return null; }
  const energyTarget = () => firstVisible(['.mk-home-real [data-energy-text]', '.mk-home-1 .mk-chip', '.mk-home-2 [data-bolts]', '.mk-home-3 .mk-ready']);
  const missionsTarget = () => { const r = $('.mk-home-real'); if (r && r.getBoundingClientRect().width) return $$('.card', r)[2]; return firstVisible(['.mk-home-1 .mk-missions', '.mk-home-2 .mk-path', '.mk-home-3 .mk-strip']); };
  function spotlight(n) {
    const sp = SPOTS[n], t = sp.sel(); if (!t) return onbDismissCoach();
    go('inicio'); const sc = $('.mk-scr.is-active'); if (n > 0) t.scrollIntoView({ block: 'center' });
    ot(() => {
      const pr = phone.getBoundingClientRect(), r = t.getBoundingClientRect(), W = size().w, H = size().h;
      const x = (r.left - pr.left) / Z - 8, y = (r.top - pr.top) / Z - 8, w = r.width / Z + 16, h = r.height / Z + 16, below = y + h / 2 < H * 0.5;
      const first = !coachVis; coachEl.hidden = false; coachVis = true;
      if (first || !$('#hole', coachEl)) coachEl.innerHTML = `<svg class="mk-spot-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><mask id="mkm"><rect width="${W}" height="${H}" fill="#fff"/><rect id="hole" x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#000"/></mask></defs><rect width="${W}" height="${H}" fill="rgba(2,8,4,.8)" mask="url(#mkm)"/><rect id="ring" x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="none" stroke="#86efac" stroke-width="2.5"/></svg><div class="mk-tip"></div>`;
      const hole = $('#hole', coachEl), ring = $('#ring', coachEl); [hole, ring].forEach((e) => { e.setAttribute('x', x); e.setAttribute('y', y); e.setAttribute('width', w); e.setAttribute('height', h); });
      const tip = $('.mk-tip', coachEl); tip.style.cssText = below ? `top:${y + h + 14}px` : `bottom:${H - y + 14}px`; tip.classList.toggle('up', !below);
      tip.innerHTML = `<b>${sp.t}</b><p>${sp.p}</p><div class="mk-tip-f"><span>${SPOTS.map((_, k) => `<i class="${k === n ? 'on' : ''}"></i>`).join('')}</span><button id="gt">${n === SPOTS.length - 1 ? '¡A jugar!' : 'Entendido'}</button></div>`;
      tip.classList.remove('in'); void tip.offsetWidth; tip.classList.add('in');
      $('#gt', tip).addEventListener('click', () => (n === SPOTS.length - 1 ? (coachVis = null, onbDismissCoach()) : spotlight(n + 1)));
    }, 380);
  }
  // ---- B · Checklist «Primeros pasos» con premio
  const STEPS = [['account', 'Crear tu cuenta'], ['pack', 'Abrir tu primer sobre'], ['ecodex', 'Visitar tu EcoDex'], ['push', 'Activar avisos de energía'], ['mission', 'Completar una misión']];
  function checklist() {
    ['account', 'pack'].forEach((k) => checkDone.add(k));
    if (checkCard) checkCard.remove();
    checkCard = el('<div class="card mk-check"></div>'); $('.mk-scr[data-s="inicio"] .page').prepend(checkCard); renderCheck();
  }
  function renderCheck() {
    if (!checkCard) return; const n = checkDone.size;
    checkCard.innerHTML = `<div class="stat"><strong>Primeros pasos</strong><span>${n}/${STEPS.length}</span></div><div class="level-progress-bar"><div class="level-progress-fill" style="width:${(n / STEPS.length) * 100}%"></div></div>
      ${STEPS.map(([k, t]) => `<div class="mk-ck${checkDone.has(k) ? ' done' : ''}" data-k="${k}"><span class="box">${checkDone.has(k) ? '✓' : ''}</span><span class="t">${t}</span>${k === 'push' && !checkDone.has(k) ? '<button class="mk-mini" data-k="push">Activar</button>' : ''}${k === 'ecodex' && !checkDone.has(k) ? '<button class="mk-mini" data-go="coleccion">Ir</button>' : ''}</div>`).join('')}
      <div class="mk-bonusline"><span>🎁 Al completarlos</span><span>+50 XP y ⚡ llena</span></div>`;
    $$('.mk-mini', checkCard).forEach((b) => b.addEventListener('click', () => (b.dataset.k === 'push' ? tick('push') : go(b.dataset.go))));
  }
  function tick(k) {
    if (!checkCard || checkDone.has(k)) return; checkDone.add(k); renderCheck();
    const row = $(`.mk-ck[data-k="${k}"]`, checkCard); row.classList.add('just');
    if (checkDone.size === STEPS.length) ot(() => { setEnergy(state.max); reward('firststeps'); checkCard.classList.add('complete'); ot(() => { if (checkCard) { checkCard.remove(); checkCard = null; } }, 2600); }, 700);
  }
  // ---- C · Mentor contextual
  const MENT = {
    welcome: { t: '¡Bien hecho! Tu primera carta ya está en el EcoDex. Tócala cuando quieras.', a: 'Ver EcoDex', go: 'coleccion' },
    ecodex: { t: 'Los candados son especies que aún no has descubierto. ¡Sigue percibiendo!' },
    energy: { t: 'Sin energía por ahora. Se recupera sola: +1 cada 4 horas. ¿Te aviso cuando haya?', a: 'Avísame' },
    repeats: { t: '¡Ya tienes 3 Tricera de las Lágrimas! Con 5 podrás fusionarlas en su forma Exceso.', a: 'Ver progreso', go: 'inicio' },
  };
  function mentor(kind) {
    const m = MENT[kind]; if (!m) return; if (mentorEl) mentorEl.remove(); clearTimeout(mentorT);
    mentorEl = el(`<div class="mk-mentor"><div class="mk-guide-av sm"><img src="${LIB.tri}" alt="Tricera de las Lágrimas" /></div><div class="mk-bubble"><p>${m.t}</p>${m.a ? `<button class="mk-mini" id="ma">${m.a}</button>` : ''}</div></div>`);
    phone.appendChild(mentorEl); mentorEl.style.pointerEvents = 'auto';
    const bye = () => { if (!mentorEl) return; mentorEl.classList.add('out'); const x = mentorEl; mentorEl = null; setTimeout(() => x.remove(), 400 * S()); };
    mentorEl.addEventListener('click', (e) => { if (e.target.id === 'ma') { if (m.go) go(m.go); } bye(); });
    mentorT = setTimeout(bye, 7500 * S());
  }

  /* ---------- panel de demostración ---------- */
  function onbDemo(s) {
    $$('[data-act="onb"]').forEach((b) => b.classList.toggle('on', b.dataset.s === s));
    if (s === 'flow') { onbReset(); draft.guest = false; mk.classList.remove('in-flow'); flowOpen('auth'); }
    else if (s === 'auth') flowOpen('auth'); else if (s === 'welcome') flowOpen('welcome'); else if (s === 'pack') flowOpen('pack');
    else if (s === 'card') flowOpen('card');
    else if (s === 'coach') { flowClose(); go('inicio'); if (checkCard) { checkCard.remove(); checkCard = null; } checkDone = new Set(); coachVis = null; coachStart(); }
    else if (s === 'mentor-energy') { flowClose(); setEnergy(0); mentor('energy'); }
    else if (s === 'mentor-repeats') { flowClose(); mentor('repeats'); }
  }
  $('#dock').addEventListener('click', (e) => { const b = e.target.closest('[data-act="onb"]'); if (b) onbDemo(b.dataset.s); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !flow.hidden) { flowClose(); } });

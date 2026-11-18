/* Lógica de la maqueta de interfaz Ecorex: dispara las animaciones según los ejes activos.
   Los ejes llegan como clases en #mk (trans-N, nav-N, xp-N, lvl-N, rew-N, ntf-N, btn-N, home-N).
   Nada de esto es código de la app: es solo para verlas en movimiento. */
(function () {
  const mk = document.getElementById('mk');
  const $ = (s, r = mk) => r.querySelector(s);
  const $$ = (s, r = mk) => [...r.querySelectorAll(s)];
  const ax = (n) => { const c = [...mk.classList].find((x) => x.startsWith(n + '-')); return c ? c.slice(n.length + 1) : '0'; };
  const S = () => (mk.classList.contains('rm') ? 0.01 : mk.classList.contains('slow') ? 3 : 1);
  const phone = $('#phone'), layer = $('#layer'), overlays = $('#overlays'), hud = $('#hud');
  const logoSrc = $('.home-logo').src, avatarSrc = $('.bottom-nav-avatar').src;

  const state = { lvl: 4, into: 60, need: 140, energy: 2, max: 3, screen: 'inicio', unread: 2, navBadge: 3 };
  const items0 = () => [
    { ic: '🔥', t: '¡Ya puedes fusionar Rex de Fuego!', unread: true },
    { ic: '⚡', t: 'Tienes 2/3 energía — ya puedes percibir.', unread: true },
    { ic: '🏅', t: '¡Subiste a nivel 4!', unread: false },
  ];
  let items = items0();
  const TITLES = { 5: 'Perceptor Iniciado', 10: 'Guía de la Fractura', 15: 'Custodio de Fractae', 20: 'Intérprete de lo Oculto', 30: 'Vidente Épico', 40: 'Guardián Primordial', 50: 'Voz de la Fractura' };

  /* ---------- utilidades ---------- */
  // Tamaño lógico del móvil (sin el zoom de ajuste) y factor de escala para que quepa entero en pantalla.
  let Z = 1;
  const size = () => (innerWidth > 480 ? { w: 390, h: 844 } : { w: phone.getBoundingClientRect().width, h: phone.getBoundingClientRect().height });
  function measure() {
    Z = innerWidth > 480 ? Math.min(1, (innerHeight - 40) / 844) : 1;
    mk.style.setProperty('--z', Z);
    mk.style.setProperty('--phh', size().h + 'px');
  }
  addEventListener('resize', measure);
  const later = (fn, ms) => setTimeout(fn, ms * S());
  const el = (html) => { const t = document.createElement('div'); t.innerHTML = html.trim(); return t.firstElementChild; };
  const done = (node, cb) => { let fired = false; const f = () => { if (!fired) { fired = true; cb(); } }; node.addEventListener('animationend', f, { once: true }); setTimeout(f, 6000 * S()); };

  function paint() {
    const pct = Math.min(100, Math.round((state.into / state.need) * 100));
    $$('[data-lv]').forEach((e) => (e.textContent = state.lvl));
    $$('[data-into]').forEach((e) => (e.textContent = state.into));
    $$('[data-fill]').forEach((e) => (e.style.width = pct + '%'));
    $('#hudFill').style.width = pct + '%';
    $$('.mk-ring-fill').forEach((e) => (e.style.strokeDasharray = pct + ' 100'));
    $$('[data-energy-text]').forEach((e) => (e.textContent = state.energy + '/' + state.max));
    $$('[data-bolts]').forEach((b) => { b.innerHTML = Array.from({ length: state.max }, (_, i) => `<i class="${i < state.energy ? 'on' : ''}"></i>`).join(''); });
    $$('[data-energy-ready]').forEach((e) => (e.textContent = state.energy === 1 ? '1 sobre listo' : state.energy + ' sobres listos'));
    mk.style.setProperty('--energy', (state.energy / state.max).toFixed(2)); mk.classList.toggle('energy-full', state.energy >= state.max); mk.classList.toggle('energy-empty', state.energy === 0);
    const u = state.unread;
    ['#fabBadge', '#hdrBadge', '#edgeN'].forEach((s) => { const e = $(s); e.textContent = u; e.style.display = u ? '' : 'none'; });
    $('#edgeTab').classList.toggle('none', !u);
    const navN = ax('fab') === '4' ? u : state.navBadge; // en la variante «sin botón» la pestaña Inicio lleva el número de novedades
    $('#navBadge').textContent = navN; $('#navBadge').style.display = navN ? '' : 'none';
    if (u !== lastUnread) { lastUnread = u; fab2Sync(); }
    renderNews();
  }
  function setInto(v, instant) {
    if (instant) { $$('[data-fill], #hudFill, .mk-ring-fill').forEach((e) => (e.style.transition = 'none')); }
    state.into = v; paint();
    if (instant) { void phone.offsetWidth; $$('[data-fill], #hudFill, .mk-ring-fill').forEach((e) => (e.style.transition = '')); }
  }
  function addXpSilent(n) { setInto(state.into + n >= state.need ? 20 : state.into + n, state.into + n >= state.need); }
  function pulseHud() { hud.classList.remove('gain'); void hud.offsetWidth; hud.classList.add('gain'); later(() => hud.classList.remove('gain'), 900); }
  function pop(node) { node.classList.remove('pop'); void node.offsetWidth; node.classList.add('pop'); setTimeout(() => node.classList.remove('pop'), 600 * S()); }

  /* ---------- fondos (capas generadas, con semilla fija para que sean siempre iguales) ---------- */
  const bgEl = $('#mkbg');
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const f1 = (n) => n.toFixed(1);
  function ridge(r, w, h, base, amp, ph) { let d = `M0 ${h}`; for (let x = 0; x <= w; x += 13) d += ` L${x} ${f1(base - amp * (0.5 * Math.sin(x * .016 + ph) + 0.3 * Math.sin(x * .043 + ph * 2) + 0.2 * r()))}`; return d + ` L${w} ${h} Z`; }
  function conifers(r, n, y0) { let d = ''; for (let i = 0; i < n; i++) { const x = r() * 390, h = 70 + r() * 95, w = h * .44; for (let k = 0; k < 3; k++) { const by = y0 - h * k * .22, hw = (w / 2) * (1 - k * .2); d += `M${f1(x - hw)} ${f1(by)} L${f1(x)} ${f1(by - h * .52)} L${f1(x + hw)} ${f1(by)} Z `; } } return d; }
  function frond(cx, cy, len, ang, bend) {
    const a = (ang * Math.PI) / 180, x1 = cx + Math.cos(a) * len, y1 = cy - Math.sin(a) * len, mx = cx + Math.cos(a + bend) * len * .55, my = cy - Math.sin(a + bend) * len * .55; let out = '';
    for (let i = 1; i <= 24; i++) {
      const t = i / 24, m = 1 - t, x = m * m * cx + 2 * m * t * mx + t * t * x1, y = m * m * cy + 2 * m * t * my + t * t * y1, tx = 2 * m * (mx - cx) + 2 * t * (x1 - mx), ty = 2 * m * (my - cy) + 2 * t * (y1 - my), g = (Math.atan2(ty, tx) * 180) / Math.PI, s = (1 - t * .78) * len * .095;
      for (const side of [52, -52]) out += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(s)}" ry="${f1(s * .28)}" transform="rotate(${Math.round(g + side)} ${f1(x)} ${f1(y)})"/>`;
    }
    return out;
  }
  function cracks(r) {
    let out = '';
    for (let i = 0; i < 5; i++) {
      const sd = r(); let x, y, ang;
      if (sd < .5) { x = r() * 390; y = 844; ang = -90 + (r() - .5) * 50; } else if (sd < .75) { x = 0; y = 500 + r() * 340; ang = -20 - r() * 50; } else { x = 390; y = 500 + r() * 340; ang = -160 + r() * 50; }
      let a = (ang * Math.PI) / 180, px = x, py = y, d = `M${Math.round(x)} ${Math.round(y)}`; const n = 7 + Math.floor(r() * 4);
      for (let s = 0; s < n; s++) {
        a += (r() - .5) * .9; const L = 38 + r() * 48; px += Math.cos(a) * L; py += Math.sin(a) * L; d += ` L${Math.round(px)} ${Math.round(py)}`;
        if (s > 1 && r() < .26) { let bx = px, by = py, ba = a + (r() < .5 ? -1 : 1) * (.6 + r() * .5); d += ` M${Math.round(bx)} ${Math.round(by)}`; for (let k = 0; k < 3; k++) { ba += (r() - .5) * .8; bx += Math.cos(ba) * (22 + r() * 26); by += Math.sin(ba) * (22 + r() * 26); d += ` L${Math.round(bx)} ${Math.round(by)}`; } d += ` M${Math.round(px)} ${Math.round(py)}`; }
      }
      out += `<path class="cr-glow" d="${d}"/><path class="cr-line" d="${d}"/><path class="cr-flow" pathLength="1" d="${d}" style="--fd:${(4 + r() * 4).toFixed(1)}s;--fl:-${(r() * 6).toFixed(1)}s"/>`;
    }
    return out;
  }
  function motes(r, n) { let o = ''; for (let i = 0; i < n; i++) o += `<i style="left:${f1(r() * 96)}%;top:${f1(8 + r() * 84)}%;--dx:${Math.round((r() - .5) * 60)}px;--dy:${Math.round((r() - .5) * 70)}px;--wd:${f1(7 + r() * 7)}s;--bd:${f1(2.6 + r() * 3)}s;--dl:-${f1(r() * 8)}s"></i>`; return o; }
  function buildBg() {
    const r = rng(20261118);
    const far = `<svg viewBox="0 0 390 300" preserveAspectRatio="xMidYMax slice"><path d="${ridge(r, 390, 300, 160, 56, 1.3)}"/><path d="M212 200 L268 100 L290 74 L310 74 L332 100 L388 200 Z"/><ellipse class="smoke" cx="300" cy="58" rx="30" ry="15"/><ellipse class="smoke" cx="318" cy="36" rx="22" ry="11" style="animation-delay:-4s"/></svg>`;
    const mid = `<svg viewBox="0 0 390 300" preserveAspectRatio="xMidYMax slice"><path d="${ridge(r, 390, 300, 232, 24, 4.1)}"/><path d="${conifers(r, 17, 300)}"/></svg>`;
    let near = '';
    [[-8, 300, [[40, 190], [62, 228], [86, 205], [112, 170]]], [398, 300, [[140, 190], [118, 228], [94, 205], [68, 170]]]].forEach(([cx, cy, fr], gi) => {
      near += `<g class="sway" style="animation-delay:-${gi * 3}s">${fr.map(([ang, len], k) => frond(cx, cy, len, ang, (gi ? 1 : -1) * (.28 + k * .05))).join('')}</g>`;
    });
    near = `<svg viewBox="0 0 390 300" preserveAspectRatio="xMidYMax slice">${near}</svg>`;
    bgEl.innerHTML =
      `<div class="b1"><i class="b1-blob b1-a"></i><i class="b1-blob b1-b"></i><i class="b1-blob b1-c"></i><i class="b1-blob b1-d"></i><i class="b1-rays"></i><i class="b1-grain"></i></div>` +
      `<div class="b2"><i class="b2-sky"></i><i class="b2-sun"></i><div class="b2-l b2-far">${far}</div><i class="b2-mist b2-m1"></i><div class="b2-l b2-mid">${mid}</div><i class="b2-mist b2-m2"></i><div class="b2-l b2-near">${near}</div><div class="b2-ff">${motes(r, 16)}</div></div>` +
      `<div class="b3"><i class="b3-ground"></i><svg class="b3-cracks" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">${cracks(r)}</svg><i class="b3-vig"></i></div>` +
      `<div class="b4"><i class="b4-c b4-c-inicio"></i><i class="b4-c b4-c-percibir"></i><i class="b4-c b4-c-coleccion"></i><i class="b4-c b4-c-perfil"></i><i class="b4-spot"></i><div class="b4-dust">${motes(r, 14)}</div><i class="b4-shine"></i></div>` +
      `<i class="mk-bg-hit"></i>`;
  }
  const bgOn = () => ['1', '2', '3', '4'].includes(ax('bg'));
  function bgHit(color) {
    if (!bgOn()) return;
    const h = $('.mk-bg-hit'); h.style.setProperty('--hit', color || 'var(--glow2)'); h.classList.remove('go'); void h.offsetWidth; h.classList.add('go'); setTimeout(() => h.classList.remove('go'), 1200 * S());
  }
  function setCtx(name) { ['inicio', 'percibir', 'coleccion', 'perfil'].forEach((c) => mk.classList.remove('ctx-' + c)); mk.classList.add('ctx-' + (name === 'botones' ? 'inicio' : name)); }
  function setEnergy(v) { state.energy = Math.max(0, Math.min(state.max, v)); paint(); }
  $('#screens').addEventListener('scroll', (e) => { if (e.target.classList && e.target.classList.contains('mk-scr')) mk.style.setProperty('--sy', e.target.scrollTop); }, true);

  /* ---------- navegación entre pantallas ---------- */
  const order = ['inicio', 'percibir', 'coleccion', 'perfil', 'botones'];
  const tabIdx = { inicio: 0, percibir: 1, coleccion: 2, perfil: 3 };
  const seam = $('#seam');
  function go(name) {
    if (name === state.screen) return;
    const from = $(`.mk-scr[data-s="${state.screen}"]`), to = $(`.mk-scr[data-s="${name}"]`);
    const dir = order.indexOf(name) > order.indexOf(state.screen) ? 'dir-f' : 'dir-b';
    const t = ax('trans');
    state.screen = name; mk.dataset.screen = name; setCtx(name); mk.style.setProperty('--sy', 0); coachHook('go', name);
    $$('.bottom-nav-tab').forEach((b) => { const on = b.dataset.go === name; b.classList.toggle('bottom-nav-tab-active', on); on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
    $('#navInd').style.opacity = name in tabIdx ? 1 : 0;
    if (name in tabIdx) $('#nav').style.setProperty('--i', tabIdx[name]);
    $$('.mk-scr').forEach((x) => x.classList.remove('enter', 'leave', 'dir-f', 'dir-b'));
    to.scrollTop = 0;
    if (t === '0' || S() < 0.1) { $$('.mk-scr').forEach((x) => x.classList.remove('is-active')); to.classList.add('is-active'); to.scrollTop = 0; return; }
    from.classList.remove('is-active'); from.classList.add('leave', dir); to.classList.add('enter', dir); to.scrollTop = 0;
    if (t === '3') { seam.classList.remove('run'); void seam.offsetWidth; seam.classList.add('run'); }
    clearTimeout(go.timer);
    go.timer = setTimeout(() => {
      from.classList.remove('leave', 'dir-f', 'dir-b'); to.classList.remove('enter', 'dir-f', 'dir-b'); to.classList.add('is-active'); seam.classList.remove('run');
    }, ({ 1: 260, 2: 360, 3: 580 }[t] || 300) * S() + 40);
  }

  /* ---------- experiencia ---------- */
  function countUp(node, to, ms) {
    const t0 = performance.now();
    (function step(t) { const k = Math.min(1, (t - t0) / (ms * S())); node.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); })(t0);
  }
  function gainXp(n) {
    const v = ax('xp'); bgHit();
    const wrap = state.into + n >= state.need;
    if (v === '0') {
      const t = el(`<div class="xp-toast" role="status">+${n} XP</div>`); layer.appendChild(t);
      later(() => t.remove(), 2500); addXpSilent(n); return;
    }
    if (wrap) setInto(20, true);
    const base = state.into;
    if (v === '1') {
      const p = el(`<div class="mk-xp-pill">+<span>0</span> XP</div>`); layer.appendChild(p); countUp($('span', p), n, 520);
      done(p, () => p.remove());
      later(() => { setInto(base + n); pulseHud(); }, 760);
    } else if (v === '2') {
      const { w, h } = size(), count = Math.max(3, Math.min(10, Math.round(n / 8)));
      const tx = w - 34, ty = 32;
      for (let i = 0; i < count; i++) {
        const sx = w / 2 + (Math.random() - .5) * 90, sy = h * .5 + (Math.random() - .5) * 70, d = (760 + Math.random() * 220);
        const ox = el(`<div class="mk-orbx"><div class="mk-orb"></div></div>`); layer.appendChild(ox);
        const ob = $('.mk-orb', ox), delay = i * 75 * S();
        ox.animate([{ transform: `translateX(${sx}px)`, opacity: 1 }, { transform: `translateX(${tx}px)`, opacity: 1 }], { duration: d * S(), delay, easing: 'cubic-bezier(.5,0,.85,.5)', fill: 'both' });
        const a = ob.animate([{ transform: `translateY(${sy}px) scale(1)` }, { transform: `translateY(${sy - 40}px) scale(1.25)`, offset: .25 }, { transform: `translateY(${ty}px) scale(.55)` }], { duration: d * S(), delay, easing: 'cubic-bezier(.2,.75,.4,1)', fill: 'both' });
        a.onfinish = () => {
          ox.remove(); setInto(base + Math.round((n * (i + 1)) / count));
          const chip = $('#hudChip'); chip.classList.remove('hit'); void chip.offsetWidth; chip.classList.add('hit');
          if (i === count - 1) pulseHud();
        };
      }
    } else if (v === '3') {
      const c = n < 20 ? '#bfe6c9' : n < 50 ? '#4fa9e0' : n < 100 ? '#c084fc' : '#ffd54a';
      const f = el(`<div class="mk-xp-float" style="--c:${c}">+${n}<small>XP</small></div>`); layer.appendChild(f); done(f, () => f.remove());
      later(() => { setInto(base + n); pulseHud(); }, 520);
    }
  }

  /* ---------- subida de nivel ---------- */
  function perks(to) {
    const list = [{ t: '⚡ Energía recargada', gold: true }];
    if (to === 5) list.push({ t: '🔋 Energía máxima +1' });
    if (to === 30) list.push({ t: '🔋 Energía máxima +1' });
    if (to === 15) list.push({ t: '🔥 Fusión con 4 cartas en vez de 5' });
    if (TITLES[to]) list.push({ t: '🏅 Título: ' + TITLES[to] });
    return list;
  }
  function closeOv(node, outClass) {
    if (!node || node.dataset.closing) return; node.dataset.closing = 1;
    if (!outClass) return node.remove();
    node.classList.add('out'); done(node, () => node.remove());
  }
  function levelUp() {
    $$('.mk-ov, .level-up-screen', overlays).forEach((n) => n.remove());
    const v = ax('lvl'), to = state.lvl + 1, pk = perks(to), prev = state.lvl; bgHit('hsl(48 95% 62%)');
    const chips = (d) => `<ul class="mk-chiplist" style="--d:${d}ms">${pk.map((p, i) => `<li class="${p.gold ? 'gold' : ''}" style="--k:${i}">${p.t}</li>`).join('')}</ul>`;
    let node;
    if (v === '0') {
      node = el(`<div class="level-up-screen"><div class="level-up-screen-top"><strong class="level-up-screen-title">¡Subiste de nivel!</strong><img src="${logoSrc}" alt="" class="level-up-screen-avatar" /></div><div class="level-up-screen-bottom"><div class="level-up-screen-levels"><span class="level-up-screen-level-prev">Nivel ${prev}</span><span class="level-up-screen-arrow">›</span><span class="level-up-screen-level-new">${to}</span></div><p class="level-up-screen-energy">⚡ ¡Energía recargada!</p><p class="level-up-screen-hint">Toca para continuar</p></div></div>`);
    } else if (v === '1') {
      node = el(`<div class="mk-ov mk-lv1"><h3>¡Subiste de nivel!</h3><div class="mk-lv1-ring"><svg viewBox="0 0 190 190"><circle class="t" cx="95" cy="95" r="84"/><circle class="f" cx="95" cy="95" r="84" pathLength="100"/></svg><div class="mk-roll"><div class="mk-roll-in"><span>${prev}</span><span>${to}</span></div></div></div>${chips(1300)}<div class="mk-tap">Toca para continuar</div></div>`);
    } else if (v === '2') {
      let cracks = '', parts = '';
      for (let a = 0; a < 9; a++) {
        const ang = (a / 9) * Math.PI * 2 + Math.random() * .3; let d = 'M170 170'; let r = 0, x = 170, y = 170;
        for (let s = 0; s < 5; s++) { r += 22 + Math.random() * 18; const j = (Math.random() - .5) * .45; x = 170 + Math.cos(ang + j) * r; y = 170 + Math.sin(ang + j) * r; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; }
        cracks += `<path pathLength="1" d="${d}"/>`;
      }
      for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 170; parts += `<i class="mk-part" style="--dx:${(Math.cos(a) * r).toFixed(0)}px;--dy:${(Math.sin(a) * r).toFixed(0)}px;width:${3 + Math.random() * 6}px;height:${3 + Math.random() * 6}px"></i>`; }
      node = el(`<div class="mk-ov mk-lv2"><i class="mk-shock" style="--d:260ms"></i><i class="mk-shock" style="--d:420ms"></i><i class="mk-shock" style="--d:600ms"></i><svg class="mk-cracks" viewBox="0 0 340 340">${cracks}</svg>${parts}<div class="mk-lv2-num">${to}</div><h3>¡Nivel ${to}!</h3>${chips(1150)}<div class="mk-tap">Toca para continuar</div></div>`);
    } else {
      const title = TITLES[to];
      node = el(`<div class="mk-ov mk-lv3"><div class="mk-shield"><small>NIVEL</small><b>${to}</b></div>${title ? `<small class="k">Título desbloqueado</small><div class="mk-unlock">${title}</div>` : `<div class="mk-unlock">¡Sigues creciendo!</div>`}${chips(1500)}<div class="mk-tap">Toca para continuar</div></div>`);
    }
    overlays.appendChild(node);
    node.addEventListener('click', () => closeOv(node, v !== '0'));
    // El servidor ya subió de nivel y recargó la energía en el momento de ganar la carta.
    items.unshift({ ic: '🏅', t: `¡Subiste a nivel ${to}!`, unread: true });
    state.lvl = to; state.need = Math.round(50 * (Math.pow(to, 1.5) - Math.pow(to - 1, 1.5))); state.max = 3 + (to >= 5 ? 1 : 0) + (to >= 30 ? 1 : 0); state.energy = state.max;
    state.unread += 1;
    setInto(10, true); pulseHud();
  }

  /* ---------- logros y recompensas ---------- */
  const EV = {
    mission: { ic: '✅', t: 'Misión completada', s: 'Percibe hoy', xp: 10, c: '#3fae5a', big: false },
    bonus: { ic: '🎁', t: 'Bonus del día', s: 'Has completado las misiones principales', xp: 30, c: '#4fa9e0', big: false },
    streak3: { ic: '🔥', t: 'Racha de 3 días', s: 'XP y energía recargada', xp: 20, c: '#ffb74d', big: false },
    species: { ic: '🦖', t: 'Nueva especie registrada', s: 'Tricera de las Lágrimas · Balance', xp: 20, c: '#7fc891', big: true },
    eco: { ic: '👻', t: '¡Has percibido un Eco!', s: 'El eco extremo de una especie que ya conoces', xp: 20, c: '#8fd8e8', big: true, cls: 'ev-eco' },
    firststeps: { ic: '🎓', t: 'Primeros pasos completados', s: 'Energía recargada', xp: 50, c: '#ffd54a', big: true },
    complete: { ic: '🏆', t: 'Especie completa', s: 'Balance, Exceso y Eco de Rex de Fuego', xp: 200, c: '#ffd54a', big: true },
  };
  function restack() { $$('.mk-banner:not(.out)').forEach((b, i) => b.style.setProperty('--stack', i)); }
  function reward(key) {
    const e = EV[key], v = ax('rew'); bgHit(e.c); coachHook('reward', key);
    if (v === '0') { const t = el(`<div class="xp-toast" role="status">+${e.xp} XP</div>`); layer.appendChild(t); later(() => t.remove(), 2500); addXpSilent(e.xp); return; }
    const style = v === '4' ? (e.big ? '2' : '1') : v;
    addXpSilent(e.xp);
    const chip = `<span class="mk-xpchip">+${e.xp} XP</span>`;
    if (style === '1') {
      const live = $$('.mk-banner:not(.out)'); if (live.length >= 3) { live[0].classList.add('out'); setTimeout(() => live[0].remove(), 330 * S()); }
      const b = el(`<div class="mk-banner" style="--c:${e.c}"><div class="mk-banner-ic">${e.ic}</div><div class="mk-banner-t"><b>${e.t}</b><span>${e.s}</span></div>${chip}</div>`);
      layer.appendChild(b); restack(); pulseHud();
      b.style.pointerEvents = 'auto'; b.addEventListener('click', () => { b.classList.add('out'); setTimeout(() => { b.remove(); restack(); }, 330 * S()); });
      later(() => { if (b.isConnected) { b.classList.add('out'); setTimeout(() => { b.remove(); restack(); }, 330 * S()); } }, 3700);
    } else if (style === '2') {
      $$('.mk-medal-ov', overlays).forEach((n) => n.remove());
      const m = el(`<div class="mk-medal-ov ${e.cls || ''}" style="--c:${e.c}"><div class="mk-medal">${e.ic}</div><h3>${e.t}</h3><p>${e.s}</p>${chip}<div class="mk-tap">Toca para continuar</div></div>`);
      overlays.appendChild(m); m.addEventListener('click', () => closeOv(m, true)); pulseHud();
    } else {
      $$('.mk-seal-sheet', overlays).forEach((n) => n.remove());
      const sh = el(`<div class="mk-seal-sheet" style="--c:${e.c};--w:${Math.round(((state.into) / state.need) * 100)}%"><div class="mk-seal">${e.ic}</div><div class="mk-seal-t"><small>Logro</small><b>${e.t}</b><span>${e.s}</span><div class="mk-seal-bar"><i></i></div></div>${chip}</div>`);
      overlays.appendChild(sh); pulseHud();
      sh.addEventListener('click', () => closeOv(sh, true)); later(() => closeOv(sh, true), 3800);
    }
  }

  /* ---------- notificaciones ---------- */
  const NTF = { energy: { ic: '⚡', t: 'Tienes 3/3 energía — ya puedes percibir.' }, fusion: { ic: '🔥', t: '¡Ya puedes fusionar Tricera de las Lágrimas!' }, streak: { ic: '🔥', t: '¡Racha de 3 días! +20 XP y ⚡' } };
  const fabBtn = $('#fabBtn'), list = $('#ntfList'), backdrop = $('#sheetBackdrop'), fabEl = $('#fab');
  let lastUnread = state.unread, lastFab = '0', fab2T;
  // La «campana» activa y su insignia dependen del eje «Botón de notificaciones» (fab-N).
  const bellEl = () => ({ 1: $('#hdrBell'), 3: $('#edgeTab'), 4: $('.bottom-nav-tab[data-go="inicio"] .bottom-nav-icon') }[ax('fab')] || fabBtn);
  const badgeEl = () => ({ 1: $('#hdrBadge'), 3: $('#edgeN'), 4: $('#navBadge') }[ax('fab')] || $('#fabBadge'));
  function renderList() {
    list.innerHTML = items.length ? items.map((n, i) => `<div class="card-clickable truncate mk-ntf-item${n.unread ? ' unread' : ''}" data-i="${i}" style="--k:${i};font-weight:${n.unread ? 700 : 400}">${n.ic || ''} ${n.t}</div>`).join('') : '<p class="mk-ntf-empty">Sin notificaciones.</p>';
  }
  function openList() { renderList(); list.hidden = false; backdrop.classList.add('open'); $('#edgeTab').classList.remove('wide'); fab2Sync(); }
  function closeList() { list.hidden = true; backdrop.classList.remove('open'); fab2Sync(); }
  const toggleList = () => (list.hidden ? openList() : closeList());
  [fabBtn, $('#hdrBell'), $('#edgeTab')].forEach((b) => b.addEventListener('click', toggleList));
  backdrop.addEventListener('click', closeList);
  function markRead(i) { const n = items[i]; if (n && n.unread) { n.unread = false; state.unread = Math.max(0, state.unread - 1); paint(); } }
  list.addEventListener('click', (e) => { const it = e.target.closest('.mk-ntf-item'); if (!it) return; markRead(+it.dataset.i); closeList(); });
  document.addEventListener('click', (e) => { if (!list.hidden && !e.target.closest('#fab, #dock, #hdrBell, #edgeTab, #news')) closeList(); });

  // B · el botón flotante solo aparece si hay novedades: entra, se recoge al borde a los 4,5 s y se va al leerlo todo
  function fab2Sync() {
    clearTimeout(fab2T);
    if (ax('fab') !== '2') { fabEl.classList.remove('fab2-off', 'fab2-peek'); return; }
    if (state.unread === 0 && list.hidden) { fabEl.classList.add('fab2-off'); fabEl.classList.remove('fab2-peek'); return; }
    fabEl.classList.remove('fab2-off', 'fab2-peek');
    if (list.hidden) fab2T = setTimeout(() => { if (ax('fab') === '2' && list.hidden && state.unread > 0) fabEl.classList.add('fab2-peek'); }, 4500 * S());
  }
  // D · «Novedades» como tarjeta en Inicio (máx. 2) en vez de un botón
  let newsShown = false;
  function renderNews() {
    const box = $('#news'), on = ax('fab') === '4', un = items.map((n, i) => ({ n, i })).filter((x) => x.n.unread);
    if (!on || !un.length) { box.hidden = true; newsShown = false; return; }
    box.hidden = false;
    const sig = un.slice(0, 2).map((x) => x.i + x.n.t).join('|') + un.length;
    if (box.dataset.sig === sig) return; box.dataset.sig = sig;
    if (!newsShown) { newsShown = true; box.style.animation = 'none'; void box.offsetWidth; box.style.animation = ''; }
    box.innerHTML = `<strong>Novedades</strong>` + un.slice(0, 2).map((x) => `<div class="mk-news-row" data-i="${x.i}"><span class="ic">${x.n.ic || '🔔'}</span><span class="t">${x.n.t}</span><em>Ver</em></div>`).join('') + (un.length > 2 ? `<button class="mk-news-more" data-open>Ver las ${un.length}</button>` : `<button class="mk-news-more" data-open>Ver historial</button>`);
  }
  $('#news').addEventListener('click', (e) => {
    if (e.target.closest('[data-open]')) return openList();
    const row = e.target.closest('.mk-news-row'); if (row) { markRead(+row.dataset.i); }
  });
  // La burbuja de «ntf-3» se coloca junto a la campana activa (a su izquierda o a su derecha según el lado de la pantalla).
  function placePill(bell) {
    const pl = $('#fabPill'), b = bell.getBoundingClientRect(), p = phone.getBoundingClientRect(), W = size().w;
    const cx = (b.left + b.width / 2 - p.left) / Z, cy = (b.top + b.height / 2 - p.top) / Z, left = cx < W / 2;
    pl.style.top = cy - 23 + 'px'; pl.style.left = left ? cx + 'px' : 'auto'; pl.style.right = left ? 'auto' : W - cx + 'px';
    pl.classList.toggle('from-left', left); pl.style.setProperty('--bellr', b.width / 2 / Z + 8 + 'px');
  }
  function notify(k) {
    const n = NTF[k], v = ax('ntf'), bell = bellEl();
    items.unshift({ ic: n.ic, t: n.t, unread: true }); state.unread += 1; paint();
    if (!list.hidden) renderList();
    const edge = $('#edgeTab');
    if (ax('fab') === '3') { $('#edgeT').textContent = n.t.replace(/ — ya puedes percibir\./, ''); edge.classList.add('wide'); later(() => edge.classList.remove('wide'), 3000); }
    const ringBell = () => { bell.classList.remove('ring'); void bell.offsetWidth; bell.classList.add('ring'); pop(badgeEl()); setTimeout(() => bell.classList.remove('ring'), 1050 * S()); };
    if (v === '1') {
      const t = el(`<div class="mk-ntoast"><span class="ic">${n.ic}</span><span>${n.t}</span></div>`); layer.appendChild(t);
      later(() => {
        const a = t.getBoundingClientRect(), b = bell.getBoundingClientRect();
        t.style.animation = 'none';
        if (!b.width) { t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 * S(), fill: 'forwards' }).onfinish = () => t.remove(); return; } // sin campana visible (p. ej. «Actual» fuera de Inicio): solo se desvanece
        const dx = (b.left + b.width / 2 - (a.left + a.width / 2)) / Z, dy = (b.top + b.height / 2 - (a.top + a.height / 2)) / Z;
        const f = t.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.08)`, opacity: .4 }], { duration: 520 * S(), easing: 'cubic-bezier(.6,0,.9,.5)', fill: 'forwards' });
        f.onfinish = () => { t.remove(); ringBell(); };
      }, 2300);
    } else if (v === '2') {
      ringBell();
    } else if (v === '3') {
      $('#fabPillTxt').textContent = n.ic + ' ' + n.t.replace(/ — ya puedes percibir\./, '');
      const pl = $('#fabPill'); if (bell.getBoundingClientRect().width) placePill(bell); pl.classList.add('show'); pop(badgeEl()); later(() => pl.classList.remove('show'), 2800);
    } else { pop(badgeEl()); }
  }
  // Al cambiar el eje «Botón de notificaciones» (llega por postMessage) se reinicia su comportamiento
  new MutationObserver(() => { const f = ax('fab'); if (f !== lastFab) { lastFab = f; closeList(); fab2Sync(); paint(); } }).observe(mk, { attributes: true, attributeFilter: ['class'] });

  /* ---------- botones ---------- */
  mk.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.mk-scr button'); if (!b || b.disabled) return;
    const v = ax('btn');
    if (v === '1') { b.classList.remove('sheen'); void b.offsetWidth; b.classList.add('sheen'); setTimeout(() => b.classList.remove('sheen'), 700 * S()); }
    if (v === '3') {
      const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, rp = document.createElement('span');
      rp.className = 'mk-ripple'; rp.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      b.appendChild(rp); setTimeout(() => rp.remove(), 700 * S());
    }
  });
  const sb = $('[data-state-demo]');
  sb.addEventListener('click', () => {
    if (sb.classList.contains('is-loading')) return;
    sb.classList.add('is-loading'); sb.textContent = 'Guardando…';
    later(() => { sb.classList.remove('is-loading'); sb.classList.add('is-done'); sb.textContent = '¡Hecho!'; later(() => { sb.classList.remove('is-done'); sb.textContent = 'Guardar'; }, 1300); }, 1200);
  });

  /* ---------- panel de demostración y navegación ---------- */
  $$('.bottom-nav-tab').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
  function reset() {
    $$('.mk-ov, .level-up-screen, .mk-medal-ov, .mk-seal-sheet', overlays).forEach((n) => n.remove()); layer.innerHTML = '';
    Object.assign(state, { lvl: 4, into: 60, need: 140, energy: 2, max: 3, unread: 2 }); items = items0(); closeList(); onbReset(); mk.dataset.screen = 'inicio'; paint(); setCtx('inicio'); mk.style.setProperty('--sy', 0); fab2Sync();
    const cur = state.screen; state.screen = '__'; $$('.mk-scr').forEach((x) => x.classList.remove('is-active', 'enter', 'leave')); state.screen = 'inicio';
    $('.mk-scr[data-s="inicio"]').classList.add('is-active');
    $$('.bottom-nav-tab').forEach((b) => b.classList.toggle('bottom-nav-tab-active', b.dataset.go === 'inicio')); $('#nav').style.setProperty('--i', 0); $('#navInd').style.opacity = 1;
  }
  $('#dock').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; const a = b.dataset.act;
    if (a === 'go') go(b.dataset.to);
    else if (a === 'xp') gainXp(+b.dataset.n);
    else if (a === 'level') levelUp();
    else if (a === 'reward') reward(b.dataset.ev);
    else if (a === 'notify') notify(b.dataset.k);
    else if (a === 'fab') (list.hidden ? openList() : closeList());
    else if (a === 'slow') { mk.classList.toggle('slow'); b.classList.toggle('on', mk.classList.contains('slow')); }
    else if (a === 'rm') { mk.classList.toggle('rm'); b.classList.toggle('on', mk.classList.contains('rm')); }
    else if (a === 'tint') { $$('[data-act="tint"]').forEach((x) => x.classList.toggle('on', x === b)); for (let i = 1; i <= 8; i++) mk.classList.remove('tint-' + i); if (+b.dataset.t) mk.classList.add('tint-' + b.dataset.t); }
    else if (a === 'readall') { items.forEach((n) => (n.unread = false)); state.unread = 0; closeList(); paint(); }
    else if (a === 'energy') setEnergy(state.energy + +b.dataset.d);
    else if (a === 'energy-full') setEnergy(state.max);
    else if (a === 'reset') reset();
  });
  mk.addEventListener('click', (e) => { const g = e.target.closest('[data-act="go"]'); if (g && !g.closest('#dock')) go(g.dataset.to); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { $$('.mk-ov, .level-up-screen, .mk-medal-ov, .mk-seal-sheet', overlays).forEach((n) => closeOv(n, false)); closeList(); } });

  /* @@ONBOARDING@@ */

  mk.dataset.screen = 'inicio'; buildBg(); setCtx('inicio'); measure(); paint(); $('#nav').style.setProperty('--i', 0);
  new ResizeObserver(measure).observe(phone);
})();

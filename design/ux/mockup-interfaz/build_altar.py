"""Maqueta enfocada del Altar de Fusión (design/ux/mockup-altar-fusion-2026-11.html).

    python3 design/ux/mockup-interfaz/build_altar.py     # desde la raíz del repo

Tres piezas, todas las opciones a la vista y a tamaño de móvil (390 px): el altar en Inicio, la pantalla del
Altar y la pantalla de «Fusión completada». Usa el CSS real (src/index.css), las fuentes de la app y arte real
de las especies; los datos son los de una cuenta de ejemplo (los de la captura que motivó el rediseño).
Autocontenida. Solo escribe en design/ux/.
"""
import base64
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
import build  # noqa: E402

OUT = ROOT / "design/ux/mockup-altar-fusion-2026-11.html"

build.IMAGES.update({
    "telm_bal": ("species-art/telmatosaurus-mirus/balance.webp", 420, "webp"),
    "telm_exc": ("species-art/telmatosaurus-mirus/exceso.webp", 520, "webp"),
    "hua_bal": ("species-art/huayangosaurus-inquisitus/balance.webp", 220, "webp"),
    "tri_bal": ("species-art/triceratops-umbra/balance.webp", 220, "webp"),
    "rex_bal": ("species-art/tyrannosaurus-imperator/balance.webp", 220, "webp"),
    "altar": ("icons/altar-fusion.png", 200, "png"),
})

# ---- datos de ejemplo (los de la captura) -----------------------------------------------------------------
READY = dict(name="Destello del Pantano", sci="Telmatosaurus mirus", n=5, img="{{img:telm_bal}}")
PROG = [
    dict(name="Hustor de Umbra", n=4, img="{{img:hua_bal}}"),
    dict(name="Tricera de las Lágrimas", n=3, img="{{img:tri_bal}}"),
    dict(name="Rex de Fuego", n=2, img="{{img:rex_bal}}"),
]
THRESHOLD = 5
COMMON = "#bfe6c9"
HINT = "Junta 5 cartas Balance de esta especie para obtener su forma Exceso."


def pips(n, total=THRESHOLD, cls=""):
    return f'<span class="pips {cls}" aria-label="{n} de {total}">' + "".join(f'<i class="{"on" if k < n else ""}"></i>' for k in range(total)) + "</span>"


def ring(n, total=THRESHOLD, size=64):
    pct = round(n / total * 100)
    return (f'<svg class="r" viewBox="0 0 64 64" width="{size}" height="{size}" aria-hidden="true"><circle cx="32" cy="32" r="28" class="t"/>'
            f'<circle cx="32" cy="32" r="28" class="f" pathLength="100" style="stroke-dasharray:{pct} 100"/></svg>')


# ============ 1 · ALTAR EN INICIO ============================================================================
def progress_card_actual(s):
    pct = round(s["n"] / THRESHOLD * 100)
    return f'''<div class="card"><div class="stat"><strong>Próxima fusión: {s["name"]}</strong><span>{s["n"]}/{THRESHOLD}</span></div>
      <div class="level-progress-bar"><div class="level-progress-fill" style="width:{pct}%"></div></div>
      <div class="streak-hint">Junta {THRESHOLD} cartas Balance de esta especie para obtener su forma Exceso.</div></div>'''


def home_actual(ready):
    cls = "card card-clickable card-altar card-altar-unlocked" if ready else "card card-altar"
    hint = "Fusiona 5 cartas Balance en una nueva" if ready else "Aún bloqueado"
    return f'''<div class="grid grid-compact"><div class="{cls}"><img class="card-icon" src="{{{{img:ic_altar}}}}" alt="" />
      <div class="card-altar-text"><strong>Altar de Fusión{"" if ready else " 🔒"}</strong><span class="card-altar-hint">{hint}</span></div></div></div>
      {progress_card_actual(PROG[0])}'''


def home_a(ready):
    ready_row = f'''<div class="alt-row ready"><img class="th" src="{READY["img"]}" alt="" /><div class="mid"><b>{READY["name"]}</b>{pips(5)}</div><button>Fusionar</button></div>''' if ready else ""
    nxt = PROG[0]
    sub = "1 especie lista para fusionar" if ready else "Aún no hay fusiones listas"
    return f'''<div class="card alt-altar-a{" is-ready" if ready else ""}"><div class="alt-head"><img src="{{{{img:ic_altar}}}}" alt="" /><div><strong>Altar de Fusión</strong><span>{sub}</span></div></div>
      {ready_row}
      <div class="alt-row next"><img class="th" src="{nxt["img"]}" alt="" /><div class="mid"><b>{nxt["name"]}</b>{pips(nxt["n"])}</div><em>Falta {THRESHOLD - nxt["n"]}</em></div></div>'''


def home_b(ready):
    s = READY if ready else PROG[0]
    slots = "".join(
        f'<span class="slot{" on" if k < s["n"] else ""}">' + (f'<img src="{s["img"]}" alt="" />' if k < s["n"] else "") + "</span>" for k in range(THRESHOLD))
    btn = '<button class="alt-wide">Fusionar ahora</button>' if ready else f'<div class="alt-note">Falta {THRESHOLD - s["n"]} carta Balance</div>'
    return f'''<div class="card alt-altar-b{" is-ready" if ready else ""}"><div class="alt-b-top"><img src="{{{{img:altar}}}}" alt="" /></div>
      <strong class="alt-b-title">{"¡Lista para fusionar!" if ready else "Altar de Fusión"}</strong><span class="alt-b-sub">{s["name"]} · {s["n"]}/{THRESHOLD}</span>
      <div class="slots" role="img" aria-label="{s["n"]} de {THRESHOLD} cartas Balance">{slots}</div>{btn}</div>'''


def home_c(ready):
    s = READY if ready else PROG[0]
    if ready:
        return f'''<div class="card card-clickable alt-altar-c is-ready"><div class="glow" aria-hidden="true"></div><div class="alt-c-img"><img src="{s["img"]}" alt="" /></div>
          <div class="alt-c-text"><span class="chip">¡LISTA!</span><strong>{s["name"]}</strong><span>Fusiona 5 cartas Balance en su forma Exceso</span></div><span class="go" aria-hidden="true">›</span></div>'''
    return f'''<div class="card alt-altar-c"><div class="alt-c-ring">{ring(s["n"])}<img src="{s["img"]}" alt="" /></div>
      <div class="alt-c-text"><strong>Próxima fusión</strong><span>{s["name"]}</span><span class="alt-c-count">{s["n"]}/{THRESHOLD} · falta {THRESHOLD - s["n"]}</span></div></div>'''


HOME = [("0", "Actual", "Banner del altar más una tarjeta aparte de «Próxima fusión» con el texto largo repetido."),
        ("1", "A · Un solo panel", "Banner y progreso fundidos en una tarjeta: la fusión lista con su botón, y debajo la siguiente con casillas."),
        ("2", "B · Ranuras", "Cinco ranuras que se llenan con la especie; al completarse brillan y aparece «Fusionar ahora»."),
        ("3", "C · Brasas", "Cuando hay fusión lista, la tarjeta late y lo dice; si no, un anillo con la especie más cercana.")]
HOME_FN = {"0": home_actual, "1": home_a, "2": home_b, "3": home_c}


def home_cols():
    out = []
    for v, t, d in HOME:
        fn = HOME_FN[v]
        out.append(f'''<article class="col"><h3>{t}</h3><p>{d}</p>
          <div class="phone"><div class="page"><span class="state">Con una fusión lista</span>{fn(True)}<span class="state">Sin fusiones listas todavía</span>{fn(False)}</div></div></article>''')
    return "".join(out)


# ============ 2 · PANTALLA DEL ALTAR =========================================================================
HEADER = '''<div class="page-header"><button class="page-back-btn" aria-label="Volver atrás">←</button><button class="page-header-logo" aria-label="Ir a Inicio"><img src="{{img:logo}}" alt="Ecorex" /></button></div>'''


def screen_actual():
    cards = "".join(progress_card_actual_screen(s) for s in PROG)
    return f'''{HEADER}<div class="page"><h1>Altar de Fusión</h1><h2>En progreso</h2>{cards}
      <div class="grid"><div class="card"><img src="{READY["img"]}" alt="" class="species-image" /><strong>{READY["name"]}</strong><div>Cartas Balance: {READY["n"]}</div><button>Fusionar</button></div></div></div>'''


def progress_card_actual_screen(s):
    pct = round(s["n"] / THRESHOLD * 100)
    return f'''<div class="card"><div class="stat"><strong>{s["name"]}</strong><span>{s["n"]}/{THRESHOLD}</span></div><div class="level-progress-bar"><div class="level-progress-fill" style="width:{pct}%"></div></div><div class="streak-hint">{HINT}</div></div>'''


def screen_a():
    rows = "".join(
        f'<div class="alt-row next"><img class="th" src="{s["img"]}" alt="" /><div class="mid"><b>{s["name"]}</b>{pips(s["n"])}</div><em>{s["n"]}/{THRESHOLD}</em></div>' for s in PROG)
    return f'''{HEADER}<div class="page"><h1>Altar de Fusión</h1>
      <h2 class="alt-h2">Listas para fusionar</h2>
      <div class="card alt-list"><div class="alt-row ready"><img class="th big" src="{READY["img"]}" alt="" /><div class="mid"><b>{READY["name"]}</b>{pips(5)}<small>{READY["n"]} cartas Balance</small></div><button>Fusionar</button></div></div>
      <h2 class="alt-h2">En progreso</h2><div class="card alt-list">{rows}</div>
      <p class="alt-foot">Junta {THRESHOLD} cartas Balance de una especie para obtener su forma Exceso.</p></div>'''


def screen_b():
    s = READY
    slots = "".join(f'<span class="slot on"><img src="{s["img"]}" alt="" /></span>' for _ in range(THRESHOLD))
    chips = "".join(f'<div class="alt-chip"><div class="rw">{ring(p["n"], size=52)}<img src="{p["img"]}" alt="" /></div><b>{p["name"].split(" de ")[0]}</b><small>{p["n"]}/{THRESHOLD}</small></div>' for p in PROG)
    return f'''{HEADER}<div class="page"><h1>Altar de Fusión</h1>
      <div class="card alt-altar-b is-ready alt-big"><div class="alt-b-top"><img src="{{{{img:altar}}}}" alt="" /></div>
        <img class="alt-b-art" src="{s["img"]}" alt="" /><strong class="alt-b-title">{s["name"]}</strong><span class="alt-b-sub">{s["sci"]}</span>
        <div class="slots">{slots}</div><button class="alt-wide">Fusionar</button></div>
      <h2 class="alt-h2">En progreso</h2><div class="alt-chips">{chips}</div></div>'''


def screen_c():
    def stack(s, ready):
        n = s["n"]
        fan = "".join(f'<img style="--k:{k}" src="{s["img"]}" alt="" />' for k in range(min(n, 5)))
        return f'''<div class="alt-stack{" is-ready" if ready else ""}"><div class="fan">{fan}<span class="cnt">{n}/{THRESHOLD}</span></div><b>{s["name"]}</b>
          {"<button>Fusionar</button>" if ready else f'<div class="level-progress-bar"><div class="level-progress-fill" style="width:{round(n / THRESHOLD * 100)}%"></div></div>'}</div>'''
    items = stack(READY, True) + "".join(stack(p, False) for p in PROG)
    return f'''{HEADER}<div class="page"><h1>Altar de Fusión</h1><div class="alt-stacks">{items}</div>
      <p class="alt-foot">Junta {THRESHOLD} cartas Balance de una especie para obtener su forma Exceso.</p></div>'''


SCREEN = [("0", "Actual", "Tarjetas de progreso con el mismo texto repetido y, al final, la especie lista como un bloque más."),
          ("1", "A · Lista compacta", "Miniaturas y casillas; las listas arriba con su botón, las demás debajo. La pista, una sola vez."),
          ("2", "B · Altar con ranuras", "La especie lista en grande sobre el altar con sus cinco ranuras; el resto, como fichas con anillo."),
          ("3", "C · Cartas apiladas", "Cada especie es un abanico de cartas con su cuenta; las listas se distinguen por el borde dorado y el botón.")]
SCREEN_FN = {"0": screen_actual, "1": screen_a, "2": screen_b, "3": screen_c}


def screen_cols():
    return "".join(f'<article class="col"><h3>{t}</h3><p>{d}</p><div class="phone has-header">{SCREEN_FN[v]()}</div></article>' for v, t, d in SCREEN)


# ============ 3 · FUSIÓN COMPLETADA ==========================================================================
R = dict(name="Destello del Pantano", sci="Telmatosaurus mirus", phase="exceso", rarity="Especie Común", xp=15, img="{{img:telm_exc}}")


def result_actual():
    return f'''<h1>Altar de Fusión</h1><div class="card" style="border:4px solid {COMMON}"><strong>¡Fusión completada!</strong>
      <img src="{R["img"]}" alt="" class="species-image" /><div>{R["name"]} ({R["sci"]})</div><div>Fase: {R["phase"]}</div><div>Rareza: {R["rarity"]}</div><button>Volver al altar</button></div>'''


def result_a():
    return f'''<h1>Altar de Fusión</h1><div class="card alt-res-a" style="--rc:{COMMON}"><span class="chip">¡FUSIÓN COMPLETADA!</span>
      <div class="art"><img src="{R["img"]}" alt="" /><i class="foil" aria-hidden="true"></i></div>
      <strong class="nm">{R["name"]}</strong><span class="sci">{R["sci"]}</span>
      <div class="facts"><div><small>Fase</small><b>Exceso</b></div><div><small>Rareza</small><b>Común</b>{pips(1, 5, "rar")}</div><div><small>XP</small><b>+{R["xp"]}</b></div></div>
      <button class="alt-wide">Volver al altar</button></div>'''


def result_b():
    ins = "".join(f'<img style="--k:{k}" src="{{{{img:telm_bal}}}}" alt="" />' for k in range(5))
    return f'''<h1>Altar de Fusión</h1><div class="card alt-res-b" style="--rc:{COMMON}"><span class="chip">¡FUSIÓN COMPLETADA!</span>
      <div class="ins" aria-label="5 cartas Balance">{ins}</div><div class="arrow" aria-hidden="true">▼</div>
      <div class="out"><img src="{R["img"]}" alt="" /></div>
      <strong class="nm">{R["name"]}</strong><span class="sci">5 cartas Balance → 1 carta Exceso</span>
      <div class="facts one"><span>Rareza <b>Común</b></span><span>+{R["xp"]} XP</span></div><button class="alt-wide">Volver al altar</button></div>'''


def result_c():
    return f'''<h1>Altar de Fusión</h1><div class="card alt-res-c" style="--rc:{COMMON}"><div class="medal"><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="74" class="t"/><circle cx="80" cy="80" r="74" class="f" pathLength="100" style="stroke-dasharray:100 100"/></svg><img src="{R["img"]}" alt="" /><em>EXCESO</em></div>
      <strong class="ttl">¡Fusión completada!</strong><span class="nm">{R["name"]}</span>{pips(1, 5, "rar big")}<span class="sci">Rareza Común · +{R["xp"]} XP</span><button class="alt-wide">Volver al altar</button></div>'''


RESULT = [("0", "Actual", "Texto plano apilado: título, imagen, tres líneas de datos y un botón."),
          ("1", "A · Carta revelada", "La criatura es la protagonista: marco y reflejo con el color de la rareza, datos en tres fichas."),
          ("2", "B · Cinco en una", "Muestra lo que ocurrió: las cinco cartas Balance se convierten en una carta Exceso."),
          ("3", "C · Medalla", "Un anillo cerrado alrededor de la criatura, con pips de rareza; lo mínimo y lo más limpio.")]
RESULT_FN = {"0": result_actual, "1": result_a, "2": result_b, "3": result_c}


def result_cols():
    return "".join(f'<article class="col"><h3>{t}</h3><p>{d}</p><div class="phone has-header">{HEADER}<div class="page">{RESULT_FN[v]()}</div></div></article>' for v, t, d in RESULT)


CSS = r"""
:root { --slow: 1; }
body { background: #07110a; padding: 24px 16px 64px; font-family: system-ui, sans-serif; }
h1.top { font: 800 2rem 'Barlow Condensed', system-ui; margin: 0 0 .3rem; }
.intro { max-width: 54rem; color: #b9d3c0; margin: 0 0 2rem; line-height: 1.5; }
h2.sec { font: 800 1.6rem 'Barlow Condensed', system-ui; margin: 2.5rem 0 .3rem; color: #86efac; }
.sub { color: #9fc0a8; margin: 0 0 1.2rem; max-width: 54rem; }
.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(390px, 390px)); gap: 1.6rem; justify-content: start; align-items: start; }
.col h3 { margin: 0 0 .2rem; font: 800 1.35rem 'Barlow Condensed', system-ui; }
.col p { margin: 0 0 .8rem; font-size: .9rem; color: #b9d3c0; max-width: 390px; }
.phone { position: relative; width: 390px; border-radius: 28px; border: 1px solid rgba(255,255,255,.12); background: radial-gradient(120% 50% at 50% 0%, rgba(63,174,90,.3), transparent 60%), linear-gradient(170deg, #1c3624, #0f2115); overflow: hidden; padding-bottom: 1rem; }
.phone .page { min-height: 0; padding: 1rem 1rem .6rem; }
.phone.has-header .page { padding-top: .4rem; }
.phone .page-header { padding-top: 1rem; }
.state { display: block; margin: .2rem 0 .5rem; font-size: .68rem; letter-spacing: .06em; text-transform: uppercase; color: #7fa98a; }
.phone .page > .state:not(:first-child) { margin-top: 1.4rem; }
.phone h1 { font-size: 2rem; margin: 1rem 0 .8rem; }
.alt-h2 { font: 800 1.15rem 'Barlow Condensed', system-ui; letter-spacing: .04em; text-transform: uppercase; color: #9fc0a8; margin: 1.1rem 0 .5rem; }
.alt-foot { margin: 1rem 0 0; font-size: .78rem; color: #7fa98a; text-align: center; }
.pips { display: inline-flex; gap: 4px; }
.pips i { width: 14px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.16); }
.pips i.on { background: linear-gradient(180deg, #7fe0a0, #3fae5a); box-shadow: 0 0 6px rgba(63,174,90,.55); }
.pips.rar i { width: 7px; height: 7px; border-radius: 50%; } .pips.rar i.on { background: var(--rc, #bfe6c9); box-shadow: 0 0 6px var(--rc, #bfe6c9); }
.pips.big i { width: 10px; height: 10px; } .pips.big i.on { background: var(--rc); box-shadow: 0 0 8px var(--rc); }
.chip { display: inline-block; padding: .18rem .7rem; border-radius: 999px; font: 800 .8rem 'Barlow Condensed', system-ui; letter-spacing: .1em; background: #3fae5a; color: #06120a; }
.alt-wide { width: 100%; padding: .85rem 1rem; font-size: 1.05rem; font-weight: 800; }

/* ---- fila común (A) ---- */
.alt-row { display: flex; align-items: center; gap: .75rem; padding: .55rem 0; border-top: 1px solid rgba(255,255,255,.07); }
.alt-row:first-of-type { border-top: 0; }
.alt-row .th { width: 52px; height: 52px; border-radius: 12px; object-fit: cover; flex: none; border: 1px solid rgba(255,255,255,.14); }
.alt-row .th.big { width: 64px; height: 64px; }
.alt-row .mid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .3rem; }
.alt-row .mid b { font: 800 1.1rem/1.1 'Barlow Condensed', system-ui; }
.alt-row .mid small { font-size: .72rem; color: #7fa98a; }
.alt-row em { font-style: normal; font-size: .82rem; color: #9fc0a8; white-space: nowrap; }
.alt-row.ready button { padding: .6rem 1rem; flex: none; }
.alt-row.ready .th { border-color: #ffd54a; box-shadow: 0 0 12px rgba(255,213,74,.35); }
.alt-list { padding-top: .5rem; padding-bottom: .5rem; }
.alt-altar-a .alt-head { display: flex; align-items: center; gap: .8rem; margin-bottom: .6rem; }
.alt-altar-a .alt-head img { width: 56px; height: 56px; object-fit: contain; }
.alt-altar-a.is-ready .alt-head img { filter: drop-shadow(0 0 10px rgba(63,174,90,.7)); }
.alt-altar-a .alt-head strong { display: block; font-size: 1.15rem; } .alt-altar-a .alt-head span { font-size: .8rem; color: #9fc0a8; }
.alt-altar-a.is-ready { border-color: rgba(63,174,90,.6); background: radial-gradient(120% 140% at 0% 0%, rgba(63,174,90,.25), transparent 60%), linear-gradient(180deg, rgba(20,34,24,.95), rgba(15,26,18,.98)); box-shadow: 0 0 22px rgba(63,174,90,.25); }

/* ---- ranuras (B) ---- */
.alt-altar-b { display: flex; flex-direction: column; align-items: center; text-align: center; gap: .35rem; }
.alt-b-top img { width: 84px; height: 84px; object-fit: contain; filter: drop-shadow(0 0 12px rgba(63,174,90,.4)); }
.alt-altar-b.is-ready .alt-b-top img { filter: drop-shadow(0 0 16px rgba(255,200,80,.85)); }
.alt-b-title { font: 800 1.45rem 'Barlow Condensed', system-ui; }
.alt-altar-b.is-ready .alt-b-title { color: #ffd86b; }
.alt-b-sub { font-size: .82rem; color: #9fc0a8; }
.slots { display: flex; gap: .45rem; margin: .5rem 0 .6rem; justify-content: center; }
.slot { width: 50px; height: 50px; border-radius: 50%; border: 2px dashed rgba(255,255,255,.25); background: rgba(255,255,255,.04); overflow: hidden; display: block; }
.slot.on { border: 2px solid #3fae5a; box-shadow: 0 0 10px rgba(63,174,90,.55); }
.slot img { width: 100%; height: 100%; object-fit: cover; display: block; }
.alt-altar-b.is-ready .slot.on { border-color: #ffd54a; box-shadow: 0 0 12px rgba(255,213,74,.6); }
.alt-note { font-size: .85rem; color: #9fc0a8; }
.alt-big .alt-b-art { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; border-radius: 12px; border: 2px solid #ffd54a; box-shadow: 0 0 22px rgba(255,213,74,.3); margin-top: .2rem; }
.alt-big .slot { width: 46px; height: 46px; }
.alt-chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; }
.alt-chip { text-align: center; padding: .7rem .3rem; border-radius: 16px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.09); }
.alt-chip .rw { position: relative; width: 52px; height: 52px; margin: 0 auto .35rem; }
.alt-chip .rw svg { position: absolute; inset: 0; transform: rotate(-90deg); }
.alt-chip .rw img { position: absolute; inset: 6px; width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.alt-chip b { display: block; font: 800 .95rem 'Barlow Condensed', system-ui; } .alt-chip small { font-size: .72rem; color: #7fa98a; }
.r .t { fill: none; stroke: rgba(255,255,255,.14); stroke-width: 5; } .r .f { fill: none; stroke: #7fc891; stroke-width: 5; stroke-linecap: round; filter: drop-shadow(0 0 3px rgba(127,200,145,.7)); }

/* ---- brasas (C) ---- */
.alt-altar-c { position: relative; display: flex; align-items: center; gap: .9rem; overflow: hidden; }
.alt-c-img img { width: 78px; height: 78px; border-radius: 16px; object-fit: cover; border: 2px solid #ffd54a; display: block; }
.alt-c-text { display: flex; flex-direction: column; gap: .15rem; flex: 1; min-width: 0; }
.alt-c-text strong { font: 800 1.3rem/1.1 'Barlow Condensed', system-ui; }
.alt-c-text > span { font-size: .8rem; color: #9fc0a8; }
.alt-c-text .chip { align-self: flex-start; background: #ffd54a; margin-bottom: .2rem; }
.alt-c-count { font-weight: 700; color: #f2f6f3 !important; }
.alt-altar-c .go { font: 800 2rem 'Barlow Condensed', system-ui; color: #ffd86b; }
.alt-altar-c.is-ready { border-color: rgba(255,213,74,.7); background: linear-gradient(180deg, rgba(40,32,12,.95), rgba(15,26,18,.98)); animation: alt-ember 2.6s ease-in-out infinite; }
.alt-altar-c .glow { position: absolute; inset: -40% -10% auto -10%; height: 90%; background: radial-gradient(closest-side, rgba(255,160,50,.4), transparent); pointer-events: none; }
@keyframes alt-ember { 50% { box-shadow: 0 0 26px rgba(255,170,60,.45); } }
.alt-c-ring { position: relative; width: 72px; height: 72px; flex: none; }
.alt-c-ring svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.alt-c-ring img { position: absolute; inset: 8px; width: 56px; height: 56px; border-radius: 50%; object-fit: cover; }

/* ---- cartas apiladas (pantalla C) ---- */
.alt-stacks { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
.alt-stack { padding: .8rem .7rem; border-radius: 18px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09); display: flex; flex-direction: column; gap: .5rem; text-align: center; }
.alt-stack.is-ready { grid-column: 1 / -1; border: 2px solid #ffd54a; box-shadow: 0 0 20px rgba(255,213,74,.25); }
.alt-stack .fan { position: relative; height: 138px; }
.alt-stack .fan img { position: absolute; left: 50%; top: 6px; width: 78px; height: 104px; margin-left: -39px; object-fit: cover; border-radius: 10px; border: 2px solid rgba(255,255,255,.35); box-shadow: 0 4px 10px rgba(0,0,0,.5); transform: rotate(calc((var(--k) - 2) * 9deg)) translateX(calc((var(--k) - 2) * 12px)); transform-origin: 50% 110%; }
.alt-stack.is-ready .fan { height: 156px; } .alt-stack.is-ready .fan img { width: 90px; height: 118px; margin-left: -45px; border-color: #ffd54a; }
.alt-stack .cnt { position: absolute; right: 8px; top: 0; z-index: 9; padding: .1rem .55rem; border-radius: 999px; background: #0a140c; border: 1px solid rgba(127,200,145,.6); font: 800 .9rem 'Barlow Condensed', system-ui; }
.alt-stack.is-ready .cnt { background: #ffd54a; color: #06120a; border-color: #ffd54a; }
.alt-stack b { font: 800 1.05rem/1.1 'Barlow Condensed', system-ui; }

/* ---- resultado ---- */
.alt-res-a, .alt-res-b, .alt-res-c { display: flex; flex-direction: column; align-items: center; text-align: center; gap: .55rem; border: 2px solid var(--rc); box-shadow: 0 0 28px color-mix(in srgb, var(--rc) 40%, transparent); }
.alt-res-a .art { position: relative; width: 100%; border-radius: 16px; overflow: hidden; border: 3px solid var(--rc); box-shadow: 0 0 18px color-mix(in srgb, var(--rc) 55%, transparent); }
.alt-res-a .art img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
.alt-res-a .foil { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.28) 46%, transparent 60%); }
.nm { font: 800 1.6rem/1.1 'Barlow Condensed', system-ui; } .sci { font-size: .82rem; color: #9fc0a8; font-style: italic; }
.facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; width: 100%; margin: .2rem 0; }
.facts > div { padding: .5rem .2rem; border-radius: 12px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.09); display: flex; flex-direction: column; align-items: center; gap: .2rem; }
.facts small { font-size: .62rem; letter-spacing: .05em; text-transform: uppercase; color: #7fa98a; } .facts b { font: 800 1.15rem 'Barlow Condensed', system-ui; }
.facts.one { display: flex; justify-content: center; gap: 1.2rem; font-size: .9rem; color: #b9d3c0; } .facts.one b { color: #f2f6f3; }
.alt-res-b .ins { display: flex; justify-content: center; padding-left: 1.4rem; }
.alt-res-b .ins img { width: 54px; height: 72px; margin-left: -1.4rem; object-fit: cover; border-radius: 8px; border: 2px solid rgba(255,255,255,.3); opacity: .6; transform: rotate(calc((var(--k) - 2) * 4deg)); }
.alt-res-b .arrow { color: #ffd86b; font-size: 1.1rem; }
.alt-res-b .out img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 16px; border: 3px solid var(--rc); box-shadow: 0 0 20px color-mix(in srgb, var(--rc) 55%, transparent); }
.alt-res-b .out { width: 100%; }
.alt-res-c .medal { position: relative; width: 190px; height: 190px; margin-top: .3rem; }
.alt-res-c .medal svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.alt-res-c .medal .t { fill: none; stroke: rgba(255,255,255,.12); stroke-width: 6; } .alt-res-c .medal .f { fill: none; stroke: var(--rc); stroke-width: 6; stroke-linecap: round; filter: drop-shadow(0 0 8px var(--rc)); }
.alt-res-c .medal img { position: absolute; inset: 14px; width: 162px; height: 162px; border-radius: 50%; object-fit: cover; }
.alt-res-c .medal em { position: absolute; left: 50%; bottom: -10px; transform: translateX(-50%); padding: .12rem .8rem; border-radius: 999px; background: var(--rc); color: #06120a; font: 800 .85rem 'Barlow Condensed', system-ui; font-style: normal; letter-spacing: .1em; }
.alt-res-c .ttl { margin-top: .9rem; font: 800 1.1rem 'Barlow Condensed', system-ui; letter-spacing: .08em; text-transform: uppercase; color: #86efac; }
.alt-res-c .nm { font-size: 1.9rem; }
@media (prefers-reduced-motion: reduce) { .alt-altar-c.is-ready { animation: none; } }
"""


def font_faces():
    css = []
    for fam, wt, pkg, fn in build.FONTS:
        data = base64.b64encode((ROOT / f"node_modules/@fontsource/{pkg}/files/{fn}").read_bytes()).decode()
        css.append(f"@font-face{{font-family:'{fam}';font-weight:{wt};font-style:normal;src:url(data:font/woff2;base64,{data}) format('woff2');}}")
    return "\n".join(css)


def main():
    uris = build.shrink_images()
    index_css = (ROOT / "src/index.css").read_text(encoding="utf-8")
    html = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ecorex · Altar de Fusión (maqueta enfocada)</title>
<style>
{font_faces()}
{index_css}
{CSS}
</style></head>
<body>
<h1 class="top">Altar de Fusión</h1>
<p class="intro">Las tres apariciones del altar, cada una con «Actual» y tres alternativas, a ancho de móvil (390 px). Los datos son los de la captura que motivó el rediseño: Destello del Pantano lista (5/5), y Hustor de Umbra 4/5, Tricera de las Lágrimas 3/5 y Rex de Fuego 2/5 en progreso. Arte real de las especies. Nada de esto está aplicado a la app.</p>

<h2 class="sec">1 · El altar en Inicio</h2>
<p class="sub">Cada columna enseña los dos estados: con una fusión lista y sin ninguna lista todavía.</p>
<section class="row">{home_cols()}</section>

<h2 class="sec">2 · La pantalla del Altar</h2>
<p class="sub">Con una especie lista y tres en progreso, como en la captura.</p>
<section class="row">{screen_cols()}</section>

<h2 class="sec">3 · Fusión completada</h2>
<p class="sub">El momento después de pulsar «Fusionar»: la fusión de Destello del Pantano, fase Exceso, rareza Común, +15 XP (el valor real para esa rareza).</p>
<section class="row">{result_cols()}</section>
</body></html>"""
    OUT.write_text(build.fill(html, uris), encoding="utf-8")
    print(OUT, OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()

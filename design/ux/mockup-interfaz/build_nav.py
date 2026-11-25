"""Maqueta enfocada de la barra inferior (design/ux/mockup-barra-inferior-2026-11.html).

    python3 design/ux/mockup-interfaz/build_nav.py     # desde la raíz del repo

Dos piezas, todas las opciones a la vista y a ancho de móvil (390 px): la barra completa y el botón de Percibir.
Usa el CSS real (src/index.css), las fuentes de la app y los iconos reales. Autocontenida. Solo escribe en design/ux/.
"""
import base64
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
import build  # noqa: E402

OUT = ROOT / "design/ux/mockup-barra-inferior-2026-11.html"

LINE = {
    "home": '<path d="M3 11.5 12 4l9 7.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" stroke-linecap="round" stroke-linejoin="round"/>',
    "eye": '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" stroke-linejoin="round"/><circle cx="12" cy="12" r="3"/>',
    "dex": '<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>',
}
svg = lambda k: f'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2">{LINE[k]}</svg>'

TABS = [("inicio", "Inicio", "home", None), ("percibir", "Percibir", "eye", "{{img:ic_percibir}}"), ("ecodex", "EcoDex", "dex", "{{img:ic_ecodex}}"), ("yo", "Yo", None, "{{img:avatar}}")]


def bar(active, cls="", icons="real", badges=True, ring=None):
    """active: índice de la pestaña activa (o -1). ring: fracción de energía (0..1) si el botón Percibir lleva anillo."""
    tabs = []
    for i, (key, label, line, img) in enumerate(TABS):
        is_active = i == active
        if key == "yo":
            icon = f'<img src="{img}" alt="" class="bottom-nav-avatar" />'
        elif icons == "line":
            icon = svg(line)
        elif img:
            icon = f'<img src="{img}" alt="" />'
        else:
            icon = svg("home")
        extra = ""
        if key == "percibir" and ring is not None:
            pct = round(ring * 100)
            extra = (f'<svg class="en-ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" class="t"/>'
                     f'<circle cx="24" cy="24" r="21" class="f" pathLength="100" style="stroke-dasharray:{pct} 100"/></svg>')
        badge = ""
        if badges and key == "inicio":
            badge = '<span class="bottom-nav-badge">3</span>'
        elif badges and key == "percibir" and (ring is None or ring > 0):
            badge = '<span class="bottom-nav-badge"></span>'
        tabs.append(
            f'<button class="bottom-nav-tab tab-{key}{" bottom-nav-tab-active" if is_active else ""}" {"aria-current=page" if is_active else ""}>'
            f'<span class="bottom-nav-icon">{extra}{icon}{badge}</span><span class="bottom-nav-label">{label}</span></button>')
    off = " bottom-nav-pill-off" if active < 0 else ""
    return (f'<nav class="bottom-nav {cls}" aria-label="Navegación principal" style="--nav-i:{max(active, 0)}">'
            f'<i class="bottom-nav-pill{off}" aria-hidden="true"></i>{"".join(tabs)}</nav>')


def scene(label, nav_html):
    return f'<div class="scene"><span class="state">{label}</span><div class="ghost"><i></i><i></i></div>{nav_html}</div>'


# ---------------- pieza 1: barra completa ----------------
BARS = [("0", "Actual", "Barra pegada al borde, píldora que se desliza, casa de línea junto a tres iconos ilustrados.", dict()),
        ("1", "A · Barra flotante", "Una píldora separada del borde con sombra: se siente más ligera y no corta el contenido.", dict(cls="nav-float")),
        ("2", "B · Iconos de línea", "Los cuatro iconos con el mismo trazo (el avatar se queda): se acaba la mezcla de estilos.", dict(cls="nav-line", icons="line")),
        ("3", "C · Pestaña activa ampliada", "Solo la activa muestra su etiqueta, en una píldora ancha; las demás quedan en icono.", dict(cls="nav-expand"))]


def bars_cols():
    out = []
    for v, t, d, kw in BARS:
        out.append(f'<article class="col"><h3>{t}</h3><p>{d}</p><div class="phone">'
                   f'{scene("Inicio activa, con avisos", bar(0, **kw))}{scene("EcoDex activa", bar(2, **kw))}</div></article>')
    return "".join(out)


# ---------------- pieza 2: botón de Percibir ----------------
BTNS = [("0", "Actual", "Un ojo de 26 px igual que los demás; solo un punto avisa de que hay energía.", dict()),
        ("1", "A · Ojo elevado", "El ojo en un círculo de 56 px que sobresale de la barra: es la acción principal del juego.", dict(cls="btn-raised")),
        ("2", "B · Anillo de energía", "Un anillo alrededor del ojo que se vacía con la energía y brilla cuando está llena.", dict(cls="btn-ring")),
        ("3", "C · Ojo que despierta", "El ojo, más grande, parpadea y brilla si hay energía; sin energía se queda cerrado y apagado.", dict(cls="btn-awake"))]


def btn_cols():
    out = []
    for v, t, d, kw in BTNS:
        ring = lambda f: f if v == "2" else None
        full = bar(0, ring=ring(1.0), **kw)
        empty = bar(1, ring=ring(0.0), **{**kw, "cls": kw.get("cls", "") + " no-energy", "badges": False})
        out.append(f'<article class="col"><h3>{t}</h3><p>{d}</p><div class="phone">'
                   f'{scene("Con energía (3/3)", full)}{scene("Sin energía, en Percibir", empty)}</div></article>')
    return "".join(out)


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
.phone { width: 390px; display: flex; flex-direction: column; gap: 1rem; }
.scene { position: relative; height: 190px; border-radius: 22px; overflow: hidden; border: 1px solid rgba(255,255,255,.12); background: radial-gradient(120% 70% at 50% 0%, rgba(63,174,90,.3), transparent 60%), linear-gradient(170deg, #1c3624, #0f2115); }
.scene .state { position: absolute; z-index: 5; left: 12px; top: 8px; font-size: .66rem; letter-spacing: .06em; text-transform: uppercase; color: #7fa98a; }
.scene .ghost { position: absolute; inset: 30px 16px auto; display: grid; gap: .5rem; opacity: .5; }
.scene .ghost i { display: block; height: 38px; border-radius: 14px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); }
/* la barra real es fixed: aquí vive dentro de su escena */
.scene .bottom-nav { position: absolute; left: 0; right: 0; bottom: 0; max-width: none; padding-bottom: .4rem; }
.scene .bottom-nav-pill { bottom: .4rem; }

/* ---- pieza 1 ---- */
/* A · flotante */
.nav-float.bottom-nav { left: 12px; right: 12px; bottom: 10px; border: 1px solid rgba(255,255,255,.12); border-radius: 26px; background: rgba(14,26,18,.92); box-shadow: 0 10px 30px rgba(0,0,0,.55); }
.nav-float .bottom-nav-pill { border-radius: 20px; }
/* B · iconos de línea */
.nav-line .bottom-nav-icon svg { display: block; }
.nav-line .bottom-nav-tab-active { color: #86efac; }
/* C · activa ampliada */
.nav-expand .bottom-nav-pill { display: none; }
.nav-expand .bottom-nav-tab { flex: 1; flex-direction: column; justify-content: center; }
.nav-expand .bottom-nav-label { display: none; }
.nav-expand .bottom-nav-tab-active { flex: 2.6; flex-direction: row; gap: .5rem; border-radius: 16px; background: rgba(127,200,145,.14); border: 1px solid rgba(127,200,145,.3); }
.nav-expand .bottom-nav-tab-active .bottom-nav-label { display: block; font-size: .85rem; font-weight: 800; color: #bfe6c9; }
.nav-expand .bottom-nav-tab-active .bottom-nav-icon { transform: none; }

/* ---- pieza 2 ---- */
/* A · ojo elevado */
.btn-raised.bottom-nav { overflow: visible; }
.btn-raised .tab-percibir .bottom-nav-icon { width: 56px; height: 56px; margin-top: -30px; border-radius: 50%; background: linear-gradient(#10241a, #10241a) padding-box, linear-gradient(135deg, #3fae5a, #4fa9e0) border-box; border: 3px solid transparent; box-shadow: 0 6px 18px rgba(0,0,0,.55), 0 0 18px rgba(63,174,90,.45); }
.btn-raised .tab-percibir .bottom-nav-icon img { width: 36px; height: 36px; }
.btn-raised .tab-percibir.bottom-nav-tab-active .bottom-nav-icon { transform: scale(1.06); }
.btn-raised.no-energy .tab-percibir .bottom-nav-icon { box-shadow: 0 6px 18px rgba(0,0,0,.55); filter: grayscale(.7) brightness(.8); }
/* B · anillo de energía */
.btn-ring .tab-percibir .bottom-nav-icon { width: 42px; height: 42px; margin: -8px 0; translate: 0 -4px; }
.btn-ring .tab-percibir .bottom-nav-icon img { width: 30px; height: 30px; }
.en-ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); pointer-events: none; }
.en-ring .t { fill: none; stroke: rgba(255,255,255,.14); stroke-width: 3; }
.en-ring .f { fill: none; stroke: #7fc891; stroke-width: 3; stroke-linecap: round; filter: drop-shadow(0 0 4px rgba(127,200,145,.8)); }
.btn-ring .tab-percibir .bottom-nav-icon { animation: nav-full 2.6s ease-in-out infinite; }
.btn-ring.no-energy .tab-percibir .bottom-nav-icon { animation: none; }
.btn-ring.no-energy .tab-percibir img { filter: grayscale(1) brightness(.7); }
@keyframes nav-full { 50% { filter: drop-shadow(0 0 8px rgba(127,200,145,.9)); } }
/* C · ojo que despierta */
.btn-awake .tab-percibir .bottom-nav-icon { width: 40px; height: 40px; margin: -7px 0; }
.btn-awake .tab-percibir .bottom-nav-icon img { filter: drop-shadow(0 0 8px rgba(127,230,150,.75)); animation: nav-blink 4.6s ease-in-out infinite; transform-origin: 50% 50%; }
.btn-awake.no-energy .tab-percibir .bottom-nav-icon img { filter: grayscale(1) brightness(.6); animation: none; transform: scaleY(.22); }
@keyframes nav-blink { 0%, 90%, 100% { transform: scaleY(1); } 94% { transform: scaleY(.1); } }
.bottom-nav-tab-active .bottom-nav-icon { transition: none; }
@media (prefers-reduced-motion: reduce) { .btn-ring .tab-percibir .bottom-nav-icon, .btn-awake .tab-percibir .bottom-nav-icon img { animation: none; } }
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
<title>Ecorex · Barra inferior (maqueta enfocada)</title>
<style>
{font_faces()}
{index_css}
{CSS}
</style></head>
<body>
<h1 class="top">Barra inferior</h1>
<p class="intro">Las dos piezas por separado, cada una con «Actual» y tres alternativas, a ancho de móvil (390 px). Las barras son las reales (CSS de la app); cada columna enseña dos estados. Nada de esto está aplicado a la app.</p>

<h2 class="sec">1 · La barra completa</h2>
<p class="sub">Con Inicio activa (y sus avisos) y con EcoDex activa: así se ve cómo se mueve la selección.</p>
<section class="row">{bars_cols()}</section>

<h2 class="sec">2 · El botón de Percibir</h2>
<p class="sub">Con energía llena y sin energía (en la propia pantalla de Percibir). Se ve sobre la barra actual, para juzgar solo el botón.</p>
<section class="row">{btn_cols()}</section>
</body></html>"""
    OUT.write_text(build.fill(html, uris), encoding="utf-8")
    print(OUT, OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()

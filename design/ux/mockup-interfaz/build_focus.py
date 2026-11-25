"""Maqueta enfocada: solo la campana de notificaciones y el perfil (design/ux/mockup-campana-perfil-2026-11.html).

    python3 design/ux/mockup-interfaz/build_focus.py     # desde la raíz del repo

Reutiliza las piezas de la maqueta única (app.html, variants.css) pero sin ejes ni iframe: todas las opciones
a la vista, a tamaño grande. Autocontenida (imágenes y fuentes incrustadas). Solo escribe en design/ux/.
"""
import base64
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
import build  # noqa: E402  (shrink_images / fill / FONTS)

OUT = ROOT / "design/ux/mockup-campana-perfil-2026-11.html"


def font_faces():
    css = []
    for fam, wt, pkg, fn in build.FONTS:
        data = base64.b64encode((ROOT / f"node_modules/@fontsource/{pkg}/files/{fn}").read_bytes()).decode()
        css.append(f"@font-face{{font-family:'{fam}';font-weight:{wt};font-style:normal;src:url(data:font/woff2;base64,{data}) format('woff2');}}")
    return "\n".join(css)


def scope(css):
    return css.replace("#mk", ".mk")


def main():
    uris = build.shrink_images()
    app = (HERE / "app.html").read_text(encoding="utf-8")
    variants = (HERE / "variants.css").read_text(encoding="utf-8")
    index_css = (ROOT / "src/index.css").read_text(encoding="utf-8")

    # --- piezas de CSS de la maqueta única que hacen falta (anillo, fichas, campana base, campana y perfil nuevos)
    lines = variants.splitlines()
    pick = lambda needle: next(l for l in lines if needle in l)
    base_css = "\n".join(pick(n) for n in [
        ".mk-hud-chip svg, #mk .mk-ringwrap svg",
        "#mk .mk-ring-track",
        "#mk .mk-ring-fill",
        "#mk .mk-ringwrap {",
        "#mk .mk-ringwrap img",
        "#mk .mk-chip {",
        "#mk .mk-chip small",
        "#mk .mk-big {",
        "#mk .mk-hbadge, #mk .mk-edge b",
        "#mk .mk-hbadge {",
        "@keyframes mk-bell",
    ])
    marker = "Campana · icono (eje"
    new_css = variants[variants.index("/* =====", variants.index(marker) - 200):]
    # sin ejes: las reglas por clase de eje siguen valiendo (bell-N / prof-N en cada móvil)
    new_css = new_css.replace(":is(.bell-1, .bell-2, .bell-3) .mk-hud { display: block; }", "")
    new_css = re.sub(r"#mk:is\(\.bell-1, \.bell-2, \.bell-3\) \.mk-hud-chip \{[^}]*\}\n", "", new_css)

    # --- cabecera: campana (marcado real de la maqueta) + anillo de nivel
    bell_html = re.search(r'<button class="mk-hdr-bell".*?</button>', app, re.S).group(0)
    ring = '<div class="demo-ring"><svg viewBox="0 0 44 44" width="44" height="44"><circle cx="22" cy="22" r="19" class="level-hud-track"/><circle cx="22" cy="22" r="19" class="level-hud-fill" pathLength="100" style="stroke-dasharray:43 100"/></svg><b>4</b></div>'
    strip = lambda cls: f'<div class="mk {cls}"><div class="strip">{bell_html}{ring}</div></div>'

    bells = [("0", "Actual", "Medallón ilustrado de 30 px dentro de un círculo de 44 px. A ese tamaño se ve como una mancha oscura."),
             ("1", "A · Medallón grande", "El mismo icono ilustrado, recortado para llenar un círculo de 56 px con borde dorado. Mantiene el arte del juego."),
             ("2", "B · Campana clara", "Glifo de campana dorado sobre fondo oscuro, 54 px. Se reconoce al instante. Mi recomendación."),
             ("3", "C · Campana con etiqueta", "Campana más el texto «AVISOS» en una píldora. No hay que adivinar nada, pero ocupa más ancho.")]
    bell_rows = "".join(
        f'<article class="opt"><h3>{t}</h3><p>{d}</p>'
        f'<div class="real"><span>Tamaño real</span>{strip("bell-" + v)}</div>'
        f'<div class="zoomwin"><span>Ampliado ×2,4</span><div class="zin">{strip("bell-" + v)}</div></div></article>'
        for v, t, d in bells)

    # --- perfil: el .page de la sección «perfil» de la maqueta, completo; la clase prof-N elige cuál se ve
    sec = app[app.index('<section class="mk-scr" data-s="perfil"'):app.index("<!-- ========== GALERÍA DE BOTONES")]
    page = re.search(r'<div class="page">(.*)</div>\s*</section>', sec, re.S).group(1)
    profs = [("0", "Actual", "Tarjetas con texto."),
             ("1", "A · Panel con anillos", "Dos donuts, dos fichas y la rareza como barra apilada. Mi recomendación."),
             ("2", "B · Cuadro de mando", "Cuatro baldosas con mini barra y la rareza en columnas."),
             ("3", "C · Tarjeta de coleccionista", "Avatar grande con anillo, casillas encendidas y barras de rareza.")]
    prof_cols = "".join(
        f'<article class="phone-col"><h3>{t}</h3><p>{d}</p>'
        f'<div class="mk prof-{v} phone"><div class="top">{bell_html}{ring}</div><div class="page">{page}</div></div></article>'
        for v, t, d in profs)

    html = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ecorex · Campana y perfil (maqueta enfocada)</title>
<style>
{font_faces()}
{index_css}
/* ---- base de la maqueta enfocada ---- */
:root {{ --slow: 1; }}
body {{ background: #07110a; padding: 24px 16px 64px; font-family: system-ui, sans-serif; }}
h1 {{ font: 800 2rem 'Barlow Condensed', system-ui; margin: 0 0 .3rem; }}
.intro {{ max-width: 52rem; color: #b9d3c0; margin: 0 0 2rem; line-height: 1.5; }}
h2 {{ font: 800 1.6rem 'Barlow Condensed', system-ui; margin: 2.5rem 0 .3rem; color: #86efac; }}
.sub {{ color: #9fc0a8; margin: 0 0 1.2rem; max-width: 52rem; }}
.opts {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 430px), 1fr)); gap: 1.2rem; }}
.opt {{ background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-radius: 18px; padding: 1rem 1.1rem 1.2rem; }}
.opt h3, .phone-col h3 {{ margin: 0 0 .2rem; font: 800 1.35rem 'Barlow Condensed', system-ui; }}
.opt p, .phone-col p {{ margin: 0 0 .8rem; font-size: .9rem; color: #b9d3c0; }}
.opt span {{ display: block; font-size: .7rem; letter-spacing: .06em; text-transform: uppercase; color: #7fa98a; margin: .7rem 0 .3rem; }}
.mk {{ position: relative; }}
.strip {{ position: relative; width: 390px; max-width: 100%; height: 78px; border-radius: 14px; background: linear-gradient(160deg, #24563a, #17361f); overflow: hidden; }}
.mk .mk-hdr-bell {{ display: grid; place-items: center; position: absolute; z-index: 2; top: 10px; right: 66px; width: 44px; height: 44px; padding: 0; border-radius: 50%; background: rgba(10,20,13,.86); border: 1px solid rgba(127,200,145,.38); box-shadow: 0 4px 14px rgba(0,0,0,.45); }}
.mk .mk-hdr-bell img {{ width: 30px; height: 30px; object-fit: contain; }}
.mk .mk-hbadge {{ position: absolute; top: -5px; right: -5px; }}
.demo-ring {{ position: absolute; top: 10px; right: 12px; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; background: rgba(10,20,13,.88); box-shadow: 0 4px 14px rgba(0,0,0,.45); z-index: 1; }}
.demo-ring svg {{ position: absolute; inset: 0; transform: rotate(-90deg); }}
.demo-ring b {{ position: relative; font: 800 1.1rem 'Barlow Condensed', system-ui; }}
.zoomwin {{ position: relative; height: 224px; overflow: hidden; border-radius: 14px; }}
.zoomwin span {{ position: absolute; z-index: 3; left: 8px; top: 2px; margin: 0; }}
.zin {{ position: absolute; right: 0; top: 24px; zoom: 2.4; }}
.zin .strip {{ border-radius: 0; }}
.cols {{ display: flex; gap: 1.4rem; overflow-x: auto; padding-bottom: 1rem; align-items: flex-start; }}
.phone-col {{ flex: none; width: 390px; }}
.phone {{ position: relative; width: 390px; border-radius: 28px; border: 1px solid rgba(255,255,255,.12); background: radial-gradient(120% 60% at 50% 0%, rgba(63,174,90,.3), transparent 60%), linear-gradient(170deg, #1c3624, #0f2115); overflow: hidden; }}
.phone .top {{ position: absolute; inset: 0 0 auto 0; height: 78px; z-index: 5; }}
.phone .page {{ min-height: 0; padding-bottom: 1.6rem; }}
{scope(base_css)}
{scope(new_css)}
</style></head>
<body>
<h1>Campana de notificaciones y perfil</h1>
<p class="intro">Solo las dos piezas, con todas las opciones a la vista. Cada campana se muestra a tamaño real y ampliada; cada perfil, completo y a ancho de móvil (390 px). «Actual» es lo que hay hoy en producción.</p>

<h2>1 · Campana</h2>
<p class="sub">Junto al anillo de nivel, en la esquina de arriba. La insignia roja es el contador de avisos sin leer.</p>
<section class="opts">{bell_rows}</section>

<h2>2 · Perfil (Yo)</h2>
<p class="sub">Desplázate hacia los lados si no caben todos. Las gráficas usan los colores de rareza de las cartas.</p>
<section class="cols">{prof_cols}</section>
</body></html>"""
    OUT.write_text(build.fill(html, uris), encoding="utf-8")
    print(OUT, OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()

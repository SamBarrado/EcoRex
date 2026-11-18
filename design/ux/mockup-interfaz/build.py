"""Monta la maqueta de interfaz de Ecorex (design/ux/mockup-interfaz-2026-11.html).

    python3 design/ux/mockup-interfaz/build.py          # desde la raíz del repo

1. Reduce las imágenes reales de public/ (sharp) y las incrusta como data URI, para que el HTML
   sea autocontenido (se abre con doble clic, sin servidor).
2. Sustituye {{img:clave}} en app.html y variants.css y escribe los resultados en .build/.
3. Llama al montador del skill /mockup con spec.json.

Solo escribe en design/ux/. No toca la app, ni la base de datos, ni nada desplegado.
"""
import base64
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BUILD = HERE / ".build"

# clave -> (ruta bajo public/, ancho máx. px, formato)
IMAGES = {
    "logo": ("logo/logo-ecorex.png", 260, "png"),
    "pack": ("cards/sobre.png", 260, "png"),
    "ic_percibir": ("icons/percibir.png", 72, "png"),
    "ic_ecodex": ("icons/mi-coleccion.png", 72, "png"),
    "ic_perfil": ("icons/perfil.png", 72, "png"),
    "ic_notif": ("icons/notificaciones.png", 120, "png"),
    "ic_altar": ("icons/altar-fusion.png", 90, "png"),
    "ic_album": ("icons/album.png", 90, "png"),
    "locked": ("icons/carta-bloqueada.png", 200, "png"),
    "fx_furia": ("icons/fractae/furia.png", 64, "png"),
    "fx_tristeza": ("icons/fractae/tristeza.png", 64, "png"),
    "fx_curiosidad": ("icons/fractae/curiosidad.png", 64, "png"),
    "fx_miedo": ("icons/fractae/miedo.png", 64, "png"),
    "tri_bal": ("species-art/triceratops-umbra/balance.webp", 380, "webp"),
    "tri_eco": ("species-art/triceratops-umbra/eco.webp", 380, "webp"),
    "rex_bal": ("species-art/tyrannosaurus-imperator/balance.webp", 380, "webp"),
    "rex_exc": ("species-art/tyrannosaurus-imperator/exceso.webp", 380, "webp"),
    "avatar": ("avatars/avatar-1.webp", 120, "webp"),
    "avatar2": ("avatars/avatar-2.webp", 120, "webp"),
    "avatar3": ("avatars/avatar-3.webp", 120, "webp"),
}

FONTS = [
    ("Barlow Condensed", 600, "barlow-condensed", "barlow-condensed-latin-600-normal.woff2"),
    ("Barlow Condensed", 700, "barlow-condensed", "barlow-condensed-latin-700-normal.woff2"),
    ("Barlow Condensed", 800, "barlow-condensed", "barlow-condensed-latin-800-normal.woff2"),
    ("Barlow", 400, "barlow", "barlow-latin-400-normal.woff2"),
]


def shrink_images():
    spec = {k: [str(ROOT / "public" / p), w, f] for k, (p, w, f) in IMAGES.items()}
    script = r"""
const sharp = require('sharp');
const spec = JSON.parse(process.argv[1]);
(async () => {
  const out = {};
  for (const [k, [file, w, fmt]] of Object.entries(spec)) {
    let img = sharp(file).resize({ width: w, withoutEnlargement: true });
    img = fmt === 'webp' ? img.webp({ quality: 72 }) : img.png({ compressionLevel: 9, palette: true, quality: 85 });
    out[k] = [fmt, (await img.toBuffer()).toString('base64')];
  }
  process.stdout.write(JSON.stringify(out));
})();
"""
    res = subprocess.run(["node", "-e", script, json.dumps(spec)], cwd=ROOT, capture_output=True, text=True)
    if res.returncode:
        sys.exit(res.stderr)
    return {k: f"data:image/{fmt};base64,{b}" for k, (fmt, b) in json.loads(res.stdout).items()}


def fill(src, uris):
    for k, v in uris.items():
        src = src.replace("{{img:%s}}" % k, v)
    if "{{img:" in src:
        sys.exit("Quedan marcadores {{img:...}} sin resolver")
    return src


def main():
    BUILD.mkdir(exist_ok=True)
    (BUILD / ".gitignore").write_text("*\n")
    uris = shrink_images()
    (BUILD / "app.html").write_text(fill((HERE / "app.html").read_text(encoding="utf-8"), uris), encoding="utf-8")
    # El onboarding vive en sus propios ficheros pero comparte el ámbito del JS principal (marcador @@ONBOARDING@@).
    css = (HERE / "variants.css").read_text(encoding="utf-8") + "\n" + (HERE / "onboarding.css").read_text(encoding="utf-8")
    (BUILD / "variants.css").write_text(fill(css, uris), encoding="utf-8")
    js = (HERE / "variants.js").read_text(encoding="utf-8")
    if "/* @@ONBOARDING@@ */" not in js:
        sys.exit("Falta el marcador /* @@ONBOARDING@@ */ en variants.js")
    (BUILD / "variants.js").write_text(js.replace("/* @@ONBOARDING@@ */", (HERE / "onboarding.js").read_text(encoding="utf-8")), encoding="utf-8")

    # Fuentes reales de la app (@fontsource), incrustadas por el montador.
    spec = json.loads((HERE / "spec.json").read_text(encoding="utf-8"))
    spec["variants_js"] = "design/ux/mockup-interfaz/.build/variants.js"
    spec["fonts"] = [
        {"family": fam, "weight": wt, "file": f"node_modules/@fontsource/{pkg}/files/{fn}"}
        for fam, wt, pkg, fn in FONTS
    ]
    (BUILD / "spec.built.json").write_text(json.dumps(spec, ensure_ascii=False, indent=1), encoding="utf-8")

    montar = Path.home() / ".claude/skills/mockup/montar.py"
    subprocess.run([sys.executable, "-I", str(montar), str(BUILD / "spec.built.json")], cwd=ROOT, check=True)


if __name__ == "__main__":
    main()

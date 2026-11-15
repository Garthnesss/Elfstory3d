#!/usr/bin/env python3
"""Build the full-3D standalone into docs/ for GitHub Pages.

Runs the standalone Vite build (vite.standalone.config.ts: every asset
inlined as data URIs), then inlines the JS/CSS into a single
docs/index.html alongside sw.js / manifest / icons from public/.
Re-run after any renderer change, then commit docs/.
"""
import re, shutil, subprocess, pathlib, sys

root = pathlib.Path(__file__).resolve().parent.parent
subprocess.run(["npx", "vite", "build", "--config", "vite.standalone.config.ts"],
               cwd=root, check=True)
dist = root / "dist-standalone"
html = (dist / "index.html").read_text()
assets = dist / "assets"
js = next(assets.glob("*.js")).read_text()
css = next(assets.glob("*.css")).read_text()
html, n_css = re.subn(r'<link[^>]+href="\./assets/[^"]+\.css"[^>]*>',
                      lambda m: "<style>\n" + css + "\n</style>", html)
html, n_js = re.subn(r'<script[^>]+src="\./assets/[^"]+\.js"[^>]*></script>',
                     lambda m: '<script type="module">\n' + js + "\n</script>", html)
assert n_css == 1 and n_js == 1 and "./assets/" not in html, (n_css, n_js)
docs = root / "docs"; docs.mkdir(exist_ok=True)
(docs / "index.html").write_text(html)
for name in ["sw.js", "manifest.webmanifest"]:
    shutil.copy(dist / name, docs / name)
shutil.copytree(dist / "icons", docs / "icons", dirs_exist_ok=True)
print(f"docs/index.html: {(docs / 'index.html').stat().st_size} bytes, "
      f"{html.count('data:image/jpeg')} JPGs inlined")

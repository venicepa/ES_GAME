const fs = require('fs');
const path = require('path');

const ORDER = ['gl.js', 'textures.js', 'map.js', 'roster.js', 'rooms.js', 'net.js', 'nav.js', 'remote.js', 'player.js', 'enemy.js', 'ui.js', 'render-gl.js', 'game.js', 'main-gl.js'];
const src_ = path.join(__dirname, 'src');

const code = ORDER.map((f) =>
  fs.readFileSync(path.join(src_, f), 'utf8')
    .replace(/^import[\s\S]*?from\s+'[^']+';\n/gm, '')
    .replace(/^export\s+/gm, '')
).join('\n');

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WebGL Deathmatch FPS</title>
<style>
  html, body { margin: 0; height: 100%; background: #0b0d12; overflow: hidden; }
  canvas { display: block; width: 100%; height: 100%; cursor: crosshair; }
</style>
</head>
<body>
<canvas id="game"></canvas>
<script>
(function () {
${code}
})();
</script>
</body>
</html>
`;

// 串接成單一作用域，同名的頂層宣告會互相踩到，先擋下來
const decls = new Map();
for (const f of ORDER) {
  const src = fs.readFileSync(path.join(src_, f), 'utf8');
  for (const m of src.matchAll(/^(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    const name = m[1];
    if (decls.has(name)) {
      console.error(`重複宣告：${name} 同時出現在 ${decls.get(name)} 與 ${f}`);
      process.exit(1);
    }
    decls.set(name, f);
  }
}

const out = path.join(__dirname, 'dist', 'fps-single.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('built', out, (html.length / 1024).toFixed(1) + ' KB');

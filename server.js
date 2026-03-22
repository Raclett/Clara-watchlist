const http = require('http');
const fs   = require('fs');
const path = require('path');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT    = 3000;

if (!API_KEY) {
  console.error('❌  Manque la clé API : ANTHROPIC_API_KEY=sk-ant-... node server.js');
  process.exit(1);
}

const MIME = { '.html':'text/html', '.js':'application/javascript',
               '.css':'text/css',   '.png':'image/png',
               '.jpg':'image/jpeg', '.webp':'image/webp',
               '.json':'application/json', '.webmanifest':'application/manifest+json' };

http.createServer(async (req, res) => {

  /* ── proxy Claude ── */
  if (req.method === 'POST' && req.url === '/.netlify/functions/claude') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const upstream = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 150,
            ...JSON.parse(body)
          })
        });
        const data = await upstream.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  /* ── fichiers statiques ── */
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('404'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log(`✅  Clara Watchlist → http://localhost:${PORT}`);
});

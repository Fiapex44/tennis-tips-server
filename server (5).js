const http = require("http");
const https = require("https");

const PORT = process.env.PORT || 3000;

function guessSurface(name = "") {
  const n = name.toLowerCase();
  if (n.includes("roland") || n.includes("madrid") || n.includes("rome") || n.includes("barcelona") || n.includes("clay") || n.includes("monte") || n.includes("hamburg") || n.includes("munich") || n.includes("sao paulo") || n.includes("morelia") || n.includes("alicante") || n.includes("split") || n.includes("bucaramanga") || n.includes("geneva") || n.includes("lyon")) return "clay";
  if (n.includes("wimbledon") || n.includes("grass") || n.includes("halle") || n.includes("queens") || n.includes("eastbourne") || n.includes("hertogenbosch")) return "grass";
  if (n.includes("indoor") || n.includes("rotterdam") || n.includes("paris") || n.includes("vienna") || n.includes("sofia") || n.includes("marseille")) return "indoor";
  return "hard";
}

function parseFlashscore(raw) {
  const result = [];
  const blocos = raw.split("~AA÷").slice(1);
  for (const bloco of blocos) {
    try {
      const campos = {};
      bloco.split("¬").forEach(par => {
        const idx = par.indexOf("÷");
        if (idx > 0) campos[par.slice(0, idx)] = par.slice(idx + 1);
      });
      const status = campos["AB"] || "";
      if (status !== "1") continue;
      const ts = parseInt(campos["AD"] || "0");
      const horario = ts
        ? new Date(ts * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
        : "—";
      result.push({
        id: campos["AA"] || String(Math.random()),
        p1: campos["AE"] || "Jogador 1",
        p2: campos["AF"] || "Jogador 2",
        torneio: campos["AN"] || "Torneio",
        tier: campos["AI"] || "",
        horario,
        superficie: guessSurface(campos["AN"] || ""),
      });
    } catch (_) {}
  }
  return result;
}

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "X-GeoIP": "1",
        "X-Fsign": "SW9D1eZo",
        "Referer": "https://www.flashscore.com.br/tenis/",
        ...headers,
      },
    };
    https.get(url, opts, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/health") {
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url === "/partidas") {
    try {
      const hoje = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const data = await fetchUrl(
        `https://d.flashscore.com/x/feed/f_2_${hoje}_1_tennis_1`
      );
      const partidas = parseFlashscore(data);
      res.end(JSON.stringify({ success: true, partidas }));
    } catch (err) {
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  res.end(JSON.stringify({ error: "Rota não encontrada" }));
});

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

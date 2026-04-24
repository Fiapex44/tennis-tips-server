const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

// Libera CORS para qualquer origem
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/partidas", async (req, res) => {
  try {
    // Flashscore tem uma API interna não-documentada
    const hoje = new Date().toISOString().split("T")[0].replace(/-/g, "");

    const { data } = await axios.get(
      `https://d.flashscore.com/x/feed/f_2_${hoje}_1_tennis_1`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "X-GeoIP": "1",
          "X-Fsign": "SW9D1eZo",
          Referer: "https://www.flashscore.com.br/tenis/",
          Accept: "application/json, text/plain, */*",
        },
        timeout: 10000,
      }
    );

    // Flashscore retorna texto delimitado por "¬"
    const partidas = parseFlashscore(data);
    res.json({ success: true, partidas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function parseFlashscore(raw) {
  const result = [];
  // Cada jogo começa com "~AA÷"
  const blocos = raw.split("~AA÷").slice(1);

  for (const bloco of blocos) {
    try {
      const campos = {};
      bloco.split("¬").forEach(par => {
        const idx = par.indexOf("÷");
        if (idx > 0) campos[par.slice(0, idx)] = par.slice(idx + 1);
      });

      // Apenas não iniciados
      const status = campos["AB"] || "";
      if (status !== "1") continue; // 1 = não iniciado

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

function guessSurface(name) {
  const n = name.toLowerCase();
  if (n.includes("roland") || n.includes("madrid") || n.includes("rome") || n.includes("barcelona") || n.includes("clay") || n.includes("monte") || n.includes("hamburg") || n.includes("munich") || n.includes("sao paulo") || n.includes("morelia") || n.includes("alicante") || n.includes("split") || n.includes("bucaramanga")) return "clay";
  if (n.includes("wimbledon") || n.includes("grass") || n.includes("halle") || n.includes("queens") || n.includes("eastbourne") || n.includes("hertogenbosch")) return "grass";
  if (n.includes("indoor") || n.includes("rotterdam") || n.includes("paris") || n.includes("vienna") || n.includes("sofia") || n.includes("marseille")) return "indoor";
  return "hard";
}

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

const http = require("http");
const https = require("https");

const PORT = process.env.PORT || 3000;
const API_KEY = "cb78844753d0dcf105e587319ef38f6accff0db875c2f46f3606c5d42bb0e116";

function guessSurface(name = "") {
  const n = name.toLowerCase();
  if (n.includes("roland") || n.includes("madrid") || n.includes("rome") || n.includes("barcelona") || n.includes("clay") || n.includes("monte") || n.includes("hamburg") || n.includes("munich") || n.includes("sao paulo") || n.includes("morelia") || n.includes("alicante") || n.includes("split") || n.includes("bucaramanga") || n.includes("geneva") || n.includes("lyon")) return "clay";
  if (n.includes("wimbledon") || n.includes("grass") || n.includes("halle") || n.includes("queens") || n.includes("eastbourne") || n.includes("hertogenbosch")) return "grass";
  if (n.includes("indoor") || n.includes("rotterdam") || n.includes("paris") || n.includes("vienna") || n.includes("sofia") || n.includes("marseille")) return "indoor";
  return "hard";
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
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
      const hoje = new Date();
      const amanha = new Date(hoje.getTime() + 12 * 60 * 60 * 1000);
      const fmt = d => d.toISOString().split("T")[0];

      const url = `https://api.api-tennis.com/tennis/?method=get_fixtures&APIkey=${API_KEY}&date_start=${fmt(hoje)}&date_stop=${fmt(amanha)}`;
      const raw = await fetchUrl(url);
      const data = JSON.parse(raw);

      if (!data.success || !Array.isArray(data.result)) {
        res.end(JSON.stringify({ success: false, error: data.message || "Sem dados" }));
        return;
      }

      const isUpcoming = e => !e.event_winner && ["not started", "ns", ""].includes((e.event_status || "").toLowerCase());

      const partidas = data.result
        .filter(isUpcoming)
        .map(e => ({
          id: String(e.event_key || Math.random()),
          p1: e.event_first_player || "Jogador 1",
          p2: e.event_second_player || "Jogador 2",
          torneio: e.tournament_name || "Torneio",
          tier: e.event_type_type || "",
          rodada: e.tournament_round || "",
          horario: e.event_time || "",
          data: e.event_date || "",
          superficie: guessSurface(e.tournament_name || ""),
        }));

      res.end(JSON.stringify({ success: true, partidas }));
    } catch (err) {
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  res.end(JSON.stringify({ error: "Rota não encontrada" }));
});

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

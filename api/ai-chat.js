// TARGETKU AI proxy: forwards {prompt, query} to the user-provided Faa endpoint.
// The browser talks to the same-origin /api/ai-chat route first, avoiding browser CORS issues.

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ status: false, message: "Method Not Allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const prompt = String(body.prompt || "").trim();
    const query = String(body.query || "").trim();

    if (!prompt || !query) {
      res.status(400).json({ status: false, message: "prompt dan query wajib diisi" });
      return;
    }

    if (prompt.length > 14000 || query.length > 1200) {
      res.status(413).json({ status: false, message: "Permintaan terlalu panjang" });
      return;
    }

    const url = new URL("https://api-faa.my.id/faa/ai-promt");
    url.searchParams.set("prompt", prompt);
    url.searchParams.set("query", query);

    const upstream = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    const text = await upstream.text();
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.status(upstream.status).send(text);
  } catch (error) {
    console.error("ai-chat:", error);
    res.status(502).json({ status: false, message: "AI upstream tidak dapat dihubungi" });
  }
};

// POST /api/redeem?id=abc123  (also accepts ?code=) — increments the Redeemed column
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const code = String(req.query.id || req.query.code || "").trim();
  if (!code) return res.status(400).json({ error: "Missing code" });
  try {
    const r = await fetch(process.env.APPS_SCRIPT_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "redeem", code, secret: process.env.APPS_SCRIPT_SECRET })
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    res.setHeader("Cache-Control", "no-store");
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "Could not redeem" });
  }
};

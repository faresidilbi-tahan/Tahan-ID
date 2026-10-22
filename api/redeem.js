// POST /api/redeem?id=1001 — increments the Redeemed column
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const id = String(req.query.id || "").trim();
  if (!id) return res.status(400).json({ error: "Missing id" });
  try {
    const r = await fetch(process.env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "redeem", id, secret: process.env.APPS_SCRIPT_SECRET })
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    res.setHeader("Cache-Control", "no-store");
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "Could not redeem" });
  }
};

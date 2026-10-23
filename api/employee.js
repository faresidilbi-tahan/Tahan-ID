// GET /api/employee?id=abc123  (also accepts ?code=) — looks up the employee by code and counts the scan
module.exports = async (req, res) => {
  const code = String(req.query.id || req.query.code || "").trim();
  if (!code) return res.status(400).json({ error: "Missing code" });
  try {
    const r = await fetch(process.env.APPS_SCRIPT_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get", code, secret: process.env.APPS_SCRIPT_SECRET })
    });
    const data = await r.json();
    if (data.error === "Not found") return res.status(404).json(data);
    if (data.error) throw new Error(data.error);
    res.setHeader("Cache-Control", "no-store");
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "Could not load data" });
  }
};

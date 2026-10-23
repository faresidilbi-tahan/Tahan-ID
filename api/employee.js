// GET /api/employee?id=1001 — looks up the employee and counts the scan
module.exports = async (req, res) => {
  const id = String(req.query.id || "").trim();
  if (!id) return res.status(400).json({ error: "Missing id" });
  try {
    const r = await fetch(process.env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get", id, code: id, secret: process.env.APPS_SCRIPT_SECRET })
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

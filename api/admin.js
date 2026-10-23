// POST /api/admin  { action: "login" | "list" | "add" | "remove", ... }
// Login with ADMIN_USER / ADMIN_PASS (env vars). Returns a signed token valid 8 hours.
const crypto = require("crypto");

const sign = exp => crypto.createHmac("sha256", process.env.APPS_SCRIPT_SECRET).update(String(exp)).digest("hex");
const makeToken = () => { const exp = Date.now() + 8 * 3600e3; return exp + "." + sign(exp); };
const validToken = t => {
  const [exp, sig] = String(t || "").split(".");
  return exp && sig && Number(exp) > Date.now() && sig === sign(exp);
};
const script = async payload => {
  const r = await fetch(process.env.APPS_SCRIPT_URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, secret: process.env.APPS_SCRIPT_SECRET })
  });
  return r.json();
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const body = req.body || {};
  res.setHeader("Cache-Control", "no-store");

  if (body.action === "login") {
    if (body.username === process.env.ADMIN_USER && body.password === process.env.ADMIN_PASS)
      return res.json({ token: makeToken() });
    return res.status(401).json({ error: "Wrong username or password" });
  }

  const auth = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!validToken(auth)) return res.status(401).json({ error: "Not logged in" });

  try {
    if (body.action === "list")   return res.json(await script({ action: "list" }));
    if (body.action === "add")    return res.json(await script({ action: "add", employee: body.employee }));
    if (body.action === "remove") return res.json(await script({ action: "remove", id: body.id }));
    if (body.action === "update") return res.json(await script({ action: "update", id: body.id, fields: body.fields }));
    if (body.action === "upload") {
      // body.image = base64 JPEG (no data: prefix). Commits photos/<id>.jpg to GitHub, then stores the URL in the sheet.
      const repo = process.env.GITHUB_REPO, token = process.env.GITHUB_TOKEN;
      if (!repo || !token) return res.status(500).json({ error: "GITHUB_REPO / GITHUB_TOKEN not set" });
      const path = `photos/${encodeURIComponent(body.id)}.jpg`;
      const gh = (url, opt = {}) => fetch(url, { ...opt, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", ...(opt.headers || {}) } });
      let sha;
      const cur = await gh(`https://api.github.com/repos/${repo}/contents/${path}`);
      if (cur.ok) sha = (await cur.json()).sha;
      const put = await gh(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: "PUT", body: JSON.stringify({ message: `photo ${body.id}`, content: body.image, sha })
      });
      if (!put.ok) return res.status(502).json({ error: "GitHub upload failed: " + (await put.text()).slice(0, 200) });
      const url = `${process.env.PUBLIC_URL || "https://tahan-id.vercel.app"}/photos/${body.id}.jpg`;
      const r = await script({ action: "update", id: body.id, fields: { photo: url } });
      return res.json({ ok: true, url, ...r });
    }
    res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    res.status(502).json({ error: "Could not reach the sheet" });
  }
};

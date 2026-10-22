// Vercel serverless function: GET /api/employee?id=1001
// Reads the Google Sheet CSV (link kept in SHEET_CSV_URL env var) and returns only the matching row.

const norm = s => String(s).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

function parseCSV(text) {
  const rows = [], row = []; let cell = "", q = false;
  const push = () => { row.push(cell); cell = ""; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") push();
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; push(); rows.push(row.splice(0)); }
    else cell += c;
  }
  if (cell !== "" || row.length) { push(); rows.push(row); }
  const [head, ...body] = rows.filter(r => r.some(v => v.trim()));
  const keys = head.map(norm);
  return body.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] || "").trim()])));
}

function pick(row, ...names) { for (const n of names) if (row[n]) return row[n]; return ""; }

module.exports = async (req, res) => {
  const id = String(req.query.id || "").trim();
  if (!id) return res.status(400).json({ error: "Missing id" });
  if (!process.env.SHEET_CSV_URL) return res.status(500).json({ error: "SHEET_CSV_URL not set" });
  try {
    const r = await fetch(process.env.SHEET_CSV_URL + "&t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    const rows = parseCSV(await r.text());
    const row = rows.find(x => pick(x, "punchid", "punchidnumber", "id") === id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.setHeader("Cache-Control", "no-store");
    res.json({
      name: pick(row, "fullname", "fullnameenglish", "name"),
      position: pick(row, "position", "title"),
      phone: pick(row, "phonenumber", "phone", "mobile"),
      id: pick(row, "punchid", "punchidnumber", "id"),
      location: pick(row, "location", "branch")
    });
  } catch (e) {
    res.status(502).json({ error: "Could not load data" });
  }
};

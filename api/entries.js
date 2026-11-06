const crypto = require("crypto");

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const HASH = "rail_tasks";
const STATUSES = ["pending", "done", "notdone"];

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

module.exports = async (req, res) => {
  if (!URL_ || !TOKEN) return res.status(500).json({ error: "Database not connected." });
  if (!process.env.APP_PASSWORD) return res.status(500).json({ error: "APP_PASSWORD is not set in Vercel environment variables." });
  if (req.headers["x-password"] !== process.env.APP_PASSWORD) return res.status(401).json({ error: "Wrong password." });

  try {
    if (req.method === "GET") {
      const flat = (await redis(["HGETALL", HASH])) || [];
      const list = [];
      for (let i = 1; i < flat.length; i += 2) list.push(JSON.parse(flat[i]));
      list.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
      return res.status(200).json(list);
    }
    if (req.method === "POST") {
      const b = req.body || {};
      const title = String(b.title || "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "Task title is required." });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || "")) return res.status(400).json({ error: "Invalid date." });
      const t = { id: crypto.randomUUID(), title, date: b.date, note: String(b.note || "").slice(0, 500), status: "pending" };
      await redis(["HSET", HASH, t.id, JSON.stringify(t)]);
      return res.status(201).json(t);
    }
    if (req.method === "PATCH") {
      const id = String(req.query.id || "");
      const status = (req.body || {}).status;
      if (!id || !STATUSES.includes(status)) return res.status(400).json({ error: "Bad request." });
      const raw = await redis(["HGET", HASH, id]);
      if (!raw) return res.status(404).json({ error: "Task not found." });
      const t = JSON.parse(raw);
      t.status = status;
      await redis(["HSET", HASH, id, JSON.stringify(t)]);
      return res.status(200).json(t);
    }
    if (req.method === "DELETE") {
      const id = String(req.query.id || "");
      if (!id) return res.status(400).json({ error: "Missing id." });
      await redis(["HDEL", HASH, id]);
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

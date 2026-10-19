const express = require("express");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const DATA_DIR = path.join(__dirname, "data");
const PROJECTS_DIR = path.join(DATA_DIR, "projects");
const DB_FILE = path.join(DATA_DIR, "projects.json");
fs.mkdirSync(PROJECTS_DIR, { recursive: true });
if (!ADMIN_PASSWORD) console.warn("WARNING: Set ADMIN_PASSWORD in environment variables before public deployment.");

function readProjects() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return []; }
}
function writeProjects(items) {
  fs.writeFileSync(DB_FILE, JSON.stringify(items, null, 2));
}
function slugify(value) {
  return String(value || "").toLowerCase().trim()
    .replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 45);
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function auth(req, res, next) {
  const token = req.get("x-aura-token") || "";
  const cookie = (req.headers.cookie || "").split(";").map(s => s.trim()).find(s => s.startsWith("aura_token="));
  const cookieToken = cookie ? decodeURIComponent(cookie.slice("aura_token=".length)) : "";
  const expected = process.env.ADMIN_TOKEN || ADMIN_PASSWORD || "";
  if (expected && (safeEqual(token, expected) || safeEqual(cookieToken, expected))) return next();
  return res.status(401).json({ error: "Please log in again." });
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!/\.html?$/i.test(file.originalname)) return cb(new Error("শুধু .html বা .htm ফাইল আপলোড করুন।"));
    cb(null, true);
  }
});

app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

app.post("/api/login", (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: "Server admin password is not configured." });
  if (!safeEqual(req.body.password, ADMIN_PASSWORD)) return res.status(401).json({ error: "Password সঠিক নয়।" });
  res.cookie("aura_token", ADMIN_PASSWORD, { httpOnly: true, sameSite: "strict", secure: req.secure, maxAge: 12 * 60 * 60 * 1000 });
  res.json({ ok: true });
});
app.post("/api/logout", (req, res) => {
  res.clearCookie("aura_token");
  res.json({ ok: true });
});
app.get("/api/projects", auth, (req, res) => {
  const items = readProjects().map(p => ({ ...p, url: `${BASE_URL || `${req.protocol}://${req.get("host")}`}/p/${p.slug}` }));
  res.json(items);
});
app.post("/api/projects", auth, upload.single("htmlFile"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "একটি HTML ফাইল নির্বাচন করুন।" });
  const name = String(req.body.name || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: "প্রজেক্টের নাম লিখুন।" });
  let slug = slugify(req.body.slug || name);
  if (!slug) slug = "project";
  const projects = readProjects();
  if (projects.some(p => p.slug === slug)) slug += "-" + crypto.randomBytes(2).toString("hex");
  const id = crypto.randomUUID();
  fs.mkdirSync(path.join(PROJECTS_DIR, slug), { recursive: true });
  fs.writeFileSync(path.join(PROJECTS_DIR, slug, "index.html"), req.file.buffer);
  const project = { id, name, slug, fileName: req.file.originalname, updatedAt: new Date().toISOString() };
  projects.unshift(project);
  writeProjects(projects);
  res.json({ ...project, url: `${BASE_URL || `${req.protocol}://${req.get("host")}`}/p/${slug}` });
});
app.patch("/api/projects/:id", auth, (req, res, next) => {
  upload.single("htmlFile")(req, res, err => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed" });
    try {
      const projects = readProjects();
      const p = projects.find(x => x.id === req.params.id);
      if (!p) return res.status(404).json({ error: "প্রজেক্ট পাওয়া যায়নি।" });
      if (req.body.name && String(req.body.name).trim()) p.name = String(req.body.name).trim().slice(0, 80);
      if (req.file) {
        fs.writeFileSync(path.join(PROJECTS_DIR, p.slug, "index.html"), req.file.buffer);
        p.fileName = req.file.originalname;
      }
      p.updatedAt = new Date().toISOString();
      writeProjects(projects);
      res.json({ ...p, url: `${BASE_URL || `${req.protocol}://${req.get("host")}`}/p/${p.slug}` });
    } catch (e) { next(e); }
  });
});
app.delete("/api/projects/:id", auth, (req, res) => {
  const projects = readProjects();
  const p = projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "প্রজেক্ট পাওয়া যায়নি।" });
  fs.rmSync(path.join(PROJECTS_DIR, p.slug), { recursive: true, force: true });
  writeProjects(projects.filter(x => x.id !== p.id));
  res.json({ ok: true });
});
app.get("/p/:slug", (req, res) => {
  const p = readProjects().find(x => x.slug === req.params.slug);
  if (!p) return res.status(404).send("Project not found");
  const file = path.join(PROJECTS_DIR, p.slug, "index.html");
  if (!fs.existsSync(file)) return res.status(404).send("Project file not found");
  res.sendFile(file);
});
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Request failed" });
});
app.listen(PORT, () => console.log(`AURA FFX listening on ${PORT}`));

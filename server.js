const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 80;
const CONFIG_PATH = "/data/config.json";
const CONFIG_BACKUP_DIR = "/data/config-backups";
const MAX_CONFIG_BACKUPS = 3;
const CHORES_PATH = "/data/chores.json";
const PHOTOS_DIR = "/data/photos";
const THUMBS_DIR = "/data/photos/thumbs";

// Ensure directories exist
[path.dirname(CONFIG_PATH), PHOTOS_DIR, THUMBS_DIR, CONFIG_BACKUP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Config backup helpers ──
function createConfigBackup() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return;
    const content = fs.readFileSync(CONFIG_PATH, "utf-8");
    // Don't backup empty/invalid configs
    const parsed = JSON.parse(content);
    if (!parsed || Object.keys(parsed).length === 0) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(CONFIG_BACKUP_DIR, `config-${timestamp}.json`);
    fs.writeFileSync(backupPath, content);

    // Prune old backups, keep only MAX_CONFIG_BACKUPS
    const backups = fs.readdirSync(CONFIG_BACKUP_DIR)
      .filter(f => f.startsWith("config-") && f.endsWith(".json"))
      .sort()
      .reverse();
    for (let i = MAX_CONFIG_BACKUPS; i < backups.length; i++) {
      fs.unlinkSync(path.join(CONFIG_BACKUP_DIR, backups[i]));
    }
  } catch (err) {
    console.error("Failed to create config backup:", err);
  }
}

function listConfigBackups() {
  try {
    return fs.readdirSync(CONFIG_BACKUP_DIR)
      .filter(f => f.startsWith("config-") && f.endsWith(".json"))
      .sort()
      .reverse()
      .map(f => {
        const stats = fs.statSync(path.join(CONFIG_BACKUP_DIR, f));
        // Parse timestamp from filename: config-2026-03-01T21-32-24-006Z.json
        const tsMatch = f.match(/^config-(.+)\.json$/);
        const ts = tsMatch ? tsMatch[1].replace(/-/g, (m, i) => i <= 15 ? (i === 10 ? "T" : [4,7].includes(i) ? "-" : [13,16].includes(i) ? ":" : m) : m) : "";
        return { filename: f, size: stats.size, createdAt: stats.birthtimeMs || stats.ctimeMs };
      });
  } catch { return []; }
}

// Ensure config file exists
if (!fs.existsSync(CONFIG_PATH)) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({}));
}

// Ensure chores file exists
const DEFAULT_BADGES = [
  { id: "first-chore", name: "First Chore!", icon: "⭐", description: "Completed your first chore", condition: { type: "total_chores", value: 1 } },
  { id: "ten-chores", name: "Getting Started", icon: "🔥", description: "Completed 10 chores", condition: { type: "total_chores", value: 10 } },
  { id: "fifty-chores", name: "Chore Champion", icon: "🏆", description: "Completed 50 chores", condition: { type: "total_chores", value: 50 } },
  { id: "hundred-chores", name: "Chore Legend", icon: "👑", description: "Completed 100 chores", condition: { type: "total_chores", value: 100 } },
  { id: "streak-3", name: "3-Day Streak", icon: "🔥", description: "Did chores 3 days in a row", condition: { type: "streak_days", value: 3 } },
  { id: "streak-7", name: "Weekly Warrior", icon: "💪", description: "Did chores 7 days in a row", condition: { type: "streak_days", value: 7 } },
  { id: "streak-30", name: "Monthly Master", icon: "🌟", description: "Did chores 30 days in a row", condition: { type: "streak_days", value: 30 } },
  { id: "points-100", name: "100 Points!", icon: "💯", description: "Earned 100 points total", condition: { type: "total_points", value: 100 } },
  { id: "points-500", name: "Point Pro", icon: "🎯", description: "Earned 500 points total", condition: { type: "total_points", value: 500 } },
];

const EMPTY_CHORES = { kids: [], chores: [], logs: [], badges: DEFAULT_BADGES, kidBadges: [], rewards: [], rewardClaims: [] };

if (!fs.existsSync(CHORES_PATH)) {
  fs.writeFileSync(CHORES_PATH, JSON.stringify(EMPTY_CHORES, null, 2));
}

function readChores() {
  try { return JSON.parse(fs.readFileSync(CHORES_PATH, "utf-8")); }
  catch { return { ...EMPTY_CHORES }; }
}

function writeChores(data) {
  fs.writeFileSync(CHORES_PATH, JSON.stringify(data, null, 2));
}

function uid() { return crypto.randomBytes(8).toString("hex"); }

// JSON body parsing
app.use(express.json({ limit: "50mb" }));

// --- Config API ---
app.get("/api/config", (_req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    res.json(data);
  } catch {
    res.json({});
  }
});

app.put("/api/config", (req, res) => {
  try {
    createConfigBackup();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2));
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: "Failed to save config" });
  }
});

// --- Config Backups API ---
app.get("/api/config/backups", (_req, res) => {
  res.json(listConfigBackups());
});

app.post("/api/config/backups/restore/:filename", (req, res) => {
  const filename = req.params.filename;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Invalid filename" });
  }
  const backupPath = path.join(CONFIG_BACKUP_DIR, filename);
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: "Backup not found" });
  }
  try {
    // Backup current before restoring
    createConfigBackup();
    const content = fs.readFileSync(backupPath, "utf-8");
    // Validate JSON
    JSON.parse(content);
    fs.writeFileSync(CONFIG_PATH, content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to restore backup" });
  }
});

// --- Photos API ---

// List all photos
app.get("/api/photos", (_req, res) => {
  try {
    const files = fs.readdirSync(PHOTOS_DIR).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"].includes(ext);
    });
    const photos = files.map((f) => {
      const stats = fs.statSync(path.join(PHOTOS_DIR, f));
      return {
        filename: f,
        url: `/api/photos/file/${encodeURIComponent(f)}`,
        thumbUrl: `/api/photos/thumb/${encodeURIComponent(f)}`,
        sizeBytes: stats.size,
        createdAt: stats.birthtimeMs || stats.ctimeMs,
      };
    });
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: "Failed to list photos" });
  }
});

// Serve full-size photo
app.get("/api/photos/file/:filename", (req, res) => {
  const filename = req.params.filename;
  // Sanitize: prevent directory traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Invalid filename" });
  }
  const filePath = path.join(PHOTOS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Photo not found" });
  }
  res.sendFile(filePath);
});

// Serve thumbnail (same as full file for now — can add sharp later for real thumbnails)
app.get("/api/photos/thumb/:filename", (req, res) => {
  const filename = req.params.filename;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Invalid filename" });
  }
  const filePath = path.join(PHOTOS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Photo not found" });
  }
  // Serve full file as thumbnail; add sharp-based resizing if needed
  res.sendFile(filePath);
});

// Upload photos (raw binary with multipart/form-data)
// Using a simple approach: read raw body chunks for each file
app.post("/api/photos/upload", (req, res) => {
  const contentType = req.headers["content-type"] || "";

  // Handle multipart manually or use a simple approach
  // We'll accept base64 JSON uploads for simplicity (converted client-side)
  // The client sends { files: [{ name: string, data: string (base64) }] }
  if (contentType.includes("application/json")) {
    try {
      const { files } = req.body;
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }
      if (files.length > 20) {
        return res.status(400).json({ error: "Maximum 20 files per upload" });
      }

      const uploaded = [];
      for (const file of files) {
        if (!file.name || !file.data) continue;

        // Validate extension
        const ext = path.extname(file.name).toLowerCase();
        if (![".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"].includes(ext)) {
          continue;
        }

        // Validate base64 size (rough: base64 is ~4/3 of binary, limit ~20MB per file)
        if (file.data.length > 28_000_000) continue;

        // Generate unique filename
        const id = crypto.randomBytes(8).toString("hex");
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filename = `${id}_${safeName}`;
        const filePath = path.join(PHOTOS_DIR, filename);

        // Strip data URL prefix if present
        const base64Data = file.data.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

        uploaded.push({
          filename,
          url: `/api/photos/file/${encodeURIComponent(filename)}`,
          thumbUrl: `/api/photos/thumb/${encodeURIComponent(filename)}`,
        });
      }

      res.json({ uploaded });
    } catch (err) {
      res.status(500).json({ error: "Upload failed" });
    }
  } else {
    res.status(400).json({ error: "Content-Type must be application/json" });
  }
});

// Delete a photo
app.delete("/api/photos/:filename", (req, res) => {
  const filename = req.params.filename;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Invalid filename" });
  }
  const filePath = path.join(PHOTOS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Photo not found" });
  }
  try {
    fs.unlinkSync(filePath);
    // Also remove thumb if exists
    const thumbPath = path.join(THUMBS_DIR, filename);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

// --- RSS Proxy ---
app.get("/api/rss", async (req, res) => {
  const feedUrl = req.query.url;
  if (!feedUrl) return res.status(400).json({ error: "Missing url parameter" });
  try {
    const response = await fetch(feedUrl, {
      headers: { "User-Agent": "HomeDash/1.0" },
    });
    if (!response.ok) return res.status(response.status).json({ error: `Upstream ${response.status}` });
    const text = await response.text();
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.send(text);
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch feed" });
  }
});

// --- Chores API ---

// Get all chores data
app.get("/api/chores", (_req, res) => {
  res.json(readChores());
});

// --- Kids CRUD ---
app.post("/api/chores/kids", (req, res) => {
  const data = readChores();
  const kid = { id: uid(), ...req.body };
  data.kids.push(kid);
  writeChores(data);
  res.json(kid);
});

app.put("/api/chores/kids/:id", (req, res) => {
  const data = readChores();
  const idx = data.kids.findIndex((k) => k.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Kid not found" });
  data.kids[idx] = { ...data.kids[idx], ...req.body };
  writeChores(data);
  res.json(data.kids[idx]);
});

app.delete("/api/chores/kids/:id", (req, res) => {
  const data = readChores();
  data.kids = data.kids.filter((k) => k.id !== req.params.id);
  writeChores(data);
  res.json({ success: true });
});

// --- Chores CRUD ---
app.post("/api/chores/chores", (req, res) => {
  const data = readChores();
  const chore = { id: uid(), createdAt: new Date().toISOString(), ...req.body };
  data.chores.push(chore);
  writeChores(data);
  res.json(chore);
});

app.put("/api/chores/chores/:id", (req, res) => {
  const data = readChores();
  const idx = data.chores.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Chore not found" });
  data.chores[idx] = { ...data.chores[idx], ...req.body };
  writeChores(data);
  res.json(data.chores[idx]);
});

app.delete("/api/chores/chores/:id", (req, res) => {
  const data = readChores();
  data.chores = data.chores.filter((c) => c.id !== req.params.id);
  writeChores(data);
  res.json({ success: true });
});

// --- Chore Logs ---
app.post("/api/chores/logs", (req, res) => {
  const data = readChores();
  data.settings = data.settings || {};

  // Calculate bonus day multiplier
  const now = new Date();
  const todayDay = now.getDay();
  const todayStr = now.toISOString().split("T")[0];
  let bonusMultiplier = 1;
  for (const bd of (data.settings.bonusDays || [])) {
    if (bd.date && bd.date === todayStr) { bonusMultiplier = bd.multiplier; break; }
    if (bd.dayOfWeek >= 0 && bd.dayOfWeek === todayDay) { bonusMultiplier = bd.multiplier; break; }
  }

  // Calculate early bonus
  let earlyBonusEarned = 0;
  const chore = data.chores.find((c) => c.id === req.body.choreId);
  if (chore && chore.deadline && chore.earlyBonus) {
    const [dh, dm] = chore.deadline.split(":").map(Number);
    const deadlineMinutes = dh * 60 + dm;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (nowMinutes <= deadlineMinutes) {
      earlyBonusEarned = chore.earlyBonus;
    }
  }

  const log = {
    id: uid(),
    choreId: req.body.choreId,
    kidId: req.body.kidId,
    completedAt: now.toISOString(),
    photoUrl: req.body.photoUrl || null,
    approved: false,
    approvedAt: null,
    undoneAt: null,
    bonusMultiplier: bonusMultiplier > 1 ? bonusMultiplier : undefined,
    earlyBonusEarned: earlyBonusEarned > 0 ? earlyBonusEarned : undefined,
  };
  data.logs.push(log);

  // Check badges
  const kidLogs = data.logs.filter((l) => l.kidId === log.kidId && !l.undoneAt);
  const totalChores = kidLogs.length;
  const choreMap = {};
  (data.chores || []).forEach((c) => { choreMap[c.id] = c; });
  const totalPoints = kidLogs.reduce((s, l) => {
    const base = choreMap[l.choreId]?.points || 0;
    const mult = l.bonusMultiplier || 1;
    const early = l.earlyBonusEarned || 0;
    return s + (base * mult) + early;
  }, 0);

  // Simple streak calc with streak protections
  const protectedDates = new Set(
    (data.streakProtections || []).filter((p) => p.kidId === log.kidId).map((p) => new Date(p.date).toDateString())
  );
  const choreDates = new Set(kidLogs.map((l) => new Date(l.completedAt).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today.getTime() - i * 86400000);
    const ds = d.toDateString();
    if (choreDates.has(ds) || protectedDates.has(ds)) streak++;
    else if (i > 0) break;
  }

  const existingBadgeIds = new Set((data.kidBadges || []).filter((kb) => kb.kidId === log.kidId).map((kb) => kb.badgeId));
  for (const badge of data.badges || []) {
    if (existingBadgeIds.has(badge.id)) continue;
    let earned = false;
    if (badge.condition.type === "total_chores" && totalChores >= badge.condition.value) earned = true;
    if (badge.condition.type === "total_points" && totalPoints >= badge.condition.value) earned = true;
    if (badge.condition.type === "streak_days" && streak >= badge.condition.value) earned = true;
    if (earned) {
      data.kidBadges = data.kidBadges || [];
      data.kidBadges.push({ kidId: log.kidId, badgeId: badge.id, earnedAt: new Date().toISOString() });
    }
  }


  writeChores(data);
  res.json(log);
});

app.put("/api/chores/logs/:id/undo", (req, res) => {
  const data = readChores();
  const log = data.logs.find((l) => l.id === req.params.id);
  if (!log) return res.status(404).json({ error: "Log not found" });
  log.undoneAt = new Date().toISOString();
  writeChores(data);
  res.json(log);
});

app.delete("/api/chores/logs/:id", (req, res) => {
  const data = readChores();
  const idx = data.logs.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Log not found" });
  data.logs.splice(idx, 1);
  writeChores(data);
  res.json({ ok: true });
});

app.put("/api/chores/logs/:id/approve", (req, res) => {
  const data = readChores();
  const log = data.logs.find((l) => l.id === req.params.id);
  if (!log) return res.status(404).json({ error: "Log not found" });
  log.approved = true;
  log.approvedAt = new Date().toISOString();
  writeChores(data);
  res.json(log);
});

// --- Rewards ---
app.post("/api/chores/rewards", (req, res) => {
  const data = readChores();
  const reward = { id: uid(), ...req.body };
  data.rewards = data.rewards || [];
  data.rewards.push(reward);
  writeChores(data);
  res.json(reward);
});

app.put("/api/chores/rewards/:id", (req, res) => {
  const data = readChores();
  data.rewards = data.rewards || [];
  const idx = data.rewards.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Reward not found" });
  data.rewards[idx] = { ...data.rewards[idx], ...req.body };
  writeChores(data);
  res.json(data.rewards[idx]);
});

app.delete("/api/chores/rewards/:id", (req, res) => {
  const data = readChores();
  data.rewards = (data.rewards || []).filter((r) => r.id !== req.params.id);
  writeChores(data);
  res.json({ success: true });
});

app.post("/api/chores/rewards/claim", (req, res) => {
  const data = readChores();
  const reward = (data.rewards || []).find((r) => r.id === req.body.rewardId);
  if (!reward) return res.status(404).json({ error: "Reward not found" });

  // Check points
  const choreMap = {};
  (data.chores || []).forEach((c) => { choreMap[c.id] = c; });
  const kidLogs = data.logs.filter((l) => l.kidId === req.body.kidId && !l.undoneAt);
  const totalPoints = kidLogs.reduce((s, l) => s + (choreMap[l.choreId]?.points || 0), 0);
  data.rewardClaims = data.rewardClaims || [];
  const rewardMap = {};
  (data.rewards || []).forEach((r) => { rewardMap[r.id] = r; });
  const spentPoints = data.rewardClaims.filter((c) => c.kidId === req.body.kidId).reduce((s, c) => s + (rewardMap[c.rewardId]?.pointsCost || 0), 0);
  const available = totalPoints - spentPoints;

  if (available < reward.pointsCost) return res.status(400).json({ error: "Not enough points" });

  const claim = { id: uid(), kidId: req.body.kidId, rewardId: req.body.rewardId, claimedAt: new Date().toISOString() };
  data.rewardClaims.push(claim);
  writeChores(data);
  res.json(claim);
});

// --- Settings ---
app.put("/api/chores/settings", (req, res) => {
  const data = readChores();
  data.settings = { ...(data.settings || {}), ...req.body };
  writeChores(data);
  res.json(data.settings);
});


// --- Streak Protections ---
app.post("/api/chores/streak-protections", (req, res) => {
  const data = readChores();
  data.streakProtections = data.streakProtections || [];
  const sp = { id: uid(), ...req.body };
  data.streakProtections.push(sp);
  writeChores(data);
  res.json(sp);
});

app.delete("/api/chores/streak-protections/:id", (req, res) => {
  const data = readChores();
  data.streakProtections = (data.streakProtections || []).filter((s) => s.id !== req.params.id);
  writeChores(data);
  res.json({ success: true });
});

// --- Chore Submissions ---
app.post("/api/chores/submissions", (req, res) => {
  const data = readChores();
  data.submissions = data.submissions || [];
  const submission = {
    id: uid(),
    kidId: req.body.kidId,
    title: (req.body.title || "").trim().slice(0, 200),
    note: (req.body.note || "").trim().slice(0, 500) || undefined,
    photoUrl: req.body.photoUrl || undefined,
    points: Math.max(1, Math.min(50, Number(req.body.points) || 5)),
    submittedAt: new Date().toISOString(),
    status: "pending",
  };
  data.submissions.push(submission);
  writeChores(data);
  res.json(submission);
});

app.put("/api/chores/submissions/:id/approve", (req, res) => {
  const data = readChores();
  data.submissions = data.submissions || [];
  const sub = data.submissions.find((s) => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: "Submission not found" });
  sub.status = "approved";
  sub.reviewedAt = new Date().toISOString();

  // Create a log entry for the approved submission
  const log = {
    id: uid(),
    choreId: `submission_${sub.id}`,
    kidId: sub.kidId,
    completedAt: sub.submittedAt,
    photoUrl: sub.photoUrl || null,
    approved: true,
    approvedAt: new Date().toISOString(),
    undoneAt: null,
  };
  data.logs.push(log);
  writeChores(data);
  res.json(sub);
});

app.put("/api/chores/submissions/:id/reject", (req, res) => {
  const data = readChores();
  data.submissions = data.submissions || [];
  const sub = data.submissions.find((s) => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: "Submission not found" });
  sub.status = "rejected";
  sub.reviewedAt = new Date().toISOString();
  sub.rejectionReason = (req.body.reason || "").trim().slice(0, 300) || undefined;
  writeChores(data);
  res.json(sub);
});


app.use(express.static("/usr/share/nginx/html"));

// SPA fallback — inject correct manifest for parent vs kids PWA
app.get("/{*splat}", (req, res) => {
  const htmlPath = "/usr/share/nginx/html/index.html";
  const isParent = req.path.startsWith("/parent");
  
  try {
    let html = fs.readFileSync(htmlPath, "utf-8");
    if (isParent) {
      html = html.replace('href="/manifest.json"', 'href="/manifest-parent.json"');
      html = html.replace('content="Chores"', 'content="Parent"');
      html = html.replace('<title>HomeDash</title>', '<title>HomeDash Parent</title>');
    }
    res.set("Content-Type", "text/html");
    res.send(html);
  } catch {
    res.sendFile(htmlPath);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

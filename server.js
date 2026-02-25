const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 80;
const CONFIG_PATH = "/data/config.json";
const PHOTOS_DIR = "/data/photos";
const THUMBS_DIR = "/data/photos/thumbs";

// Ensure directories exist
[path.dirname(CONFIG_PATH), PHOTOS_DIR, THUMBS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Ensure config file exists
if (!fs.existsSync(CONFIG_PATH)) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({}));
}

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
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2));
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: "Failed to save config" });
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

// --- Static files ---
app.use(express.static("/usr/share/nginx/html"));

// SPA fallback
app.get("/{*splat}", (_req, res) => {
  res.sendFile("/usr/share/nginx/html/index.html");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

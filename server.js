const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 80;
const CONFIG_PATH = "/data/config.json";

// Ensure config file exists
if (!fs.existsSync(CONFIG_PATH)) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({}));
}

// JSON body parsing
app.use(express.json({ limit: "10mb" }));

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

// --- Static files ---
app.use(express.static("/usr/share/nginx/html"));

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile("/usr/share/nginx/html/index.html");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import db from "./db.js";

export function getSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export function updateSettings(data) {
  const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  for (const [key, value] of Object.entries(data)) {
    stmt.run(key, value);
  }
  return true;
}

export function generateModelNumber(prefix, startNumber) {
  const num = parseInt(startNumber) || 1001;
  const row = db.prepare(`
    SELECT model FROM products 
    WHERE model LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(prefix + "%");
  
  let nextNum = num;
  if (row) {
    const existingNum = parseInt(row.model.replace(prefix, ""));
    if (!isNaN(existingNum)) {
      nextNum = existingNum + 1;
    }
  }
  return prefix + nextNum;
}
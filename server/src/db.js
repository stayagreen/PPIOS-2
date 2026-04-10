import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, "..", "database.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'operator',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    model TEXT NOT NULL,
    main_image TEXT,
    size_image TEXT,
    spec TEXT,
    size TEXT,
    net_weight REAL,
    packaged_weight REAL,
    factory_price REAL,
    retail_price REAL,
    light_source_spec TEXT,
    light_source_count INTEGER,
    catalog_path TEXT,
    remark TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

const defaultSettings = {
  model_prefix: "PPIOS",
  model_start_number: "1001"
};
for (const [key, value] of Object.entries(defaultSettings)) {
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

export default db;
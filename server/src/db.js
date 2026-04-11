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
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS product_skus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
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
    main_image TEXT,
    size_image TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

const defaultSettings = {
  model_prefix: "PPIOS",
  model_start_number: "1001",
  export_template: JSON.stringify({
    columns: [
      { key: "id", header: "产品ID", enabled: true },
      { key: "model", header: "产品型号", enabled: true },
      { key: "spec", header: "规格名称", enabled: true },
      { key: "size", header: "尺寸", enabled: true },
      { key: "net_weight", header: "净重(kg)", enabled: true },
      { key: "packaged_weight", header: "含包装重量(kg)", enabled: true },
      { key: "factory_price", header: "出厂价(元)", enabled: true },
      { key: "retail_price", header: "零售价(元)", enabled: true },
      { key: "light_source_spec", header: "光源规格", enabled: true },
      { key: "light_source_count", header: "光源数量", enabled: true },
      { key: "catalog_path", header: "图册目录", enabled: true },
      { key: "remark", header: "备注", enabled: true },
      { key: "creator_name", header: "创建人", enabled: true },
      { key: "created_at", header: "创建时间", enabled: true }
    ],
    font: {
      name: "Arial",
      size: 11,
      color: "000000",
      bold: false
    }
  })
};
for (const [key, value] of Object.entries(defaultSettings)) {
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

export default db;
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
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
    catalog_path TEXT,
    supplier_id INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    contact_info TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    other_images TEXT,
    other_files TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS product_suppliers (
    product_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    factory_model TEXT,
    PRIMARY KEY (product_id, supplier_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
  );
`);

// Migration: Add factory_model to product_suppliers if it doesn't exist
const productSupplierColumns = db.prepare("PRAGMA table_info(product_suppliers)").all();
const productSupplierColumnNames = productSupplierColumns.map((c) => c.name);
if (!productSupplierColumnNames.includes("factory_model")) {
  db.exec("ALTER TABLE product_suppliers ADD COLUMN factory_model TEXT");
}

// Migration: Add catalog_path to products if it doesn't exist
const productColumns = db.prepare("PRAGMA table_info(products)").all();
const productColumnNames = productColumns.map((c) => c.name);
if (!productColumnNames.includes("catalog_path")) {
  db.exec("ALTER TABLE products ADD COLUMN catalog_path TEXT");
}
if (!productColumnNames.includes("supplier_id")) {
  db.exec("ALTER TABLE products ADD COLUMN supplier_id INTEGER");
}
if (!productColumnNames.includes("factory_model")) {
  db.exec("ALTER TABLE products ADD COLUMN factory_model TEXT");
}

// Migration: Migrate supplier_id to product_suppliers
const productsWithSupplier = db.prepare("SELECT id, supplier_id FROM products WHERE supplier_id IS NOT NULL").all();
const insertSupplierStmt = db.prepare("INSERT OR IGNORE INTO product_suppliers (product_id, supplier_id) VALUES (?, ?)");
for (const p of productsWithSupplier) {
  insertSupplierStmt.run(p.id, p.supplier_id);
}

// Migration: Add other_images and other_files to product_skus if they don't exist
const columns = db.prepare("PRAGMA table_info(product_skus)").all();
const columnNames = columns.map((c) => c.name);
if (!columnNames.includes("other_images")) {
  db.exec("ALTER TABLE product_skus ADD COLUMN other_images TEXT");
}
if (!columnNames.includes("other_files")) {
  db.exec("ALTER TABLE product_skus ADD COLUMN other_files TEXT");
}

const defaultSettings = {
  model_prefix: "PPIOS",
  model_start_number: "1001",
  export_template: JSON.stringify({
    header: {
      title: "产品列表清单",
      image: "",
      fontSize: 20,
      fontColor: "000000",
      bgColor: "FFFFFF",
      height: 40,
      enabled: false,
      align: "center",
      valign: "middle",
      bold: true,
      italic: false,
      underline: false
    },
    columns: [
      { key: "id", header: "产品ID", enabled: true },
      { key: "model", header: "产品型号", enabled: true },
      { key: "supplier_names", header: "供应商", enabled: true },
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

// Migration: Remove factory_model from existing export_template setting
const exportTemplateSetting = db.prepare("SELECT value FROM settings WHERE key = 'export_template'").get();
if (exportTemplateSetting) {
  try {
    const template = JSON.parse(exportTemplateSetting.value);
    const originalCount = template.columns.length;
    template.columns = template.columns.filter((c) => c.key !== 'factory_model');
    if (template.columns.length !== originalCount) {
      db.prepare("UPDATE settings SET value = ? WHERE key = 'export_template'").run(JSON.stringify(template));
    }
  } catch (e) {
    console.error("Failed to migrate export_template:", e);
  }
}

// Initialize default admin
const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  const hashed = bcrypt.hashSync("admin", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashed, "admin");
}

export default db;
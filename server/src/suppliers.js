import db from "./db.js";

export function getSuppliers() {
  return db.prepare("SELECT * FROM suppliers ORDER BY name ASC").all();
}

export function getSupplier(id) {
  return db.prepare("SELECT * FROM suppliers WHERE id = ?").get(id);
}

export function createSupplier(data) {
  const stmt = db.prepare(`
    INSERT INTO suppliers (name, contact_person, contact_info, address)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(data.name, data.contact_person, data.contact_info, data.address);
  return result.lastInsertRowid;
}

export function updateSupplier(id, data) {
  const stmt = db.prepare(`
    UPDATE suppliers 
    SET name = ?, contact_person = ?, contact_info = ?, address = ?
    WHERE id = ?
  `);
  stmt.run(data.name, data.contact_person, data.contact_info, data.address, id);
  return id;
}

export function deleteSupplier(id) {
  // Check if supplier is used by any product
  const used = db.prepare("SELECT id FROM products WHERE supplier_id = ? LIMIT 1").get(id);
  if (used) {
    throw new Error("该供应商已被产品使用，无法删除");
  }
  db.prepare("DELETE FROM suppliers WHERE id = ?").run(id);
  return true;
}

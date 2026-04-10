import db from "./db.js";

export function getProducts(userId) {
  return db.prepare(`
    SELECT p.*, u.username as creator_name 
    FROM products p 
    JOIN users u ON p.created_by = u.id 
    ORDER BY p.created_at DESC
  `).all();
}

export function getProduct(id) {
  return db.prepare(`
    SELECT p.*, u.username as creator_name 
    FROM products p 
    JOIN users u ON p.created_by = u.id 
    WHERE p.id = ?
  `).get(id);
}

export function checkModelDuplicate(model, excludeId = null) {
  let sql = "SELECT id FROM products WHERE model = ?";
  const params = [model];
  if (excludeId) {
    sql += " AND id != ?";
    params.push(excludeId);
  }
  const existing = db.prepare(sql).get(...params);
  return !!existing;
}

export function createProduct(data, userId) {
  if (checkModelDuplicate(data.model)) {
    throw new Error("产品型号已存在");
  }
  const stmt = db.prepare(`
    INSERT INTO products (
      created_by, model, main_image, size_image, spec, size, net_weight, packaged_weight,
      factory_price, light_source_spec, light_source_count, catalog_path, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    userId, 
    data.model, 
    data.main_image || null, 
    data.size_image || null, 
    data.spec || null, 
    data.size || null,
    data.net_weight || null, 
    data.packaged_weight || null, 
    data.factory_price || null, 
    data.light_source_spec || null,
    data.light_source_count || null, 
    data.catalog_path || null, 
    data.remark || null
  );
  return result.lastInsertRowid;
}

export function updateProduct(id, data, userId, role) {
  const product = getProduct(id);
  if (!product) return null;
  
  if (role !== "admin" && product.created_by !== userId) {
    throw new Error("没有权限修改此产品");
  }
  
  const fields = [];
  const values = [];
  
  const allowFields = ["model", "main_image", "size_image", "spec", "size", "net_weight", 
    "packaged_weight", "factory_price", "retail_price", "light_source_spec", "light_source_count", 
    "catalog_path", "remark"];
  
  for (const field of allowFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
    }
  }
  
  if (fields.length === 0) return id;
  
  values.push(id);
  db.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return id;
}

export function deleteProduct(id, userId, role) {
  const product = getProduct(id);
  if (!product) return false;
  
  if (role !== "admin" && product.created_by !== userId) {
    throw new Error("没有权限删除此产品");
  }
  
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
  return true;
}
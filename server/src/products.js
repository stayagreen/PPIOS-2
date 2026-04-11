import db from "./db.js";

export function getProducts(userId) {
  const products = db.prepare(`
    SELECT p.*, u.username as creator_name
    FROM products p 
    JOIN users u ON p.created_by = u.id 
    ORDER BY p.created_at DESC
  `).all();

  for (const product of products) {
    product.skus = db.prepare("SELECT * FROM product_skus WHERE product_id = ?").all(product.id);
    for (const sku of product.skus) {
      sku.other_images = sku.other_images ? JSON.parse(sku.other_images) : [];
      sku.other_files = sku.other_files ? JSON.parse(sku.other_files) : [];
    }
    product.suppliers = db.prepare(`
      SELECT s.*, ps.factory_model FROM suppliers s
      JOIN product_suppliers ps ON s.id = ps.supplier_id
      WHERE ps.product_id = ?
    `).all(product.id);
  }
  return products;
}

export function getProduct(id) {
  const product = db.prepare(`
    SELECT p.*, u.username as creator_name
    FROM products p 
    JOIN users u ON p.created_by = u.id 
    WHERE p.id = ?
  `).get(id);

  if (product) {
    product.skus = db.prepare("SELECT * FROM product_skus WHERE product_id = ?").all(product.id);
    for (const sku of product.skus) {
      sku.other_images = sku.other_images ? JSON.parse(sku.other_images) : [];
      sku.other_files = sku.other_files ? JSON.parse(sku.other_files) : [];
    }
    product.suppliers = db.prepare(`
      SELECT s.*, ps.factory_model FROM suppliers s
      JOIN product_suppliers ps ON s.id = ps.supplier_id
      WHERE ps.product_id = ?
    `).all(product.id);
  }
  return product;
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

  const transaction = db.transaction((productData, skus, suppliers) => {
    const productStmt = db.prepare(`
      INSERT INTO products (created_by, model, catalog_path, material) VALUES (?, ?, ?, ?)
    `);
    const result = productStmt.run(userId, productData.model, productData.catalog_path || null, productData.material || null);
    const productId = result.lastInsertRowid;

    if (suppliers && suppliers.length > 0) {
      const supplierStmt = db.prepare("INSERT INTO product_suppliers (product_id, supplier_id, factory_model) VALUES (?, ?, ?)");
      const checkSupplierStmt = db.prepare("SELECT id FROM suppliers WHERE id = ?");
      for (const s of suppliers) {
        if (!checkSupplierStmt.get(s.id)) {
          throw new Error(`供应商 ID ${s.id} 不存在`);
        }
        supplierStmt.run(productId, s.id, s.factory_model || null);
      }
    }

    const skuStmt = db.prepare(`
      INSERT INTO product_skus (
        product_id, spec, size, net_weight, packaged_weight, factory_price, 
        retail_price, light_source_spec, light_source_count, 
        remark, main_image, size_image, other_images, other_files
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const sku of skus) {
      skuStmt.run(
        productId,
        sku.spec || null,
        sku.size || null,
        sku.net_weight || null,
        sku.packaged_weight || null,
        sku.factory_price || null,
        sku.retail_price || null,
        sku.light_source_spec || null,
        sku.light_source_count || null,
        sku.remark || null,
        sku.main_image || null,
        sku.size_image || null,
        sku.other_images ? JSON.stringify(sku.other_images) : null,
        sku.other_files ? JSON.stringify(sku.other_files) : null
      );
    }
    return productId;
  });

  return transaction(data, data.skus || [], data.suppliers || []);
}

export function updateProduct(id, data, userId, role) {
  const product = getProduct(id);
  if (!product) return null;
  
  if (role !== "admin" && product.created_by !== userId) {
    throw new Error("没有权限修改此产品");
  }

  const transaction = db.transaction((productId, productData, skus, suppliers) => {
    // Update product model and catalog_path if changed
    const updateFields = [];
    const params = [];
    if (productData.model) {
      if (checkModelDuplicate(productData.model, productId)) {
        throw new Error("产品型号已存在");
      }
      updateFields.push("model = ?");
      params.push(productData.model);
    }
    if (productData.hasOwnProperty('catalog_path')) {
      updateFields.push("catalog_path = ?");
      params.push(productData.catalog_path || null);
    }
    if (productData.hasOwnProperty('material')) {
      updateFields.push("material = ?");
      params.push(productData.material || null);
    }
    
    if (updateFields.length > 0) {
      params.push(productId);
      db.prepare(`UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);
    }

    // Sync suppliers
    db.prepare("DELETE FROM product_suppliers WHERE product_id = ?").run(productId);
    if (suppliers && suppliers.length > 0) {
      const supplierStmt = db.prepare("INSERT INTO product_suppliers (product_id, supplier_id, factory_model) VALUES (?, ?, ?)");
      const checkSupplierStmt = db.prepare("SELECT id FROM suppliers WHERE id = ?");
      for (const s of suppliers) {
        if (!checkSupplierStmt.get(s.id)) {
          throw new Error(`供应商 ID ${s.id} 不存在`);
        }
        supplierStmt.run(productId, s.id, s.factory_model || null);
      }
    }

    // Sync SKUs: easiest way is to delete all and re-insert
    db.prepare("DELETE FROM product_skus WHERE product_id = ?").run(productId);

    const skuStmt = db.prepare(`
      INSERT INTO product_skus (
        product_id, spec, size, net_weight, packaged_weight, factory_price, 
        retail_price, light_source_spec, light_source_count, 
        remark, main_image, size_image, other_images, other_files
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const sku of skus) {
      skuStmt.run(
        productId,
        sku.spec || null,
        sku.size || null,
        sku.net_weight || null,
        sku.packaged_weight || null,
        sku.factory_price || null,
        sku.retail_price || null,
        sku.light_source_spec || null,
        sku.light_source_count || null,
        sku.remark || null,
        sku.main_image || null,
        sku.size_image || null,
        sku.other_images ? JSON.stringify(sku.other_images) : null,
        sku.other_files ? JSON.stringify(sku.other_files) : null
      );
    }
    return productId;
  });

  return transaction(id, data, data.skus || [], data.suppliers || []);
}

export function deleteProduct(id, userId, role) {
  const product = getProduct(id);
  if (!product) return false;
  
  if (role !== "admin" && product.created_by !== userId) {
    throw new Error("没有权限删除此产品");
  }
  
  const transaction = db.transaction((productId) => {
    db.prepare("DELETE FROM product_skus WHERE product_id = ?").run(productId);
    db.prepare("DELETE FROM product_suppliers WHERE product_id = ?").run(productId);
    db.prepare("DELETE FROM products WHERE id = ?").run(productId);
  });
  transaction(id);
  return true;
}
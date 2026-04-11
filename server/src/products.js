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

  const transaction = db.transaction((productData, skus) => {
    const productStmt = db.prepare(`
      INSERT INTO products (created_by, model) VALUES (?, ?)
    `);
    const result = productStmt.run(userId, productData.model);
    const productId = result.lastInsertRowid;

    const skuStmt = db.prepare(`
      INSERT INTO product_skus (
        product_id, spec, size, net_weight, packaged_weight, factory_price, 
        retail_price, light_source_spec, light_source_count, catalog_path, 
        remark, main_image, size_image, other_images, other_files
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        sku.catalog_path || null,
        sku.remark || null,
        sku.main_image || null,
        sku.size_image || null,
        sku.other_images ? JSON.stringify(sku.other_images) : null,
        sku.other_files ? JSON.stringify(sku.other_files) : null
      );
    }
    return productId;
  });

  return transaction(data, data.skus || []);
}

export function updateProduct(id, data, userId, role) {
  const product = getProduct(id);
  if (!product) return null;
  
  if (role !== "admin" && product.created_by !== userId) {
    throw new Error("没有权限修改此产品");
  }

  const transaction = db.transaction((productId, productData, skus) => {
    // Update product model if changed
    if (productData.model) {
      if (checkModelDuplicate(productData.model, productId)) {
        throw new Error("产品型号已存在");
      }
      db.prepare("UPDATE products SET model = ? WHERE id = ?").run(productData.model, productId);
    }

    // Sync SKUs: easiest way is to delete all and re-insert
    db.prepare("DELETE FROM product_skus WHERE product_id = ?").run(productId);

    const skuStmt = db.prepare(`
      INSERT INTO product_skus (
        product_id, spec, size, net_weight, packaged_weight, factory_price, 
        retail_price, light_source_spec, light_source_count, catalog_path, 
        remark, main_image, size_image, other_images, other_files
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        sku.catalog_path || null,
        sku.remark || null,
        sku.main_image || null,
        sku.size_image || null,
        sku.other_images ? JSON.stringify(sku.other_images) : null,
        sku.other_files ? JSON.stringify(sku.other_files) : null
      );
    }
    return productId;
  });

  return transaction(id, data, data.skus || []);
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
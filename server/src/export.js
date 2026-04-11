import ExcelJS from "exceljs";
import db from "./db.js";

export async function exportProducts(ids = null, templateStr = null) {
  let query = `
    SELECT p.*, u.username as creator_name 
    FROM products p 
    JOIN users u ON p.created_by = u.id 
  `;
  
  let products;
  if (ids && ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    query += ` WHERE p.id IN (${placeholders}) ORDER BY p.created_at DESC`;
    products = db.prepare(query).all(...ids);
  } else {
    query += ` ORDER BY p.created_at DESC`;
    products = db.prepare(query).all();
  }
  
  const template = templateStr ? JSON.parse(templateStr) : {
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
    font: { name: "Arial", size: 11, color: "000000", bold: false }
  };

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("产品列表");
  
  const enabledColumns = template.columns.filter(c => c.enabled);
  sheet.columns = enabledColumns.map(c => ({
    header: c.header,
    key: c.key,
    width: 20
  }));
  
  // Apply font style to header
  sheet.getRow(1).font = {
    name: template.font.name,
    size: template.font.size,
    color: { argb: "FF" + template.font.color.replace("#", "") },
    bold: template.font.bold
  };
  
  for (const p of products) {
    const skus = db.prepare("SELECT * FROM product_skus WHERE product_id = ?").all(p.id);
    for (const sku of skus) {
      const rowData = {};
      for (const col of enabledColumns) {
        if (col.key === "creator_name" || col.key === "created_at" || col.key === "model" || col.key === "id") {
          rowData[col.key] = p[col.key];
        } else {
          rowData[col.key] = sku[col.key];
        }
      }
      const row = sheet.addRow(rowData);
      row.font = {
        name: template.font.name,
        size: template.font.size,
        color: { argb: "FF" + template.font.color.replace("#", "") },
        bold: template.font.bold
      };
    }
  }
  
  return await workbook.xlsx.writeBuffer();
}

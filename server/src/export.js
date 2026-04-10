import ExcelJS from "exceljs";
import db from "./db.js";

export async function exportProducts() {
  const products = db.prepare(`
    SELECT p.*, u.username as creator_name 
    FROM products p 
    JOIN users u ON p.created_by = u.id 
    ORDER BY p.created_at DESC
  `).all();
  
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("产品列表");
  
  sheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "创建时间", key: "created_at", width: 20 },
    { header: "创建人", key: "creator_name", width: 15 },
    { header: "产品型号", key: "model", width: 25 },
    { header: "产品规格", key: "spec", width: 20 },
    { header: "产品尺寸", key: "size", width: 15 },
    { header: "净重(kg)", key: "net_weight", width: 12 },
    { header: "含包装重量(kg)", key: "packaged_weight", width: 15 },
    { header: "出厂价(元)", key: "factory_price", width: 15 },
    { header: "光源规格", key: "light_source_spec", width: 20 },
    { header: "光源数量", key: "light_source_count", width: 12 },
    { header: "图册目录", key: "catalog_path", width: 30 },
    { header: "备注", key: "remark", width: 30 }
  ];
  
  for (const p of products) {
    sheet.addRow({
      id: p.id,
      created_at: p.created_at,
      creator_name: p.creator_name,
      model: p.model,
      spec: p.spec,
      size: p.size,
      net_weight: p.net_weight,
      packaged_weight: p.packaged_weight,
      factory_price: p.factory_price,
      light_source_spec: p.light_source_spec,
      light_source_count: p.light_source_count,
      catalog_path: p.catalog_path,
      remark: p.remark
    });
  }
  
  return await workbook.xlsx.writeBuffer();
}
import ExcelJS from "exceljs";
import db from "./db.js";
import path from "path";
import fs from "fs";

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
  
  if (!templateStr) {
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'export_template'").get();
    if (setting) {
      templateStr = setting.value;
    }
  }

  const template = templateStr ? JSON.parse(templateStr) : {
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
    font: { name: "Arial", size: 11, color: "000000", bold: false }
  };

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("产品列表");
  
  const enabledColumns = template.columns.filter(c => c.enabled);
  
  let startRow = 1;
  if (template.header && template.header.enabled) {
    const headerRow = sheet.getRow(1);
    headerRow.height = template.header.height || 40;
    
    // Merge cells for title
    sheet.mergeCells(1, 1, 1, enabledColumns.length);
    const cell = sheet.getCell(1, 1);
    cell.value = template.header.title;
    cell.font = {
      name: template.font.name,
      size: template.header.fontSize || 20,
      color: { argb: "FF" + (template.header.fontColor || "000000").replace("#", "") },
      bold: template.header.bold !== undefined ? template.header.bold : true,
      italic: template.header.italic || false,
      underline: template.header.underline || false
    };
    cell.alignment = { 
      vertical: template.header.valign || 'middle', 
      horizontal: template.header.align || 'center' 
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: "FF" + (template.header.bgColor || "FFFFFF").replace("#", "") }
    };

    // Handle Header Image
    if (template.header.image) {
      try {
        // This is a bit tricky since we might need to fetch the image or it might be a local path
        // For now, let's assume it's a local path or we can try to fetch it if it's a URL
        // But ExcelJS addImage usually takes a buffer or a filename
        // If it's a relative path like /uploads/..., we need to resolve it
        let imagePath = template.header.image;
        if (imagePath.startsWith('/uploads/')) {
          imagePath = path.join(process.cwd(), imagePath);
        }
        
        if (fs.existsSync(imagePath)) {
          const imageId = workbook.addImage({
            filename: imagePath,
            extension: imagePath.split('.').pop(),
          });
          sheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 50, height: template.header.height || 40 }
          });
        }
      } catch (e) {
        console.error("Failed to add header image:", e);
      }
    }
    
    startRow = 2;
  }

  sheet.columns = enabledColumns.map(c => ({
    key: c.key,
    width: 20
  }));
  
  // Apply font style to column headers
  const colHeaderRow = sheet.getRow(startRow);
  colHeaderRow.values = enabledColumns.map(c => c.header);
  colHeaderRow.font = {
    name: template.font.name,
    size: template.font.size,
    color: { argb: "FF" + template.font.color.replace("#", "") },
    bold: true
  };
  
  for (const p of products) {
    const suppliers = db.prepare(`
      SELECT s.name, ps.factory_model FROM suppliers s
      JOIN product_suppliers ps ON s.id = ps.supplier_id
      WHERE ps.product_id = ?
    `).all(p.id);
    p.supplier_names = suppliers.map(s => s.factory_model ? `${s.name}(${s.factory_model})` : s.name).join(", ");

    const skus = db.prepare("SELECT * FROM product_skus WHERE product_id = ?").all(p.id);
    for (const sku of skus) {
      const rowData = {};
      for (const col of enabledColumns) {
        if (col.key === "creator_name" || col.key === "created_at" || col.key === "model" || col.key === "id" || col.key === "supplier_names") {
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

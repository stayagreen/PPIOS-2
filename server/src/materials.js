import { ZipArchive } from "archiver";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getProduct } from "./products.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const uploadDir = path.join(projectRoot, "uploads");

function sanitizeFileName(value) {
  return String(value || "未命名")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "未命名";
}

function getUploadedFilePath(url) {
  if (!url || typeof url !== "string") return null;

  let pathname = url;
  try {
    if (/^https?:\/\//i.test(url)) return null;
    if (url.startsWith("file:///")) {
      pathname = new URL(url).pathname;
    }
  } catch {
    return null;
  }

  pathname = decodeURIComponent(pathname.split("?")[0].split("#")[0]);
  if (!pathname.startsWith("/uploads/")) return null;

  const relativePath = pathname.replace(/^\/uploads\//, "");
  const resolvedPath = path.resolve(uploadDir, relativePath);
  const relativeToUploads = path.relative(uploadDir, resolvedPath);

  if (relativeToUploads.startsWith("..") || path.isAbsolute(relativeToUploads)) {
    return null;
  }

  return fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()
    ? resolvedPath
    : null;
}

function addImage(entries, folder, url, label) {
  const filePath = getUploadedFilePath(url);
  if (!filePath) return;

  const ext = path.extname(filePath) || ".jpg";
  const baseName = sanitizeFileName(label);
  entries.push({
    filePath,
    zipPath: `${folder}/${baseName}${ext}`,
  });
}

function uniqueZipPaths(entries) {
  const used = new Map();
  return entries.map((entry) => {
    const parsed = path.posix.parse(entry.zipPath);
    const key = entry.zipPath.toLowerCase();
    const count = used.get(key) || 0;
    used.set(key, count + 1);

    if (count === 0) return entry;

    return {
      ...entry,
      zipPath: path.posix.join(parsed.dir, `${parsed.name}-${count + 1}${parsed.ext}`),
    };
  });
}

export function collectProductMaterialFiles(product) {
  const entries = [];
  const model = sanitizeFileName(product.model);
  const productFolder = model;

  const folderPath = (folder) => `${productFolder}/${folder}`;

  (product.main_images || []).forEach((url, index) => {
    addImage(entries, folderPath("主图"), url, `${model}-主图-${index + 1}`);
  });

  (product.detail_images || []).forEach((url, index) => {
    addImage(entries, folderPath("详情图"), url, `${model}-详情图-${index + 1}`);
  });

  (product.skus || []).forEach((sku, index) => {
    const skuLabel = sanitizeFileName(sku.spec || sku.size || `SKU-${index + 1}`);
    const prefix = `${String(index + 1).padStart(2, "0")}-${skuLabel}`;

    addImage(entries, folderPath("SKU图"), sku.main_image, `${prefix}-SKU图`);
    (sku.other_images || []).forEach((url, imageIndex) => {
      addImage(entries, folderPath("SKU图"), url, `${prefix}-SKU图-${imageIndex + 2}`);
    });
    addImage(entries, folderPath("尺寸图"), sku.size_image, `${prefix}-尺寸图`);
  });

  return uniqueZipPaths(entries);
}

export async function streamProductMaterials(productId, res) {
  const product = getProduct(productId);
  if (!product) {
    res.status(404).json({ error: "产品不存在" });
    return;
  }

  const files = collectProductMaterialFiles(product);
  if (files.length === 0) {
    res.status(404).json({ error: "该产品没有可下载的本地素材" });
    return;
  }

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const fileName = `${sanitizeFileName(product.model)}-素材.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);

  archive.on("error", (err) => {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.destroy(err);
    }
  });

  archive.pipe(res);
  for (const file of files) {
    archive.file(file.filePath, { name: file.zipPath });
  }
  await archive.finalize();
}

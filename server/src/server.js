import express from "express";
import cors from "cors";
import multer from "multer";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { v4 as uuid } from "uuid";
import fs from "fs";
import db from "./db.js";
import * as auth from "./auth.js";
import * as products from "./products.js";
import * as settings from "./settings.js";
import * as suppliers from "./suppliers.js";
import { exportProducts } from "./export.js";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const uploadDir = join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, uuid() + "." + file.originalname.split(".").pop())
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = auth.verifyToken(token);
  if (!user) return res.status(401).json({ error: "未登录" });
  req.user = user;
  next();
}

app.post("/api/register", (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: "缺少参数" });
  const user = auth.register(username, password, role);
  if (!user) return res.status(400).json({ error: "用户名已存在" });
  res.json(user);
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const result = auth.login(username, password);
  if (!result) return res.status(401).json({ error: "用户名或密码错误" });
  res.json(result);
});

app.get("/api/products", authMiddleware, (req, res) => {
  res.json(products.getProducts(req.user.id));
});

app.get("/api/products/:id", authMiddleware, (req, res) => {
  const product = products.getProduct(req.params.id);
  if (!product) return res.status(404).json({ error: "产品不存在" });
  res.json(product);
});

app.post("/api/products", authMiddleware, (req, res) => {
  if (!req.body.model) return res.status(400).json({ error: "产品型号不能为空" });
  try {
    const id = products.createProduct(req.body, req.user.id);
    res.json({ id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put("/api/products/:id", authMiddleware, (req, res) => {
  try {
    const id = products.updateProduct(req.params.id, req.body, req.user.id, req.user.role);
    if (!id) return res.status(404).json({ error: "产品不存在" });
    res.json({ id });
  } catch (e) {
    res.status(403).json({ error: e.message });
  }
});

app.delete("/api/products/:id", authMiddleware, (req, res) => {
  try {
    const success = products.deleteProduct(req.params.id, req.user.id, req.user.role);
    if (!success) return res.status(404).json({ error: "产品不存在" });
    res.json({ success: true });
  } catch (e) {
    res.status(403).json({ error: e.message });
  }
});

app.get("/api/export", authMiddleware, async (req, res) => {
  const buffer = await exportProducts();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=products.xlsx");
  res.send(buffer);
});

app.post("/api/upload", authMiddleware, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "没有文件" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.get("/api/settings", authMiddleware, (req, res) => {
  res.json(settings.getSettings());
});

app.put("/api/settings", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "只有管理员可以修改设置" });
  }
  settings.updateSettings(req.body);
  res.json({ success: true });
});

app.get("/api/model/generate", authMiddleware, (req, res) => {
  const s = settings.getSettings();
  const model = settings.generateModelNumber(s.model_prefix, s.model_start_number);
  res.json({ model });
});

app.get("/api/suppliers", authMiddleware, (req, res) => {
  res.json(suppliers.getSuppliers());
});

app.post("/api/suppliers", authMiddleware, (req, res) => {
  const id = suppliers.createSupplier(req.body);
  res.json({ id });
});

app.put("/api/suppliers/:id", authMiddleware, (req, res) => {
  suppliers.updateSupplier(req.params.id, req.body);
  res.json({ success: true });
});

app.delete("/api/suppliers/:id", authMiddleware, (req, res) => {
  try {
    suppliers.deleteSupplier(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put("/api/user/password", authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "缺少参数" });
  }
  const user = db.prepare("SELECT password FROM users WHERE id = ?").get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(400).json({ error: "原密码错误" });
  }
  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, req.user.id);
  res.json({ success: true });
});

const PORT = process.env.PORT || 6000;
const BROWSER_PORT = process.env.BROWSER_PORT || 6001;
app.listen(PORT, "::", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

if (BROWSER_PORT !== PORT) {
  app.listen(BROWSER_PORT, "::", () => {
    console.log(`Browser access available at http://localhost:${BROWSER_PORT}`);
  });
}

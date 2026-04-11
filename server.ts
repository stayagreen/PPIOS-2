import express from "express";
import cors from "cors";
import multer from "multer";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { v4 as uuid } from "uuid";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import path from "path";

// Import server logic
// We use dynamic imports or require because the original files are .js and might use ESM
import db from "./server/src/db.js";
import * as auth from "./server/src/auth.js";
import * as products from "./server/src/products.js";
import * as settings from "./server/src/settings.js";
import * as suppliers from "./server/src/suppliers.js";
import { exportProducts } from "./server/src/export.js";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  const uploadDir = join(__dirname, "uploads");
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

  function authMiddleware(req: any, res: any, next: any) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const payload = auth.verifyToken(token) as any;
    if (!payload) return res.status(401).json({ error: "未登录" });
    
    // Verify user still exists in database to prevent foreign key errors during operations
    const user = db.prepare("SELECT id, username, role FROM users WHERE id = ?").get(payload.id);
    if (!user) return res.status(401).json({ error: "用户不存在或已被删除" });
    
    req.user = user;
    next();
  }

  // API Routes
  app.get("/api/users", authMiddleware, (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "权限不足" });
    }
    const users = db.prepare("SELECT id, username, role, created_at FROM users").all();
    res.json(users);
  });

  app.post("/api/users", authMiddleware, (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "权限不足" });
    }
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: "缺少参数" });
    const user = auth.register(username, password, role);
    if (!user) return res.status(400).json({ error: "用户名已存在" });
    res.json(user);
  });

  app.delete("/api/users/:id", authMiddleware, (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "权限不足" });
    }
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ error: "不能删除自己" });
    }
    try {
      db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      if (e.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
        return res.status(400).json({ error: "该用户已创建产品，无法删除。请先删除或转移该用户创建的产品。" });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/users/:id", authMiddleware, (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "权限不足" });
    }
    const { username, password, role } = req.body;
    if (!username) return res.status(400).json({ error: "用户名不能为空" });
    
    try {
      if (password) {
        const hashed = bcrypt.hashSync(password, 10);
        db.prepare("UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?").run(username, hashed, role, req.params.id);
      } else {
        db.prepare("UPDATE users SET username = ?, role = ? WHERE id = ?").run(username, role, req.params.id);
      }
      res.json({ success: true });
    } catch (e: any) {
      if (e.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(400).json({ error: "用户名已存在" });
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const result = auth.login(username, password);
    if (!result) return res.status(401).json({ error: "用户名或密码错误" });
    res.json(result);
  });

  app.get("/api/products", authMiddleware, (req: any, res) => {
    res.json(products.getProducts(req.user.id));
  });

  app.get("/api/products/:id", authMiddleware, (req: any, res) => {
    const product = products.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "产品不存在" });
    res.json(product);
  });

  app.post("/api/products", authMiddleware, (req: any, res) => {
    if (!req.body.model) return res.status(400).json({ error: "产品型号不能为空" });
    try {
      const id = products.createProduct(req.body, req.user.id);
      res.json({ id });
    } catch (e: any) {
      if (e.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
        return res.status(400).json({ error: "数据关联错误，请检查供应商或用户状态" });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/products/:id", authMiddleware, (req: any, res) => {
    try {
      const id = products.updateProduct(req.params.id, req.body, req.user.id, req.user.role);
      if (!id) return res.status(404).json({ error: "产品不存在" });
      res.json({ id });
    } catch (e: any) {
      res.status(403).json({ error: e.message });
    }
  });

  app.delete("/api/products/:id", authMiddleware, (req: any, res) => {
    try {
      const success = products.deleteProduct(req.params.id, req.user.id, req.user.role);
      if (!success) return res.status(404).json({ error: "产品不存在" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(403).json({ error: e.message });
    }
  });

  app.get("/api/export", authMiddleware, async (req: any, res) => {
    const ids = req.query.ids ? req.query.ids.split(",").map(Number) : null;
    const s = settings.getSettings();
    const buffer = await exportProducts(ids, s.export_template);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=products.xlsx");
    res.send(buffer);
  });

  app.post("/api/upload", authMiddleware, upload.single("image"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "没有文件" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  app.get("/api/settings", authMiddleware, (req: any, res) => {
    res.json(settings.getSettings());
  });

  app.put("/api/settings", authMiddleware, (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "只有管理员可以修改设置" });
    }
    try {
      settings.updateSettings(req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/model/generate", authMiddleware, (req: any, res) => {
    const s = settings.getSettings();
    const model = settings.generateModelNumber(s.model_prefix, s.model_start_number);
    res.json({ model });
  });

  app.get("/api/suppliers", authMiddleware, (req: any, res) => {
    res.json(suppliers.getSuppliers());
  });

  app.post("/api/suppliers", authMiddleware, (req: any, res) => {
    try {
      const id = suppliers.createSupplier(req.body);
      res.json({ id });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/suppliers/:id", authMiddleware, (req: any, res) => {
    try {
      suppliers.updateSupplier(req.params.id, req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/suppliers/:id", authMiddleware, (req: any, res) => {
    try {
      suppliers.deleteSupplier(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/user/password", authMiddleware, (req: any, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "缺少参数" });
    }
    try {
      const user: any = db.prepare("SELECT password FROM users WHERE id = ?").get(req.user.id);
      if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
        return res.status(400).json({ error: "原密码错误" });
      }
      const hashed = bcrypt.hashSync(newPassword, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, req.user.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0'
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Serve the original web/index.html for the root path if not handled by Vite
    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "web", "index.html"));
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

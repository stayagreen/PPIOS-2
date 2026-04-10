import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./db.js";

const JWT_SECRET = "pcios-secret-key-change-in-production";

export function login(username, password) {
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) return null;
  
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return null;
  
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  return { token, user: { id: user.id, username: user.username, role: user.role } };
}

export function register(username, password, role = "operator") {
  const hashed = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, hashed, role);
    return { id: result.lastInsertRowid, username, role };
  } catch (e) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") return null;
    throw e;
  }
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function checkPermission(role, requiredRoles) {
  return requiredRoles.includes(role);
}
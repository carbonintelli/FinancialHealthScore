import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { config } from "../config.js";
import { SCHEMA } from "./schema.js";
import { seedDatabase } from "./seed.js";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export function initDatabase(): void {
  const dbPath = path.isAbsolute(config.databaseUrl)
    ? config.databaseUrl
    : path.resolve(config.rootPath, config.databaseUrl);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  seedDatabase(db);
}

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  organization_id: number;
  msme_id: string | null;
  is_active: number;
}

export interface OrgRow {
  id: number;
  name: string;
  org_type: string;
  registration_id: string | null;
}

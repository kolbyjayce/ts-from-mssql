import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import keytar from 'keytar';

interface Connection {
  id: number;
  name: string;
  server: string;
  database: string;
  username: string;
  created_at: string;
}

export class DatabaseManager {
  private db: Database.Database;
  private static instance: DatabaseManager;
  private static readonly SERVICE_NAME = 'ts-from-mssql';

  private constructor() {
    const dbDir = path.join(os.homedir(), '.ts-from-mssql');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir);
    }

    const dbPath = path.join(dbDir, 'connections.db');
    this.db = new Database(dbPath);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        server TEXT NOT NULL,
        database TEXT NOT NULL,
        username TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async saveConnection(
    name: string,
    server: string,
    database: string,
    username: string,
    password: string
  ): Promise<void> {
    // Store password in system keychain
    await keytar.setPassword(DatabaseManager.SERVICE_NAME, name, password);

    // Store other connection details in SQLite
    const stmt = this.db.prepare(`
      INSERT INTO connections (name, server, database, username)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(name, server, database, username);
  }

  public getAllConnections(): Connection[] {
    const stmt = this.db.prepare('SELECT * FROM connections ORDER BY created_at DESC');
    return stmt.all() as Connection[];
  }

  public getConnectionByName(name: string): Connection | undefined {
    const stmt = this.db.prepare('SELECT * FROM connections WHERE name = ?');
    return stmt.get(name) as Connection | undefined;
  }

  public async deleteConnection(name: string): Promise<void> {
    // Remove password from system keychain
    await keytar.deletePassword(DatabaseManager.SERVICE_NAME, name);

    // Remove connection details from SQLite
    const stmt = this.db.prepare('DELETE FROM connections WHERE name = ?');
    stmt.run(name);
  }

  public async buildConnectionString(connection: Connection): Promise<string> {
    const password = await keytar.getPassword(DatabaseManager.SERVICE_NAME, connection.name);
    if (!password) {
      throw new Error(`Password not found for connection: ${connection.name}`);
    }
    
    return `Server=${connection.server};Database=${connection.database};User Id=${connection.username};Password=${password};Encrypt=true;TrustServerCertificate=true`;
  }
}

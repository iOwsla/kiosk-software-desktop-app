import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from '../../../api/utils/logger';

export interface SyncQueueItem {
  id?: number;
  operation_type: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_id: string;
  payload: any;
  status?: 'pending' | 'syncing' | 'completed' | 'failed';
  retry_count?: number;
  error_message?: string;
  created_at?: string;
  synced_at?: string;
}

export interface TransactionLog {
  id?: number;
  transaction_id: string;
  transaction_type: string;
  amount?: number;
  currency?: string;
  customer_data?: any;
  items?: any[];
  payment_method?: string;
  status?: string;
  receipt_data?: any;
  synced?: boolean;
  created_at?: string;
  completed_at?: string;
}

export interface Product {
  id?: number;
  product_id: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  stock_quantity?: number;
  image_url?: string;
  attributes?: any;
  is_active?: boolean;
  synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id?: number;
  customer_id: string;
  name?: string;
  phone?: string;
  email?: string;
  loyalty_card?: string;
  points?: number;
  total_spent?: number;
  visit_count?: number;
  last_visit?: string;
  preferences?: any;
  synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database;
  private dbPath: string;

  private constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'kiosk-hub.db');
    
    // Create database directory if it doesn't exist
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    this.initializeSchema();
    logger.info('Database initialized', { path: this.dbPath });
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private initializeSchema(): void {
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    // If schema file exists, execute it
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      this.db.exec(schema);
    } else {
      // Fallback: create schema directly
      this.createTables();
    }
  }

  private createTables(): void {
    // Create sync_queue table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_type VARCHAR(20) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME
      )
    `);

    // Create transaction_log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transaction_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT NOT NULL UNIQUE,
        transaction_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2),
        currency VARCHAR(3) DEFAULT 'TRY',
        customer_data TEXT,
        items TEXT,
        payment_method VARCHAR(30),
        status VARCHAR(20) DEFAULT 'pending',
        receipt_data TEXT,
        synced BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `);

    // Create products table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL UNIQUE,
        barcode TEXT,
        name TEXT NOT NULL,
        description TEXT,
        category VARCHAR(50),
        price DECIMAL(10, 2),
        stock_quantity INTEGER DEFAULT 0,
        image_url TEXT,
        attributes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        synced_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create customers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT NOT NULL UNIQUE,
        name TEXT,
        phone VARCHAR(20),
        email VARCHAR(100),
        loyalty_card VARCHAR(50),
        points INTEGER DEFAULT 0,
        total_spent DECIMAL(10, 2) DEFAULT 0,
        visit_count INTEGER DEFAULT 0,
        last_visit DATETIME,
        preferences TEXT,
        synced_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create local_cache table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS local_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cache_key TEXT NOT NULL UNIQUE,
        cache_value TEXT NOT NULL,
        cache_type VARCHAR(30) NOT NULL,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
      CREATE INDEX IF NOT EXISTS idx_transaction_log_synced ON transaction_log(synced);
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    `);
  }

  // Sync Queue Methods
  public addToSyncQueue(item: SyncQueueItem): number {
    const stmt = this.db.prepare(`
      INSERT INTO sync_queue (operation_type, entity_type, entity_id, payload, status, retry_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      item.operation_type,
      item.entity_type,
      item.entity_id,
      JSON.stringify(item.payload),
      item.status || 'pending',
      item.retry_count || 0
    );
    
    return result.lastInsertRowid as number;
  }

  public getPendingSyncItems(limit: number = 100): SyncQueueItem[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sync_queue 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT ?
    `);
    
    const rows = stmt.all(limit);
    return rows.map((row: any) => ({
      ...(row as SyncQueueItem),
      payload: JSON.parse(row.payload as string)
    })) as SyncQueueItem[];
  }

  public updateSyncStatus(id: number, status: string, error?: string): void {
    const stmt = this.db.prepare(`
      UPDATE sync_queue 
      SET status = ?, error_message = ?, synced_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE synced_at END
      WHERE id = ?
    `);
    
    stmt.run(status, error || null, status, id);
  }

  // Transaction Methods
  public saveTransaction(transaction: TransactionLog): number {
    const stmt = this.db.prepare(`
      INSERT INTO transaction_log (
        transaction_id, transaction_type, amount, currency, 
        customer_data, items, payment_method, status, receipt_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      transaction.transaction_id,
      transaction.transaction_type,
      transaction.amount || 0,
      transaction.currency || 'TRY',
      JSON.stringify(transaction.customer_data || {}),
      JSON.stringify(transaction.items || []),
      transaction.payment_method || null,
      transaction.status || 'pending',
      JSON.stringify(transaction.receipt_data || {})
    );
    
    return result.lastInsertRowid as number;
  }

  public getUnsyncedTransactions(): TransactionLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM transaction_log 
      WHERE synced = FALSE 
      ORDER BY created_at ASC
    `);
    
    const rows = stmt.all();
    return rows.map((row: any) => ({
      ...(row as TransactionLog),
      customer_data: JSON.parse(row.customer_data as string),
      items: JSON.parse(row.items as string),
      receipt_data: JSON.parse(row.receipt_data as string)
    })) as TransactionLog[];
  }

  // Product Methods
  public upsertProduct(product: Product): void {
    const stmt = this.db.prepare(`
      INSERT INTO products (
        product_id, barcode, name, description, category, 
        price, stock_quantity, image_url, attributes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(product_id) DO UPDATE SET
        barcode = excluded.barcode,
        name = excluded.name,
        description = excluded.description,
        category = excluded.category,
        price = excluded.price,
        stock_quantity = excluded.stock_quantity,
        image_url = excluded.image_url,
        attributes = excluded.attributes,
        is_active = excluded.is_active,
        updated_at = datetime('now'),
        synced_at = datetime('now')
    `);
    
    stmt.run(
      product.product_id,
      product.barcode || null,
      product.name,
      product.description || null,
      product.category || null,
      product.price || 0,
      product.stock_quantity || 0,
      product.image_url || null,
      JSON.stringify(product.attributes || {}),
      product.is_active !== false ? 1 : 0
    );
  }

  public getProductByBarcode(barcode: string): Product | null {
    const stmt = this.db.prepare(`
      SELECT * FROM products WHERE barcode = ? AND is_active = 1
    `);
    
    const row = stmt.get(barcode) as Product;
    if (!row) return null;
    
    return {
      ...(row as Product),
      attributes: JSON.parse(row.attributes as string),
      is_active: Boolean(row.is_active)
    } as Product;
  }

  public searchProducts(query: string): Product[] {
    const stmt = this.db.prepare(`
      SELECT * FROM products 
      WHERE (name LIKE ? OR barcode LIKE ? OR category LIKE ?) 
      AND is_active = 1
      LIMIT 50
    `);
    
    const searchTerm = `%${query}%`;
    const rows = stmt.all(searchTerm, searchTerm, searchTerm);
    
    return rows.map((row: any) => ({
      ...(row as Product),
      attributes: JSON.parse(row.attributes as string),
      is_active: Boolean(row.is_active)
    })) as Product[];
  }

  // Customer Methods
  public upsertCustomer(customer: Customer): void {
    const stmt = this.db.prepare(`
      INSERT INTO customers (
        customer_id, name, phone, email, loyalty_card,
        points, total_spent, visit_count, preferences
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(customer_id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        email = excluded.email,
        loyalty_card = excluded.loyalty_card,
        points = excluded.points,
        total_spent = excluded.total_spent,
        visit_count = excluded.visit_count,
        preferences = excluded.preferences,
        updated_at = datetime('now'),
        synced_at = datetime('now')
    `);
    
    stmt.run(
      customer.customer_id,
      customer.name || null,
      customer.phone || null,
      customer.email || null,
      customer.loyalty_card || null,
      customer.points || 0,
      customer.total_spent || 0,
      customer.visit_count || 0,
      JSON.stringify(customer.preferences || {})
    );
  }

  public getCustomerByPhone(phone: string): Customer | null {
    const stmt = this.db.prepare(`
      SELECT * FROM customers WHERE phone = ?
    `);
    
    const row = stmt.get(phone) as Customer;
    if (!row) return null;
    
    return {
      ...(row as Customer),
      preferences: JSON.parse(row.preferences as string)
    } as Customer;
  }

  // Cache Methods
  public setCache(key: string, value: any, type: string, expiresInMinutes?: number): void {
    const expiresAt = expiresInMinutes 
      ? new Date(Date.now() + expiresInMinutes * 60000).toISOString()
      : null;
    
    const stmt = this.db.prepare(`
      INSERT INTO local_cache (cache_key, cache_value, cache_type, expires_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        cache_value = excluded.cache_value,
        expires_at = excluded.expires_at,
        updated_at = datetime('now')
    `);
    
    stmt.run(key, JSON.stringify(value), type, expiresAt);
  }

  public getCache(key: string): any | null {
    const stmt = this.db.prepare(`
      SELECT cache_value FROM local_cache 
      WHERE cache_key = ? 
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    `);
    
    const row = stmt.get(key) as any;
    if (!row) return null;
    
    return JSON.parse(row.cache_value as string);
  }

  public clearExpiredCache(): void {
    const stmt = this.db.prepare(`
      DELETE FROM local_cache WHERE expires_at <= datetime('now')
    `);
    stmt.run();
  }

  // Cleanup and maintenance
  public vacuum(): void {
    this.db.exec('VACUUM');
  }

  public close(): void {
    this.db.close();
  }
}
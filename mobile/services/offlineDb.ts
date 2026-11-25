import * as SQLite from 'expo-sqlite';

export type SyncActionType =
  | 'CREATE_CUSTOMER'
  | 'CREATE_SALE'
  | 'CREATE_PAYMENT'
  | 'CREATE_EXPENSE';

export type SyncItemStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export interface SyncQueueItem {
  id: string;
  idempotency_key: string;
  action: SyncActionType;
  payload_json: string;
  status: SyncItemStatus;
  retry_count: number;
  last_error: string | null;
  server_id: string | null;
  server_number: string | null;
  created_at: string;
}

class OfflineDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const database = await SQLite.openDatabaseAsync('dipu_khata_offline.db');
      await database.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          mobile TEXT NOT NULL,
          village TEXT,
          current_balance INTEGER DEFAULT 0,
          updated_at TEXT,
          sync_status TEXT DEFAULT 'SYNCED'
        );

        CREATE TABLE IF NOT EXISTS materials (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category_name TEXT,
          default_unit TEXT,
          selling_rate INTEGER DEFAULT 0,
          purchase_rate INTEGER DEFAULT 0,
          current_stock REAL DEFAULT 0,
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          invoice_number TEXT,
          customer_id TEXT,
          customer_name TEXT,
          grand_total INTEGER DEFAULT 0,
          amount_paid INTEGER DEFAULT 0,
          balance_due INTEGER DEFAULT 0,
          payment_status TEXT,
          sale_date TEXT,
          sync_status TEXT DEFAULT 'SYNCED'
        );

        CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          payment_number TEXT,
          customer_id TEXT,
          customer_name TEXT,
          amount INTEGER DEFAULT 0,
          payment_method TEXT,
          payment_date TEXT,
          sync_status TEXT DEFAULT 'SYNCED'
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          idempotency_key TEXT UNIQUE NOT NULL,
          action TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          status TEXT DEFAULT 'PENDING',
          retry_count INTEGER DEFAULT 0,
          last_error TEXT,
          server_id TEXT,
          server_number TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sync_meta (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);
      this.db = database;
      return database;
    })();

    return this.initPromise;
  }

  async enqueueOperation(
    localId: string,
    action: SyncActionType,
    payload: Record<string, any>
  ): Promise<SyncQueueItem> {
    const db = await this.getDb();
    const idempotencyKey = `offline_${action}_${localId}`;
    const createdAt = new Date().toISOString();
    const payloadJson = JSON.stringify(payload);

    await db.runAsync(
      `INSERT OR IGNORE INTO sync_queue (id, idempotency_key, action, payload_json, status, retry_count, created_at)
       VALUES (?, ?, ?, ?, 'PENDING', 0, ?)`,
      [localId, idempotencyKey, action, payloadJson, createdAt]
    );

    return {
      id: localId,
      idempotency_key: idempotencyKey,
      action,
      payload_json: payloadJson,
      status: 'PENDING',
      retry_count: 0,
      last_error: null,
      server_id: null,
      server_number: null,
      created_at: createdAt,
    };
  }

  async getPendingQueue(): Promise<SyncQueueItem[]> {
    const db = await this.getDb();
    return db.getAllAsync<SyncQueueItem>(
      `SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY created_at ASC`
    );
  }

  async getAllQueueItems(limit = 50): Promise<SyncQueueItem[]> {
    const db = await this.getDb();
    return db.getAllAsync<SyncQueueItem>(
      `SELECT * FROM sync_queue ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
  }

  async markSynced(localId: string, serverId?: string, serverNumber?: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE sync_queue SET status = 'SYNCED', server_id = ?, server_number = ?, last_error = NULL WHERE id = ?`,
      [serverId || null, serverNumber || null, localId]
    );
  }

  async markFailed(localId: string, errorMessage: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE sync_queue SET status = 'FAILED', retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
      [errorMessage, localId]
    );
  }

  async retryFailedItems(): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`UPDATE sync_queue SET status = 'PENDING' WHERE status = 'FAILED'`);
  }

  async getSyncStats(): Promise<{ pendingCount: number; failedCount: number; syncedCount: number }> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<{ status: string; cnt: number }>(
      `SELECT status, COUNT(*) as cnt FROM sync_queue GROUP BY status`
    );
    let pendingCount = 0;
    let failedCount = 0;
    let syncedCount = 0;
    for (const r of rows) {
      if (r.status === 'PENDING') pendingCount = r.cnt;
      else if (r.status === 'FAILED') failedCount = r.cnt;
      else if (r.status === 'SYNCED') syncedCount = r.cnt;
    }
    return { pendingCount, failedCount, syncedCount };
  }

  async cacheDelta(data: {
    serverTimestamp: string;
    customers?: any[];
    materials?: any[];
    sales?: any[];
    payments?: any[];
  }): Promise<void> {
    const db = await this.getDb();

    for (const c of data.customers || []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO customers (id, name, mobile, village, current_balance, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, 'SYNCED')`,
        [c._id, c.name, c.mobile, c.village || null, c.currentBalance || 0, c.updatedAt || null]
      );
    }

    for (const m of data.materials || []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO materials (id, name, category_name, default_unit, selling_rate, purchase_rate, current_stock, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          m._id,
          m.name,
          m.categoryName || null,
          m.defaultUnit || null,
          m.sellingRate || 0,
          m.purchaseRate || 0,
          m.currentStock || 0,
          m.updatedAt || null,
        ]
      );
    }

    for (const s of data.sales || []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO sales (id, invoice_number, customer_id, customer_name, grand_total, amount_paid, balance_due, payment_status, sale_date, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED')`,
        [
          s._id,
          s.invoiceNumber,
          s.customerId,
          s.customerName,
          s.grandTotal || 0,
          s.amountPaid || 0,
          s.balanceDue || 0,
          s.paymentStatus,
          s.saleDate,
        ]
      );
    }

    for (const p of data.payments || []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO payments (id, payment_number, customer_id, customer_name, amount, payment_method, payment_date, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'SYNCED')`,
        [
          p._id,
          p.paymentNumber,
          p.customerId,
          p.customerName,
          p.amount || 0,
          p.paymentMethod,
          p.paymentDate,
        ]
      );
    }

    await db.runAsync(
      `INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_pulled_at', ?)`,
      [data.serverTimestamp]
    );
  }

  async getLocalCustomers(): Promise<any[]> {
    const db = await this.getDb();
    return db.getAllAsync(`SELECT * FROM customers ORDER BY current_balance DESC, name ASC`);
  }

  async getLocalMaterials(): Promise<any[]> {
    const db = await this.getDb();
    return db.getAllAsync(`SELECT * FROM materials ORDER BY name ASC`);
  }

  async getLastPulledAt(): Promise<string | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM sync_meta WHERE key = 'last_pulled_at'`
    );
    return row?.value || null;
  }
}

export const offlineDb = new OfflineDatabase();

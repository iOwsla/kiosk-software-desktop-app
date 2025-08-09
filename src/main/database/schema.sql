-- Offline Sync Queue Table
CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
    entity_type VARCHAR(50) NOT NULL,
    entity_id TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON data
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'completed', 'failed')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at DATETIME,
    UNIQUE(entity_type, entity_id, operation_type, status)
);

-- Transaction Log Table
CREATE TABLE IF NOT EXISTS transaction_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL UNIQUE,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'TRY',
    customer_data TEXT, -- JSON
    items TEXT, -- JSON array
    payment_method VARCHAR(30),
    status VARCHAR(20) DEFAULT 'pending',
    receipt_data TEXT, -- JSON
    synced BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Local Cache Table
CREATE TABLE IF NOT EXISTS local_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT NOT NULL UNIQUE,
    cache_value TEXT NOT NULL,
    cache_type VARCHAR(30) NOT NULL,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Device Info Table
CREATE TABLE IF NOT EXISTS device_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL UNIQUE,
    device_name TEXT,
    location TEXT,
    ip_address TEXT,
    last_online DATETIME,
    sync_status VARCHAR(20),
    config TEXT, -- JSON configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product Catalog (Offline copy)
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
    attributes TEXT, -- JSON
    is_active BOOLEAN DEFAULT TRUE,
    synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customer Data (Offline copy)
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
    preferences TEXT, -- JSON
    synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Session Management
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    user_type VARCHAR(20) DEFAULT 'customer',
    user_data TEXT, -- JSON
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    activity_log TEXT, -- JSON array
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_log_synced ON transaction_log(synced);
CREATE INDEX IF NOT EXISTS idx_transaction_log_created ON transaction_log(created_at);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_loyalty ON customers(loyalty_card);
CREATE INDEX IF NOT EXISTS idx_cache_key ON local_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON local_cache(expires_at);
-- ====================================================================
-- SHU BRAND NEW — SUPABASE POSTGRESQL PRODUCTION DATABASE SCHEMA
-- Migration: 001_initial_schema.sql
-- Description: Core tables, constraints, indexes, triggers, and Row Level Security
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USERS & PROFILES
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER', 'PRODUCT_MANAGER')),
    region VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    location_lat DECIMAL(10, 7),
    location_lng DECIMAL(10, 7),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    image_url TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    item_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- 4. BRANCHES & WAREHOUSES
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    billz_shop_id VARCHAR(100),
    address TEXT NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_central BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branches_billz_shop ON branches(billz_shop_id);

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(100) PRIMARY KEY,
    billz_id VARCHAR(100),
    billz_shop_id VARCHAR(100),
    source VARCHAR(50) NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'BILLZ')),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category_slug VARCHAR(255) REFERENCES categories(slug) ON UPDATE CASCADE ON DELETE SET NULL,
    category_name VARCHAR(255),
    price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(14, 2) DEFAULT 0,
    discount_price NUMERIC(14, 2),
    description TEXT,
    brand VARCHAR(100) DEFAULT 'SHU BRAND NEW',
    sku VARCHAR(100),
    barcode VARCHAR(100),
    images TEXT[] DEFAULT '{}',
    has_custom_images BOOLEAN DEFAULT false,
    colors TEXT[] DEFAULT '{}',
    sizes TEXT[] DEFAULT '{}',
    stock INT NOT NULL DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 5.0,
    review_count INT DEFAULT 0,
    is_new BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    last_billz_sync TIMESTAMPTZ,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_billz_id ON products(billz_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- 6. PRODUCT VARIANTS
CREATE TABLE IF NOT EXISTS product_variants (
    id VARCHAR(100) PRIMARY KEY,
    product_id VARCHAR(100) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    color VARCHAR(100) NOT NULL,
    size VARCHAR(50) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    billz_variant_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_color_size ON product_variants(product_id, color, size);

-- 7. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(100) PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    region VARCHAR(100),
    city VARCHAR(100),
    address TEXT NOT NULL,
    location_lat DECIMAL(10, 7),
    location_lng DECIMAL(10, 7),
    note TEXT,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'CLICK_CARD',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'KUTILMOQDA',
    payment_details JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'YANGI',
    status_history JSONB DEFAULT '[]'::jsonb,
    billz_sale_id VARCHAR(100),
    billz_synced_at TIMESTAMPTZ,
    assigned_branch_id VARCHAR(100) REFERENCES branches(id) ON DELETE SET NULL,
    statistical_period_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_period ON orders(statistical_period_id);

-- 8. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(100) PRIMARY KEY,
    order_id VARCHAR(100) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_image TEXT,
    category_name VARCHAR(255),
    size VARCHAR(50) NOT NULL,
    color VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- 9. PAYMENT TRANSACTIONS
CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(100) PRIMARY KEY,
    order_id VARCHAR(100) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_id ON payment_transactions(transaction_id);

-- 10. BILLZ STAGING PRODUCTS
CREATE TABLE IF NOT EXISTS billz_staging_products (
    id VARCHAR(100) PRIMARY KEY,
    billz_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    brand VARCHAR(100),
    category_name VARCHAR(255),
    category_slug VARCHAR(255),
    price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(14, 2) DEFAULT 0,
    discount_price NUMERIC(14, 2),
    description TEXT,
    images TEXT[] DEFAULT '{}',
    has_custom_images BOOLEAN DEFAULT false,
    colors TEXT[] DEFAULT '{}',
    sizes TEXT[] DEFAULT '{}',
    variants JSONB DEFAULT '[]'::jsonb,
    main_warehouse_stock INT NOT NULL DEFAULT 0,
    branch_stock INT NOT NULL DEFAULT 0,
    total_stock INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'SELECTED',
    published_product_id VARCHAR(100),
    published_at TIMESTAMPTZ,
    raw_billz_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staging_billz_id ON billz_staging_products(billz_id);
CREATE INDEX IF NOT EXISTS idx_staging_status ON billz_staging_products(status);

-- 11. BILLZ SYNC LOGS
CREATE TABLE IF NOT EXISTS billz_sync_logs (
    id VARCHAR(100) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    items_count INT DEFAULT 0,
    details TEXT NOT NULL,
    error TEXT,
    duration_ms INT
);

CREATE INDEX IF NOT EXISTS idx_billz_logs_timestamp ON billz_sync_logs(timestamp DESC);

-- 12. BANNERS
CREATE TABLE IF NOT EXISTS banners (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    button_text VARCHAR(100) DEFAULT 'Kolleksiyani ko‘rish',
    button_link VARCHAR(255) DEFAULT '/clothing',
    image_url TEXT NOT NULL,
    mobile_image_url TEXT,
    badge VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admin_username VARCHAR(100) NOT NULL,
    admin_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(50),
    previous_value JSONB,
    new_value JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

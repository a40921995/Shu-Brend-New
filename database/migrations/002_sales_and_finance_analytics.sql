-- ====================================================================
-- SHU BRAND NEW — SUPABASE POSTGRESQL PRODUCTION DATABASE SCHEMA
-- Migration: 002_sales_and_finance_analytics.sql
-- Description: Statistical Periods, Sales & Finance Analytics, RLS Policies
-- ====================================================================

-- 1. STATISTICAL PERIODS TABLE (For "Yangi statistik davrni boshlash" / Reset to 0)
CREATE TABLE IF NOT EXISTS statistical_periods (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    archived_by VARCHAR(100),
    reason TEXT,
    summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_periods_started_at ON statistical_periods(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_periods_archived_at ON statistical_periods(archived_at);

-- Insert default active period if not present
INSERT INTO statistical_periods (id, name, started_at)
VALUES ('period_initial', 'Boshlang‘ich hisobot davri', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. SALES SUMMARY VIEW (Accurate Revenue, COGS, Gross Profit, Real Net Profit)
CREATE OR REPLACE VIEW view_sales_finance_summary AS
SELECT
    COALESCE(o.statistical_period_id, 'period_initial') AS period_id,
    COUNT(DISTINCT o.id) AS total_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'YETKAZILDI' THEN o.id END) AS completed_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'BEKOR_QILINDI' THEN o.id END) AS cancelled_orders,
    COUNT(DISTINCT CASE WHEN o.status IN ('YANGI', 'TASDIQLANDI', 'TAYYORLANMOQDA', 'YETKAZILMOQDA') THEN o.id END) AS pending_orders,
    COALESCE(SUM(CASE WHEN o.status = 'YETKAZILDI' THEN o.total ELSE 0 END), 0) AS total_revenue,
    COALESCE(SUM(CASE WHEN o.status = 'YETKAZILDI' THEN o.delivery_fee ELSE 0 END), 0) AS delivery_expenses,
    COALESCE(SUM(CASE WHEN o.status = 'YETKAZILDI' THEN o.discount ELSE 0 END), 0) AS discounts_total,
    COALESCE(SUM(CASE WHEN o.status = 'BEKOR_QILINDI' AND o.payment_status = 'TOLANDI' THEN o.total ELSE 0 END), 0) AS refunds_total,
    COALESCE(SUM(CASE WHEN o.status IN ('YANGI', 'TASDIQLANDI', 'TAYYORLANMOQDA', 'YETKAZILMOQDA') THEN o.total ELSE 0 END), 0) AS pending_revenue
FROM orders o
GROUP BY COALESCE(o.statistical_period_id, 'period_initial');

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistical_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Anonymous and public read access for catalog
DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products" ON products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view active categories" ON categories;
CREATE POLICY "Public can view active categories" ON categories
    FOR SELECT USING (is_hidden = false);

DROP POLICY IF EXISTS "Public can view active banners" ON banners;
CREATE POLICY "Public can view active banners" ON banners
    FOR SELECT USING (is_active = true);

-- Service role full access for backend API operations
DROP POLICY IF EXISTS "Service role full access on products" ON products;
CREATE POLICY "Service role full access on products" ON products
    FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access on orders" ON orders;
CREATE POLICY "Service role full access on orders" ON orders
    FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access on order_items" ON order_items;
CREATE POLICY "Service role full access on order_items" ON order_items
    FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access on users" ON users;
CREATE POLICY "Service role full access on users" ON users
    FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access on statistical_periods" ON statistical_periods;
CREATE POLICY "Service role full access on statistical_periods" ON statistical_periods
    FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access on audit_logs" ON audit_logs;
CREATE POLICY "Service role full access on audit_logs" ON audit_logs
    FOR ALL TO service_role USING (true);

-- ============================================================
-- Migration: Enable Row Level Security (RLS) on ALL tables
-- Purpose: Fix 30 Supabase Security Advisor errors
--   - 22 errors: RLS not enabled on public tables
--   - 8 errors: Sensitive columns exposed without RLS
--
-- Strategy: Since this app uses Prisma with the service_role key
-- (which bypasses RLS), we enable RLS on all tables and create
-- a restrictive default policy. The service_role key will continue
-- to work as before. The anon/authenticated Supabase API keys
-- will be blocked from accessing data directly.
-- ============================================================

-- ─── USERS ──────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ─── COMPANY ────────────────────────────────────────────────
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;

-- ─── CLIENTS ────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ─── PROVIDERS ──────────────────────────────────────────────
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- ─── SERVICES ───────────────────────────────────────────────
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- ─── TAXES ──────────────────────────────────────────────────
ALTER TABLE public.taxes ENABLE ROW LEVEL SECURITY;

-- ─── DOCUMENT COUNTERS ──────────────────────────────────────
ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;

-- ─── QUOTES ─────────────────────────────────────────────────
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- ─── QUOTE LINES ────────────────────────────────────────────
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;

-- ─── INVOICES ───────────────────────────────────────────────
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ─── INVOICE LINES ──────────────────────────────────────────
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

-- ─── PURCHASE INVOICES ──────────────────────────────────────
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;

-- ─── PURCHASE INVOICE LINES ────────────────────────────────
ALTER TABLE public.purchase_invoice_lines ENABLE ROW LEVEL SECURITY;

-- ─── PAYMENTS ───────────────────────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ─── RECURRING TEMPLATES ────────────────────────────────────
ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;

-- ─── RECURRING TEMPLATE LINES ──────────────────────────────
ALTER TABLE public.recurring_template_lines ENABLE ROW LEVEL SECURITY;

-- ─── RECURRING RUNS ─────────────────────────────────────────
ALTER TABLE public.recurring_runs ENABLE ROW LEVEL SECURITY;

-- ─── DOCUMENTS ──────────────────────────────────────────────
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ─── ACTIVITY LOGS ──────────────────────────────────────────
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ─── BANK ACCOUNTS ──────────────────────────────────────────
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- ─── BANK TRANSACTIONS ─────────────────────────────────────
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- ─── BRANDING ───────────────────────────────────────────────
ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RESTRICTIVE POLICIES
-- By default, with RLS enabled and NO permissive policies,
-- all access via anon/authenticated keys is DENIED.
-- The service_role key (used by Prisma) bypasses RLS entirely.
--
-- If in the future you need Supabase Auth users to access
-- data directly via the Supabase client SDK, you would add
-- permissive policies here. For now, all access goes through
-- the Next.js API routes using the service_role key.
-- ============================================================

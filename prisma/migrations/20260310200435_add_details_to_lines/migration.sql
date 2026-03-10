-- AlterTable
ALTER TABLE "quote_lines" ADD COLUMN "details" TEXT;

-- AlterTable
ALTER TABLE "invoice_lines" ADD COLUMN "details" TEXT;

-- AlterTable
ALTER TABLE "purchase_invoice_lines" ADD COLUMN "details" TEXT;

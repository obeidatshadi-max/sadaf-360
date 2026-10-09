CREATE TYPE "public"."customer_segment" AS ENUM('Tender', 'Private');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('invoice', 'return');--> statement-breakpoint
CREATE TYPE "public"."import_kind" AS ENUM('products', 'customers', 'sales', 'receipts', 'open_invoices', 'stock_snapshot', 'stock_transactions', 'installed_units');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('accepted', 'partial', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."product_line" AS ENUM('Equipment', 'Devices', 'Consumables');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('Active', 'Expiring', 'No contract');--> statement-breakpoint
CREATE TYPE "public"."stock_tx_type" AS ENUM('customer_issue', 'customer_return', 'transfer', 'purchase_receipt', 'adjustment');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(300) NOT NULL,
	"city" varchar(100),
	"customer_type" varchar(100),
	"segment" "customer_segment",
	"payment_terms_days" integer,
	"credit_limit" numeric(14, 3),
	"account_owner" varchar(200),
	"active" boolean DEFAULT true NOT NULL,
	"import_batch_id" uuid,
	CONSTRAINT "customers_company_id_uniq" UNIQUE("company_id","id")
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"kind" "import_kind" NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_sha256" varchar(64) NOT NULL,
	"snapshot_date" date,
	"rows_total" integer NOT NULL,
	"rows_accepted" integer NOT NULL,
	"rows_rejected" integer NOT NULL,
	"status" "import_status" NOT NULL,
	"rejections" jsonb,
	"imported_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_batches_company_id_uniq" UNIQUE("company_id","id")
);
--> statement-breakpoint
CREATE TABLE "installed_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(80) NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid,
	"name" varchar(300) NOT NULL,
	"installed_on" date,
	"warranty_end" date,
	"service" "service_status",
	"expected_monthly_consumables" numeric(14, 3),
	"import_batch_id" uuid
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"invoice_no" varchar(80) NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_date" date NOT NULL,
	"due_date" date,
	"account_owner" varchar(200),
	"import_batch_id" uuid,
	CONSTRAINT "invoices_company_id_uniq" UNIQUE("company_id","id")
);
--> statement-breakpoint
CREATE TABLE "open_invoice_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"invoice_id" uuid NOT NULL,
	"remaining_amount" numeric(14, 3) NOT NULL,
	"import_batch_id" uuid
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(300) NOT NULL,
	"line" "product_line" NOT NULL,
	"manufacturer" varchar(200),
	"supplier_code" varchar(80),
	"supplier_name" varchar(200),
	"unit" varchar(30),
	"pack_conversion" numeric(14, 3),
	"tracks_expiry" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"import_batch_id" uuid,
	CONSTRAINT "products_company_id_uniq" UNIQUE("company_id","id")
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"receipt_no" varchar(80) NOT NULL,
	"allocation_row_id" varchar(80) NOT NULL,
	"receipt_date" date NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_id" uuid,
	"allocated_amount" numeric(14, 3) NOT NULL,
	"import_batch_id" uuid
);
--> statement-breakpoint
CREATE TABLE "sales_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_no" varchar(40) NOT NULL,
	"doc_type" "doc_type" DEFAULT 'invoice' NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"net_sales" numeric(14, 3) NOT NULL,
	"product_cost" numeric(14, 3),
	"project_ref" varchar(80),
	"import_batch_id" uuid
);
--> statement-breakpoint
CREATE TABLE "stock_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"product_id" uuid NOT NULL,
	"warehouse" varchar(80) NOT NULL,
	"batch" varchar(80) DEFAULT '' NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"unit_cost" numeric(14, 3),
	"expiry_date" date,
	"owned" boolean DEFAULT true NOT NULL,
	"import_batch_id" uuid
);
--> statement-breakpoint
CREATE TABLE "stock_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"transaction_id" varchar(80) NOT NULL,
	"tx_date" date NOT NULL,
	"product_id" uuid NOT NULL,
	"batch" varchar(80) DEFAULT '' NOT NULL,
	"warehouse" varchar(80) NOT NULL,
	"tx_type" "stock_tx_type" NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"import_batch_id" uuid
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_import_batch_id_import_batches_company_id_id_fk" FOREIGN KEY ("company_id","import_batch_id") REFERENCES "public"."import_batches"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installed_units" ADD CONSTRAINT "installed_units_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installed_units" ADD CONSTRAINT "installed_units_company_id_customer_id_customers_company_id_id_fk" FOREIGN KEY ("company_id","customer_id") REFERENCES "public"."customers"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installed_units" ADD CONSTRAINT "installed_units_company_id_product_id_products_company_id_id_fk" FOREIGN KEY ("company_id","product_id") REFERENCES "public"."products"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installed_units" ADD CONSTRAINT "installed_units_company_id_import_batch_id_import_batches_company_id_id_fk" FOREIGN KEY ("company_id","import_batch_id") REFERENCES "public"."import_batches"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_customer_id_customers_company_id_id_fk" FOREIGN KEY ("company_id","customer_id") REFERENCES "public"."customers"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_import_batch_id_import_batches_company_id_id_fk" FOREIGN KEY ("company_id","import_batch_id") REFERENCES "public"."import_batches"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_invoice_snapshots" ADD CONSTRAINT "open_invoice_snapshots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_invoice_snapshots" ADD CONSTRAINT "open_invoice_snapshots_company_id_invoice_id_invoices_company_id_id_fk" FOREIGN KEY ("company_id","invoice_id") REFERENCES "public"."invoices"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_invoice_snapshots" ADD CONSTRAINT "open_invoice_snapshots_company_id_import_batch_id_import_batches_company_id_id_fk" FOREIGN KEY ("company_id","import_batch_id") REFERENCES "public"."import_batches"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_import_batch_id_import_batches_company_id_id_fk" FOREIGN KEY ("company_id","import_batch_id") REFERENCES "public"."import_batches"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_company_id_customer_id_customers_company_id_id_fk" FOREIGN KEY ("company_id","customer_id") REFERENCES "public"."customers"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_company_id_invoice_id_invoices_company_id_id_fk" FOREIGN KEY ("company_id","invoice_id") REFERENCES "public"."invoices"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_company_id_import_batch_id_import_batches_company_id_id_fk" FOREIGN KEY ("company_id","import_batch_id") REFERENCES "public"."import_batches"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_lines" ADD CONSTRAINT "sales_lines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_lines" ADD CONSTRAINT "sales_lines_company_id_invoice_id_invoices_company_id_id_fk" FOREIGN KEY ("company_id","invoice_id") REFERENCES "public"."invoices"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_lines" ADD CONSTRAINT "sales_lines_company_id_product_id_products_company_id_id_fk" FOREIGN KEY ("company_id","product_id") REFERENCES "public"."products"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_lines" ADD CONSTRAINT "sales_lines_company_id_import_batch_id_import_batches_company_id_id_fk" FOREIGN KEY ("company_id","import_batch_id") REFERENCES "public"."import_batches"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_company_id_product_id_products_company_id_id_fk" FOREIGN KEY ("company_id","product_id") REFERENCES "public"."products"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_company_id_import_batch_id_import_batches_company_id_id_fk" FOREIGN KEY ("company_id","import_batch_id") REFERENCES "public"."import_batches"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_company_id_product_id_products_company_id_id_fk" FOREIGN KEY ("company_id","product_id") REFERENCES "public"."products"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_company_id_import_batch_id_import_batches_company_id_id_fk" FOREIGN KEY ("company_id","import_batch_id") REFERENCES "public"."import_batches"("company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_company_code_uniq" ON "customers" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batches_file_uniq" ON "import_batches" USING btree ("company_id","kind","file_sha256");--> statement-breakpoint
CREATE INDEX "import_batches_company_kind_idx" ON "import_batches" USING btree ("company_id","kind","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "installed_units_company_code_uniq" ON "installed_units" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "installed_units_customer_idx" ON "installed_units" USING btree ("company_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_company_no_uniq" ON "invoices" USING btree ("company_id","invoice_no");--> statement-breakpoint
CREATE INDEX "invoices_customer_date_idx" ON "invoices" USING btree ("company_id","customer_id","invoice_date");--> statement-breakpoint
CREATE UNIQUE INDEX "open_invoice_snapshots_uniq" ON "open_invoice_snapshots" USING btree ("company_id","snapshot_date","invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_company_code_uniq" ON "products" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_alloc_uniq" ON "receipts" USING btree ("company_id","receipt_no","allocation_row_id");--> statement-breakpoint
CREATE INDEX "receipts_customer_date_idx" ON "receipts" USING btree ("company_id","customer_id","receipt_date");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_lines_invoice_line_uniq" ON "sales_lines" USING btree ("company_id","invoice_id","line_no");--> statement-breakpoint
CREATE INDEX "sales_lines_product_idx" ON "sales_lines" USING btree ("company_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_snapshots_uniq" ON "stock_snapshots" USING btree ("company_id","snapshot_date","product_id","warehouse","batch");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_tx_uniq" ON "stock_transactions" USING btree ("company_id","transaction_id");--> statement-breakpoint
CREATE INDEX "stock_tx_product_date_idx" ON "stock_transactions" USING btree ("company_id","product_id","tx_date");
-- AlterTable
ALTER TABLE "organization_verifications"
ADD COLUMN "status_report_doc_key" TEXT,
ADD COLUMN "memart_doc_key" TEXT,
ADD COLUMN "scuml_doc_key" TEXT,
ADD COLUMN "tin_doc_key" TEXT,
ADD COLUMN "address_proof_doc_key" TEXT;

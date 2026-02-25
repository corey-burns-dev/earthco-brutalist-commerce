CREATE SEQUENCE IF NOT EXISTS "Product_id_seq";

ALTER TABLE "Product"
ALTER COLUMN "id" SET DEFAULT nextval('"Product_id_seq"');

SELECT setval(
  '"Product_id_seq"',
  COALESCE((SELECT MAX("id") FROM "Product"), 0) + 1,
  false
);

ALTER SEQUENCE "Product_id_seq" OWNED BY "Product"."id";

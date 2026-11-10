/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `sizes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `sizes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "sizes_isActive_idx";

-- DropIndex
DROP INDEX "sizes_name_code_key";

-- DropIndex
DROP INDEX "sizes_sortOrder_idx";

-- CreateIndex
CREATE UNIQUE INDEX "sizes_name_key" ON "sizes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sizes_code_key" ON "sizes"("code");

-- CreateIndex
CREATE INDEX "sizes_sortOrder_isActive_idx" ON "sizes"("sortOrder", "isActive");

-- CHECK constraints de integridad para cantidades, dineros y rangos.
-- Prisma no los expresa en el schema; viven aquí como migración manual.

-- Órdenes y líneas
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_subtotal_nonneg_check" CHECK ("subtotal" >= 0),
  ADD CONSTRAINT "orders_shipping_total_nonneg_check" CHECK ("shipping_total" >= 0),
  ADD CONSTRAINT "orders_tax_total_nonneg_check" CHECK ("tax_total" >= 0),
  ADD CONSTRAINT "orders_total_nonneg_check" CHECK ("total" >= 0);

ALTER TABLE "order_lines"
  ADD CONSTRAINT "order_lines_quantity_positive_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "order_lines_unit_price_nonneg_check" CHECK ("unit_price" >= 0),
  ADD CONSTRAINT "order_lines_tax_amount_nonneg_check" CHECK ("tax_amount" >= 0),
  ADD CONSTRAINT "order_lines_total_nonneg_check" CHECK ("total" >= 0);

-- Carrito
ALTER TABLE "cart_lines"
  ADD CONSTRAINT "cart_lines_quantity_positive_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "cart_lines_captured_unit_price_nonneg_check" CHECK ("captured_unit_price" >= 0),
  ADD CONSTRAINT "cart_lines_current_unit_price_nonneg_check" CHECK ("current_unit_price" >= 0),
  ADD CONSTRAINT "cart_lines_available_stock_nonneg_check" CHECK ("available_stock" >= 0);

-- Reservas de stock
ALTER TABLE "stock_reservations"
  ADD CONSTRAINT "stock_reservations_quantity_positive_check" CHECK ("quantity" > 0);

-- Pagos
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_nonneg_check" CHECK ("amount" >= 0);

ALTER TABLE "payment_refunds"
  ADD CONSTRAINT "payment_refunds_amount_nonneg_check" CHECK ("amount" >= 0);

-- Niveles de inventario: no negativos y reservas no exceden stock
ALTER TABLE "inventory_levels"
  ADD CONSTRAINT "inventory_levels_stocked_nonneg_check" CHECK ("stocked_quantity" >= 0),
  ADD CONSTRAINT "inventory_levels_reserved_nonneg_check" CHECK ("reserved_quantity" >= 0),
  ADD CONSTRAINT "inventory_levels_incoming_nonneg_check" CHECK ("incoming_quantity" >= 0),
  ADD CONSTRAINT "inventory_levels_reserved_le_stocked_check" CHECK ("reserved_quantity" <= "stocked_quantity");

-- Catálogo de precios
ALTER TABLE "prices"
  ADD CONSTRAINT "prices_amount_nonneg_check" CHECK ("amount" >= 0);

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_cost_nonneg_check" CHECK ("cost" IS NULL OR "cost" >= 0),
  ADD CONSTRAINT "product_variants_sale_price_nonneg_check" CHECK ("sale_price" IS NULL OR "sale_price" >= 0);

-- Envío
ALTER TABLE "store_shipping_methods"
  ADD CONSTRAINT "store_shipping_methods_base_amount_nonneg_check" CHECK ("base_amount" >= 0),
  ADD CONSTRAINT "store_shipping_methods_per_kg_amount_nonneg_check" CHECK ("per_kg_amount" >= 0),
  ADD CONSTRAINT "store_shipping_methods_free_over_amount_nonneg_check" CHECK ("free_over_amount" IS NULL OR "free_over_amount" >= 0);

-- Reseñas
ALTER TABLE "product_reviews"
  ADD CONSTRAINT "product_reviews_rating_range_check" CHECK ("rating" BETWEEN 1 AND 5);

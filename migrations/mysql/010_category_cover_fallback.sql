UPDATE categories
SET image='/assets/floralis/product-4198-0.webp'
WHERE slug='cadouri-accesorii'
  AND (image IS NULL OR TRIM(image)='');

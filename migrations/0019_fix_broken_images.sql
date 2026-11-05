-- Two demo product photos were removed from Unsplash (404): swap them for working ones
UPDATE products SET images = replace(images, 'photo-1583241800698-e8ab01c85dfc', 'photo-1512496015851-a90fb38ba796')
  WHERE images LIKE '%photo-1583241800698-e8ab01c85dfc%';
UPDATE products SET images = replace(images, 'photo-1588423771073-b8903fba77ac', 'photo-1606220588913-b3aacb4d2f46')
  WHERE images LIKE '%photo-1588423771073-b8903fba77ac%';

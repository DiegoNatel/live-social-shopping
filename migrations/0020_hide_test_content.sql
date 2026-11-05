-- Hides the QA and test lives and the "NÃO COMPRAR" test product from shoppers, the same way an
-- admin takedown does (nothing is deleted). All get the same blocked_at, so undoing it is:
--   UPDATE streams SET blocked_at = NULL WHERE blocked_at = '2026-11-04T00:00:00.000Z';
--   UPDATE products SET is_active = 1, blocked_at = NULL WHERE blocked_at = '2026-11-04T00:00:00.000Z';
UPDATE streams SET blocked_at = '2026-11-04T00:00:00.000Z'
  WHERE blocked_at IS NULL AND id IN (
    '3edf3dc6-3fd2-4581-8399-3a9ecb0e1a9b', -- QA TESTE FUNCIONAL — NÃO COMPRAR
    'f419b8a7-2027-4efd-81ff-547b3cea46dd', -- Dauda teste 3
    'c4bb51b4-1eef-4d99-b777-a9fa19977ab3', -- Teste Dauda
    '04e6a9e3-9f0f-4c20-9b81-ac03272525a4'  -- Live test 2
  );
UPDATE products SET is_active = 0, blocked_at = '2026-11-04T00:00:00.000Z'
  WHERE blocked_at IS NULL AND id = '52a67e75-e2d6-4c2f-b75b-73ead92da54b'; -- QA TESTE — Kit demonstrativo — NÃO COMPRAR

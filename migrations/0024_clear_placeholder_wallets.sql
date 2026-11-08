-- Asaas wallet ids that can't be real (the form's 00000000-0000-… example, or one digit
-- repeated). Saving one marked the shop ready to sell with nowhere to send the seller's money;
-- the API now refuses them (isPlaceholderWalletId in lib/payments/asaas.ts). Shops that had one
-- go back to "configurando a loja" until a real wallet is saved.
UPDATE users SET asaas_wallet_id = NULL
WHERE lower(asaas_wallet_id) IN (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'ffffffff-ffff-ffff-ffff-ffffffffffff'
);

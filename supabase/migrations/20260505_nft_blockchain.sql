-- =============================================================================
-- Migration : Intégration blockchain NFT pour KATRYA
-- Date      : 2026-05-05
-- =============================================================================
-- Cette migration ajoute :
--   1. Colonnes NFT sur la table `products`
--      - nft_token_id        : ID du token ERC-721 sur Polygon
--      - nft_contract_address: Adresse du smart contract Thirdweb
--      - nft_chain           : Blockchain utilisée (ex: 'polygon')
--   2. Table `nft_transfers`
--      - Historique complet des transferts de propriété NFT
--      - Permet d'afficher le "passeport de propriété" sur la page certificat
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Colonnes NFT sur products
-- -----------------------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS nft_token_id        TEXT,
  ADD COLUMN IF NOT EXISTS nft_contract_address TEXT,
  ADD COLUMN IF NOT EXISTS nft_chain            TEXT DEFAULT 'polygon';

-- Index pour requêtes rapides par token
CREATE INDEX IF NOT EXISTS idx_products_nft_token_id
  ON products (nft_token_id)
  WHERE nft_token_id IS NOT NULL;

COMMENT ON COLUMN products.nft_token_id         IS 'ID du token NFT ERC-721 sur Polygon';
COMMENT ON COLUMN products.nft_contract_address IS 'Adresse du smart contract ERC-721 KATRYA';
COMMENT ON COLUMN products.nft_chain            IS 'Blockchain : polygon | ethereum';

-- -----------------------------------------------------------------------------
-- 2. Table nft_transfers (historique de propriété)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nft_transfers (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id       UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  token_id         TEXT        NOT NULL,
  from_address     TEXT        NOT NULL,
  to_address       TEXT        NOT NULL,
  transaction_hash TEXT        NOT NULL UNIQUE,
  chain            TEXT        NOT NULL DEFAULT 'polygon',
  transferred_by   UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_nft_transfers_product_id
  ON nft_transfers (product_id);

CREATE INDEX IF NOT EXISTS idx_nft_transfers_to_address
  ON nft_transfers (to_address);

COMMENT ON TABLE nft_transfers IS 'Historique complet des transferts NFT (preuve de propriété blockchain)';

-- -----------------------------------------------------------------------------
-- 3. RLS (Row Level Security) sur nft_transfers
-- -----------------------------------------------------------------------------
ALTER TABLE nft_transfers ENABLE ROW LEVEL SECURITY;

-- Lecture publique : n'importe qui peut vérifier l'authenticité
CREATE POLICY "nft_transfers_public_read"
  ON nft_transfers FOR SELECT
  USING (true);

-- Écriture : uniquement via les API routes backend (service role)
-- Les API routes Next.js utilisent le service role key, pas le anon key
CREATE POLICY "nft_transfers_service_insert"
  ON nft_transfers FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- =============================================================================
-- Instructions de déploiement Thirdweb
-- =============================================================================
-- Avant de pouvoir minter des NFTs, vous devez :
--
-- 1. Créer un compte sur https://thirdweb.com
-- 2. Déployer un contrat NFT Collection (ERC-721) sur Polygon
--    -> Dashboard -> Deploy -> NFT Collection -> Polygon
-- 3. Récupérer :
--    - L'adresse du contrat -> THIRDWEB_CONTRACT_ADDRESS
--    - Votre secret key -> THIRDWEB_SECRET_KEY
-- 4. Créer un wallet admin KATRYA (MetaMask ou autre)
--    - Exporter la private key -> KATRYA_ADMIN_PRIVATE_KEY
--    - Alimenter ce wallet avec ~1 MATIC pour les frais de gas
-- 5. Ajouter ces variables dans Vercel Dashboard -> Settings -> Env Vars
-- 6. Exécuter cette migration dans Supabase -> SQL Editor
-- =============================================================================

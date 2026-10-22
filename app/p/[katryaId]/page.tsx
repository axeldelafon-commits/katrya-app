import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AddToWardrobeButton from './AddToWardrobeButton'
import ImageGallery from './ImageGallery'
import { resolveTheme, accentIsReadableOnDark, type BrandTheme } from '@/lib/brand-theme'
import { passportFieldLabel, isHiddenPassportField } from '@/lib/passport-labels'
import { categoryLabel } from '@/lib/categories'

/**
 * Jamais de cache sur un passeport.
 *
 * Next met en cache les appels fetch des composants serveur, et le client
 * Supabase passe par fetch : sans cette ligne, la page sert indefiniment le
 * contenu lu au premier affichage. Une photo ajoutee ou un passeport
 * republie n'apparait jamais -- c'est ce qui s'est produit sur le
 * deploiement de previsualisation, bloque a trois photos alors que la base
 * en comptait cinq.
 *
 * Pour un passeport produit, servir une version perimee n'est pas un detail
 * de performance : la marque corrige une information et le visiteur continue
 * de lire l'ancienne.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: { katryaId: string }
}

export default async function PassportPage({ params }: PageProps) {
  const { katryaId } = params
  // Lecture cote serveur avec la cle de service : les donnees publiques du
  // passeport sont choisies ici, colonne par colonne, plutot que d'etre
  // exposees par une politique de lecture anonyme sur la table entiere.
  // Avec une telle politique, la cle publique permettait de vider le
  // catalogue (tous les produits actifs, toutes les colonnes) via l'API REST.
  const supabase = createServiceClient()

  const { data: product, error: productError } = await supabase
    .from('products')
    .select(`
      id, katrya_id, brand, model_name, category, status, serial_number,
      nft_token_id, nft_contract_address, nft_chain,
      passports(version, public_data, published_at),
      organizations(name, slug, theme),
      product_images(id, url, position, alt_text)
    `)
    .eq('katrya_id', katryaId)
    .maybeSingle()

  if (productError) {
    console.error('[passport] Supabase error:', productError.message)
    return <PassportUnavailable katryaId={katryaId} />
  }

  if (!product) notFound()

  // La lecture passe desormais par la cle de service, qui ignore les politiques
  // RLS : le filtre sur le statut, jusqu'ici assure par la politique publique,
  // doit etre explicite ici. Il est aussi plus fin qu'avant -- un produit non
  // publie affichait "puce non reconnue", c'est-a-dire le message des
  // contrefacons, alors qu'il est parfaitement legitime.
  const VISIBLE = ['active', 'transferred']
  const WITHDRAWN = ['flagged', 'revoked']
  if (!VISIBLE.includes(product.status)) {
    return WITHDRAWN.includes(product.status)
      ? <PassportWithdrawn katryaId={katryaId} />
      : <PassportNotPublished katryaId={katryaId} />
  }

  const passports = product.passports as any[]
  const passport = passports && passports.length > 0
    ? passports.sort((a: any, b: any) => b.version - a.version)[0]
    : null

  const org = product.organizations as any
  const publicData = passport?.public_data as any

  // Charte de la marque. Le passeport est la seule page que voit l'acheteur
  // apres un scan : elle porte l'identite de la marque, pas celle de KATRYA.
  const theme = resolveTheme(org?.theme)
  const accentOnText = accentIsReadableOnDark(theme.accent)
  const displayClass = theme.displayFont === 'display' ? 'font-display' : ''
  const bodyClass = theme.bodyFont === 'body' ? 'font-body' : ''

  // Le recit est structure : il se met en page, il ne se range pas dans le
  // tableau cle/valeur -- sans quoi il s'y afficherait en "[object Object]".
  const story = publicData?.story as
    | { headline?: string; intro?: string; steps?: { title: string; detail: string }[] }
    | undefined
  const hasStory = Boolean(
    story && (story.headline || story.intro || (story.steps && story.steps.length > 0))
  )
  const images = ((product.product_images as any[]) || []).sort(
    (a: any, b: any) => a.position - b.position
  )
  const fallbackUrl = publicData?.main_image_url || null

  // Certificat NFT
  const { data: nftCert } = await supabase
    .from('nft_certificates')
    .select('token_id, transaction_hash, contract_address, owner_address, status, minted_at')
    .eq('katrya_id', katryaId)
    .maybeSingle()

  return (
    <main className={`min-h-screen bg-black text-white ${bodyClass}`}>
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between gap-4">
        <BrandMark theme={theme} name={org?.name} displayClass={displayClass} />
        <div className="flex items-center gap-3 shrink-0">
          <span className={`hidden sm:inline text-xs tracking-[0.2em] uppercase text-white/30 ${displayClass}`}>
            Passeport Produit
          </span>
          <Link
            href="/wardrobe"
            className={`text-xs tracking-[0.2em] uppercase text-white/60 border border-white/20 px-3 py-1 rounded-full hover:border-white/50 hover:text-white transition-colors ${displayClass}`}
          >
            Mon dressing
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <ImageGallery
          images={images}
          productName={`${product.brand} ${product.model_name}`}
          fallbackUrl={fallbackUrl}
          accent={theme.accent}
        />

        <div className="mb-6">
          <p className={`text-xs text-white/40 uppercase tracking-widest ${displayClass}`}>
            {org?.name || 'KATRYA'}
          </p>
          <h1 className={`text-3xl font-bold mt-1 ${displayClass}`}>{product.model_name}</h1>
          <p className="text-white/40 mt-2 text-sm">{categoryLabel(product.category)}</p>
        </div>

        <Panel accent={theme.accent}>
          <PanelTitle displayClass={displayClass}>Passeport numérique</PanelTitle>
          <div className="space-y-2 text-sm">
            <Row label="ID KATRYA" value={<span className="font-mono text-xs">{product.katrya_id}</span>} />
            <Row label="Marque" value={product.brand} />
            <Row label="Modèle" value={product.model_name} />
            {product.serial_number && (
              <Row
                label="N° de série"
                value={<span className="font-mono text-xs">{product.serial_number}</span>}
              />
            )}
            <Row
              label="Statut"
              value={
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: theme.accent, color: '#fff' }}
                >
                  ✓ Authentique
                </span>
              }
            />
          </div>
        </Panel>

        {hasStory && (
          <Panel accent={theme.accent} className="p-5">
            {story?.headline && (
              <h2 className={`text-lg font-semibold tracking-wide mb-2 ${displayClass}`}>
                {story.headline}
              </h2>
            )}
            {story?.intro && (
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">
                {story.intro}
              </p>
            )}
            {story?.steps && story.steps.length > 0 && (
              <ol className="mt-5 space-y-4">
                {story.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className="mt-0.5 shrink-0 w-6 h-6 rounded-full grid place-items-center text-[11px] tabular-nums"
                      style={{
                        border: `1px solid ${theme.accent}`,
                        color: accentOnText ? theme.accent : 'rgba(255,255,255,.65)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${displayClass}`}>{step.title}</p>
                      {step.detail && (
                        <p className="text-sm text-white/50 leading-relaxed">{step.detail}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        )}

        {publicData && (
          <Panel accent={theme.accent}>
            <PanelTitle displayClass={displayClass}>Informations</PanelTitle>
            <div className="space-y-2 text-sm">
              {Object.entries(publicData)
                .filter(([key, value]) =>
                  !isHiddenPassportField(key) &&
                  value !== null &&
                  value !== '' &&
                  typeof value !== 'object'
                )
                .map(([key, value]) => (
                  <Row
                    key={key}
                    label={passportFieldLabel(key)}
                    value={
                      <span className="text-white/70">
                        {key === 'category' ? categoryLabel(String(value)) : String(value)}
                      </span>
                    }
                  />
                ))}
            </div>
          </Panel>
        )}

        {/* === CERTIFICATION BLOCKCHAIN === */}
        {nftCert ? (
          <div className="border border-purple-500/30 bg-purple-950/20 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: 16 }}>⚡</span>
              <h2 className={`text-sm font-semibold text-purple-300 uppercase tracking-widest ${displayClass}`}>
                Certifié Blockchain
              </h2>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Réseau" value={<span className="text-purple-300 font-semibold">Polygon Mainnet</span>} />
              <Row label="Token ID" value={<span className="font-mono text-xs text-white">#{nftCert.token_id}</span>} />
              <Row
                label="Propriétaire"
                value={
                  <span className="font-mono text-xs text-white/70">
                    {nftCert.owner_address.slice(0, 6)}...{nftCert.owner_address.slice(-4)}
                  </span>
                }
              />
              <Row
                label="Certifié le"
                value={
                  <span className="text-white/70 text-xs">
                    {new Date(nftCert.minted_at).toLocaleDateString('fr-FR')}
                  </span>
                }
              />
              <div className="pt-2 flex gap-3 flex-wrap">
                <a
                  href={`https://polygonscan.com/tx/${nftCert.transaction_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                >
                  Voir la transaction ↗
                </a>
                <a
                  href={`https://polygonscan.com/token/${nftCert.contract_address}?a=${nftCert.token_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                >
                  Voir le NFT ↗
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-white/5 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 14, opacity: 0.3 }}>⚡</span>
              <p className="text-xs text-white/30">Certification blockchain en attente</p>
            </div>
          </div>
        )}

        <AddToWardrobeButton productId={product.id} katryaId={product.katrya_id} />
      </div>

      <div className="border-t border-white/10 px-6 py-6 text-center mt-4 flex flex-col items-center gap-3">
        {theme.emblemUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={theme.emblemUrl} alt="" aria-hidden="true" className="h-5 w-auto opacity-25" />
        )}
        <p className={`text-xs text-white/20 tracking-widest uppercase ${displayClass}`}>
          Powered by KATRYA NFC
        </p>
      </div>
    </main>
  )
}

/** Logo de la marque, ou son nom en toutes lettres si elle n'en a pas depose. */
function BrandMark({
  theme,
  name,
  displayClass,
}: {
  theme: BrandTheme
  name?: string
  displayClass: string
}) {
  if (theme.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={theme.logoUrl}
        alt={name || 'KATRYA'}
        style={{ height: theme.logoHeight ?? 34 }}
        className="w-auto"
      />
    )
  }
  return (
    <span className={`text-xs tracking-[0.3em] uppercase text-white/40 ${displayClass}`}>
      {name || 'KATRYA'}
    </span>
  )
}

function Panel({
  children,
  accent,
  className = 'p-4',
}: {
  children: React.ReactNode
  accent: string
  className?: string
}) {
  return (
    <div
      className={`rounded-xl mb-4 ${className}`}
      style={{ border: '1px solid rgba(255,255,255,.10)', borderLeft: `2px solid ${accent}` }}
    >
      {children}
    </div>
  )
}

function PanelTitle({
  children,
  displayClass,
}: {
  children: React.ReactNode
  displayClass: string
}) {
  return (
    <h2 className={`text-[11px] font-semibold text-white/40 mb-3 uppercase tracking-[0.18em] ${displayClass}`}>
      {children}
    </h2>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/40 shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

function PassportNotPublished({ katryaId }: { katryaId: string }) {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">KATRYA</h1>
        <p className="text-yellow-400 text-lg mb-2">Passeport pas encore publie</p>
        <p className="text-gray-400 text-sm mb-2">
          Cette puce est bien enregistree chez KATRYA, mais le passeport du
          produit {katryaId} n&apos;a pas encore ete publie par la marque.
        </p>
        <p className="text-gray-500 text-xs mb-8">
          L&apos;authenticite du produit n&apos;est pas remise en cause.
        </p>
        <a href="/" className="inline-block border border-white text-white px-6 py-3 text-sm hover:bg-white hover:text-black transition-colors">
          Retour a l&apos;accueil
        </a>
      </div>
    </main>
  )
}

function PassportWithdrawn({ katryaId }: { katryaId: string }) {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">KATRYA</h1>
        <p className="text-red-400 text-lg mb-2">Passeport retire</p>
        <p className="text-gray-400 text-sm mb-2">
          Le passeport du produit {katryaId} a ete signale ou retire par la marque.
          Il ne certifie plus l&apos;authenticite de cet article.
        </p>
        <p className="text-gray-500 text-xs mb-8">
          Si vous venez d&apos;acheter cet article, contactez le vendeur et notre support.
        </p>
        <a href="/" className="inline-block border border-white text-white px-6 py-3 text-sm hover:bg-white hover:text-black transition-colors">
          Retour a l&apos;accueil
        </a>
      </div>
    </main>
  )
}

function PassportUnavailable({ katryaId }: { katryaId: string }) {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">KATRYA</h1>
        <p className="text-yellow-400 text-lg mb-2">Service momentanement indisponible</p>
        <p className="text-gray-400 text-sm mb-2">
          Nous ne parvenons pas a joindre le registre des passeports pour le moment.
          Ceci ne remet pas en cause l&apos;authenticite du produit {katryaId}.
        </p>
        <p className="text-gray-500 text-xs mb-8">Merci de reessayer dans quelques instants.</p>
        <a href="/" className="inline-block border border-white text-white px-6 py-3 text-sm hover:bg-white hover:text-black transition-colors">
          Retour a l&apos;accueil
        </a>
      </div>
    </main>
  )
}

/**
 * Charte graphique par marque.
 *
 * Le passeport est la seule page que voit l'acheteur apres un scan : elle doit
 * porter l'identite de la marque, pas celle de KATRYA. Le theme est stocke en
 * base (organizations.theme, jsonb) pour qu'une nouvelle marque n'exige aucune
 * modification de code.
 *
 * Contrainte de lisibilite : le passeport est sur fond blanc. Une couleur
 * d'accent sombre y est pleinement utilisable comme texte -- le bleu #2B4E79
 * de Jadesiign donne 8,5:1 sur blanc, tres au-dessus des 4,5:1 requis. C'est
 * l'interet du fond clair : la couleur de la marque porte les titres, les
 * numeros d'etape et le bouton d'action, au lieu de se limiter aux bordures.
 *
 * L'inverse existe aussi : une marque a l'accent tres clair (un jaune, un
 * beige) ne pourrait pas porter de texte sur blanc. `accentIsReadableOnLight`
 * tranche ce cas, et le code retombe alors sur l'encre du passeport.
 */

/** Encre du passeport : repli quand l'accent de la marque est trop clair. */
export const PASSPORT_INK = '#111111'

export interface BrandTheme {
  /** Couleur d'accent de la marque, en hexadecimal. */
  accent: string
  /** Logo affiche en tete de passeport. Chemin public ou URL de stockage. */
  logoUrl?: string | null
  /** Hauteur d'affichage du logo, en pixels. */
  logoHeight?: number
  /** Petit embleme repris comme filigrane ou puce. Chemin public. */
  emblemUrl?: string | null
  /** Police des titres : 'display' (Archivo Narrow) ou 'sans' (defaut). */
  displayFont?: 'display' | 'sans'
  /** Police du texte courant : 'body' (Montserrat) ou 'sans' (defaut). */
  bodyFont?: 'body' | 'sans'
}

export const DEFAULT_THEME: BrandTheme = {
  // Sur fond blanc, l'accent par defaut doit etre une encre, pas du blanc :
  // sans marque identifiee, le passeport se rend en noir et blanc.
  accent: PASSPORT_INK,
  logoUrl: null,
  emblemUrl: null,
  displayFont: 'sans',
  bodyFont: 'sans',
}

/**
 * Normalise ce qui sort de la base. La colonne est en jsonb libre : tout
 * champ absent ou mal type retombe sur la valeur par defaut plutot que de
 * casser la page publique.
 */
export function resolveTheme(raw: unknown): BrandTheme {
  if (!raw || typeof raw !== 'object') return DEFAULT_THEME
  const t = raw as Record<string, unknown>
  const hex = typeof t.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(t.accent)
    ? t.accent
    : DEFAULT_THEME.accent
  return {
    accent: hex,
    logoUrl: typeof t.logo_url === 'string' && t.logo_url ? t.logo_url : null,
    logoHeight: typeof t.logo_height === 'number' ? t.logo_height : 34,
    emblemUrl: typeof t.emblem_url === 'string' && t.emblem_url ? t.emblem_url : null,
    displayFont: t.display_font === 'display' ? 'display' : 'sans',
    bodyFont: t.body_font === 'body' ? 'body' : 'sans',
  }
}

/** Luminance relative WCAG. */
function relativeLuminance(hex: string): number {
  const v = hex.replace('#', '')
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** Contraste de la couleur d'accent sur fond blanc. */
export function accentContrastOnWhite(accent: string): number {
  return 1.05 / (relativeLuminance(accent) + 0.05)
}

/**
 * Vrai si la couleur d'accent peut porter du texte sur fond blanc.
 * Sinon, le texte retombe sur `PASSPORT_INK` et l'accent reste cantonne aux
 * aplats et bordures.
 */
export function accentIsReadableOnLight(accent: string): boolean {
  return accentContrastOnWhite(accent) >= 4.5
}

/**
 * Couleur a utiliser pour du texte ou un aplat portant du blanc : l'accent
 * de la marque s'il est assez sombre, l'encre du passeport sinon.
 */
export function accentInk(accent: string): string {
  return accentIsReadableOnLight(accent) ? accent : PASSPORT_INK
}

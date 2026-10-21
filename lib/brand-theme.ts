/**
 * Charte graphique par marque.
 *
 * Le passeport est la seule page que voit l'acheteur apres un scan : elle doit
 * porter l'identite de la marque, pas celle de KATRYA. Le theme est stocke en
 * base (organizations.theme, jsonb) pour qu'une nouvelle marque n'exige aucune
 * modification de code -- seul le fichier de logo doit etre depose dans
 * public/brands/<slug>/.
 *
 * Contrainte de lisibilite : le passeport est sur fond noir. Une couleur
 * d'accent sombre (le bleu #2B4E79 de Jadesiign, par exemple) a un contraste
 * de 2,4:1 sur du noir, tres en dessous des 4,5:1 requis pour du texte. La
 * couleur d'accent ne sert donc qu'en aplat (bandeaux, bordures, pastilles) ;
 * le texte reste blanc. C'est la raison d'etre de `accentIsReadableOnDark`.
 */

export interface BrandTheme {
  /** Couleur d'accent de la marque, en hexadecimal. */
  accent: string
  /** Logo affiche en tete de passeport, sur fond noir. Chemin public. */
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
  accent: '#FFFFFF',
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

/** Contraste de la couleur d'accent sur fond noir. */
export function accentContrastOnBlack(accent: string): number {
  return (relativeLuminance(accent) + 0.05) / 0.05
}

/**
 * Vrai si la couleur d'accent peut porter du texte sur fond noir.
 * Sinon, l'accent reste cantonne aux aplats et le texte reste blanc.
 */
export function accentIsReadableOnDark(accent: string): boolean {
  return accentContrastOnBlack(accent) >= 4.5
}

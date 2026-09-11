/**
 * Vocabulaire canonique des categories produit.
 *
 * ATTENTION : ces valeurs ne sont pas cosmetiques. Le regroupement du dressing
 * (app/admin/users/[userId]/wardrobe/page.tsx) filtre sur ces chaines exactes.
 * Une categorie ecrite autrement -- "Haut", "T-Shirt", "Chaussures" -- cree un
 * produit qui n'apparait dans AUCUNE section du dressing, silencieusement.
 *
 * Toute nouvelle categorie doit donc etre ajoutee ici ET dans le regroupement.
 */
export const PRODUCT_CATEGORIES = [
  { value: 'tops', label: 'Haut (t-shirt, chemise, pull)' },
  { value: 'bottoms', label: 'Bas (pantalon, jean, short)' },
  { value: 'outerwear', label: 'Veste / manteau' },
  { value: 'dresses', label: 'Robe' },
  { value: 'full-body', label: 'Piece complete (combinaison)' },
  { value: 'shoes', label: 'Chaussures' },
  { value: 'bags', label: 'Sac / maroquinerie' },
  { value: 'accessories', label: 'Accessoire' },
  { value: 'hats', label: 'Chapeau / casquette' },
  { value: 'jewelry', label: 'Bijou' },
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]['value']

export const PRODUCT_CATEGORY_VALUES = PRODUCT_CATEGORIES.map(c => c.value) as readonly string[]

export function isProductCategory(v: string): v is ProductCategory {
  return PRODUCT_CATEGORY_VALUES.includes(v)
}

/** Libelle lisible pour une valeur stockee ; retourne la valeur brute si inconnue. */
export function categoryLabel(value: string): string {
  return PRODUCT_CATEGORIES.find(c => c.value === value)?.label ?? value
}

/**
 * Libelles du tableau "Informations" du passeport public.
 *
 * Sans ce dictionnaire, la page fabriquait l'intitule a partir du nom
 * technique du champ : "material_composition" devenait "Material Composition".
 * Des libelles anglais sur un passeport francais, devant une marque, font
 * inacheve. Un champ absent de cette table retombe sur l'ancien comportement
 * plutot que de disparaitre.
 */
const LABELS: Record<string, string> = {
  product_name: 'Modèle',
  brand: 'Marque',
  category: 'Catégorie',
  size: 'Taille',
  color: 'Couleur',
  material_composition: 'Composition',
  care_instructions: 'Entretien',
  country_of_manufacture: 'Pays de fabrication',
  authenticity_message: 'Authenticité',
  serial_number: 'N° de série',
  collection: 'Collection',
  season: 'Saison',
  made_by: 'Réalisé par',
  made_at: 'Lieu de fabrication',
  made_on: 'Date de réalisation',
}

/** Champs deja affiches ailleurs sur la page, ou non affichables. */
const HIDDEN = new Set(['main_image_url', 'story', 'brand', 'product_name'])

export function passportFieldLabel(key: string): string {
  if (LABELS[key]) return LABELS[key]
  const spaced = key.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function isHiddenPassportField(key: string): boolean {
  return HIDDEN.has(key)
}

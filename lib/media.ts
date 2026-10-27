/**
 * La table product_images ne distingue pas photo et video : elle ne stocke
 * qu'une URL. Plutot que d'ajouter une colonne qu'il faudrait remplir
 * correctement a chaque insertion (et qui mentirait le jour ou quelqu'un se
 * trompe), le type se deduit de l'extension du fichier stocke.
 *
 * L'URL Supabase se termine toujours par l'extension d'origine
 * (".../1792586591513.mp4"), parfois suivie d'une query string.
 */
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogv', 'mov', 'm4v']

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  const path = url.split('?')[0].split('#')[0]
  const ext = path.split('.').pop()?.toLowerCase()
  return Boolean(ext && VIDEO_EXTENSIONS.includes(ext))
}

/**
 * Types acceptes a l'upload. Le .mov est accepte parce que c'est ce que
 * produit un iPhone, mais il est souvent encode en HEVC : Safari le lit,
 * Chrome et Firefox affichent un cadre noir. L'admin est prevenu au moment
 * du depot -- voir image-uploader.tsx.
 */
export const ACCEPTED_UPLOAD_TYPES = 'image/*,video/mp4,video/webm,video/quicktime'

export function isHevcRiskyFile(file: File): boolean {
  return file.type === 'video/quicktime' || file.name.toLowerCase().endsWith('.mov')
}

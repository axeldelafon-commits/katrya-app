'use client'
import { useState } from 'react'

type Product = { brand: string; model_name: string; category: string }

type Passport = {
  version: number
  public_data: Record<string, unknown> | null
  private_data: Record<string, unknown> | null
} | null

/**
 * Publier cree une nouvelle version qui remplace la precedente sur la page
 * publique. Le formulaire doit donc partir du contenu actuel, pas d'un
 * formulaire vide : sinon un simple clic sur "Publier" efface tout le
 * passeport -- recit, matiere, couleur -- sans le moindre avertissement.
 * C'est exactement ce qui est arrive sur L'Homme de la mer le 22/10/2026.
 */
function initialForm(product: Product, latest: Passport) {
  const pub = (latest?.public_data ?? {}) as Record<string, any>
  const priv = (latest?.private_data ?? {}) as Record<string, any>
  const story = (pub.story ?? {}) as Record<string, any>
  const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
  return {
    product_name: str(pub.product_name, product.model_name),
    brand: str(pub.brand, product.brand),
    category: str(pub.category, product.category),
    color: str(pub.color),
    size: str(pub.size),
    material_composition: str(pub.material_composition),
    country_of_manufacture: str(pub.country_of_manufacture),
    care_instructions: str(pub.care_instructions),
    authenticity_message: str(pub.authenticity_message, 'Produit vérifié par KATRYA'),
    main_image_url: str(pub.main_image_url),
    story_headline: str(story.headline),
    story_intro: str(story.intro),
    story_steps: stepsToText(story.steps),
    supplier_name: str(priv.supplier_name),
    supplier_batch_id: str(priv.supplier_batch_id),
    internal_notes: str(priv.internal_notes),
  }
}

export default function PublishPassportForm({
  productId,
  product,
  latest = null,
}: {
  productId: string
  product: Product
  latest?: Passport
}) {
  const [form, setForm] = useState(() => initialForm(product, latest))
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  function update(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSuccess('')
    setError('')
    const public_data = {
      product_name: form.product_name, brand: form.brand, category: form.category,
      color: form.color, size: form.size, material_composition: form.material_composition,
      country_of_manufacture: form.country_of_manufacture, care_instructions: form.care_instructions,
      authenticity_message: form.authenticity_message, main_image_url: form.main_image_url,
      // Recit : ce qui distingue un passeport de marque d'une fiche technique.
      // Stocke sous forme structuree pour que la page publique puisse le mettre
      // en page, plutot que de le noyer dans le tableau cle/valeur.
      story: {
        headline: form.story_headline.trim(),
        intro: form.story_intro.trim(),
        steps: parseSteps(form.story_steps),
      },
    }
    const private_data = {
      supplier_name: form.supplier_name, supplier_batch_id: form.supplier_batch_id,
      internal_notes: form.internal_notes,
    }
    const res = await fetch('/api/admin/passports/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, public_data, private_data }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) return setError(json.error ?? 'Erreur')
    setSuccess(`Passeport publié en version v${json.passport.version}`)
  }

  const feedback = error ? (
    <p style={{ color: '#f87171', margin: 0 }}>{error}</p>
  ) : success ? (
    <p style={{ color: '#86efac', margin: 0 }}>{success}</p>
  ) : null

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
      {feedback}
      {latest && (
        <p style={{ margin: 0, fontSize: 11, color: '#777', lineHeight: 1.5 }}>
          Les champs reprennent la version v{latest.version} actuellement en ligne.
          Publier crée une nouvelle version qui la remplace sur la page publique.
        </p>
      )}
      <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#aaa', fontSize: 13 }}>Données publiques</p>
      {(['product_name','brand','category','color','size','material_composition','country_of_manufacture','authenticity_message','main_image_url'] as const).map(k => (
        <label key={k} style={labelStyle}>
          {k.replace(/_/g, ' ')}
          <input value={(form as Record<string,string>)[k]} onChange={e => update(k, e.target.value)} style={inputStyle} />
        </label>
      ))}
      <label style={labelStyle}>
        care instructions
        <textarea value={form.care_instructions} onChange={e => update('care_instructions', e.target.value)} style={{ ...inputStyle, minHeight: 60 }} />
      </label>
      <p style={{ margin: '12px 0 4px', fontWeight: 600, color: '#aaa', fontSize: 13 }}>Récit du produit</p>
      <p style={{ margin: '0 0 4px', fontSize: 11, color: '#666', lineHeight: 1.5 }}>
        Facultatif. C&apos;est ce qui distingue un passeport de marque d&apos;une fiche
        technique : d&apos;où vient la matière, ce que la pièce a vécu.
      </p>
      <label style={labelStyle}>
        titre du récit
        <input value={form.story_headline} onChange={e => update('story_headline', e.target.value)} style={inputStyle} placeholder="ex : Pièce unique" />
      </label>
      <label style={labelStyle}>
        introduction
        <textarea value={form.story_intro} onChange={e => update('story_intro', e.target.value)} style={{ ...inputStyle, minHeight: 60 }} placeholder="Deux ou trois phrases." />
      </label>
      <label style={labelStyle}>
        étapes — une par ligne, au format «&nbsp;Titre | Description&nbsp;»
        <textarea
          value={form.story_steps}
          onChange={e => update('story_steps', e.target.value)}
          style={{ ...inputStyle, minHeight: 100, fontFamily: 'ui-monospace, monospace' }}
          placeholder={'Tissée | Un rouleau d’éponge produit pour une commande annulée\nAcquise | Achetée en lot, avril 2026\nCousue | Atelier de Genève, mai 2026'}
        />
      </label>

      <p style={{ margin: '12px 0 4px', fontWeight: 600, color: '#aaa', fontSize: 13 }}>Données privées</p>
      {(['supplier_name','supplier_batch_id'] as const).map(k => (
        <label key={k} style={labelStyle}>
          {k.replace(/_/g, ' ')}
          <input value={(form as Record<string,string>)[k]} onChange={e => update(k, e.target.value)} style={inputStyle} />
        </label>
      ))}
      <label style={labelStyle}>
        notes internes
        <textarea value={form.internal_notes} onChange={e => update('internal_notes', e.target.value)} style={{ ...inputStyle, minHeight: 60 }} />
      </label>
      <button type="submit" disabled={loading} style={btnStyle}>
        {loading ? 'Publication...' : 'Publier le passeport'}
      </button>
      {/* La confirmation est repetee ici : le formulaire est long, et un
          message affiche uniquement en haut passe inapercu depuis le bouton.
          Sans retour visible, on croit que le clic n'a rien fait -- et on
          republie. */}
      {feedback}
    </form>
  )
}

/**
 * Une etape par ligne, "Titre | Description". La description est facultative.
 * Format volontairement minimal : une saisie au kilometre est plus rapide
 * qu'une interface a lignes repetables, et se colle depuis un document.
 */
function parseSteps(raw: string): { title: string; detail: string }[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const i = line.indexOf('|')
      if (i === -1) return { title: line, detail: '' }
      return { title: line.slice(0, i).trim(), detail: line.slice(i + 1).trim() }
    })
    .filter(s => s.title.length > 0)
}

/** Operation inverse de parseSteps, pour reafficher le recit existant. */
function stepsToText(steps: unknown): string {
  if (!Array.isArray(steps)) return ''
  return steps
    .map((s) => {
      if (!s || typeof s !== 'object') return ''
      const { title, detail } = s as { title?: unknown; detail?: unknown }
      const t = typeof title === 'string' ? title.trim() : ''
      const d = typeof detail === 'string' ? detail.trim() : ''
      if (!t) return ''
      return d ? `${t} | ${d}` : t
    })
    .filter(Boolean)
    .join('\n')
}

const inputStyle: React.CSSProperties = { display: 'block', padding: '7px 12px', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', fontSize: 13, width: '100%', marginTop: 3 }
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', fontSize: 12, color: '#777' }
const btnStyle: React.CSSProperties = { background: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', marginTop: 4 }

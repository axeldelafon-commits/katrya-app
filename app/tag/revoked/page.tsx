export default function TagRevokedPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">KATRYA</h1>
        <p className="text-red-400 text-lg mb-2">Puce révoquée</p>
        <p className="text-gray-400 text-sm mb-4">
          Cette puce a été enregistrée par KATRYA, puis invalidée par la marque.
          Elle ne certifie plus aucun produit.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Un article portant cette puce ne doit pas être considéré comme
          authentifié. Si vous venez de l&apos;acheter, contactez le vendeur
          et notre support.
        </p>
        <a
          href="/"
          className="inline-block border border-white text-white px-6 py-3 text-sm hover:bg-white hover:text-black transition-colors"
        >
          Retour à l&apos;accueil
        </a>
      </div>
    </main>
  )
}

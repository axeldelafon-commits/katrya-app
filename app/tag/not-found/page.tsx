export default function TagNotFoundPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">KATRYA</h1>
        <p className="text-yellow-400 text-lg mb-2">Tag non reconnu</p>
        <p className="text-gray-400 text-sm mb-8">
          Ce tag NFC n&apos;est pas associé à un produit KATRYA.
          Si vous pensez que c&apos;est une erreur, contactez notre support.
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

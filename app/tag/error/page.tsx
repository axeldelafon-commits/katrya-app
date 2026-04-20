export default function TagErrorPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">KATRYA</h1>
        <p className="text-red-400 text-lg mb-2">Erreur de lecture NFC</p>
        <p className="text-gray-400 text-sm mb-8">
          Une erreur s&apos;est produite lors de la lecture de cette puce NFC.
          Veuillez réessayer ou contacter le support.
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

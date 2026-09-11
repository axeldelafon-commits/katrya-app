export default function TagInactivePage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">KATRYA</h1>
        <p className="text-yellow-400 text-lg mb-2">Passeport temporairement suspendu</p>
        <p className="text-gray-400 text-sm mb-4">
          Cette puce est bien enregistrée chez KATRYA, mais son passeport est
          momentanément suspendu par la marque.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          L&apos;authenticité du produit n&apos;est pas remise en cause.
          Réessayez plus tard ou contactez notre support.
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

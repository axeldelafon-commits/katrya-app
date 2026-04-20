export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-black text-white">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">KATRYA</h1>
        <p className="text-lg text-gray-400 mb-8">
          Authentification produit NFC + Passeport numérique
        </p>
        <div className="grid gap-4 mt-8">
          <a
            href="/admin"
            className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition"
          >
            Accès Admin
          </a>
        </div>
      </div>
    </main>
  )
}

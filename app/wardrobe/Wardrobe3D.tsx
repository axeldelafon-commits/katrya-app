'use client'

import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import {
  OrbitControls,
  Environment,
  PerspectiveCamera,
  Html,
  Float,
} from '@react-three/drei'
import { Suspense, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { useRouter } from 'next/navigation'

export interface Wardrobe3DItem {
  id: string
  product_id: string
  katrya_id: string
  brand: string
  model_name: string
  category: string
  image_url: string | null
  is_favorite: boolean
}

/* -------------------------------------------------------------------------- */
/*  Texture loader with graceful fallback                                     */
/* -------------------------------------------------------------------------- */

function makePlaceholderTexture(label: string): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 640
  const ctx = c.getContext('2d')!
  // Soft gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, c.height)
  grad.addColorStop(0, '#1a1a1a')
  grad.addColorStop(1, '#0a0a0a')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, c.width, c.height)
  // Border
  ctx.strokeStyle = '#222'
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, c.width - 4, c.height - 4)
  // Label
  ctx.fillStyle = '#666'
  ctx.font = '600 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label.toUpperCase(), c.width / 2, c.height / 2)
  ctx.fillStyle = '#333'
  ctx.font = '20px sans-serif'
  ctx.fillText('aucune photo', c.width / 2, c.height / 2 + 36)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function useItemTexture(url: string | null, label: string): THREE.Texture {
  return useMemo(() => {
    if (!url) return makePlaceholderTexture(label)
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    const tex = loader.load(
      url,
      undefined,
      undefined,
      () => {
        /* on error, swap to placeholder later — ignored here */
      }
    )
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [url, label])
}

/* -------------------------------------------------------------------------- */
/*  Single garment "card" hanging on the rack                                 */
/* -------------------------------------------------------------------------- */

interface ItemCardProps {
  item: Wardrobe3DItem
  position: [number, number, number]
  rotationY: number
  onSelect: (item: Wardrobe3DItem) => void
  onHover: (item: Wardrobe3DItem | null) => void
  isHovered: boolean
}

function ItemCard({ item, position, rotationY, onSelect, onHover, isHovered }: ItemCardProps) {
  const groupRef = useRef<THREE.Group>(null)
  const texture = useItemTexture(item.image_url, item.brand || 'KATRYA')

  // Subtle hover lift / scale
  useFrame((_, dt) => {
    if (!groupRef.current) return
    const target = isHovered ? 1.08 : 1
    const s = groupRef.current.scale
    const next = THREE.MathUtils.damp(s.x, target, 8, dt)
    s.set(next, next, next)
  })

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.08}>
        {/* Hanger rod attachment line */}
        <mesh position={[0, 1.45, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.18, 8]} />
          <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Garment plane */}
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation()
            onHover(item)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            onHover(null)
            document.body.style.cursor = ''
          }}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(item)
          }}
        >
          <planeGeometry args={[1.1, 1.5]} />
          <meshStandardMaterial
            map={texture}
            side={THREE.DoubleSide}
            transparent
            roughness={0.9}
            metalness={0}
          />
        </mesh>

        {/* Soft frame highlight when hovered */}
        {isHovered && (
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[1.18, 1.58]} />
            <meshBasicMaterial color="#0cf" transparent opacity={0.35} />
          </mesh>
        )}

        {/* Favorite heart */}
        {item.is_favorite && (
          <Html position={[0.45, 0.65, 0.02]} center distanceFactor={6}>
            <div
              style={{
                background: 'rgba(255,40,80,0.95)',
                color: 'white',
                fontSize: 14,
                width: 26,
                height: 26,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                pointerEvents: 'none',
              }}
            >
              ♥
            </div>
          </Html>
        )}
      </Float>
    </group>
  )
}

/* -------------------------------------------------------------------------- */
/*  The clothing rack (curved arc of items)                                   */
/* -------------------------------------------------------------------------- */

function Rack({
  items,
  onSelect,
  hoveredId,
  setHoveredId,
}: {
  items: Wardrobe3DItem[]
  onSelect: (item: Wardrobe3DItem) => void
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
}) {
  // Layout: curved arc, up to 8 per row, then stack rows
  const positions = useMemo(() => {
    const perRow = Math.min(8, Math.max(3, items.length))
    const radius = 4.5
    const arcSpan = Math.min(Math.PI * 0.85, (perRow - 1) * 0.32) // total angular span
    const rowGap = 2
    return items.map((_, i) => {
      const row = Math.floor(i / perRow)
      const idxInRow = i % perRow
      const itemsInThisRow = Math.min(perRow, items.length - row * perRow)
      const localSpan = Math.min(arcSpan, (itemsInThisRow - 1) * 0.32)
      const angle =
        itemsInThisRow === 1
          ? 0
          : -localSpan / 2 + (idxInRow * localSpan) / (itemsInThisRow - 1)
      const x = Math.sin(angle) * radius
      const z = -Math.cos(angle) * radius
      const y = -row * rowGap + 0.2
      return { x, y, z, rotationY: angle }
    })
  }, [items])

  // Generate horizontal rod segments per row
  const rodMeshes = useMemo(() => {
    const perRow = Math.min(8, Math.max(3, items.length))
    const radius = 4.5
    const rowGap = 2
    const rows = Math.ceil(items.length / perRow)
    const segments: JSX.Element[] = []
    for (let r = 0; r < rows; r++) {
      const itemsInThisRow = Math.min(perRow, items.length - r * perRow)
      const localSpan = Math.min(Math.PI * 0.85, (itemsInThisRow - 1) * 0.32)
      const arcLen = localSpan * radius
      const y = -r * rowGap + 1.55
      // Create curved tube using TorusGeometry slice
      segments.push(
        <mesh
          key={`rod-${r}`}
          position={[0, y, 0]}
          rotation={[Math.PI / 2, 0, -localSpan / 2 - Math.PI / 2]}
        >
          <torusGeometry
            args={[radius, 0.04, 12, Math.max(16, itemsInThisRow * 8), localSpan]}
          />
          <meshStandardMaterial color="#aaa" metalness={0.85} roughness={0.25} />
        </mesh>
      )
    }
    return segments
  }, [items])

  return (
    <group>
      {rodMeshes}
      {items.map((item, i) => {
        const p = positions[i]
        return (
          <ItemCard
            key={item.id}
            item={item}
            position={[p.x, p.y, p.z]}
            rotationY={p.rotationY}
            onSelect={onSelect}
            onHover={(it) => setHoveredId(it ? it.id : null)}
            isHovered={hoveredId === item.id}
          />
        )
      })}
    </group>
  )
}

/* -------------------------------------------------------------------------- */
/*  Floor + ambient room dressing                                             */
/* -------------------------------------------------------------------------- */

function Room() {
  return (
    <>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, 0]} receiveShadow>
        <circleGeometry args={[12, 64]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.95} />
      </mesh>
      {/* Subtle inner ring on floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.49, 0]}>
        <ringGeometry args={[5, 5.06, 64]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main exported component                                                    */
/* -------------------------------------------------------------------------- */

export default function Wardrobe3D({ items }: { items: Wardrobe3DItem[] }) {
  const router = useRouter()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const hoveredItem = useMemo(
    () => items.find((i) => i.id === hoveredId) || null,
    [hoveredId, items]
  )

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Ton dressing est vide. La vue 3D s'activera dès que tu ajouteras un
        article.
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 8, 20]} />

        <PerspectiveCamera makeDefault position={[0, 0.5, 7]} fov={45} />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3.5}
          maxDistance={11}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2 + 0.1}
          target={[0, 0, 0]}
        />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <spotLight
          position={[0, 6, 4]}
          intensity={0.6}
          angle={0.6}
          penumbra={0.6}
          color="#cce8ff"
        />

        <Suspense fallback={null}>
          <Environment preset="apartment" />
          <Rack
            items={items}
            onSelect={(it) => router.push(`/p/${it.katrya_id}`)}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
          <Room />
        </Suspense>
      </Canvas>

      {/* HUD: hovered item info */}
      {hoveredItem && (
        <div
          className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur border border-gray-800 rounded-2xl px-4 py-3 text-white shadow-xl"
          style={{ minWidth: 240, maxWidth: '90vw' }}
        >
          <p className="text-[10px] uppercase tracking-wider text-gray-500">
            {hoveredItem.brand}
          </p>
          <p className="text-sm font-semibold truncate">
            {hoveredItem.model_name}
          </p>
          <p className="text-xs text-gray-500 capitalize mt-0.5">
            {hoveredItem.category}
            {hoveredItem.is_favorite && ' · ♥ favori'}
          </p>
          <p className="text-[10px] font-mono text-gray-700 mt-1">
            {hoveredItem.katrya_id}
          </p>
        </div>
      )}

      {/* Hint overlay */}
      <div className="pointer-events-none absolute top-4 right-4 bg-black/60 backdrop-blur text-[11px] text-gray-400 px-3 py-2 rounded-lg border border-gray-900">
        🖱️ glisser pour tourner · molette pour zoomer · clic = ouvrir
      </div>
    </div>
  )
}

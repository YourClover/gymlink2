import { useEffect, useRef } from 'react'

interface ConfettiProps {
  active: boolean
  onComplete?: () => void
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
}

const COLORS = [
  '#FFD700', // Gold
  '#FFA500', // Orange
  '#FF6347', // Tomato
  '#00CED1', // Dark Turquoise
  '#9370DB', // Medium Purple
  '#3CB371', // Medium Sea Green
  '#FF69B4', // Hot Pink
]

export default function Confetti({ active, onComplete }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      particlesRef.current = []
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Create particles
    const particles: Particle[] = []
    const particleCount = 150

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 20,
        vy: Math.random() * -20 - 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
      })
    }

    particlesRef.current = particles

    let frameCount = 0
    const maxFrames = 180 // ~3 seconds at 60fps

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let activeParticles = 0

      for (const particle of particlesRef.current) {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += 0.5 // Gravity
        particle.vx *= 0.99 // Air resistance
        particle.rotation += particle.rotationSpeed

        // Skip if off screen
        if (particle.y > canvas.height + 50) continue

        activeParticles++

        // Draw particle (rectangle confetti)
        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.rotate(particle.rotation)
        ctx.fillStyle = particle.color
        ctx.fillRect(
          -particle.size / 2,
          -particle.size / 4,
          particle.size,
          particle.size / 2,
        )
        ctx.restore()
      }

      frameCount++

      if (activeParticles > 0 && frameCount < maxFrames) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        onComplete?.()
      }
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [active, onComplete])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}

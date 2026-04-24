import { useRef, useState, Suspense, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { motion, useMotionValue, useSpring, useInView } from 'framer-motion'
import UploadObject      from './cards/UploadObject'
import StyleObject       from './cards/StyleObject'
import ScanObject        from './cards/ScanObject'
import ReconstructObject from './cards/ReconstructObject'
import ExploreObject     from './cards/ExploreObject'

const CARDS = [
  {
    n:'01', title:'Upload Inspiration',
    body:'Drop any Pinterest screenshot or design photo. We handle the rest automatically.',
    Object: UploadObject, camera:[0,0,3.5],
  },
  {
    n:'02', title:'Style Detection',
    body:'CLIP vision model reads every furniture piece, colour, and interior style — instantly.',
    Object: StyleObject, camera:[0,0,4],
  },
  {
    n:'03', title:'Room Scanning',
    body:'Photograph your room from 15–20 angles. Our pipeline maps every surface in 3D.',
    Object: ScanObject, camera:[0,0,3],
  },
  {
    n:'04', title:'3D Reconstruction',
    body:'94,000 Gaussians rebuild your room with true geometry, real dimensions, real depth.',
    Object: ReconstructObject, camera:[2,1.5,4],
  },
  {
    n:'05', title:'Explore the Result',
    body:'Walk through your furnished room in 3D. Every piece scaled to your actual space.',
    Object: ExploreObject, camera:[0,0,3.2],
  },
]

function Card({ card, index }) {
  const ref    = useRef()
  const inView = useInView(ref, { once:false, margin:'-10%' })
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity:0, y:60, rotateX:12 }}
      animate={inView
        ? { opacity:1, y:0, rotateX:0 }
        : { opacity:0, y:60, rotateX:12 }
      }
      transition={{
        duration:0.9,
        delay: index * 0.1,
        ease:[0.16,1,0.3,1],
      }}
      whileHover={{
        y: -12,
        transition:{ duration:0.4, ease:[0.16,1,0.3,1] },
      }}
      style={{
        flexShrink:0,
        width:340,
        height:480,
        position:'relative',
        transformStyle:'preserve-3d',
        perspective:1000,
      }}
    >
      {/* Card border — animated on hover */}
      <motion.div
        animate={{
          borderColor: hovered
            ? 'rgba(200,255,0,0.4)'
            : 'rgba(255,255,255,0.07)',
          background: hovered
            ? 'rgba(200,255,0,0.025)'
            : 'rgba(255,255,255,0.015)',
          boxShadow: hovered
            ? '0 0 60px rgba(200,255,0,0.06), 0 30px 60px rgba(0,0,0,0.4)'
            : '0 0 0px rgba(200,255,0,0)',
        }}
        transition={{ duration:0.4 }}
        style={{
          position:'absolute', inset:0,
          border:'1px solid rgba(255,255,255,0.07)',
          display:'flex', flexDirection:'column',
        }}
      >
        {/* 3D Canvas */}
        <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
          <Canvas
            camera={{ position:card.camera, fov:45 }}
            style={{ background:'transparent' }}
            gl={{ antialias:true, alpha:true }}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={0.5}/>
              <card.Object/>
            </Suspense>
          </Canvas>

          {/* Scan line animation on hover */}
          <motion.div
            animate={{
              y: hovered ? ['0%','100%'] : '0%',
              opacity: hovered ? [0, 0.6, 0] : 0,
            }}
            transition={{
              duration: 1.4,
              repeat: hovered ? Infinity : 0,
              ease:'linear',
            }}
            style={{
              position:'absolute', left:0, right:0,
              height:2,
              background:'linear-gradient(90deg, transparent, rgba(200,255,0,0.6), transparent)',
              pointerEvents:'none',
            }}
          />

          {/* Corner brackets — appear on hover */}
          {[
            {top:8,left:8,
             borderTop:'1px solid var(--accent)',
             borderLeft:'1px solid var(--accent)'},
            {top:8,right:8,
             borderTop:'1px solid var(--accent)',
             borderRight:'1px solid var(--accent)'},
            {bottom:8,left:8,
             borderBottom:'1px solid var(--accent)',
             borderLeft:'1px solid var(--accent)'},
            {bottom:8,right:8,
             borderBottom:'1px solid var(--accent)',
             borderRight:'1px solid var(--accent)'},
          ].map((s,i) => (
            <motion.div
              key={i}
              animate={{ opacity: hovered ? 0.7 : 0, scale: hovered ? 1 : 0.5 }}
              transition={{ duration:0.3, delay: i*0.04 }}
              style={{
                position:'absolute', width:14, height:14,
                pointerEvents:'none', ...s,
              }}
            />
          ))}
        </div>

        {/* Text area */}
        <div style={{
          padding:'20px 24px 28px',
          borderTop:'1px solid rgba(255,255,255,0.06)',
          position:'relative',
        }}>
          {/* Accent line that grows on hover */}
          <motion.div
            animate={{ width: hovered ? '100%' : '0%' }}
            transition={{ duration:0.4, ease:[0.16,1,0.3,1] }}
            style={{
              position:'absolute', top:0, left:0,
              height:1, background:'var(--accent)',
            }}
          />

          <motion.div
            animate={{ color: hovered ? 'var(--accent)' : 'rgba(255,255,255,0.22)' }}
            transition={{ duration:0.3 }}
            style={{
              fontFamily:'var(--mono)', fontSize:10,
              letterSpacing:'0.18em', textTransform:'uppercase',
              marginBottom:10,
            }}
          >[{card.n}]</motion.div>

          <div style={{
            fontFamily:'var(--display)',
            fontSize:26, lineHeight:1.0,
            letterSpacing:'-0.01em',
            color:'var(--text)',
            marginBottom:10,
          }}>{card.title.toUpperCase()}</div>

          <p style={{
            fontFamily:'var(--body)', fontSize:13,
            lineHeight:1.75,
            color:'rgba(255,255,255,0.32)',
            fontWeight:300,
          }}>{card.body}</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function FeatureCards() {
  const [isDragging, setIsDragging] = useState(false)
  const x       = useMotionValue(0)
  const springX = useSpring(x, { stiffness:60, damping:18 })

  const CARD_W  = 340
  const GAP     = 20
  const PAD     = 56
  const maxDrag = -(CARDS.length * (CARD_W + GAP) - window.innerWidth + PAD * 2)

  const clamp = v => Math.min(0, Math.max(maxDrag, v))

  const handleWheel = e => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    e.preventDefault()
    x.set(clamp(x.get() - e.deltaY * 0.7))
  }

  return (
    <section style={{
      background:'var(--bg)',
      padding:'120px 0 140px',
      borderTop:'none',
      overflow:'hidden',
      position:'relative',
    }}>

      {/* Section label */}
      <div style={{
        padding:'0 56px', marginBottom:72,
        display:'flex', alignItems:'center',
        justifyContent:'space-between',
      }}>
        <div style={{
          fontFamily:'var(--mono)', fontSize:10,
          color:'rgba(255,255,255,0.2)',
          letterSpacing:'0.2em', textTransform:'uppercase',
        }}>[ How it works ]</div>

        <motion.div
          animate={{ x:[0,6,0] }}
          transition={{ repeat:Infinity, duration:2, ease:'easeInOut' }}
          style={{
            fontFamily:'var(--mono)', fontSize:10,
            color:'rgba(255,255,255,0.15)',
            letterSpacing:'0.2em', textTransform:'uppercase',
            display:'flex', alignItems:'center', gap:10,
          }}
        >
          ← Drag → 
        </motion.div>
      </div>

      {/* Cards track */}
      <motion.div
        drag="x"
        dragConstraints={{ left:maxDrag, right:0 }}
        dragElastic={0.04}
        onDrag={(_,info) => x.set(clamp(x.get() + info.delta.x))}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        onWheel={handleWheel}
        style={{
          display:'flex', gap:GAP,
          paddingLeft:PAD, paddingRight:PAD,
          width:'max-content',
          cursor: isDragging ? 'grabbing' : 'grab',
          x:springX,
          userSelect:'none',
        }}
      >
        {CARDS.map((card,i) => (
          <Card key={i} card={card} index={i}/>
        ))}
      </motion.div>

      {/* Progress indicator */}
      <motion.div style={{
        display:'flex', justifyContent:'center',
        gap:8, marginTop:56,
      }}>
        {CARDS.map((_,i) => (
          <div key={i} style={{
            width:24, height:1,
            background:'rgba(255,255,255,0.15)',
          }}/>
        ))}
      </motion.div>
    </section>
  )
}

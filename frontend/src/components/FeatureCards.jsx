import { useRef } from 'react'
// eslint-disable-next-line
import { motion, useInView } from 'framer-motion'

const STEPS = [
  {
    n:'01',
    title:'Upload Inspiration',
    body:'Any Pinterest screenshot, Instagram save, or design photograph. AI reads furniture, colour palette, and interior style — completely automatically.',
    tag:'Image Analysis',
    detail:'CLIP Vision · LLaVA 7B',
  },
  {
    n:'02',
    title:'Photograph Your Room',
    body:'Take 15–20 overlapping photos from different angles. Every wall, floor, window, and surface captured for reconstruction.',
    tag:'Room Capture',
    detail:'COLMAP · Structure from Motion',
  },
  {
    n:'03',
    title:'3D Reconstruction',
    body:'94,000 Gaussian splats rebuild your room with precise geometry — real dimensions, real proportions, real depth.',
    tag:'Spatial AI',
    detail:'3D Gaussian Splatting',
  },
  {
    n:'04',
    title:'Furniture Adaptation',
    body:'Every piece from your inspiration is scaled to your room\'s actual dimensions. Placed, validated, and checked for proportion.',
    tag:'Design Matching',
    detail:'Grounded-SAM · Spatial AI',
  },
  {
    n:'05',
    title:'Explore in 3D',
    body:'Walk through your room furnished exactly as the inspiration. Toggle between empty and designed. Share with anyone.',
    tag:'3D Viewer',
    detail:'Three.js · WebGL',
  },
]

function Step({ step, index }) {
  const ref    = useRef()
  const inView = useInView(ref, { once:true, margin:'-60px' })
  const isOdd  = index % 2 !== 0

  return (
    <motion.div
      ref={ref}
      initial={{ opacity:0, y:40 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:1.0, delay:0.05, ease:[0.16,1,0.3,1] }}
      style={{
        display:'grid',
        gridTemplateColumns:'1fr 1fr',
        borderTop:'1px solid rgba(26,23,20,0.08)',
        minHeight:220,
      }}
    >
      {/* Number + tag — alternates sides */}
      <div style={{
        padding:'56px 64px 56px 0',
        display:'flex', flexDirection:'column',
        justifyContent:'space-between',
        order: isOdd ? 2 : 1,
        paddingLeft: isOdd ? 64 : 0,
        paddingRight: isOdd ? 0 : 64,
        borderRight: isOdd ? 'none' : '1px solid rgba(26,23,20,0.08)',
        borderLeft: isOdd ? '1px solid rgba(26,23,20,0.08)' : 'none',
      }}>
        <motion.div
          initial={{ opacity:0 }}
          animate={inView ? { opacity:1 } : {}}
          transition={{ duration:0.8, delay:0.1 }}
          style={{
            fontFamily:'var(--serif)',
            fontSize:'clamp(64px,9vw,120px)',
            fontWeight:300, lineHeight:1,
            letterSpacing:'-0.03em',
            color:'rgba(26,23,20,0.10)',
          }}
        >{step.n}</motion.div>

        <div>
          <div style={{
            fontFamily:'var(--sans)', fontSize:11,
            fontWeight:600, color:'#1a1714',
            letterSpacing:'0.04em',
            textTransform:'uppercase', marginBottom:8,
          }}>{step.tag}</div>
          <div style={{
            fontFamily:'var(--mono)', fontSize:9,
            color:'#6b6560', letterSpacing:'0.15em',
            textTransform:'uppercase', lineHeight:2,
          }}>
            {step.detail.split('·').map((t,i) => (
              <div key={i}>{t.trim()}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        padding:'56px 0 56px 64px',
        display:'flex', flexDirection:'column',
        justifyContent:'center',
        order: isOdd ? 1 : 2,
        paddingLeft: isOdd ? 0 : 64,
        paddingRight: isOdd ? 64 : 0,
      }}>
        <motion.div
          initial={{ opacity:0, y:16 }}
          animate={inView ? { opacity:1, y:0 } : {}}
          transition={{ duration:0.9, delay:0.12, ease:[0.16,1,0.3,1] }}
          style={{
            fontFamily:'var(--serif)',
            fontSize:'clamp(28px,3vw,44px)',
            fontWeight:500, lineHeight:1.1,
            letterSpacing:'-0.01em',
            color:'#1a1714', marginBottom:20,
          }}
        >{step.title}</motion.div>

        <motion.p
          initial={{ opacity:0 }}
          animate={inView ? { opacity:1 } : {}}
          transition={{ duration:0.9, delay:0.2 }}
          style={{
            fontFamily:'var(--sans)', fontSize:15,
            lineHeight:1.85, color:'#4a4540',
            fontWeight:400, maxWidth:460,
          }}
        >{step.body}</motion.p>
      </div>
    </motion.div>
  )
}

export default function FeatureCards() {
  const ref    = useRef()
  const inView = useInView(ref, { once:true, margin:'-80px' })

  return (
    <section style={{
      background:'#f0ebe0',
      borderTop:'1px solid rgba(26,23,20,0.08)',
    }}>
      {/* Section header */}
      <div style={{
        padding:'100px 56px 80px',
        display:'grid',
        gridTemplateColumns:'1fr 1fr',
        gap:80,
        borderBottom:'1px solid rgba(26,23,20,0.08)',
      }}>
        <div ref={ref}>
          <motion.div
            initial={{ opacity:0 }}
            animate={inView ? { opacity:1 } : {}}
            transition={{ duration:0.8 }}
            style={{
              fontFamily:'var(--mono)', fontSize:9,
              color:'#b8b2a8', letterSpacing:'0.22em',
              textTransform:'uppercase', marginBottom:40,
            }}
          >[ Process ]</motion.div>

          {['Five steps.', 'One result.'].map((line,i) => (
            <div key={i} style={{ overflow:'hidden' }}>
              <motion.div
                initial={{ y:'108%' }}
                animate={inView ? { y:0 } : {}}
                transition={{ duration:1.0, delay:i*0.12, ease:[0.16,1,0.3,1] }}
                style={{
                  fontFamily:'var(--serif)',
                  fontSize:'clamp(44px,6vw,80px)',
                  fontWeight: i===0 ? 500 : 300,
                  fontStyle: i===0 ? 'italic' : 'normal',
                  lineHeight:1.05,
                  letterSpacing:'-0.02em',
                  color: '#1a1714',
                }}
              >{line}</motion.div>
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity:0, y:20 }}
          animate={inView ? { opacity:1, y:0 } : {}}
          transition={{ duration:1.0, delay:0.25 }}
          style={{
            display:'flex', flexDirection:'column',
            justifyContent:'flex-end',
          }}
        >
          <p style={{
            fontFamily:'var(--sans)', fontSize:16,
            lineHeight:1.85, color:'#4a4540',
            fontWeight:400, marginBottom:48,
          }}>
            From a saved image to a fully furnished 3D room.
            Our pipeline handles every step — upload, scan,
            reconstruct, adapt, and explore.
          </p>

          {/* Step indicators */}
          <div style={{ display:'flex', gap:0 }}>
            {STEPS.map((s,i) => (
              <div key={i} style={{
                flex:1,
                borderTop:'2px solid rgba(26,23,20,0.12)',
                paddingTop:12,
                paddingRight: i<4 ? 16 : 0,
              }}>
                <div style={{
                  fontFamily:'var(--mono)', fontSize:9,
                  color:'#b8b2a8', letterSpacing:'0.1em',
                  marginBottom:4,
                }}>{s.n}</div>
                <div style={{
                  fontFamily:'var(--sans)', fontSize:11,
                  color:'#6b6560', fontWeight:500,
                }}>{s.title.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Steps — alternating layout */}
      <div style={{ padding:'0 56px' }}>
        {STEPS.map((step, i) => (
          <Step key={i} step={step} index={i}/>
        ))}
        <div style={{ borderTop:'1px solid rgba(26,23,20,0.08)', height:1 }}/>
      </div>
    </section>
  )
}

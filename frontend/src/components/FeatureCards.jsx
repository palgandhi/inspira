import { useRef } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'

const STEPS = [
  {
    n:'01',
    title:'Upload Inspiration',
    body:'Any Pinterest screenshot, Instagram save, or design photograph. Our system reads the image completely — furniture, colour palette, spatial arrangement, interior style. No manual tagging.',
    detail:'CLIP Vision · LLaVA 7B',
    tag:'Image Analysis',
  },
  {
    n:'02',
    title:'Photograph Your Room',
    body:'Take 15–20 overlapping photographs from different positions. Every corner, wall, window, and floor surface. The more overlap, the more accurate the reconstruction.',
    detail:'COLMAP · Depth Anything V2',
    tag:'Room Capture',
  },
  {
    n:'03',
    title:'3D Reconstruction',
    body:'Our pipeline builds a precise 3D model of your room — 94,000 individual Gaussian splats, each placed with geometric accuracy derived from your photographs.',
    detail:'3D Gaussian Splatting',
    tag:'Spatial AI',
  },
  {
    n:'04',
    title:'Adaptation',
    body:'Furniture from your inspiration is matched to your room\'s actual dimensions. Every piece correctly scaled. Every placement validated for clearance and proportion.',
    detail:'Grounded-SAM · Spatial AI',
    tag:'Design Matching',
  },
  {
    n:'05',
    title:'Explore in 3D',
    body:'Walk through your room as it would look, furnished exactly as the inspiration. Toggle between your empty room and the designed version. Share with anyone.',
    detail:'Three.js · WebGL',
    tag:'3D Viewer',
  },
]

function Step({ step, index }) {
  const ref    = useRef()
  const inView = useInView(ref, { once:true, margin:'-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity:0, y:32 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:1.0, delay:0.05, ease:[0.16,1,0.3,1] }}
      style={{
        display:'grid',
        gridTemplateColumns:'72px 1fr 180px',
        gap:56, padding:'64px 0',
        borderTop:'1px solid rgba(26,23,20,0.08)',
        alignItems:'start',
        position:'relative',
      }}
    >
      {/* Animated left border line */}
      <motion.div
        initial={{ scaleY:0 }}
        animate={inView ? { scaleY:1 } : {}}
        transition={{ duration:0.8, delay:0.1, ease:[0.16,1,0.3,1] }}
        style={{
          position:'absolute', left:0, top:0, bottom:0,
          width:1, background:'rgba(26,23,20,0.15)',
          transformOrigin:'top',
        }}
      />

      {/* Number */}
      <motion.div
        initial={{ opacity:0 }}
        animate={inView ? { opacity:1 } : {}}
        transition={{ duration:0.8, delay:0.15 }}
        style={{
          fontFamily:'var(--mono)', fontSize:10,
          color:'#b8b2a8', letterSpacing:'0.15em',
          paddingTop:6, paddingLeft:16,
        }}
      >{step.n}</motion.div>

      {/* Content */}
      <div>
        <motion.div
          initial={{ opacity:0, y:12 }}
          animate={inView ? { opacity:1, y:0 } : {}}
          transition={{ duration:0.8, delay:0.12, ease:[0.16,1,0.3,1] }}
          style={{
            fontFamily:'var(--serif)',
            fontSize:'clamp(28px,3.5vw,48px)',
            fontWeight:300, letterSpacing:'-0.01em',
            color:'#1a1714', marginBottom:20,
            lineHeight:1.05,
          }}
        >{step.title}</motion.div>

        <motion.p
          initial={{ opacity:0, y:8 }}
          animate={inView ? { opacity:1, y:0 } : {}}
          transition={{ duration:0.9, delay:0.2, ease:[0.16,1,0.3,1] }}
          style={{
            fontFamily:'var(--sans)', fontSize:14,
            lineHeight:1.9, color:'#6b6560',
            fontWeight:300, maxWidth:520,
          }}
        >{step.body}</motion.p>
      </div>

      {/* Right — tag + tech */}
      <motion.div
        initial={{ opacity:0 }}
        animate={inView ? { opacity:1 } : {}}
        transition={{ duration:0.8, delay:0.25 }}
        style={{ paddingTop:6 }}
      >
        <div style={{
          fontFamily:'var(--sans)', fontSize:11,
          color:'#1a1714', fontWeight:500,
          marginBottom:12, letterSpacing:'0.02em',
        }}>{step.tag}</div>
        <div style={{
          fontFamily:'var(--mono)', fontSize:9,
          color:'#b8b2a8', letterSpacing:'0.15em',
          textTransform:'uppercase', lineHeight:2.2,
        }}>
          {step.detail.split('·').map((t,i) => (
            <div key={i}>{t.trim()}</div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function FeatureCards() {
  const ref    = useRef()
  const inView = useInView(ref, { once:true, margin:'-60px' })
  const { scrollYProgress } = useScroll({ target:ref, offset:['start end','end start'] })
  const bgY = useTransform(scrollYProgress, [0,1], ['0%','3%'])

  return (
    <section
      ref={ref}
      style={{
        padding:'140px 56px',
        background:'#f0ebe0',
        borderTop:'1px solid rgba(26,23,20,0.08)',
        borderBottom:'1px solid rgba(26,23,20,0.08)',
        position:'relative', overflow:'hidden',
      }}
    >
      {/* Subtle parallax texture */}
      <motion.div style={{
        position:'absolute', inset:0, zIndex:0,
        background:`radial-gradient(ellipse 50% 60% at 90% 10%, rgba(180,150,100,0.05) 0%, transparent 60%),
                    radial-gradient(ellipse 40% 50% at 10% 90%, rgba(150,120,80,0.04) 0%, transparent 50%)`,
        y: bgY,
        pointerEvents:'none',
      }}/>

      <div style={{ position:'relative', zIndex:1 }}>
        {/* Section heading */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'1fr 1fr',
          gap:80, marginBottom:100,
        }}>
          <div>
            <motion.div
              initial={{ opacity:0 }}
              whileInView={{ opacity:1 }}
              viewport={{ once:true }}
              transition={{ duration:0.8 }}
              style={{
                fontFamily:'var(--mono)', fontSize:9,
                color:'#b8b2a8', letterSpacing:'0.22em',
                textTransform:'uppercase', marginBottom:32,
              }}
            >[ Process ]</motion.div>

            {/* Staggered line reveal */}
            {['Five steps.', 'One result.'].map((line,i) => (
              <div key={i} style={{ overflow:'hidden' }}>
                <motion.div
                  initial={{ y:'108%' }}
                  whileInView={{ y:0 }}
                  viewport={{ once:true }}
                  transition={{ duration:1.0, delay:i*0.12, ease:[0.16,1,0.3,1] }}
                  style={{
                    fontFamily:'var(--serif)',
                    fontSize:'clamp(44px,6vw,80px)',
                    fontWeight:300,
                    fontStyle: i===0 ? 'italic' : 'normal',
                    lineHeight:1.05,
                    letterSpacing:'-0.02em',
                    color: i===0 ? '#1a1714' : '#b8b2a8',
                  }}
                >{line}</motion.div>
              </div>
            ))}
          </div>

          <motion.div
            initial={{ opacity:0, y:20 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:1.0, delay:0.2, ease:[0.16,1,0.3,1] }}
            style={{ paddingTop:82 }}
          >
            <p style={{
              fontFamily:'var(--sans)', fontSize:15,
              lineHeight:1.95, color:'#6b6560',
              fontWeight:300, marginBottom:40,
            }}>
              From a saved image to a fully furnished 3D room.
              Our pipeline handles every step — image analysis,
              room scanning, 3D reconstruction, furniture adaptation,
              and interactive exploration.
            </p>

            {/* Progress bar visual */}
            <div style={{ display:'flex', gap:4 }}>
              {STEPS.map((_,i) => (
                <motion.div
                  key={i}
                  initial={{ scaleX:0 }}
                  whileInView={{ scaleX:1 }}
                  viewport={{ once:true }}
                  transition={{ duration:0.6, delay:0.4+i*0.1, ease:[0.16,1,0.3,1] }}
                  style={{
                    flex:1, height:2,
                    background:'rgba(26,23,20,0.15)',
                    transformOrigin:'left',
                  }}
                />
              ))}
            </div>
            <div style={{
              display:'flex', justifyContent:'space-between',
              marginTop:8,
              fontFamily:'var(--mono)', fontSize:8,
              color:'#b8b2a8', letterSpacing:'0.1em',
            }}>
              <span>Upload</span>
              <span>Explore</span>
            </div>
          </motion.div>
        </div>

        {/* Steps */}
        <div>
          {STEPS.map((step, i) => (
            <Step key={i} step={step} index={i}/>
          ))}
          <div style={{ borderTop:'1px solid rgba(26,23,20,0.08)' }}/>
        </div>
      </div>
    </section>
  )
}

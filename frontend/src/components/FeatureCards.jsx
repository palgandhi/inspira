import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const STEPS = [
  {
    n:'01',
    title:'Upload Inspiration',
    body:'Any Pinterest screenshot, Instagram save, or design photograph. Our system reads the image completely — furniture, colour palette, spatial arrangement, interior style.',
    detail:'CLIP Vision · LLaVA 7B',
  },
  {
    n:'02',
    title:'Photograph Your Room',
    body:'Take 15–20 overlapping photographs from different positions. Every corner, wall, window, and floor surface captured.',
    detail:'COLMAP · Depth Anything V2',
  },
  {
    n:'03',
    title:'3D Reconstruction',
    body:'Our pipeline builds a precise 3D model of your room from the photographs — 94,000 individual data points, each placed with geometric accuracy.',
    detail:'3D Gaussian Splatting',
  },
  {
    n:'04',
    title:'Adaptation',
    body:'Furniture from your inspiration is matched to your room\'s actual dimensions and proportions. Every piece correctly scaled. Every placement validated.',
    detail:'Grounded-SAM · Spatial AI',
  },
  {
    n:'05',
    title:'Explore in 3D',
    body:'Walk through your room as it would look, furnished exactly as the inspiration. Toggle between your empty room and the designed version.',
    detail:'Three.js · WebGL',
  },
]

function Step({ step, index }) {
  const ref    = useRef()
  const inView = useInView(ref, { once:true, margin:'-60px' })
  const isEven = index % 2 === 0

  return (
    <motion.div
      ref={ref}
      initial={{ opacity:0, y:24 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:1.0, delay:index*0.06, ease:[0.16,1,0.3,1] }}
      style={{
        display:'grid',
        gridTemplateColumns:'80px 1fr 200px',
        gap:48, padding:'56px 0',
        borderTop:'1px solid var(--border)',
        alignItems:'start',
      }}
    >
      {/* Number */}
      <div style={{
        fontFamily:'var(--mono)', fontSize:10,
        color:'var(--light)', letterSpacing:'0.15em',
        paddingTop:4,
      }}>{step.n}</div>

      {/* Content */}
      <div>
        <div style={{
          fontFamily:'var(--serif)',
          fontSize:'clamp(24px,3vw,40px)',
          fontWeight:300, letterSpacing:'-0.01em',
          color:'var(--dark)', marginBottom:20,
          lineHeight:1.1,
        }}>{step.title}</div>
        <p style={{
          fontFamily:'var(--sans)', fontSize:14,
          lineHeight:1.9, color:'var(--mid)',
          fontWeight:300, maxWidth:540,
        }}>{step.body}</p>
      </div>

      {/* Tech detail */}
      <div style={{
        fontFamily:'var(--mono)', fontSize:9,
        color:'var(--light)', letterSpacing:'0.15em',
        textTransform:'uppercase', paddingTop:6,
        textAlign:'right', lineHeight:2,
      }}>
        {step.detail.split('·').map((t,i) => (
          <div key={i}>{t.trim()}</div>
        ))}
      </div>
    </motion.div>
  )
}

export default function FeatureCards() {
  const ref    = useRef()
  const inView = useInView(ref, { once:true })

  return (
    <section style={{ padding:'140px 48px', borderBottom:'1px solid var(--border)' }}>
      {/* Section heading */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:80, marginBottom:80 }}>
        <div>
          <motion.div
            initial={{ opacity:0 }}
            whileInView={{ opacity:1 }}
            viewport={{ once:true }}
            transition={{ duration:0.8 }}
            style={{
              fontFamily:'var(--mono)', fontSize:9,
              color:'var(--light)', letterSpacing:'0.2em',
              textTransform:'uppercase', marginBottom:32,
            }}
          >[ Process ]</motion.div>

          <div style={{ overflow:'hidden' }}>
            <motion.div
              initial={{ y:'105%' }}
              whileInView={{ y:0 }}
              viewport={{ once:true }}
              transition={{ duration:1.0, ease:[0.16,1,0.3,1] }}
              style={{
                fontFamily:'var(--serif)',
                fontSize:'clamp(36px,5vw,68px)',
                fontWeight:300, fontStyle:'italic',
                lineHeight:1.05, letterSpacing:'-0.01em',
                color:'var(--dark)',
              }}
            >Five steps.</motion.div>
          </div>
          <div style={{ overflow:'hidden' }}>
            <motion.div
              initial={{ y:'105%' }}
              whileInView={{ y:0 }}
              viewport={{ once:true }}
              transition={{ duration:1.0, delay:0.1, ease:[0.16,1,0.3,1] }}
              style={{
                fontFamily:'var(--serif)',
                fontSize:'clamp(36px,5vw,68px)',
                fontWeight:300,
                lineHeight:1.05, letterSpacing:'-0.01em',
                color:'var(--light)',
              }}
            >One result.</motion.div>
          </div>
        </div>

        <motion.p
          initial={{ opacity:0, y:20 }}
          whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }}
          transition={{ duration:1.0, delay:0.2 }}
          style={{
            fontFamily:'var(--sans)', fontSize:15,
            lineHeight:1.9, color:'var(--mid)',
            fontWeight:300, paddingTop:88,
          }}
        >
          From a saved image to a fully furnished 3D room —
          our process handles everything. Upload, scan, reconstruct,
          adapt, explore.
        </motion.p>
      </div>

      {/* Steps */}
      <div>
        {STEPS.map((step, i) => (
          <Step key={i} step={step} index={i}/>
        ))}
        <div style={{ borderTop:'1px solid var(--border)' }}/>
      </div>
    </section>
  )
}

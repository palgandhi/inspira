import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  motion, useSpring, AnimatePresence,
  useMotionValue, useScroll, useTransform,
} from 'framer-motion'
import FluidBackground from '../components/FluidBackground'
import FeatureCards    from '../components/FeatureCards'

function Cursor() {
  const x  = useMotionValue(-20)
  const y  = useMotionValue(-20)
  const sx = useSpring(x, { stiffness:500, damping:32 })
  const sy = useSpring(y, { stiffness:500, damping:32 })
  useEffect(() => {
    const m = e => { x.set(e.clientX-6); y.set(e.clientY-6) }
    window.addEventListener('mousemove', m)
    return () => window.removeEventListener('mousemove', m)
  }, [])
  return (
    <motion.div style={{
      position:'fixed', zIndex:9999,
      width:12, height:12, borderRadius:'50%',
      border:'1px solid var(--accent)',
      background:'transparent', pointerEvents:'none',
      x:sx, y:sy,
    }}/>
  )
}

function Coords() {
  const [pos, setPos] = useState({ x:0, y:0 })
  useEffect(() => {
    const m = e => setPos({ x:e.clientX, y:e.clientY })
    window.addEventListener('mousemove', m)
    return () => window.removeEventListener('mousemove', m)
  }, [])
  return (
    <div style={{
      position:'fixed', bottom:24, right:32, zIndex:50,
      fontFamily:'var(--mono)', fontSize:10,
      color:'var(--dim)', letterSpacing:'0.12em',
      lineHeight:2, pointerEvents:'none', userSelect:'none',
    }}>
      <div>X: {String(pos.x).padStart(4,'0')}</div>
      <div>Y: {String(pos.y).padStart(4,'0')}</div>
    </div>
  )
}

function Loader({ onDone }) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const start = Date.now(), dur = 2000
    const frame = () => {
      const p = Math.min(Math.round(((Date.now()-start)/dur)*100), 100)
      setPct(p)
      if (p < 100) requestAnimationFrame(frame)
      else setTimeout(onDone, 300)
    }
    requestAnimationFrame(frame)
  }, [onDone])
  return (
    <motion.div
      exit={{ opacity:0 }}
      transition={{ duration:1.0, ease:[0.76,0,0.24,1] }}
      style={{
        position:'fixed', inset:0, background:'#0a0a0e',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        zIndex:1000, overflow:'hidden',
      }}
    >
      <FluidBackground/>
      <div style={{ position:'relative', zIndex:2, textAlign:'center' }}>
        <div style={{
          fontFamily:'var(--display)',
          fontSize:'clamp(140px,28vw,320px)',
          lineHeight:1, letterSpacing:'-0.03em',
          color:'rgba(255,255,255,0.85)',
        }}>
          {pct}
          <span style={{ color:'var(--accent)' }}>%</span>
        </div>
        <div style={{
          fontFamily:'var(--mono)', fontSize:10,
          color:'rgba(255,255,255,0.2)', marginTop:24,
          letterSpacing:'0.3em', textTransform:'uppercase',
        }}>Inspira · Loading</div>
      </div>
      <div style={{
        position:'absolute', bottom:0, left:0, right:0,
        height:1, background:'rgba(255,255,255,0.06)',
      }}>
        <div style={{
          height:'100%', background:'var(--accent)',
          width:`${pct}%`, transition:'width 0.04s linear',
        }}/>
      </div>
    </motion.div>
  )
}

function MagButton({ children, onClick, variant='filled' }) {
  const ref = useRef()
  const x   = useMotionValue(0)
  const y   = useMotionValue(0)
  const sx  = useSpring(x, { stiffness:200, damping:14 })
  const sy  = useSpring(y, { stiffness:200, damping:14 })
  const onMove = e => {
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX-(r.left+r.width/2))*0.3)
    y.set((e.clientY-(r.top+r.height/2))*0.3)
  }
  const onLeave = () => { x.set(0); y.set(0) }
  const filled  = variant === 'filled'
  return (
    <motion.button
      ref={ref} onClick={onClick}
      onMouseMove={onMove} onMouseLeave={onLeave}
      style={{
        x:sx, y:sy,
        fontFamily:'var(--display)',
        fontSize:18, letterSpacing:'0.06em',
        cursor:'none', borderRadius:'6px',
        border: filled ? 'none' : '1px solid rgba(255,255,255,0.2)',
        background: filled ? 'var(--accent)' : 'transparent',
        color: filled ? '#0a0a0e' : 'rgba(255,255,255,0.5)',
        padding: filled ? '15px 48px' : '15px 40px',
      }}
      whileHover={filled
        ? { boxShadow:'0 0 60px rgba(200,255,0,0.3)', scale:1.04 }
        : { borderColor:'rgba(255,255,255,0.5)', color:'rgba(255,255,255,0.9)', scale:1.03 }
      }
      whileTap={{ scale:0.96 }}
    >{children}</motion.button>
  )
}

export default function LandingPage() {
  const navigate   = useNavigate()
  const [loaded, setLoaded] = useState(false)
  const handleDone = useCallback(() => setLoaded(true), [])

  const { scrollY } = useScroll()

  // Hero fades out as you scroll
  const heroOpacity  = useTransform(scrollY, [0, 500], [1, 0])
  const heroScale    = useTransform(scrollY, [0, 500], [1, 0.96])

  // Overlay that transitions from transparent → dark bg colour
  // This creates the "fluid dissolves into dark" effect
  const overlayOpacity = useTransform(scrollY, [200, 600], [0, 1])

  if (!loaded) return (
    <AnimatePresence mode="wait">
      <Loader key="loader" onDone={handleDone}/>
    </AnimatePresence>
  )

  return (
    <motion.div
      initial={{ opacity:0 }}
      animate={{ opacity:1 }}
      transition={{ duration:0.8 }}
      style={{ background:'var(--bg)' }}
    >
      <Cursor/>
      <Coords/>

      {/* ── HERO ── sticky so content scrolls over it */}
      <motion.div style={{
        position:'sticky', top:0, zIndex:1,
        height:'100vh', overflow:'hidden',
        opacity: heroOpacity,
        scale:   heroScale,
      }}>
        {/* Fluid background */}
        <FluidBackground/>

        {/* Dark overlay that fades in as you scroll — the transition effect */}
        <motion.div style={{
          position:'absolute', inset:0, zIndex:3,
          background:'var(--bg)',
          opacity: overlayOpacity,
          pointerEvents:'none',
        }}/>

        {/* Navbar */}
        <motion.nav
          initial={{ y:-60, opacity:0 }}
          animate={{ y:0, opacity:1 }}
          transition={{ duration:0.9, delay:0.2, ease:[0.16,1,0.3,1] }}
          style={{
            position:'absolute', top:0, left:0, right:0, zIndex:10,
            display:'flex', alignItems:'center',
            justifyContent:'space-between',
            padding:'24px 56px',
          }}
        >
          <motion.div
            style={{
              fontFamily:'var(--display)', fontSize:22,
              letterSpacing:'0.06em', color:'rgba(255,255,255,0.9)',
            }}
            whileHover={{ color:'var(--accent)' }}
            transition={{ duration:0.2 }}
          >INSPIRA.</motion.div>

          <div style={{
            display:'flex', gap:52,
            fontFamily:'var(--mono)', fontSize:10,
            letterSpacing:'0.18em', textTransform:'uppercase',
          }}>
            {['About','How it works','Research'].map(item => (
              <motion.a key={item} href="#"
                style={{ color:'rgba(255,255,255,0.28)', textDecoration:'none' }}
                whileHover={{ color:'rgba(255,255,255,0.8)' }}
                transition={{ duration:0.15 }}
              >{item}</motion.a>
            ))}
          </div>

          <MagButton onClick={()=>navigate('/upload')}>
            Try free →
          </MagButton>
        </motion.nav>

        {/* Hero content */}
        <div style={{
          position:'absolute', inset:0, zIndex:5,
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          textAlign:'center', padding:'0 48px',
          pointerEvents:'none',
        }}>
          <motion.div
            initial={{ opacity:0, y:10 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.7, delay:0.4 }}
            style={{
              fontFamily:'var(--mono)', fontSize:10,
              color:'rgba(255,255,255,0.28)',
              letterSpacing:'0.3em', textTransform:'uppercase',
              marginBottom:32,
              display:'flex', alignItems:'center', gap:12,
            }}
          >
            <motion.div
              animate={{ opacity:[1,0.2,1] }}
              transition={{ repeat:Infinity, duration:1.8 }}
              style={{ width:5, height:5, borderRadius:'50%', background:'var(--accent)' }}
            />
            AI Interior Design
            <motion.div
              animate={{ opacity:[1,0.2,1] }}
              transition={{ repeat:Infinity, duration:1.8, delay:0.9 }}
              style={{ width:5, height:5, borderRadius:'50%', background:'var(--accent)' }}
            />
          </motion.div>

          <div style={{ overflow:'hidden', marginBottom:12 }}>
            <motion.div
              initial={{ y:'110%' }}
              animate={{ y:0 }}
              transition={{ duration:1.1, delay:0.5, ease:[0.16,1,0.3,1] }}
              style={{
                fontFamily:'var(--display)',
                fontSize:'clamp(48px,9vw,130px)',
                lineHeight:0.92, letterSpacing:'-0.01em',
                color:'rgba(255,255,255,0.92)',
                whiteSpace:'nowrap',
              }}
            >See it in your room,</motion.div>
          </div>

          <div style={{ overflow:'hidden', marginBottom:48 }}>
            <motion.div
              initial={{ y:'110%' }}
              animate={{ y:0 }}
              transition={{ duration:1.1, delay:0.62, ease:[0.16,1,0.3,1] }}
              style={{
                fontFamily:'var(--display)',
                fontSize:'clamp(48px,9vw,130px)',
                lineHeight:0.92, letterSpacing:'-0.01em',
                color:'var(--accent)',
                whiteSpace:'nowrap',
              }}
            >before it's in your room.</motion.div>
          </div>

          <motion.p
            initial={{ opacity:0, y:16 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.8, delay:0.9 }}
            style={{
              fontFamily:'var(--body)', fontSize:15,
              lineHeight:1.8, color:'rgba(255,255,255,0.3)',
              fontWeight:300, maxWidth:480, marginBottom:52,
            }}
          >
            Upload any design inspiration.
            Photograph your room. Inspira reconstructs
            your space in 3D and shows you exactly how
            it fits — before you spend a single rupee.
          </motion.p>

          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ duration:0.6, delay:1.1 }}
            style={{ display:'flex', gap:16, alignItems:'center', pointerEvents:'all' }}
          >
            <MagButton onClick={()=>navigate('/upload')}>
              Start for free →
            </MagButton>
            <MagButton onClick={()=>navigate('/upload')} variant="outline">
              Watch demo
            </MagButton>
          </motion.div>
        </div>

        {/* Bottom labels */}
        <motion.div
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          transition={{ duration:0.8, delay:1.2 }}
          style={{
            position:'absolute', bottom:40, left:56, zIndex:10,
            fontFamily:'var(--mono)', fontSize:10,
            color:'rgba(255,255,255,0.22)',
            letterSpacing:'0.18em', textTransform:'uppercase',
            lineHeight:2.4,
          }}
        >
          <div>Interior Design</div>
          <div>3D Visualization</div>
          <div>AI-Powered</div>
        </motion.div>

        {/* Scroll hint — bounces */}
        <motion.div
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          transition={{ duration:0.8, delay:1.3 }}
          style={{
            position:'absolute', bottom:40, left:'50%',
            transform:'translateX(-50%)',
            zIndex:10,
            fontFamily:'var(--mono)', fontSize:10,
            color:'rgba(255,255,255,0.2)',
            letterSpacing:'0.2em', textTransform:'uppercase',
            display:'flex', flexDirection:'column',
            alignItems:'center', gap:8,
          }}
        >
          <span>Scroll</span>
          <motion.div
            animate={{ y:[0,8,0] }}
            transition={{ repeat:Infinity, duration:2, ease:'easeInOut' }}
            style={{ width:1, height:32, background:'rgba(255,255,255,0.2)' }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          transition={{ duration:0.8, delay:1.3 }}
          style={{
            position:'absolute', bottom:40, right:56, zIndex:10,
            fontFamily:'var(--mono)', fontSize:10,
            color:'rgba(255,255,255,0.22)',
            letterSpacing:'0.2em', textTransform:'uppercase',
            display:'flex', alignItems:'center', gap:10,
          }}
        >
          <motion.span
            animate={{ y:[0,4,0] }}
            transition={{ repeat:Infinity, duration:2 }}
          >↓</motion.span>
          Scroll to explore
        </motion.div>
      </motion.div>

      {/* ── CONTENT — sits below sticky hero, scrolls over it ── */}
      <div style={{ position:'relative', zIndex:2 }}>
        <FeatureCards/>

        <footer style={{
          padding:'28px 56px',
          borderTop:'1px solid var(--border)',
          display:'flex', justifyContent:'space-between',
          alignItems:'center', flexWrap:'wrap', gap:16,
          background:'var(--bg)',
        }}>
          <div style={{
            fontFamily:'var(--display)', fontSize:18,
            letterSpacing:'0.06em', color:'var(--text)',
          }}>INSPIRA.</div>
          <div style={{
            fontFamily:'var(--mono)', fontSize:10,
            color:'rgba(255,255,255,0.18)', letterSpacing:'0.15em',
          }}>© 2026 · COMPUTER VISION RESEARCH</div>
          <div style={{
            fontFamily:'var(--mono)', fontSize:10,
            color:'rgba(255,255,255,0.18)', letterSpacing:'0.12em',
          }}>3DGS + CLIP + LLAVA</div>
        </footer>
      </div>
    </motion.div>
  )
}

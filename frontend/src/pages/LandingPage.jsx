import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  motion, useSpring, AnimatePresence,
  useMotionValue, useScroll, useTransform, useInView,
} from 'framer-motion'
import FeatureCards from '../components/FeatureCards'
import FloatingObject from '../components/FloatingObject'

/* ── Cursor — large white ring, always visible ── */
function Cursor() {
  const mx = useMotionValue(-80)
  const my = useMotionValue(-80)
  const ox = useSpring(mx, { stiffness:60, damping:18 })
  const oy = useSpring(my, { stiffness:60, damping:18 })
  const ix = useSpring(mx, { stiffness:500, damping:32 })
  const iy = useSpring(my, { stiffness:500, damping:32 })
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const m   = e => { mx.set(e.clientX); my.set(e.clientY) }
    const ov  = e => { if (e.target.closest('button,a')) setHovered(true)  }
    const out = e => { if (e.target.closest('button,a')) setHovered(false) }
    window.addEventListener('mousemove', m)
    window.addEventListener('mouseover', ov)
    window.addEventListener('mouseout',  out)
    return () => {
      window.removeEventListener('mousemove', m)
      window.removeEventListener('mouseover', ov)
      window.removeEventListener('mouseout',  out)
    }
  }, [])

  return (
    <>
      {/* Outer ring */}
      <motion.div
        animate={{ scale: hovered ? 1.8 : 1 }}
        transition={{ duration:0.3 }}
        style={{
          position:'fixed', zIndex:9999,
          width:40, height:40, borderRadius:'50%',
          border:'1.5px solid rgba(245,240,232,0.7)',
          pointerEvents:'none',
          x:ox, y:oy,
          translateX:'-50%', translateY:'-50%',
          mixBlendMode:'difference',
        }}
      />
      {/* Inner dot */}
      <motion.div style={{
        position:'fixed', zIndex:9999,
        width:6, height:6, borderRadius:'50%',
        background:'rgba(245,240,232,0.9)',
        pointerEvents:'none',
        x:ix, y:iy,
        translateX:'-50%', translateY:'-50%',
        mixBlendMode:'difference',
      }}/>
    </>
  )
}

/* ── Loader ── */
function Loader({ onDone }) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const start = Date.now(), dur = 2200
    const frame = () => {
      const p = Math.min(Math.round(((Date.now()-start)/dur)*100), 100)
      setPct(p)
      if (p < 100) requestAnimationFrame(frame)
      else setTimeout(onDone, 400)
    }
    requestAnimationFrame(frame)
  }, [onDone])
  return (
    <motion.div exit={{ opacity:0 }} transition={{ duration:1.2 }}
      style={{
        position:'fixed', inset:0, background:'#f0ebe0',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', zIndex:1000,
      }}
    >
      <div style={{
        fontFamily:'var(--serif)',
        fontSize:'clamp(100px,22vw,240px)',
        fontWeight:300, lineHeight:1,
        letterSpacing:'-0.03em', color:'#1a1714',
      }}>
        {pct}
        <span style={{
          fontSize:'0.35em', verticalAlign:'top',
          marginTop:'0.25em', display:'inline-block',
          color:'#b8b2a8',
        }}>%</span>
      </div>
      <div style={{
        fontFamily:'var(--mono)', fontSize:9, color:'#b8b2a8',
        marginTop:32, letterSpacing:'0.35em', textTransform:'uppercase',
      }}>Inspira</div>
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:'rgba(0,0,0,0.08)' }}>
        <div style={{ height:'100%', background:'#1a1714', width:`${pct}%`, transition:'width 0.04s linear' }}/>
      </div>
    </motion.div>
  )
}

/* ── FadeIn ── */
function FadeIn({ children, delay=0, y=20, style={} }) {
  const ref    = useRef()
  const inView = useInView(ref, { once:true, margin:'-80px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:1.2, delay, ease:[0.16,1,0.3,1] }}
      style={style}
    >{children}</motion.div>
  )
}

/* ── Reveal ── */
function Reveal({ lines, lineStyle={}, delay=0, style={} }) {
  const ref    = useRef()
  const inView = useInView(ref, { once:true, margin:'-80px' })
  return (
    <div ref={ref} style={style}>
      {lines.map((line,i) => (
        <div key={i} style={{ overflow:'hidden' }}>
          <motion.div
            initial={{ y:'108%' }}
            animate={inView ? { y:0 } : {}}
            transition={{ duration:1.1, delay:delay+i*0.1, ease:[0.16,1,0.3,1] }}
            style={lineStyle}
          >{line}</motion.div>
        </div>
      ))}
    </div>
  )
}

export default function LandingPage() {
  const navigate   = useNavigate()
  const [loaded, setLoaded] = useState(false)
  const handleDone = useCallback(() => setLoaded(true), [])
  const { scrollY } = useScroll()
  const imgY = useTransform(scrollY, [0, 800], [0, 80])

  if (!loaded) return (
    <AnimatePresence mode="wait">
      <Loader key="loader" onDone={handleDone}/>
    </AnimatePresence>
  )

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }}
      transition={{ duration:0.8 }}
      style={{ background:'#f0ebe0', color:'#1a1714' }}
    >
      <Cursor/>

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ opacity:0, y:-10 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:1, delay:0.4 }}
        style={{
          position:'fixed', top:0, left:0, right:0, zIndex:100,
          display:'flex', alignItems:'center',
          justifyContent:'space-between',
          padding:'28px 56px',
          mixBlendMode:'difference',
        }}
      >
        <div style={{
          fontFamily:'var(--serif)', fontSize:22,
          fontWeight:400, letterSpacing:'0.18em',
          textTransform:'uppercase', color:'white',
        }}>Inspira</div>

        <div style={{
          display:'flex', gap:52,
          fontFamily:'var(--mono)', fontSize:11,
          letterSpacing:'0.18em', textTransform:'uppercase',
          color:'rgba(255,255,255,0.55)',
        }}>
          {[
            { label: 'Studio', path: '#' },
            { label: 'Process', path: '#' },
            { label: 'History', path: '/history' }
          ].map(item => (
            <motion.a key={item.label} 
              href={item.path !== '#' ? undefined : '#'}
              onClick={(e) => {
                if (item.path !== '#') {
                  e.preventDefault();
                  navigate(item.path);
                }
              }}
              style={{ textDecoration:'none', color:'inherit', cursor:'none' }}
              whileHover={{ color:'white' }}
            >{item.label}</motion.a>
          ))}
        </div>

        <motion.button
          onClick={() => navigate('/upload')}
          style={{
            fontFamily:'var(--mono)', fontSize:11,
            letterSpacing:'0.18em', textTransform:'uppercase',
            color:'white', background:'transparent',
            border:'1px solid rgba(255,255,255,0.35)',
            padding:'13px 36px', cursor:'none',
          }}
          whileHover={{ borderColor:'white' }}
        >Begin →</motion.button>
      </motion.nav>

      {/* ── HERO ── */}
      <section style={{
        height:'100vh', position:'relative',
        overflow:'hidden',
        background:'#1c1510',
      }}>
        {/* ── Background: coffee-beige warm tones ── */}
        <motion.div style={{ y:imgY, position:'absolute', inset:'-15%', zIndex:0 }}>
          {/* Base warm coffee tone */}
          <div style={{
            position:'absolute', inset:0,
            background:'radial-gradient(ellipse 100% 100% at 55% 45%, #2e1f12 0%, #1a110a 50%, #0e0908 100%)',
          }}/>
          {/* Warm window light — top right */}
          <div style={{
            position:'absolute', inset:0,
            background:'radial-gradient(ellipse 45% 55% at 80% 15%, rgba(240,200,130,0.22) 0%, rgba(200,150,80,0.08) 50%, transparent 75%)',
          }}/>
          {/* Warm floor glow */}
          <div style={{
            position:'absolute', inset:0,
            background:'radial-gradient(ellipse 70% 40% at 50% 90%, rgba(180,120,60,0.12) 0%, transparent 60%)',
          }}/>
          {/* Cool shadow — left */}
          <div style={{
            position:'absolute', inset:0,
            background:'radial-gradient(ellipse 40% 80% at 5% 50%, rgba(15,10,8,0.4) 0%, transparent 60%)',
          }}/>
        </motion.div>

        {/* ── Hero room illustration — richer ── */}
        <motion.div
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          transition={{ duration:2.5, delay:0.6 }}
          style={{
            position:'absolute', inset:0, zIndex:2,
            display:'flex', alignItems:'center',
            justifyContent:'center',
          }}
        >
          <svg viewBox="0 0 900 650" style={{ width:'80%', maxWidth:900 }}>
            <defs>
              <radialGradient id="glow" cx="50%" cy="30%" r="60%">
                <stop offset="0%"   stopColor="rgba(240,210,150,0.15)"/>
                <stop offset="100%" stopColor="rgba(240,210,150,0)"/>
              </radialGradient>
              <radialGradient id="floorGlow" cx="50%" cy="80%" r="50%">
                <stop offset="0%"   stopColor="rgba(180,130,80,0.08)"/>
                <stop offset="100%" stopColor="rgba(180,130,80,0)"/>
              </radialGradient>
              <linearGradient id="wallLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="rgba(245,235,210,0.04)"/>
                <stop offset="100%" stopColor="rgba(245,235,210,0.09)"/>
              </linearGradient>
              <linearGradient id="wallBack" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="rgba(245,235,210,0.10)"/>
                <stop offset="100%" stopColor="rgba(245,235,210,0.04)"/>
              </linearGradient>
            </defs>

            {/* Glow fill */}
            <rect width="900" height="650" fill="url(#glow)"/>
            <rect width="900" height="650" fill="url(#floorGlow)"/>

            {/* ── Walls — filled panels ── */}
            {/* Back wall */}
            <polygon points="220,80 680,80 680,440 220,440" fill="url(#wallBack)"/>
            {/* Left wall */}
            <polygon points="40,540 220,440 220,80 40,120" fill="url(#wallLeft)"/>
            {/* Floor */}
            <polygon points="40,540 860,540 680,440 220,440" fill="rgba(180,130,70,0.06)"/>

            {/* Wall outlines */}
            <polygon points="220,80 680,80 680,440 220,440" fill="none" stroke="rgba(245,235,210,0.12)" strokeWidth="0.8"/>
            <polygon points="40,540 220,440 220,80 40,120" fill="none" stroke="rgba(245,235,210,0.07)" strokeWidth="0.8"/>
            <polygon points="40,540 860,540 680,440 220,440" fill="none" stroke="rgba(245,235,210,0.07)" strokeWidth="0.8"/>
            {/* Ceiling */}
            <polygon points="40,120 860,120 680,80 220,80" fill="rgba(245,235,210,0.03)" stroke="rgba(245,235,210,0.06)" strokeWidth="0.8"/>

            {/* ── Window — filled with light ── */}
            <g transform="">
              {/* Window opening */}
              <rect x="255" y="110" width="170" height="140" fill="rgba(240,210,150,0.18)" stroke="rgba(245,235,210,0.25)" strokeWidth="1"/>
              {/* Window frame */}
              <rect x="255" y="110" width="170" height="140" fill="none" stroke="rgba(245,235,210,0.35)" strokeWidth="1.5"/>
              {/* Cross */}
              <line x1="340" y1="110" x2="340" y2="250" stroke="rgba(245,235,210,0.3)" strokeWidth="1.2"/>
              <line x1="255" y1="180" x2="425" y2="180" stroke="rgba(245,235,210,0.3)" strokeWidth="1.2"/>
              {/* Light rays */}
              <polygon points="255,110 425,110 580,440 220,440" fill="rgba(240,210,130,0.03)"/>
            </g>

            {/* ── Artwork on back wall ── */}
            <rect x="480" y="120" width="110" height="80" fill="rgba(200,170,110,0.08)" stroke="rgba(245,235,210,0.2)" strokeWidth="1"/>
            <rect x="492" y="130" width="86" height="60" fill="rgba(200,170,110,0.05)" stroke="rgba(245,235,210,0.12)" strokeWidth="0.5"/>

            {/* ── Sofa — filled ── */}
            <g>
              {/* Body */}
              <rect x="290" y="370" width="240" height="55" fill="rgba(160,130,90,0.18)" stroke="rgba(245,235,210,0.18)" strokeWidth="0.8"/>
              {/* Back */}
              <rect x="290" y="330" width="240" height="42" fill="rgba(160,130,90,0.22)" stroke="rgba(245,235,210,0.2)" strokeWidth="0.8"/>
              {/* Arms */}
              <rect x="284" y="330" width="18" height="95" fill="rgba(140,110,75,0.25)" stroke="rgba(245,235,210,0.18)" strokeWidth="0.8"/>
              <rect x="518" y="330" width="18" height="95" fill="rgba(140,110,75,0.25)" stroke="rgba(245,235,210,0.18)" strokeWidth="0.8"/>
              {/* Cushions */}
              <rect x="297" y="338" width="108" height="30" fill="rgba(180,155,110,0.15)" stroke="rgba(245,235,210,0.12)" strokeWidth="0.5"/>
              <rect x="415" y="338" width="108" height="30" fill="rgba(180,155,110,0.15)" stroke="rgba(245,235,210,0.12)" strokeWidth="0.5"/>
              {/* Legs */}
              <rect x="297" y="423" width="8" height="12" fill="rgba(245,235,210,0.15)"/>
              <rect x="515" y="423" width="8" height="12" fill="rgba(245,235,210,0.15)"/>
            </g>

            {/* ── Coffee table ── */}
            <g>
              <rect x="340" y="430" width="150" height="8"  fill="rgba(200,170,120,0.2)"  stroke="rgba(245,235,210,0.2)" strokeWidth="0.8"/>
              <rect x="350" y="438" width="6"   height="20" fill="rgba(200,170,120,0.15)"/>
              <rect x="474" y="438" width="6"   height="20" fill="rgba(200,170,120,0.15)"/>
              {/* Book on table */}
              <rect x="375" y="424" width="50" height="6" fill="rgba(245,235,210,0.12)" stroke="rgba(245,235,210,0.15)" strokeWidth="0.5"/>
            </g>

            {/* ── Floor lamp — right ── */}
            <g>
              <line x1="590" y1="290" x2="590" y2="440" stroke="rgba(245,235,210,0.2)" strokeWidth="1"/>
              {/* Shade */}
              <polygon points="562,290 618,290 605,265 575,265" fill="rgba(240,210,140,0.15)" stroke="rgba(245,235,210,0.25)" strokeWidth="0.8"/>
              {/* Light glow */}
              <ellipse cx="590" cy="295" rx="35" ry="15" fill="rgba(240,210,130,0.08)"/>
              {/* Base */}
              <ellipse cx="590" cy="440" rx="18" ry="5" fill="rgba(245,235,210,0.12)"/>
            </g>

            {/* ── Side table + plant ── */}
            <g>
              <rect x="240" y="385" width="38" height="7"  fill="rgba(200,170,120,0.2)" stroke="rgba(245,235,210,0.15)" strokeWidth="0.8"/>
              <rect x="244" y="392" width="4"  height="38" fill="rgba(200,170,120,0.12)"/>
              <rect x="270" y="392" width="4"  height="38" fill="rgba(200,170,120,0.12)"/>
              {/* Plant pot */}
              <rect x="250" y="365" width="22" height="22" rx="2" fill="rgba(160,120,80,0.2)" stroke="rgba(245,235,210,0.15)" strokeWidth="0.8"/>
              {/* Foliage */}
              <ellipse cx="261" cy="355" rx="18" ry="14" fill="rgba(80,110,70,0.25)" stroke="rgba(100,140,80,0.2)" strokeWidth="0.8"/>
              <ellipse cx="254" cy="348" rx="12" ry="10" fill="rgba(80,110,70,0.2)"/>
              <ellipse cx="268" cy="350" rx="10" ry="9"  fill="rgba(90,120,75,0.2)"/>
            </g>

            {/* ── Rug ── */}
            <ellipse cx="415" cy="455" rx="160" ry="28" fill="rgba(160,120,80,0.08)" stroke="rgba(245,235,210,0.08)" strokeWidth="0.8"/>
            <ellipse cx="415" cy="455" rx="138" ry="22" fill="none" stroke="rgba(245,235,210,0.05)" strokeWidth="0.5"/>

            {/* ── Floor reflection of lamp ── */}
            <ellipse cx="590" cy="445" rx="40" ry="8" fill="rgba(240,210,130,0.04)"/>
          </svg>
        </motion.div>

        {/* Bottom gradient */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, zIndex:3,
          height:'55%',
          background:'linear-gradient(to top, rgba(14,9,6,0.92) 0%, rgba(14,9,6,0.5) 50%, transparent 100%)',
        }}/>

        {/* ── Hero text ── */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, zIndex:5,
          padding:'0 56px 60px',
          display:'grid',
          gridTemplateColumns:'1fr 320px',
          gap:60, alignItems:'flex-end',
        }}>
          {/* Left — headline */}
          <div>
            <motion.div
              initial={{ opacity:0 }}
              animate={{ opacity:1 }}
              transition={{ duration:1, delay:0.8 }}
              style={{
                fontFamily:'var(--mono)', fontSize:10,
                color:'rgba(245,235,210,0.35)',
                letterSpacing:'0.28em', textTransform:'uppercase',
                marginBottom:24,
              }}
            >AI Interior Design — 2026</motion.div>

            <div style={{ overflow:'hidden' }}>
              <motion.div
                initial={{ y:'108%' }}
                animate={{ y:0 }}
                transition={{ duration:1.3, delay:0.85, ease:[0.16,1,0.3,1] }}
                style={{
                  fontFamily:'var(--serif)',
                  fontSize:'clamp(56px,8vw,120px)',
                  fontWeight:300, lineHeight:0.90,
                  letterSpacing:'-0.01em',
                  color:'rgba(245,235,210,0.95)',
                  fontStyle:'italic',
                }}
              >See it in your room,</motion.div>
            </div>
            <div style={{ overflow:'hidden' }}>
              <motion.div
                initial={{ y:'108%' }}
                animate={{ y:0 }}
                transition={{ duration:1.3, delay:0.97, ease:[0.16,1,0.3,1] }}
                style={{
                  fontFamily:'var(--serif)',
                  fontSize:'clamp(56px,8vw,120px)',
                  fontWeight:300, lineHeight:0.90,
                  letterSpacing:'-0.01em',
                  color:'rgba(245,235,210,0.82)',
                }}
              >before it's in your room.</motion.div>
            </div>
          </div>

          {/* Right — CTA only, no overlapping text */}
          <motion.div
            initial={{ opacity:0, y:16 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:1, delay:1.2 }}
            style={{ paddingBottom:4 }}
          >
            <p style={{
              fontFamily:'var(--sans)', fontSize:14,
              color:'rgba(245,235,210,0.82)',
              fontWeight:300, lineHeight:1.85,
              marginBottom:28,
              textAlign:'right',
            }}>
              Upload any design inspiration.<br/>
              Photograph your room.<br/>
              See the result in 3D.
            </p>

            <motion.button
              onClick={() => navigate('/upload')}
              style={{
                fontFamily:'var(--mono)', fontSize:11,
                letterSpacing:'0.2em', textTransform:'uppercase',
                color:'#1a1714',
                background:'rgba(245,235,210,0.92)',
                border:'none', padding:'18px 0',
                cursor:'none', width:'100%',
              }}
              whileHover={{ background:'rgba(245,235,210,1)', boxShadow:'0 8px 40px rgba(0,0,0,0.4)' }}
              whileTap={{ scale:0.97 }}
            >Begin your project →</motion.button>

            <div style={{
              fontFamily:'var(--mono)', fontSize:8,
              color:'rgba(245,235,210,0.18)',
              letterSpacing:'0.2em', textTransform:'uppercase',
              marginTop:12, textAlign:'center',
            }}>Free · No account needed</div>
          </motion.div>
        </div>


      </section>

      {/* ── Intro ── */}
      <section style={{ background:'#f0ebe0', position:'relative', overflow:'hidden' }}>

        {/* ── Big statement + image panel ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', minHeight:'70vh' }}>

          {/* Left — headline + body */}
          <div style={{
            padding:'100px 64px 80px 56px',
            display:'flex', flexDirection:'column',
            justifyContent:'space-between',
            
          }}>
            <div>
              <FadeIn>
                <div style={{
                  fontFamily:'var(--mono)', fontSize:9,
                  color:'#b8b2a8', letterSpacing:'0.22em',
                  textTransform:'uppercase', marginBottom:48,
                }}>[ About ]</div>
              </FadeIn>

              <Reveal
                lines={['The gap between', 'inspiration', 'and reality', 'is over.']}
                lineStyle={{
                  fontFamily:'var(--serif)',
                  fontSize:'clamp(44px,5.5vw,76px)',
                  fontWeight:500,
                  lineHeight:1.05,
                  letterSpacing:'-0.02em',
                  color:'#1a1714',
                }}
                style={{ marginBottom:56 }}
              />
            </div>

            <FadeIn delay={0.3}>
              <p style={{
                fontFamily:'var(--sans)', fontSize:16,
                lineHeight:1.85, color:'#3a3530',
                fontWeight:400, maxWidth:480,
              }}>
                450 million people save design inspiration every month.
                Almost none recreate it — not for lack of taste, but because
                translating a 2D image into a real 3D space has always been
                technically impossible.
                <br/><br/>
                <strong style={{ fontWeight:600, color:'#1a1714' }}>Inspira makes it possible.</strong>
              </p>
            </FadeIn>
          </div>

          {/* Right — floating 3D object on same cream background */}
          <FadeIn delay={0.3} style={{
            position:'relative', minHeight:500,
            display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
          }}>
            {/* 3D canvas */}
            <div style={{ width:'100%', height:480 }}>
              <FloatingObject/>
            </div>

            {/* Subtle label */}
            <div style={{
              position:'absolute', bottom:32,
              fontFamily:'var(--mono)', fontSize:9,
              color:'#c8c0b4',
              letterSpacing:'0.22em', textTransform:'uppercase',
            }}>Spatial Intelligence</div>
          </FadeIn>
        </div>

        {/* ── How it works teaser — horizontal strip ── */}
        <div style={{
          borderTop:'1px solid rgba(26,23,20,0.1)',
          display:'grid', gridTemplateColumns:'repeat(3,1fr)',
          background:'#e8e2d5',
        }}>
          {[
            { n:'01', title:'Upload', body:'Drop any Pinterest or Instagram design image. AI reads style, furniture, and palette instantly.' },
            { n:'02', title:'Photograph', body:'Take 15–20 photos of your room. Our pipeline maps every surface in true 3D geometry.' },
            { n:'03', title:'Explore', body:'Walk through your room furnished in the inspiration style before spending anything.' },
          ].map((item, i) => (
            <FadeIn key={i} delay={i*0.12} style={{
              padding:'56px 52px',
              borderLeft: i>0 ? '1px solid rgba(26,23,20,0.1)' : 'none',
            }}>
              <div style={{
                fontFamily:'var(--mono)', fontSize:9,
                color:'#b8b2a8', letterSpacing:'0.2em',
                marginBottom:20,
              }}>{item.n}</div>
              <div style={{
                fontFamily:'var(--serif)', fontSize:'clamp(28px,3vw,40px)',
                fontWeight:500, color:'#1a1714',
                marginBottom:16, lineHeight:1.1,
              }}>{item.title}</div>
              <p style={{
                fontFamily:'var(--sans)', fontSize:14,
                lineHeight:1.8, color:'#4a4540',
                fontWeight:400,
              }}>{item.body}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ background:'#e8e3d8', borderTop:'1px solid rgba(26,23,20,0.08)', borderBottom:'1px solid rgba(26,23,20,0.08)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)' }}>
          {[
            { n:'450M', label:'Design saves monthly', sub:'On Pinterest alone' },
            { n:'< 60s', label:'To read an inspiration', sub:'Full AI analysis' },
            { n:'94K',   label:'Gaussians per room', sub:'True 3D geometry' },
            { n:'100%',  label:'Your actual dimensions', sub:'Never estimated' },
          ].map((s,i) => (
            <FadeIn key={i} delay={i*0.1} style={{
              padding:'72px 0',
              paddingLeft: i===0 ? 56 : 48,
              paddingRight: 24,
              borderLeft: i>0 ? '1px solid rgba(26,23,20,0.08)' : 'none',
            }}>
              <div style={{
                fontFamily:'var(--serif)',
                fontSize:'clamp(48px,6vw,80px)',
                fontWeight:400, letterSpacing:'-0.03em',
                color:'#1a1714', lineHeight:1, marginBottom:16,
              }}>{s.n}</div>
              <div style={{
                fontFamily:'var(--sans)', fontSize:14,
                color:'#1a1714', fontWeight:600,
                marginBottom:6,
              }}>{s.label}</div>
              <div style={{
                fontFamily:'var(--sans)', fontSize:12,
                color:'#8a8480', fontWeight:400,
              }}>{s.sub}</div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Process ── */}
      <FeatureCards/>

      {/* ── CTA ── */}
      <section style={{
        padding:'160px 56px', background:'#1a1714',
        display:'grid', gridTemplateColumns:'1fr 1fr',
        gap:100, alignItems:'end', position:'relative', overflow:'hidden',
      }}>
        <div style={{
          position:'absolute', inset:0, zIndex:0,
          background:'radial-gradient(ellipse 60% 80% at 20% 80%, rgba(180,130,70,0.08) 0%, transparent 60%)',
          pointerEvents:'none',
        }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <Reveal
            lines={['Begin your', 'project today.']}
            lineStyle={{
              fontFamily:'var(--serif)',
              fontSize:'clamp(48px,7vw,100px)',
              fontWeight:500, fontStyle:'italic',
              lineHeight:1.0, letterSpacing:'-0.01em',
              color:'#f0ebe0',
            }}
          />
        </div>
        <FadeIn delay={0.2} style={{ position:'relative', zIndex:1 }}>
          <p style={{
            fontFamily:'var(--sans)', fontSize:16,
            lineHeight:1.9, color:'rgba(240,235,224,0.5)',
            fontWeight:400, marginBottom:40,
          }}>
            Upload your inspiration and room photos.
            We reconstruct your space in 3D and show you
            exactly how your chosen design fits — before
            you commit to anything.
          </p>
          <motion.button
            onClick={() => navigate('/upload')}
            style={{
              fontFamily:'var(--mono)', fontSize:11,
              letterSpacing:'0.2em', textTransform:'uppercase',
              color:'#1a1714', background:'#f0ebe0',
              border:'none', padding:'18px 48px', cursor:'none',
            }}
            whileHover={{ background:'white', boxShadow:'0 8px 40px rgba(0,0,0,0.4)' }}
            whileTap={{ scale:0.97 }}
          >Start for free →</motion.button>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding:'32px 56px', background:'#1a1714',
        borderTop:'1px solid rgba(240,235,224,0.07)',
        display:'flex', justifyContent:'space-between',
        alignItems:'center', flexWrap:'wrap', gap:16,
      }}>
        <div style={{ fontFamily:'var(--serif)', fontSize:17, fontWeight:500, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(240,235,224,0.45)' }}>Inspira</div>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'rgba(240,235,224,0.18)', letterSpacing:'0.15em', textTransform:'uppercase' }}>© 2026 · Computer Vision Research</div>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'rgba(240,235,224,0.18)', letterSpacing:'0.12em', textTransform:'uppercase' }}>3DGS · CLIP · LLaVA</div>
      </footer>
    </motion.div>
  )
}

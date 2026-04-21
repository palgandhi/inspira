import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform,
         AnimatePresence, useInView } from 'framer-motion'
import RoomScene from '../components/RoomScene'

/* ── Coords ── */
function Coords() {
  const [pos, setPos] = useState({ x:0, y:0 })
  useEffect(() => {
    const m = e => setPos({ x:e.clientX, y:e.clientY })
    window.addEventListener('mousemove', m)
    return () => window.removeEventListener('mousemove', m)
  }, [])
  return (
    <div style={{
      position:'fixed', bottom:24, right:32,
      fontFamily:'var(--mono)', fontSize:10,
      color:'rgba(255,255,255,0.2)', zIndex:50,
      letterSpacing:'0.12em', lineHeight:2,
      pointerEvents:'none', userSelect:'none',
    }}>
      <div>X: {String(pos.x).padStart(4,'0')}</div>
      <div>Y: {String(pos.y).padStart(4,'0')}</div>
    </div>
  )
}

/* ── Loader ── */
function Loader({ onDone }) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const start = Date.now(), dur = 1800
    const frame = () => {
      const p = Math.min(Math.round(((Date.now()-start)/dur)*100), 100)
      setPct(p)
      if (p < 100) requestAnimationFrame(frame)
      else setTimeout(onDone, 200)
    }
    requestAnimationFrame(frame)
  }, [onDone])
  return (
    <motion.div
      exit={{ opacity:0, transition:{ duration:0.6 } }}
      style={{
        position:'fixed', inset:0, background:'var(--bg)',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', zIndex:1000,
      }}
    >
      <motion.div
        animate={{ scale:[1, 1.01, 1] }}
        transition={{ repeat:Infinity, duration:1.5 }}
        style={{
          fontFamily:'var(--display)',
          fontSize:'clamp(100px,22vw,220px)',
          color:'var(--text)', lineHeight:1,
          letterSpacing:'-0.02em',
        }}
      >{pct}%</motion.div>
      <div style={{
        fontFamily:'var(--mono)', fontSize:10,
        color:'rgba(255,255,255,0.2)', marginTop:24,
        letterSpacing:'0.25em', textTransform:'uppercase',
      }}>Initialising Inspira</div>
      {/* Loading bar */}
      <div style={{
        position:'absolute', bottom:0, left:0,
        height:1, background:'var(--border)', width:'100%',
      }}>
        <motion.div style={{
          height:'100%', background:'var(--accent)',
          width:`${pct}%`, transition:'width 0.05s linear',
        }}/>
      </div>
    </motion.div>
  )
}

/* ── Ticker ── */
function Ticker({ items, speed=20 }) {
  return (
    <div style={{
      overflow:'hidden',
      borderTop:'1px solid var(--border)',
      borderBottom:'1px solid var(--border)',
      padding:'12px 0',
      background:'rgba(200,255,0,0.02)',
    }}>
      <motion.div
        animate={{ x:['0%','-50%'] }}
        transition={{ repeat:Infinity, duration:speed, ease:'linear' }}
        style={{ display:'flex', gap:56, whiteSpace:'nowrap', width:'max-content' }}
      >
        {[...items,...items].map((item,i) => (
          <span key={i} style={{
            fontFamily:'var(--mono)', fontSize:10,
            color:'rgba(255,255,255,0.22)', letterSpacing:'0.22em',
            textTransform:'uppercase',
          }}>
            {item}
            <span style={{color:'var(--accent)', marginLeft:40, opacity:0.6}}>×</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

/* ── Animated text reveal ── */
function RevealText({ children, delay=0, style={} }) {
  const ref = useRef()
  const inView = useInView(ref, { once:true, margin:'-80px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y:40 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:0.9, delay, ease:[0.16,1,0.3,1] }}
      style={style}
    >
      {children}
    </motion.div>
  )
}

/* ── Section ── */
function Section({ tag, children, style={} }) {
  return (
    <section style={{
      padding:'140px 48px',
      borderBottom:'1px solid var(--border)',
      ...style,
    }}>
      <div style={{
        fontFamily:'var(--mono)', fontSize:10,
        color:'rgba(255,255,255,0.2)', letterSpacing:'0.2em',
        textTransform:'uppercase', marginBottom:80,
      }}>[ {tag} ]</div>
      {children}
    </section>
  )
}

/* ── Main ── */
export default function LandingPage() {
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(false)
  const { scrollY } = useScroll()

  const heroOpacity = useTransform(scrollY, [0,500], [1,0])
  const heroScale   = useTransform(scrollY, [0,500], [1,0.96])
  const sceneY      = useTransform(scrollY, [0,600], [0,80])

  const handleDone = useCallback(() => setLoaded(true), [])

  const TICKER = [
    '3D Gaussian Splatting','CLIP Vision-Language','LLaVA 7B',
    'Grounded-SAM','COLMAP SfM','Depth Anything V2',
    'Three.js WebGL','FastAPI','Computer Vision 2026',
  ]

  if (!loaded) return (
    <AnimatePresence mode="wait">
      <Loader key="loader" onDone={handleDone}/>
    </AnimatePresence>
  )

  return (
    <motion.div
      initial={{ opacity:0 }}
      animate={{ opacity:1 }}
      transition={{ duration:0.6 }}
      style={{ background:'var(--bg)', minHeight:'100vh', color:'var(--text)' }}
    >
      <Coords/>

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y:-60, opacity:0 }}
        animate={{ y:0, opacity:1 }}
        transition={{ duration:0.7, delay:0.1 }}
        style={{
          position:'fixed', top:0, left:0, right:0, zIndex:100,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'18px 48px',
          borderBottom:'1px solid var(--border)',
          background:'rgba(8,8,9,0.92)',
          backdropFilter:'blur(20px)',
        }}
      >
        <div style={{
          fontFamily:'var(--display)', fontSize:22,
          letterSpacing:'0.08em', color:'var(--text)',
        }}>INSPIRA</div>

        <div style={{
          display:'flex', gap:48,
          fontFamily:'var(--mono)', fontSize:10,
          letterSpacing:'0.18em', textTransform:'uppercase',
        }}>
          {['About','How it works','Research'].map(item => (
            <a key={item} href="#" style={{
              color:'rgba(255,255,255,0.3)', textDecoration:'none',
              transition:'color 0.2s',
            }}
            onMouseEnter={e=>e.target.style.color='var(--text)'}
            onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.3)'}>
              {item}
            </a>
          ))}
        </div>

        <button onClick={()=>navigate('/upload')} style={{
          fontFamily:'var(--mono)', fontSize:10,
          letterSpacing:'0.18em', textTransform:'uppercase',
          color:'var(--bg)', background:'var(--accent)',
          border:'none', padding:'10px 28px', cursor:'none',
          transition:'opacity 0.15s',
        }}
        onMouseEnter={e=>e.currentTarget.style.opacity='0.85'}
        onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
          Try free →
        </button>
      </motion.nav>

      {/* ── Hero ── */}
      <motion.section style={{
        opacity: heroOpacity,
        scale:   heroScale,
        minHeight:'100vh',
        display:'grid',
        gridTemplateColumns:'1fr 1fr',
        alignItems:'center',
        padding:'100px 48px 60px',
        gap:0,
        position:'sticky', top:0, zIndex:1,
      }}>
        {/* Left — text */}
        <div style={{ position:'relative', zIndex:2 }}>
          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ duration:0.6, delay:0.2 }}
            style={{
              fontFamily:'var(--mono)', fontSize:10,
              color:'rgba(255,255,255,0.22)', letterSpacing:'0.2em',
              textTransform:'uppercase', marginBottom:48,
            }}
          >
            [ 3D Gaussian Splatting · Computer Vision ]
          </motion.div>

          <motion.h1
            initial={{ opacity:0, y:60 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:1, delay:0.25, ease:[0.16,1,0.3,1] }}
            style={{
              fontFamily:'var(--display)',
              fontSize:'clamp(60px,8vw,110px)',
              lineHeight:0.93,
              letterSpacing:'-0.01em',
              color:'var(--text)',
              marginBottom:44,
            }}
          >
            YOUR ROOM.<br/>
            <span style={{color:'var(--accent)'}}>REDESIGNED.</span><br/>
            IN 3D.
          </motion.h1>

          <motion.p
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.8, delay:0.5 }}
            style={{
              fontFamily:'var(--body)', fontSize:15,
              lineHeight:1.9, color:'rgba(255,255,255,0.48)',
              fontWeight:300, maxWidth:400, marginBottom:52,
            }}
          >
            Upload a Pinterest inspiration.
            Photograph your room. Inspira reconstructs
            your space in 3D and adapts the design
            to your actual dimensions — before you
            spend anything.
          </motion.p>

          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ duration:0.6, delay:0.7 }}
            style={{ display:'flex', alignItems:'center', gap:28 }}
          >
            <button onClick={()=>navigate('/upload')} style={{
              fontFamily:'var(--mono)', fontSize:11,
              letterSpacing:'0.18em', textTransform:'uppercase',
              color:'var(--bg)', background:'var(--accent)',
              border:'none', padding:'14px 36px', cursor:'none',
              transition:'opacity 0.15s',
            }}
            onMouseEnter={e=>e.currentTarget.style.opacity='0.85'}
            onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
              Start now →
            </button>
            <span style={{
              fontFamily:'var(--mono)', fontSize:10,
              color:'rgba(255,255,255,0.22)', letterSpacing:'0.12em',
            }}>Free · No signup</span>
          </motion.div>
        </div>

        {/* Right — 3D scene */}
        <motion.div
          style={{ y: sceneY }}
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          transition={{ duration:1.4, delay:0.3 }}
        >
          <div style={{
            height:520, position:'relative',
            border:'1px solid rgba(200,255,0,0.1)',
          }}>
            <RoomScene/>

            {/* Overlay labels */}
            <div style={{
              position:'absolute', top:16, left:16,
              fontFamily:'var(--mono)', fontSize:9,
              color:'rgba(200,255,0,0.4)', letterSpacing:'0.15em',
              pointerEvents:'none',
            }}>[ LIVE 3D RECONSTRUCTION ]</div>

            <div style={{
              position:'absolute', bottom:16, right:16,
              fontFamily:'var(--mono)', fontSize:9,
              color:'rgba(255,255,255,0.18)', letterSpacing:'0.12em',
              pointerEvents:'none',
            }}>~94K GAUSSIANS · ROTATING</div>

            {/* Corner decorations */}
            {[
              {top:0,left:0,borderTop:'1px solid var(--accent)',borderLeft:'1px solid var(--accent)',width:24,height:24},
              {top:0,right:0,borderTop:'1px solid var(--accent)',borderRight:'1px solid var(--accent)',width:24,height:24},
              {bottom:0,left:0,borderBottom:'1px solid var(--accent)',borderLeft:'1px solid var(--accent)',width:24,height:24},
              {bottom:0,right:0,borderBottom:'1px solid var(--accent)',borderRight:'1px solid var(--accent)',width:24,height:24},
            ].map((s,i) => (
              <div key={i} style={{position:'absolute', opacity:0.5, ...s}}/>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* Content below hero — positioned above sticky */}
      <div style={{ position:'relative', zIndex:2, background:'var(--bg)' }}>

        {/* ── Ticker ── */}
        <Ticker items={TICKER}/>

        {/* ── About ── */}
        <Section tag="About">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:80 }}>
            <RevealText>
              <h2 style={{
                fontFamily:'var(--display)',
                fontSize:'clamp(40px,5.5vw,80px)',
                lineHeight:1.0, color:'var(--text)',
                letterSpacing:'-0.01em',
              }}>
                THE GAP<br/>
                BETWEEN<br/>
                INSPIRATION<br/>
                AND REALITY<br/>
                IS OVER.
              </h2>
            </RevealText>

            <RevealText delay={0.15}>
              <p style={{
                fontFamily:'var(--body)', fontSize:15,
                lineHeight:1.95, color:'rgba(255,255,255,0.48)',
                fontWeight:300, marginBottom:56,
              }}>
                450 million people save interior design inspiration every month on Pinterest.
                Almost none of them successfully recreate it. The reason is not lack of
                taste — it is the impossibility of translating a 2D image into a real 3D
                space with real dimensions. Inspira solves that. Completely.
              </p>

              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:40 }}>
                {[
                  { n:'450M', label:'People searching for design inspiration monthly' },
                  { n:'94K',  label:'3D Gaussians per room reconstruction' },
                  { n:'< 60s', label:'Time to analyze an inspiration image' },
                  { n:'100%',  label:'Based on true room geometry' },
                ].map((s,i) => (
                  <motion.div key={i}
                    initial={{ opacity:0, y:20 }}
                    whileInView={{ opacity:1, y:0 }}
                    transition={{ duration:0.6, delay:i*0.1 }}
                    viewport={{ once:true }}
                    style={{ paddingTop:32, borderTop:'1px solid var(--border)' }}
                  >
                    <div style={{
                      fontFamily:'var(--display)',
                      fontSize:'clamp(36px,4vw,56px)',
                      color:'var(--accent)', lineHeight:1,
                      marginBottom:10,
                    }}>{s.n}</div>
                    <div style={{
                      fontFamily:'var(--body)', fontSize:12,
                      color:'rgba(255,255,255,0.38)',
                      lineHeight:1.6, fontWeight:300,
                    }}>{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </RevealText>
          </div>
        </Section>

        {/* ── Ticker 2 ── */}
        <Ticker items={['Upload inspiration','Reconstruct room','Adapt furniture',
                        'Explore in 3D','No guesswork','True geometry',
                        'AI-powered','Real dimensions']} speed={15}/>

        {/* ── How it works ── */}
        <Section tag="How it works">
          {[
            {
              n:'01',
              title:'UPLOAD YOUR\nINSPIRATION',
              body:'Any Pinterest screenshot or design photo. CLIP vision-language model detects every piece of furniture, extracts the colour palette, and identifies the interior style — automatically.',
              tags:['CLIP ViT-B/32','LLaVA 7B','Grounded-SAM'],
              accent:false,
            },
            {
              n:'02',
              title:'PHOTOGRAPH\nYOUR ROOM',
              body:'15–20 overlapping photos from different angles. Our 3D Gaussian Splatting pipeline reconstructs the true geometry of your space — not an estimate. Real dimensions. Real depth.',
              tags:['3DGS · COLMAP','Depth Anything V2','94K Gaussians'],
              accent:true,
            },
            {
              n:'03',
              title:'EXPLORE\nIN 3D',
              body:'Walk through your room furnished in the inspiration style. Every piece of furniture is correctly scaled to your actual dimensions. Toggle between empty and furnished.',
              tags:['Three.js · WebGL','FastAPI backend','Real-time render'],
              accent:false,
            },
          ].map((step,i) => (
            <motion.div key={i}
              initial={{ opacity:0 }}
              whileInView={{ opacity:1 }}
              transition={{ duration:0.8 }}
              viewport={{ once:true, margin:'-60px' }}
              style={{
                display:'grid',
                gridTemplateColumns:'160px 1fr 200px',
                gap:64,
                padding:'72px 0',
                borderTop:'1px solid var(--border)',
                alignItems:'start',
              }}
            >
              {/* Number */}
              <motion.div
                initial={{ opacity:0, x:-20 }}
                whileInView={{ opacity:1, x:0 }}
                transition={{ duration:0.7, delay:0.1 }}
                viewport={{ once:true }}
                style={{
                  fontFamily:'var(--display)',
                  fontSize:'clamp(80px,10vw,120px)',
                  color: step.accent ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                  lineHeight:1, letterSpacing:'-0.02em',
                  transition:'color 0.3s',
                }}
              >{step.n}</motion.div>

              {/* Content */}
              <div>
                <motion.h3
                  initial={{ opacity:0, y:20 }}
                  whileInView={{ opacity:1, y:0 }}
                  transition={{ duration:0.7, delay:0.15 }}
                  viewport={{ once:true }}
                  style={{
                    fontFamily:'var(--display)',
                    fontSize:'clamp(30px,4vw,52px)',
                    color:'var(--text)', marginBottom:24,
                    lineHeight:1.0, letterSpacing:'-0.01em',
                    whiteSpace:'pre-line',
                  }}
                >{step.title}</motion.h3>
                <motion.p
                  initial={{ opacity:0 }}
                  whileInView={{ opacity:1 }}
                  transition={{ duration:0.7, delay:0.25 }}
                  viewport={{ once:true }}
                  style={{
                    fontFamily:'var(--body)', fontSize:14,
                    lineHeight:1.9, color:'rgba(255,255,255,0.45)',
                    fontWeight:300, maxWidth:480,
                  }}
                >{step.body}</motion.p>
              </div>

              {/* Tags */}
              <motion.div
                initial={{ opacity:0 }}
                whileInView={{ opacity:1 }}
                transition={{ duration:0.6, delay:0.3 }}
                viewport={{ once:true }}
                style={{ paddingTop:8 }}
              >
                {step.tags.map((t,j) => (
                  <div key={j} style={{
                    fontFamily:'var(--mono)', fontSize:9,
                    color: step.accent ? 'rgba(200,255,0,0.5)' : 'rgba(255,255,255,0.2)',
                    letterSpacing:'0.15em', textTransform:'uppercase',
                    padding:'6px 0',
                    borderBottom:'1px solid var(--border)',
                    marginBottom:8,
                  }}>{t}</div>
                ))}
              </motion.div>
            </motion.div>
          ))}
          <div style={{ borderTop:'1px solid var(--border)' }}/>
        </Section>

        {/* ── Tech stack ── */}
        <section style={{
          padding:'80px 48px',
          borderBottom:'1px solid var(--border)',
          display:'grid',
          gridTemplateColumns:'160px 1fr',
          gap:64, alignItems:'center',
        }}>
          <div style={{
            fontFamily:'var(--mono)', fontSize:10,
            color:'rgba(255,255,255,0.2)', letterSpacing:'0.2em',
            textTransform:'uppercase',
          }}>[ Stack ]</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {[
              '3D Gaussian Splatting','CLIP ViT-B/32','LLaVA 7B',
              'Grounded-SAM','Depth Anything V2','COLMAP',
              'Three.js','FastAPI','React 18','Python 3.11',
            ].map(t => (
              <motion.div key={t}
                whileHover={{ borderColor:'var(--accent)', color:'var(--accent)' }}
                transition={{ duration:0.15 }}
                style={{
                  fontFamily:'var(--mono)', fontSize:10,
                  color:'rgba(255,255,255,0.35)',
                  letterSpacing:'0.12em', textTransform:'uppercase',
                  padding:'7px 16px',
                  border:'1px solid rgba(255,255,255,0.08)',
                  cursor:'none',
                }}
              >{t}</motion.div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ padding:'160px 48px' }}>
          <RevealText>
            <div style={{
              display:'grid',
              gridTemplateColumns:'1fr auto',
              alignItems:'flex-end', gap:80,
            }}>
              <h2 style={{
                fontFamily:'var(--display)',
                fontSize:'clamp(56px,9vw,130px)',
                lineHeight:0.93, color:'var(--text)',
                letterSpacing:'-0.01em',
              }}>
                SEE YOUR<br/>
                ROOM IN 3D.<br/>
                <motion.span
                  animate={{ color:['#c8ff00','#ffffff','#c8ff00'] }}
                  transition={{ repeat:Infinity, duration:3 }}
                >NOW.</motion.span>
              </h2>

              <div style={{ paddingBottom:8 }}>
                <motion.button
                  onClick={()=>navigate('/upload')}
                  whileHover={{ scale:1.02 }}
                  whileTap={{ scale:0.98 }}
                  style={{
                    fontFamily:'var(--mono)', fontSize:11,
                    letterSpacing:'0.2em', textTransform:'uppercase',
                    color:'var(--bg)', background:'var(--accent)',
                    border:'none', padding:'18px 48px',
                    cursor:'none', display:'block', marginBottom:16,
                  }}
                >Start for free →</motion.button>
                <div style={{
                  fontFamily:'var(--mono)', fontSize:10,
                  color:'rgba(255,255,255,0.2)',
                  letterSpacing:'0.12em', textAlign:'center',
                }}>No account needed</div>
              </div>
            </div>
          </RevealText>
        </section>

        {/* ── Footer ── */}
        <footer style={{
          padding:'28px 48px',
          borderTop:'1px solid var(--border)',
          display:'flex', justifyContent:'space-between',
          alignItems:'center', flexWrap:'wrap', gap:16,
        }}>
          <div style={{
            fontFamily:'var(--display)', fontSize:18,
            letterSpacing:'0.08em', color:'var(--text)',
          }}>INSPIRA</div>
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

import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform,
         AnimatePresence, useInView } from 'framer-motion'
import RoomScene from '../components/RoomScene'

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
      color:'rgba(255,255,255,0.18)', zIndex:50,
      letterSpacing:'0.12em', lineHeight:2,
      pointerEvents:'none', userSelect:'none',
    }}>
      <div>X: {String(pos.x).padStart(4,'0')}</div>
      <div>Y: {String(pos.y).padStart(4,'0')}</div>
    </div>
  )
}

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
    <motion.div exit={{ opacity:0 }} transition={{ duration:0.6 }}
      style={{
        position:'fixed', inset:0, background:'var(--bg)',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', zIndex:1000,
      }}
    >
      <div style={{
        fontFamily:'var(--display)',
        fontSize:'clamp(120px,25vw,260px)',
        color:'var(--text)', lineHeight:1,
        letterSpacing:'-0.02em',
      }}>{pct}%</div>
      <div style={{
        fontFamily:'var(--mono)', fontSize:10,
        color:'rgba(255,255,255,0.2)', marginTop:24,
        letterSpacing:'0.25em', textTransform:'uppercase',
      }}>Initialising Inspira</div>
      <div style={{
        position:'absolute', bottom:0, left:0, right:0,
        height:1, background:'var(--border)',
      }}>
        <div style={{
          height:'100%', background:'var(--accent)',
          width:`${pct}%`, transition:'width 0.05s linear',
        }}/>
      </div>
    </motion.div>
  )
}

function Ticker({ items, speed=22 }) {
  return (
    <div style={{
      overflow:'hidden',
      borderTop:'1px solid var(--border)',
      borderBottom:'1px solid var(--border)',
      padding:'13px 0',
      background:'rgba(200,255,0,0.015)',
    }}>
      <motion.div
        animate={{ x:['0%','-50%'] }}
        transition={{ repeat:Infinity, duration:speed, ease:'linear' }}
        style={{ display:'flex', gap:64, whiteSpace:'nowrap', width:'max-content' }}
      >
        {[...items,...items].map((item,i) => (
          <span key={i} style={{
            fontFamily:'var(--mono)', fontSize:10,
            color:'rgba(255,255,255,0.2)', letterSpacing:'0.22em',
            textTransform:'uppercase',
          }}>
            {item}
            <span style={{color:'var(--accent)',marginLeft:48,opacity:0.5}}>·</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

function RevealText({ children, delay=0, style={} }) {
  const ref = useRef()
  const inView = useInView(ref, { once:true, margin:'-80px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y:40 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:0.9, delay, ease:[0.16,1,0.3,1] }}
      style={style}
    >{children}</motion.div>
  )
}

export default function LandingPage() {
  const navigate  = useNavigate()
  const [loaded, setLoaded] = useState(false)
  const { scrollY } = useScroll()

  const heroOpacity = useTransform(scrollY, [0,500], [1,0])
  const heroY       = useTransform(scrollY, [0,500], [0,-60])
  const sceneScale  = useTransform(scrollY, [0,400], [1,1.06])

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
      transition={{ duration:0.5 }}
      style={{ background:'var(--bg)', minHeight:'100vh', color:'var(--text)' }}
    >
      <Coords/>

      {/* Navbar */}
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
          letterSpacing:'0.08em',
        }}>INSPIRA</div>

        <div style={{
          display:'flex', gap:48,
          fontFamily:'var(--mono)', fontSize:10,
          letterSpacing:'0.18em', textTransform:'uppercase',
          color:'rgba(255,255,255,0.28)',
        }}>
          {['About','How it works','Research'].map(item => (
            <a key={item} href="#" style={{
              color:'inherit', textDecoration:'none', transition:'color 0.2s',
            }}
            onMouseEnter={e=>e.target.style.color='var(--text)'}
            onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.28)'}>
              {item}
            </a>
          ))}
        </div>

        <button onClick={()=>navigate('/upload')} style={{
          fontFamily:'var(--mono)', fontSize:10,
          letterSpacing:'0.18em', textTransform:'uppercase',
          color:'var(--bg)', background:'var(--accent)',
          border:'none', padding:'10px 28px', cursor:'none',
        }}>Try free →</button>
      </motion.nav>

      {/* ── HERO ── */}
      <motion.section
        style={{ opacity:heroOpacity, y:heroY }}
        className="hero-section"
      >
        {/* Full-screen 3D background */}
        <motion.div
          style={{
            position:'absolute', inset:0, zIndex:0,
            scale: sceneScale,
          }}
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          transition={{ duration:2, delay:0.2 }}
        >
          <RoomScene/>
          {/* Dark vignette over 3D so text is readable */}
          <div style={{
            position:'absolute', inset:0,
            background:`
              radial-gradient(ellipse 60% 100% at 30% 50%,
                rgba(8,8,9,0.96) 0%,
                rgba(8,8,9,0.7) 55%,
                rgba(8,8,9,0.1) 100%)
            `,
          }}/>
        </motion.div>

        {/* Hero content — over 3D */}
        <div style={{
          position:'relative', zIndex:1,
          display:'flex', flexDirection:'column',
          justifyContent:'flex-end',
          height:'100%',
          padding:'0 48px 80px',
        }}>
          {/* Tag */}
          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ duration:0.7, delay:0.3 }}
            style={{
              fontFamily:'var(--mono)', fontSize:10,
              color:'rgba(255,255,255,0.22)', letterSpacing:'0.2em',
              textTransform:'uppercase', marginBottom:32,
            }}
          >[ 3D Gaussian Splatting · Computer Vision · 2026 ]</motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity:0, y:60 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:1, delay:0.35, ease:[0.16,1,0.3,1] }}
            style={{
              fontFamily:'var(--display)',
              fontSize:'clamp(80px,12vw,160px)',
              lineHeight:0.9,
              letterSpacing:'-0.01em',
              marginBottom:40,
              maxWidth:'60vw',
            }}
          >
            YOUR ROOM.<br/>
            <span style={{color:'var(--accent)'}}>REDESIGNED.</span><br/>
            IN 3D.
          </motion.h1>

          {/* Bottom row — description + CTA */}
          <motion.div
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.8, delay:0.6 }}
            style={{
              display:'flex', alignItems:'flex-end',
              justifyContent:'space-between', flexWrap:'wrap', gap:40,
            }}
          >
            <p style={{
              fontFamily:'var(--body)', fontSize:15,
              lineHeight:1.85, color:'rgba(255,255,255,0.45)',
              fontWeight:300, maxWidth:380,
            }}>
              Upload a Pinterest inspiration.
              Photograph your room.
              Inspira reconstructs your space in 3D
              and adapts the design to your actual
              dimensions — before you spend anything.
            </p>

            <div style={{ display:'flex', flexDirection:'column',
                          alignItems:'flex-start', gap:16 }}>
              <button onClick={()=>navigate('/upload')} style={{
                fontFamily:'var(--mono)', fontSize:11,
                letterSpacing:'0.2em', textTransform:'uppercase',
                color:'var(--bg)', background:'var(--accent)',
                border:'none', padding:'16px 44px', cursor:'none',
                transition:'opacity 0.15s',
              }}
              onMouseEnter={e=>e.currentTarget.style.opacity='0.85'}
              onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                Start now →
              </button>
              <span style={{
                fontFamily:'var(--mono)', fontSize:10,
                color:'rgba(255,255,255,0.2)', letterSpacing:'0.12em',
              }}>Free · No signup required</span>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <div style={{
            position:'absolute', bottom:40, left:'50%',
            transform:'translateX(-50%)',
            display:'flex', flexDirection:'column',
            alignItems:'center', gap:10,
            fontFamily:'var(--mono)', fontSize:10,
            color:'rgba(255,255,255,0.2)',
            letterSpacing:'0.2em', textTransform:'uppercase',
          }}>
            <span>Scroll</span>
            <motion.div
              animate={{ y:[0,10,0] }}
              transition={{ repeat:Infinity, duration:2.5 }}
              style={{ width:1, height:40, background:'rgba(255,255,255,0.15)' }}
            />
          </div>
        </div>

        {/* 3D info overlay — top right */}
        <motion.div
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          transition={{ duration:1, delay:0.8 }}
          style={{
            position:'absolute', top:100, right:48,
            zIndex:2, textAlign:'right',
          }}
        >
          <div style={{
            fontFamily:'var(--mono)', fontSize:9,
            color:'rgba(200,255,0,0.35)', letterSpacing:'0.15em',
            textTransform:'uppercase', lineHeight:2.2,
          }}>
            <div>[ LIVE 3D RECONSTRUCTION ]</div>
            <div style={{color:'rgba(255,255,255,0.15)'}}>~94K GAUSSIANS</div>
            <div style={{color:'rgba(255,255,255,0.15)'}}>ROTATING · REAL-TIME</div>
          </div>
        </motion.div>
      </motion.section>

      {/* Content */}
      <div style={{ position:'relative', zIndex:2, background:'var(--bg)' }}>
        <Ticker items={TICKER}/>

        {/* ── About ── */}
        <section style={{
          padding:'140px 48px',
          borderBottom:'1px solid var(--border)',
        }}>
          <div style={{
            fontFamily:'var(--mono)', fontSize:10,
            color:'rgba(255,255,255,0.2)', letterSpacing:'0.2em',
            textTransform:'uppercase', marginBottom:80,
          }}>[ About ]</div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:80 }}>
            <RevealText>
              <h2 style={{
                fontFamily:'var(--display)',
                fontSize:'clamp(44px,6vw,88px)',
                lineHeight:0.97, color:'var(--text)',
                letterSpacing:'-0.01em',
              }}>
                THE GAP<br/>BETWEEN<br/>INSPIRATION<br/>AND REALITY<br/>IS OVER.
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
                space with real dimensions. Inspira solves that.
              </p>

              <div style={{
                display:'grid', gridTemplateColumns:'1fr 1fr', gap:0,
              }}>
                {[
                  { n:'450M', label:'Design saves per month on Pinterest' },
                  { n:'94K',  label:'Gaussians per room reconstruction' },
                  { n:'< 60s', label:'To analyze an inspiration image' },
                  { n:'True', label:'Room geometry — not an estimate' },
                ].map((s,i) => (
                  <motion.div key={i}
                    initial={{ opacity:0, y:20 }}
                    whileInView={{ opacity:1, y:0 }}
                    transition={{ duration:0.6, delay:i*0.08 }}
                    viewport={{ once:true }}
                    style={{
                      padding:'32px 0',
                      borderTop:'1px solid var(--border)',
                      borderRight: i%2===0 ? '1px solid var(--border)' : 'none',
                      paddingRight: i%2===0 ? 32 : 0,
                      paddingLeft:  i%2===1 ? 32 : 0,
                    }}
                  >
                    <div style={{
                      fontFamily:'var(--display)',
                      fontSize:'clamp(40px,5vw,64px)',
                      color:'var(--accent)', lineHeight:1, marginBottom:10,
                    }}>{s.n}</div>
                    <div style={{
                      fontFamily:'var(--body)', fontSize:12,
                      color:'rgba(255,255,255,0.35)',
                      lineHeight:1.6, fontWeight:300,
                    }}>{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </RevealText>
          </div>
        </section>

        <Ticker items={['Upload inspiration','Reconstruct room',
                        'Adapt furniture','Explore in 3D',
                        'No guesswork','True geometry',
                        'AI-powered','Real dimensions']} speed={16}/>

        {/* ── How it works ── */}
        <section style={{ padding:'140px 48px', borderBottom:'1px solid var(--border)' }}>
          <div style={{
            fontFamily:'var(--mono)', fontSize:10,
            color:'rgba(255,255,255,0.2)', letterSpacing:'0.2em',
            textTransform:'uppercase', marginBottom:100,
          }}>[ How it works ]</div>

          {[
            {
              n:'01', accent:false,
              title:'UPLOAD YOUR\nINSPIRATION',
              body:'Any Pinterest screenshot or design photo. CLIP vision-language model detects every piece of furniture, extracts the colour palette, and identifies the interior style — automatically.',
              tags:['CLIP ViT-B/32','LLaVA 7B','Grounded-SAM'],
            },
            {
              n:'02', accent:true,
              title:'PHOTOGRAPH\nYOUR ROOM',
              body:'15–20 overlapping photos from different angles. Our 3D Gaussian Splatting pipeline reconstructs the true geometry of your space — not an estimate. Real dimensions. Real depth.',
              tags:['3DGS · COLMAP','Depth Anything V2','94K Gaussians'],
            },
            {
              n:'03', accent:false,
              title:'EXPLORE\nIN 3D',
              body:'Walk through your room furnished in the inspiration style. Every piece of furniture is correctly scaled to your actual dimensions. Toggle between empty and furnished view.',
              tags:['Three.js · WebGL','FastAPI backend','Real-time render'],
            },
          ].map((step,i) => (
            <motion.div key={i}
              initial={{ opacity:0 }}
              whileInView={{ opacity:1 }}
              transition={{ duration:0.8 }}
              viewport={{ once:true, margin:'-60px' }}
              style={{
                display:'grid',
                gridTemplateColumns:'140px 1fr 180px',
                gap:64, padding:'72px 0',
                borderTop:'1px solid var(--border)',
                alignItems:'start',
              }}
            >
              <motion.div
                initial={{ opacity:0 }}
                whileInView={{ opacity:1 }}
                transition={{ duration:0.7 }}
                viewport={{ once:true }}
                style={{
                  fontFamily:'var(--display)',
                  fontSize:'clamp(72px,9vw,110px)',
                  color: step.accent
                    ? 'var(--accent)'
                    : 'rgba(255,255,255,0.05)',
                  lineHeight:1, letterSpacing:'-0.02em',
                }}
              >{step.n}</motion.div>

              <div>
                <motion.h3
                  initial={{ opacity:0, y:24 }}
                  whileInView={{ opacity:1, y:0 }}
                  transition={{ duration:0.7, delay:0.1 }}
                  viewport={{ once:true }}
                  style={{
                    fontFamily:'var(--display)',
                    fontSize:'clamp(32px,4vw,56px)',
                    color:'var(--text)', marginBottom:24,
                    lineHeight:1.0, letterSpacing:'-0.01em',
                    whiteSpace:'pre-line',
                  }}
                >{step.title}</motion.h3>
                <motion.p
                  initial={{ opacity:0 }}
                  whileInView={{ opacity:1 }}
                  transition={{ duration:0.7, delay:0.2 }}
                  viewport={{ once:true }}
                  style={{
                    fontFamily:'var(--body)', fontSize:14,
                    lineHeight:1.9, color:'rgba(255,255,255,0.42)',
                    fontWeight:300, maxWidth:500,
                  }}
                >{step.body}</motion.p>
              </div>

              <motion.div
                initial={{ opacity:0 }}
                whileInView={{ opacity:1 }}
                transition={{ duration:0.6, delay:0.25 }}
                viewport={{ once:true }}
                style={{ paddingTop:8 }}
              >
                {step.tags.map((t,j) => (
                  <div key={j} style={{
                    fontFamily:'var(--mono)', fontSize:9,
                    color: step.accent
                      ? 'rgba(200,255,0,0.45)'
                      : 'rgba(255,255,255,0.18)',
                    letterSpacing:'0.15em', textTransform:'uppercase',
                    padding:'8px 0',
                    borderBottom:'1px solid var(--border)',
                    marginBottom:4,
                  }}>{t}</div>
                ))}
              </motion.div>
            </motion.div>
          ))}
          <div style={{ borderTop:'1px solid var(--border)'}}/>
        </section>

        {/* ── Stack ── */}
        <section style={{
          padding:'72px 48px',
          borderBottom:'1px solid var(--border)',
          display:'grid', gridTemplateColumns:'140px 1fr',
          gap:64, alignItems:'center',
        }}>
          <div style={{
            fontFamily:'var(--mono)', fontSize:10,
            color:'rgba(255,255,255,0.18)', letterSpacing:'0.2em',
            textTransform:'uppercase',
          }}>[ Stack ]</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {[
              '3D Gaussian Splatting','CLIP ViT-B/32','LLaVA 7B',
              'Grounded-SAM','Depth Anything V2','COLMAP',
              'Three.js','FastAPI','React 18','Python 3.11',
            ].map(t => (
              <motion.div key={t}
                whileHover={{
                  borderColor:'rgba(200,255,0,0.5)',
                  color:'var(--accent)',
                }}
                transition={{ duration:0.15 }}
                style={{
                  fontFamily:'var(--mono)', fontSize:9,
                  color:'rgba(255,255,255,0.3)',
                  letterSpacing:'0.12em', textTransform:'uppercase',
                  padding:'7px 16px',
                  border:'1px solid rgba(255,255,255,0.07)',
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
              display:'flex', alignItems:'flex-end',
              justifyContent:'space-between', gap:80, flexWrap:'wrap',
            }}>
              <h2 style={{
                fontFamily:'var(--display)',
                fontSize:'clamp(64px,10vw,140px)',
                lineHeight:0.92, color:'var(--text)',
                letterSpacing:'-0.01em',
              }}>
                SEE YOUR<br/>
                ROOM IN 3D.<br/>
                <motion.span
                  animate={{ color:['#c8ff00','rgba(255,255,255,0.9)','#c8ff00'] }}
                  transition={{ repeat:Infinity, duration:3, ease:'easeInOut' }}
                >NOW.</motion.span>
              </h2>

              <div style={{ paddingBottom:12 }}>
                <motion.button
                  onClick={()=>navigate('/upload')}
                  whileHover={{ opacity:0.85 }}
                  style={{
                    fontFamily:'var(--mono)', fontSize:11,
                    letterSpacing:'0.2em', textTransform:'uppercase',
                    color:'var(--bg)', background:'var(--accent)',
                    border:'none', padding:'18px 52px',
                    cursor:'none', display:'block', marginBottom:14,
                  }}
                >Start for free →</motion.button>
                <div style={{
                  fontFamily:'var(--mono)', fontSize:10,
                  color:'rgba(255,255,255,0.18)',
                  letterSpacing:'0.12em', textAlign:'center',
                }}>No account needed</div>
              </div>
            </div>
          </RevealText>
        </section>

        {/* Footer */}
        <footer style={{
          padding:'28px 48px',
          borderTop:'1px solid var(--border)',
          display:'flex', justifyContent:'space-between',
          alignItems:'center', flexWrap:'wrap', gap:16,
        }}>
          <div style={{
            fontFamily:'var(--display)', fontSize:18,
            letterSpacing:'0.08em',
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

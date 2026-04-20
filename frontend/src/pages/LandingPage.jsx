import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'

/* ── Coordinates overlay (darknode's X: Y: readout) ── */
function Coords() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const move = e => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 32,
      fontFamily: 'var(--mono)', fontSize: 11,
      color: 'var(--muted)', zIndex: 50,
      letterSpacing: '0.1em', lineHeight: 1.8,
      pointerEvents: 'none',
    }}>
      <div>X: {String(pos.x).padStart(4, '0')}</div>
      <div>Y: {String(pos.y).padStart(4, '0')}</div>
    </div>
  )
}

/* ── Loading screen ── */
function Loader({ onDone }) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const dur   = 1800
    const frame = () => {
      const elapsed = Date.now() - start
      const p = Math.min(Math.round((elapsed / dur) * 100), 100)
      setPct(p)
      if (p < 100) requestAnimationFrame(frame)
      else setTimeout(onDone, 200)
    }
    requestAnimationFrame(frame)
  }, [onDone])

  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed', inset: 0, background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{
        fontFamily: 'var(--display)',
        fontSize: 'clamp(80px, 20vw, 180px)',
        color: 'var(--text)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        {pct}%
      </div>
      <div style={{
        fontFamily: 'var(--mono)',
        fontSize: 11,
        color: 'var(--muted)',
        marginTop: 16,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
      }}>
        Loading Inspira
      </div>
    </motion.div>
  )
}

/* ── Main ── */
export default function LandingPage() {
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(false)
  const { scrollY } = useScroll()

  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])
  const heroY       = useTransform(scrollY, [0, 400], [0, -60])

  if (!loaded) {
    return <Loader onDone={() => setLoaded(true)} />
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Coords />

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(8,8,9,0.85)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          fontFamily: 'var(--display)',
          fontSize: 24,
          letterSpacing: '0.05em',
          color: 'var(--text)',
        }}>
          INSPIRA
        </div>

        <div style={{
          display: 'flex', gap: 40,
          fontFamily: 'var(--mono)',
          fontSize: 11,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}>
          {['About', 'How it works', 'Research'].map(item => (
            <a key={item} href="#"
              style={{ color: 'inherit', textDecoration: 'none',
                       transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'var(--text)'}
              onMouseLeave={e => e.target.style.color = 'var(--muted)'}
            >
              {item}
            </a>
          ))}
        </div>

        <button
          onClick={() => navigate('/upload')}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--bg)',
            background: 'var(--accent)',
            border: 'none',
            padding: '10px 24px',
            cursor: 'none',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Try free →
        </button>
      </nav>

      {/* ── Hero ── */}
      <motion.section
        style={{
          opacity: heroOpacity,
          y: heroY,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 40px 80px',
          paddingTop: 80,
          position: 'relative',
        }}
      >
        {/* Top-left tag */}
        <div style={{
          position: 'absolute', top: 100, left: 40,
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--muted)', letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          [ 3D Gaussian Splatting · Computer Vision ]
        </div>

        {/* Top-right tag */}
        <div style={{
          position: 'absolute', top: 100, right: 40,
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--muted)', letterSpacing: '0.15em',
        }}>
          v1.0 — 2026
        </div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1 }}
        >
          <div style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(72px, 12vw, 180px)',
            lineHeight: 0.92,
            letterSpacing: '-0.01em',
            color: 'var(--text)',
            maxWidth: '90vw',
            marginBottom: 48,
          }}>
            YOUR ROOM.<br />
            <span style={{ color: 'var(--accent)' }}>REDESIGNED.</span><br />
            IN 3D.
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 32,
          }}>
            <p style={{
              fontFamily: 'var(--body)',
              fontSize: 16,
              lineHeight: 1.7,
              color: 'var(--muted)',
              maxWidth: 420,
              fontWeight: 300,
            }}>
              Upload a design inspiration image.
              Photograph your room.
              Inspira reconstructs your space in 3D
              and adapts the design to your actual dimensions —
              before you spend anything.
            </p>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <button
                onClick={() => navigate('/upload')}
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--bg)',
                  background: 'var(--accent)',
                  border: 'none',
                  padding: '16px 40px',
                  cursor: 'none',
                  transition: 'opacity 0.2s',
                }}
              >
                Start now →
              </button>
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--muted)',
                letterSpacing: '0.1em',
              }}>
                Free · No signup
              </span>
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 40, left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--mono)', fontSize: 10,
          color: 'var(--muted)', letterSpacing: '0.2em',
          textTransform: 'uppercase',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 8,
        }}>
          <span>scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ width: 1, height: 40, background: 'var(--muted)' }}
          />
        </div>
      </motion.section>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'var(--border)', margin: '0 40px' }} />

      {/* ── About section ── */}
      <section style={{ padding: '120px 40px' }}>
        <div style={{ display: 'flex', gap: 80, alignItems: 'flex-start',
                      flexWrap: 'wrap' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 11,
            color: 'var(--muted)', letterSpacing: '0.15em',
            textTransform: 'uppercase', paddingTop: 8,
            minWidth: 140,
          }}>
            [ About ]
          </div>

          <div style={{ flex: 1, minWidth: 300 }}>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              style={{
                fontFamily: 'var(--display)',
                fontSize: 'clamp(40px, 6vw, 80px)',
                lineHeight: 1.0,
                color: 'var(--text)',
                marginBottom: 40,
                letterSpacing: '-0.01em',
              }}
            >
              THE GAP BETWEEN<br />
              INSPIRATION AND<br />
              REALITY IS OVER.
            </motion.h2>

            <p style={{
              fontFamily: 'var(--body)', fontSize: 16,
              lineHeight: 1.8, color: 'var(--muted)',
              fontWeight: 300, maxWidth: 560,
            }}>
              450 million people save interior design inspiration every month on Pinterest.
              Almost none of them successfully recreate it. The reason is not lack of taste —
              it is the impossibility of translating a 2D image into a real 3D space.
              Inspira solves that. Completely.
            </p>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'var(--border)', margin: '0 40px' }} />

      {/* ── How it works ── */}
      <section style={{ padding: '120px 40px' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--muted)', letterSpacing: '0.15em',
          textTransform: 'uppercase', marginBottom: 80,
        }}>
          [ How it works ]
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            {
              n: '01',
              title: 'Upload your inspiration',
              body: 'Any Pinterest screenshot or design photo. CLIP vision-language model detects every piece of furniture, extracts the colour palette, and identifies the interior style — automatically.',
              tag: 'CLIP · LLaVA 7B',
            },
            {
              n: '02',
              title: 'Photograph your room',
              body: '15–20 overlapping photos from different angles. Our 3D Gaussian Splatting pipeline reconstructs the true geometry of your space — not an estimate. Real dimensions, real depth.',
              tag: '3DGS · COLMAP · Grounded-SAM',
            },
            {
              n: '03',
              title: 'Explore in 3D',
              body: 'Walk through your room furnished in the inspiration style. Every piece of furniture is correctly scaled to your actual dimensions. Toggle between empty and furnished.',
              tag: 'Three.js · WebGL',
            },
          ].map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr auto',
                gap: 48,
                padding: '56px 0',
                borderTop: '1px solid var(--border)',
                alignItems: 'start',
              }}
            >
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                color: 'var(--muted)',
                paddingTop: 6,
                letterSpacing: '0.1em',
              }}>
                [{step.n}]
              </div>

              <div>
                <h3 style={{
                  fontFamily: 'var(--display)',
                  fontSize: 'clamp(28px, 4vw, 52px)',
                  color: 'var(--text)',
                  marginBottom: 20,
                  lineHeight: 1.05,
                  letterSpacing: '-0.01em',
                }}>
                  {step.title.toUpperCase()}
                </h3>
                <p style={{
                  fontFamily: 'var(--body)',
                  fontSize: 15,
                  lineHeight: 1.8,
                  color: 'var(--muted)',
                  fontWeight: 300,
                  maxWidth: 520,
                }}>
                  {step.body}
                </p>
              </div>

              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                paddingTop: 8,
                textAlign: 'right',
                minWidth: 160,
              }}>
                {step.tag}
              </div>
            </motion.div>
          ))}

          {/* Last border */}
          <div style={{ borderTop: '1px solid var(--border)' }} />
        </div>
      </section>

      {/* ── Tech ── */}
      <section style={{
        padding: '80px 40px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 40,
        flexWrap: 'wrap',
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--muted)', letterSpacing: '0.15em',
          textTransform: 'uppercase', minWidth: 120,
        }}>
          [ Stack ]
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1 }}>
          {[
            '3D Gaussian Splatting',
            'CLIP ViT-B/32',
            'LLaVA 7B',
            'Grounded-SAM',
            'Depth Anything V2',
            'COLMAP',
            'Three.js',
            'FastAPI',
          ].map(t => (
            <div key={t} style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--muted)',
              letterSpacing: '0.1em',
              padding: '8px 16px',
              border: '1px solid var(--border)',
              textTransform: 'uppercase',
            }}>
              {t}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        padding: '160px 40px',
        borderTop: '1px solid var(--border)',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(60px, 10vw, 140px)',
            lineHeight: 0.95,
            color: 'var(--text)',
            marginBottom: 64,
            letterSpacing: '-0.01em',
          }}>
            SEE YOUR<br />
            ROOM IN 3D.<br />
            <span style={{ color: 'var(--accent)' }}>NOW.</span>
          </div>

          <button
            onClick={() => navigate('/upload')}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 13,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--bg)',
              background: 'var(--accent)',
              border: 'none',
              padding: '20px 60px',
              cursor: 'none',
              display: 'inline-block',
            }}
          >
            Start for free →
          </button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: '32px 40px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{
          fontFamily: 'var(--display)',
          fontSize: 20,
          letterSpacing: '0.05em',
          color: 'var(--text)',
        }}>
          INSPIRA
        </div>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--muted)',
          letterSpacing: '0.1em',
        }}>
          © 2026 · Computer Vision Research
        </div>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--muted)',
          letterSpacing: '0.1em',
        }}>
          Built on 3DGS + CLIP + LLaVA
        </div>
      </footer>
    </div>
  )
}

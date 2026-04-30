import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getHistory } from '../services/api';

/* ── Custom Cursor ── */
function Cursor() {
  const mx = useMotionValue(-80);
  const my = useMotionValue(-80);
  const ox = useSpring(mx, { stiffness: 60, damping: 18 });
  const oy = useSpring(my, { stiffness: 60, damping: 18 });
  const ix = useSpring(mx, { stiffness: 500, damping: 32 });
  const iy = useSpring(my, { stiffness: 500, damping: 32 });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const m = e => { mx.set(e.clientX); my.set(e.clientY) };
    const ov = e => { if (e.target.closest('button,a,label,input,.history-card')) setHovered(true) };
    const out = e => { if (e.target.closest('button,a,label,input,.history-card')) setHovered(false) };
    window.addEventListener('mousemove', m);
    window.addEventListener('mouseover', ov);
    window.addEventListener('mouseout', out);
    return () => {
      window.removeEventListener('mousemove', m);
      window.removeEventListener('mouseover', ov);
      window.removeEventListener('mouseout', out);
    };
  }, []);

  const cursorContent = (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
      <motion.div
        animate={{ scale: hovered ? 1.8 : 1 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'fixed', zIndex: 9999,
          width: 40, height: 40, borderRadius: '50%',
          border: '1.5px solid rgba(245,240,232,0.7)',
          pointerEvents: 'none',
          x: ox, y: oy,
          translateX: '-50%', translateY: '-50%',
          mixBlendMode: 'difference',
        }}
      />
      <motion.div style={{
        position: 'fixed', zIndex: 9999,
        width: 6, height: 6, borderRadius: '50%',
        background: 'rgba(245,240,232,0.9)',
        pointerEvents: 'none',
        x: ix, y: iy,
        translateX: '-50%', translateY: '-50%',
        mixBlendMode: 'difference',
      }} />
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(cursorContent, document.body) : null;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await getHistory();
        setHistoryData(data);
      } catch (error) {
        console.error("Failed to load history", error);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const handleCardClick = (job) => {
    if (job.status === 'processing') {
      navigate('/processing', { state: { job_id: job.job_id } });
    } else {
      navigate('/result', { state: { job_id: job.job_id } });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: '#1c1510', color: '#f0ebe0', minHeight: '100vh',
        position: 'relative', overflowX: 'hidden'
      }}
    >
      <Cursor />

      {/* Decorative Background Elements */}
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(196,168,130,0.03) 0%, transparent 60%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.1 }}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '28px 56px',
        }}
      >
        <div 
          onClick={() => navigate('/')}
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 400,
            letterSpacing: '0.18em', textTransform: 'uppercase', color: 'white', cursor: 'none'
        }}>Inspira</div>
        <motion.button
          onClick={() => navigate('/')}
          style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'white', background: 'transparent', border: 'none', padding: '13px 0', cursor: 'none',
          }}
          whileHover={{ opacity: 0.7 }}
        >Return ←</motion.button>
      </motion.nav>

      {/* ── Main Content ── */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', padding: '140px 2rem 6rem' }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }}
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(48px, 6vw, 84px)',
            fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#f5f0e8', marginBottom: '4rem'
          }}
        >
          Archive
        </motion.h1>

        {loading ? (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.9rem', color: 'rgba(240,235,224,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Loading historical data...
          </div>
        ) : (
          <motion.div 
            variants={containerVariants} initial="hidden" animate="show"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}
          >
            {historyData.map((job) => (
              <motion.div
                key={job.job_id}
                variants={itemVariants}
                className="history-card"
                onClick={() => handleCardClick(job)}
                whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                style={{
                  background: 'rgba(26,23,20,0.6)', border: '1px solid rgba(245,235,210,0.1)', backdropFilter: 'blur(12px)',
                  padding: '2rem', display: 'flex', flexDirection: 'column', cursor: 'none', position: 'relative', overflow: 'hidden'
                }}
              >
                {/* Status Indicator */}
                <div style={{ position: 'absolute', top: '2rem', right: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: job.status === 'processing' ? '#c4a882' : 'rgba(240,235,224,0.3)',
                    boxShadow: job.status === 'processing' ? '0 0 10px #c4a882' : 'none'
                  }} />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,235,224,0.5)' }}>
                    {job.status}
                  </span>
                </div>

                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c4a882', marginBottom: '1rem' }}>
                  {new Date(job.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                
                <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '2rem', fontWeight: 300, color: '#f0ebe0', marginBottom: '1.5rem', lineHeight: 1.2 }}>
                  {job.style}
                </h2>

                <div style={{ marginTop: 'auto' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,235,224,0.4)', borderBottom: '1px solid rgba(240,235,224,0.2)', paddingBottom: '4px' }}>
                    View Synthesis →
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

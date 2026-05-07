import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// eslint-disable-next-line
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getJobStatus } from '../services/api';

/* ── Custom Cursor (From LandingPage) ── */
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
    const ov = e => { if (e.target.closest('button,a,label,input')) setHovered(true) };
    const out = e => { if (e.target.closest('button,a,label,input')) setHovered(false) };
    window.addEventListener('mousemove', m);
    window.addEventListener('mouseover', ov);
    window.addEventListener('mouseout', out);
    return () => {
      window.removeEventListener('mousemove', m);
      window.removeEventListener('mouseover', ov);
      window.removeEventListener('mouseout', out);
    };
  }, [mx, my]);;

  const cursorContent = (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
      {/* Outer ring */}
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
      {/* Inner dot */}
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

const STAGES = [
  { id: 1, label: "Applying style transfer (ControlNet)" },
  { id: 2, label: "Estimating camera poses (COLMAP)" },
  { id: 3, label: "Reconstructing room (7k iterations)" },
  { id: 4, label: "Optimizing 3D geometry (Open3D)" },
  { id: 5, label: "Finalizing results (Export)" }
];

export default function ProcessingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [jobId] = useState(location.state?.job_id);
  const [currentStage, setCurrentStage] = useState(1);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState(["[System] Initializing neural link...", "[System] Connecting to backend..."]);

  useEffect(() => {
    if (!jobId) {
      setError("No job ID provided. Please start from the upload page.");
      setLogs(prev => [...prev, "[ERROR] No job ID — redirecting..."]);
      setTimeout(() => navigate('/upload'), 2000);
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const data = await getJobStatus(jobId);
        setCurrentStage(data.stage || 1);
        setProgress(data.progress || 0);

        if (data.message) {
          setLogs(prev => {
            if (prev[prev.length - 1] === data.message) return prev;
            return [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${data.message}`];
          });
        }

        if (data.status === 'complete') {
          clearInterval(intervalId);
          setTimeout(() => {
            navigate('/result', { state: { job_id: jobId } });
          }, 500);
        }

        if (data.status === 'failed') {
          clearInterval(intervalId);
          setLogs(prev => [...prev, `[ERROR] ${data.error || 'Unknown error'}`]);
        }
      } catch (error) {
        console.error("Error polling job status:", error);
        if (error.response?.status === 404) {
          clearInterval(intervalId);
          setLogs(prev => [...prev, "[ERROR] Job not found. Did the server restart?"]);
        }
      }
    }, 2500);

    return () => clearInterval(intervalId);
  }, [jobId, navigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: '#1a1714', color: '#f0ebe0',
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'none', position: 'relative', overflow: 'hidden'
      }}
    >
      <Cursor />

      {/* Decorative Background Elements */}
      <div style={{ position: 'absolute', top: '20%', left: '10%', width: '30vw', height: '30vw', background: 'radial-gradient(circle, rgba(196,168,130,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(196,168,130,0.03) 0%, transparent 70%)', filter: 'blur(80px)' }} />

      <div style={{ zIndex: 10, width: '100%', maxWidth: '600px', padding: '2rem' }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(36px, 5vw, 48px)',
            fontWeight: 300, textAlign: 'center', marginBottom: '4rem', color: '#f0ebe0', letterSpacing: '0.05em'
          }}
        >
          Synthesizing Reality
        </motion.h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {STAGES.map((stageItem) => {
            const isActive = currentStage === stageItem.id;
            const isCompleted = currentStage > stageItem.id;
            
            return (
              <div key={stageItem.id} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', opacity: isCompleted ? 0.4 : (isActive ? 1 : 0.2), transition: 'opacity 0.6s ease' }}>
                {/* Stage Indicator */}
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: '0.8rem', color: isActive ? '#c4a882' : '#f0ebe0',
                  width: '30px', transition: 'color 0.6s ease'
                }}>
                  0{stageItem.id}.
                </div>

                {/* Stage Name */}
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: '1.1rem', flex: 1,
                  letterSpacing: '0.02em', transition: 'all 0.6s ease'
                }}>
                  {stageItem.label}
                </div>

                {/* Status Icon/Spinner */}
                <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}>
                  {isCompleted ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: '#c4a882' }}>✓</motion.div>
                  ) : isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      style={{ width: '14px', height: '14px', border: '1px solid rgba(196,168,130,0.3)', borderTopColor: '#c4a882', borderRadius: '50%' }}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Progress Bar */}
        <div style={{ marginTop: '5rem', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: 'rgba(240,235,224,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            <span>Reconstruction Progress</span>
            <span>{Math.min(Math.round(((currentStage - 1) * 20) + (progress * 0.2)), 100)}%</span>
          </div>
          <div style={{ height: '2px', background: 'rgba(240,235,224,0.1)', width: '100%', position: 'relative', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${Math.min(((currentStage - 1) * 20) + (progress * 0.2), 100)}%` }}
              transition={{ ease: "linear", duration: 0.2 }}
              style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: '#c4a882', boxShadow: '0 0 10px rgba(196,168,130,0.5)' }}
            />
          </div>
        </div>

        {/* ── System Logs / Terminal ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            marginTop: '4rem',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(196, 168, 130, 0.15)',
            borderRadius: '8px',
            padding: '1.5rem',
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.75rem',
            color: 'rgba(240, 235, 224, 0.6)',
            height: '160px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          {logs.map((log, i) => (
            <div key={i} style={{ 
              color: log.includes('[ERROR]') ? '#ff8888' : (log.includes('complete') ? '#c4a882' : 'inherit'),
              opacity: i === logs.length - 1 ? 1 : 0.6
            }}>
              {log}
            </div>
          ))}
          <div style={{ height: '1px' }} ref={el => el?.scrollIntoView({ behavior: 'smooth' })} />
        </motion.div>

      </div>
    </motion.div>
  );
}

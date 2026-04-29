import React, { useState, useCallback, useRef, Suspense, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { analyzeInspiration, uploadRoomPhotos } from '../services/api';

/* ── Custom Cursor (Matches LandingPage) ── */
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
    const ov  = e => { if (e.target.closest('button,a,label,input')) setHovered(true)  }
    const out = e => { if (e.target.closest('button,a,label,input')) setHovered(false) }
    window.addEventListener('mousemove', m)
    window.addEventListener('mouseover', ov)
    window.addEventListener('mouseout',  out)
    return () => {
      window.removeEventListener('mousemove', m)
      window.removeEventListener('mouseover', ov)
      window.removeEventListener('mouseout',  out)
    }
  }, [])

  const cursorContent = (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
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
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(cursorContent, document.body) : null;
}

/* ── 3D Futuristic Object ── */
function AnimatedSphere({ isUploading }) {
  const meshRef = useRef();
  
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = clock.getElapsedTime() * 0.2;
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.3;
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <MeshDistortMaterial 
          color={isUploading ? "#c4a882" : "#1a1714"} 
          attach="material" 
          distort={isUploading ? 0.6 : 0.3} 
          speed={isUploading ? 3 : 1.5} 
          roughness={0.2} 
          metalness={0.8}
          wireframe={!isUploading}
        />
      </mesh>
      {/* Outer Glow */}
      <mesh>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial 
          color="#c4a882" 
          transparent 
          opacity={isUploading ? 0.15 : 0.05} 
          wireframe 
        />
      </mesh>
    </Float>
  );
}

function Upload3DBackground({ isSubmitting }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[2, 5, 2]} intensity={1} color="#f5ead8" />
          <AnimatedSphere isUploading={isSubmitting} />
        </Suspense>
      </Canvas>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 0%, #1c1510 80%)',
      }} />
    </div>
  );
}

/* ── Futuristic Drop Zone Components ── */
const CornerAccents = ({ active }) => (
  <>
    <div style={{ position: 'absolute', top: -1, left: -1, width: 24, height: 24, borderTop: `2px solid ${active ? '#c4a882' : 'rgba(245,235,210,0.3)'}`, borderLeft: `2px solid ${active ? '#c4a882' : 'rgba(245,235,210,0.3)'}`, zIndex: 5, transition: 'all 0.3s' }} />
    <div style={{ position: 'absolute', top: -1, right: -1, width: 24, height: 24, borderTop: `2px solid ${active ? '#c4a882' : 'rgba(245,235,210,0.3)'}`, borderRight: `2px solid ${active ? '#c4a882' : 'rgba(245,235,210,0.3)'}`, zIndex: 5, transition: 'all 0.3s' }} />
    <div style={{ position: 'absolute', bottom: -1, left: -1, width: 24, height: 24, borderBottom: `2px solid ${active ? '#c4a882' : 'rgba(245,235,210,0.3)'}`, borderLeft: `2px solid ${active ? '#c4a882' : 'rgba(245,235,210,0.3)'}`, zIndex: 5, transition: 'all 0.3s' }} />
    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 24, height: 24, borderBottom: `2px solid ${active ? '#c4a882' : 'rgba(245,235,210,0.3)'}`, borderRight: `2px solid ${active ? '#c4a882' : 'rgba(245,235,210,0.3)'}`, zIndex: 5, transition: 'all 0.3s' }} />
  </>
);

const ScannerLine = () => (
  <motion.div
    animate={{ top: ['0%', '100%', '0%'] }}
    transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
    style={{
      position: 'absolute', left: 0, right: 0, height: 1,
      background: 'linear-gradient(90deg, transparent, rgba(196,168,130,0.8), transparent)',
      boxShadow: '0 0 15px rgba(196,168,130,1)', zIndex: 0
    }}
  />
);

const GlowingIcon = ({ d }) => (
  <motion.div 
    whileHover={{ scale: 1.1, textShadow: '0 0 10px rgba(196,168,130,0.8)' }}
    style={{
      width: 70, height: 70, borderRadius: '50%',
      background: 'rgba(196,168,130,0.05)',
      border: '1px solid rgba(196,168,130,0.3)',
      boxShadow: '0 0 20px rgba(196,168,130,0.1) inset',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 1.5rem', color: '#c4a882', position: 'relative'
  }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
    <motion.div 
      animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      style={{ position: 'absolute', inset: -5, border: '1px dashed rgba(196,168,130,0.2)', borderRadius: '50%' }}
    />
  </motion.div>
);

/* ── Main Component ── */
export default function UploadPage() {
  const navigate = useNavigate();
  const [inspiration, setInspiration] = useState(null);
  const [roomPhotos, setRoomPhotos] = useState([]);
  const [dragTarget, setDragTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInspirationDrop = useCallback((e) => {
    e.preventDefault();
    setDragTarget(null);
    const file = e.dataTransfer.files[0];
    if (!file?.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }
    if (inspiration) URL.revokeObjectURL(inspiration.previewUrl);
    setInspiration({ file, previewUrl: URL.createObjectURL(file) });
    setError('');
  }, [inspiration]);

  const handleRoomPhotosDrop = useCallback((e) => {
    e.preventDefault();
    setDragTarget(null);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) {
      setError('Please upload valid image files');
      return;
    }
    const newPhotos = files.slice(0, 25 - roomPhotos.length).map(file => ({
      file, previewUrl: URL.createObjectURL(file)
    }));
    setRoomPhotos(prev => [...prev, ...newPhotos].slice(0, 25));
    setError('');
  }, [roomPhotos.length]);

  const removeInspiration = (e) => {
    e.stopPropagation();
    if (inspiration) {
      URL.revokeObjectURL(inspiration.previewUrl);
      setInspiration(null);
    }
  };

  const removeRoomPhoto = (e, index) => {
    e.stopPropagation();
    setRoomPhotos(prev => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!inspiration || roomPhotos.length < 10) return;
    setIsSubmitting(true);
    setError('');
    try {
      const [inspirationRes, roomRes] = await Promise.all([
        analyzeInspiration(inspiration.file),
        uploadRoomPhotos(roomPhotos.map(p => p.file))
      ]);
      const jobId = inspirationRes.job_id || roomRes.job_id;
      navigate('/processing', { state: { job_id: jobId } });
    } catch (err) {
      setError('Submission failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const getBoxStyle = (isTarget) => ({
    border: '1px solid rgba(245,235,210,0.05)',
    background: isTarget ? 'rgba(196,168,130,0.08)' : 'linear-gradient(145deg, rgba(26,23,20,0.8), rgba(15,12,10,0.9))',
    backdropFilter: 'blur(20px)',
    boxShadow: isTarget ? '0 0 30px rgba(196,168,130,0.2) inset, 0 10px 40px rgba(0,0,0,0.6)' : '0 20px 50px rgba(0,0,0,0.8)',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative', overflow: 'hidden'
  });

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
      <Upload3DBackground isSubmitting={isSubmitting} />

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.4 }}
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
            letterSpacing: '0.18em', textTransform: 'uppercase', color: 'white', cursor: 'pointer'
        }}>Inspira</div>
        <motion.button
          onClick={() => navigate('/')}
          style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'white', background: 'transparent', border: 'none', padding: '13px 0', cursor: 'pointer',
          }}
          whileHover={{ opacity: 0.7 }}
        >Return ←</motion.button>
      </motion.nav>

      {/* ── Main Content ── */}
      <div style={{
        position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto',
        padding: '140px 2rem 6rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'none'
      }}>
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(48px, 6vw, 84px)',
            fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#f5f0e8', marginBottom: '1rem'
          }}>Initialize Your Space</h1>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: '1.1rem', color: 'rgba(240,235,224,0.6)',
            maxWidth: '500px', margin: '0 auto', fontWeight: 300, lineHeight: 1.6
          }}>
            Provide your design inspiration and capture your room's geometry.
            Our spatial AI will reconstruct reality.
          </p>
        </motion.div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '2rem', width: '100%', marginBottom: '4rem'
        }}>
          {/* Inspiration Zone */}
          <motion.div
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'rgba(240,235,224,0.5)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between'
            }}>
              <span style={{ color: '#c4a882' }}>01. Target Vector</span>
              <span>1 Image Required</span>
            </div>
              <motion.div
              onDragOver={(e) => { e.preventDefault(); setDragTarget('inspiration'); }}
              onDragLeave={() => setDragTarget(null)}
              onDrop={handleInspirationDrop}
              onClick={() => document.getElementById('inspiration-input').click()}
              whileHover={{ scale: 1.01 }}
              style={{
                ...getBoxStyle(dragTarget === 'inspiration'),
                flex: 1, padding: '2rem', minHeight: '380px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', cursor: 'none'
              }}
            >
              <CornerAccents active={dragTarget === 'inspiration'} />
              {dragTarget === 'inspiration' && <ScannerLine />}
              
              <input id="inspiration-input" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (inspiration) URL.revokeObjectURL(inspiration.previewUrl);
                    setInspiration({ file, previewUrl: URL.createObjectURL(file) });
                  }
                }}
              />
              <AnimatePresence mode="wait">
                {inspiration ? (
                  <motion.div
                    key="insp-preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}
                  >
                    <img src={inspiration.previewUrl} alt="Inspiration"
                      style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}
                    />
                    <motion.button
                      onClick={removeInspiration} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      style={{
                        position: 'absolute', top: '-1rem', right: '-1rem', background: 'rgba(200,50,50,0.8)', color: 'white',
                        border: '1px solid rgba(255,100,100,0.4)', width: 32, height: 32, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, backdropFilter: 'blur(5px)'
                      }}>✕</motion.button>
                  </motion.div>
                ) : (
                  <motion.div key="insp-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', zIndex: 10 }}>
                    <GlowingIcon d={<><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></>} />
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#f5f0e8', marginBottom: '0.5rem' }}>Upload Inspiration</div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: 'rgba(240,235,224,0.5)', fontWeight: 300 }}>Drag & drop or click to browse</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Room Photos Zone */}
          <motion.div
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.5 }}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'rgba(240,235,224,0.5)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between'
            }}>
              <span style={{ color: '#c4a882' }}>02. Spatial Mapping</span>
              <span style={{ color: roomPhotos.length >= 10 ? '#c4a882' : 'rgba(240,235,224,0.5)' }}>
                {roomPhotos.length} / 25 Scans
              </span>
            </div>
            <motion.div
              onDragOver={(e) => { e.preventDefault(); setDragTarget('room'); }}
              onDragLeave={() => setDragTarget(null)}
              onDrop={handleRoomPhotosDrop}
              onClick={() => document.getElementById('room-photos-input').click()}
              whileHover={{ scale: 1.01 }}
              style={{
                ...getBoxStyle(dragTarget === 'room'),
                flex: 1, padding: '2rem', minHeight: '380px', display: 'flex', flexDirection: 'column', cursor: 'none'
              }}
            >
              <CornerAccents active={dragTarget === 'room'} />
              {dragTarget === 'room' && <ScannerLine />}

              <input id="room-photos-input" type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={(e) => {
                  const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
                  const newPhotos = files.slice(0, 25 - roomPhotos.length).map(file => ({
                    file, previewUrl: URL.createObjectURL(file)
                  }));
                  setRoomPhotos(prev => [...prev, ...newPhotos].slice(0, 25));
                }}
              />
              <AnimatePresence>
                {roomPhotos.length > 0 ? (
                  <motion.div
                    key="room-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', alignContent: 'start', width: '100%', zIndex: 10 }}
                  >
                    {roomPhotos.map((photo, index) => (
                      <motion.div
                        key={photo.previewUrl} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                        style={{ position: 'relative', aspectRatio: '1' }}
                      >
                        <img src={photo.previewUrl} alt={`Room ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', border: '1px solid rgba(196,168,130,0.3)' }} />
                        <motion.button
                          onClick={(e) => removeRoomPhoto(e, index)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          style={{
                            position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10, borderRadius: '50%'
                          }}>✕</motion.button>
                      </motion.div>
                    ))}
                    {roomPhotos.length < 25 && (
                      <div style={{ aspectRatio: '1', border: '1px dashed rgba(196,168,130,0.4)', background: 'rgba(196,168,130,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(196,168,130,0.5)', fontSize: '1.5rem' }}>+</div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="room-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', margin: 'auto', zIndex: 10 }}>
                    <GlowingIcon d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></>} />
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#f5f0e8', marginBottom: '0.5rem' }}>Upload Room Scans</div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: 'rgba(240,235,224,0.5)', fontWeight: 300, marginBottom: '1rem' }}>Drag & drop or click to browse</p>
                    <div style={{ background: 'rgba(196,168,130,0.1)', border: '1px solid rgba(196,168,130,0.2)', padding: '4px 12px', borderRadius: 20, display: 'inline-block' }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#c4a882', letterSpacing: '0.1em', textTransform: 'uppercase' }}>10 photos minimum</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* Progress Bar */}
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', width: '100%', position: 'relative', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${Math.min((roomPhotos.length / 10) * 100, 100)}%` }} transition={{ duration: 0.5 }}
                  style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: roomPhotos.length >= 10 ? '#c4a882' : 'rgba(196,168,130,0.5)', boxShadow: '0 0 10px rgba(196,168,130,0.8)' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: 'rgba(240,235,224,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <span>Reconstruction Readiness</span>
                <span style={{ color: roomPhotos.length >= 10 ? '#c4a882' : 'inherit' }}>{roomPhotos.length >= 10 ? 'Systems Ready' : `${10 - roomPhotos.length} scans required`}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ background: 'rgba(204, 68, 68, 0.1)', border: '1px solid rgba(204, 68, 68, 0.3)', color: '#ff8888', padding: '1rem 2rem', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', marginBottom: '2rem', backdropFilter: 'blur(10px)' }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }}>
          <motion.button
            onClick={handleSubmit}
            disabled={isSubmitting || !inspiration || roomPhotos.length < 10}
            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(196,168,130,0.4)' }}
            whileTap={{ scale: 0.98 }}
            style={{
              fontFamily: "'Space Mono', monospace", fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase',
              color: '#1a1714', background: 'linear-gradient(90deg, #f0ebe0, #d4c5ab)', border: 'none', padding: '1.25rem 4rem',
              cursor: 'none', opacity: (isSubmitting || !inspiration || roomPhotos.length < 10) ? 0.3 : 1, transition: 'opacity 0.3s ease',
            }}
          >
            {isSubmitting ? 'Synthesizing...' : 'Initialize Reconstruction →'}
          </motion.button>
        </motion.div>
      </div>
      
      <Cursor />
    </motion.div>
  );
}

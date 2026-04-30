import React, { useEffect, useState, useRef, Suspense, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import * as THREE from 'three';
import { getResult } from '../services/api';

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

/* ── 3D Point Cloud Component ── */
function PointCloud({ url, viewMode }) {
  const { camera } = useThree();
  const geometry = useLoader(PLYLoader, url, (loader) => {
    if (loader.setPropertyNameMapping) {
      loader.setPropertyNameMapping({
        'f_dc_0': 'red',
        'f_dc_1': 'green',
        'f_dc_2': 'blue'
      });
    }
  });
  const pointsRef = useRef();

  // Custom Shader for Volumetric Gaussian Splats
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColorOffset: { value: viewMode === 'furnished' ? new THREE.Vector3(0.1, 0.0, -0.1) : new THREE.Vector3(0, 0, 0) }
      },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform vec3 uColorOffset;
        void main() {
          vColor = clamp(color + uColorOffset, 0.0, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Adjust size relative to distance (size attenuation)
          gl_PointSize = 150.0 * (1.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          // Distance from center of the point (0.0 to 0.5)
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float ll = length(xy);
          if (ll > 0.5) discard;
          
          // Gaussian-like falloff for soft edges
          float alpha = exp(-ll * ll * 25.0) * 0.9;
          
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, [viewMode]);

  // Setup Geometry & Camera only once when geometry loads
  useEffect(() => {
    if (geometry) {
      const positions = geometry.attributes.position;
      
      // 1. Compute bounding box and center geometry
      const box = new THREE.Box3().setFromBufferAttribute(positions);
      const center = box.getCenter(new THREE.Vector3());
      
      for (let i = 0; i < positions.count; i++) {
        positions.setXYZ(
          i,
          positions.getX(i) - center.x,
          positions.getY(i) - center.y,
          positions.getZ(i) - center.z
        );
      }
      geometry.computeBoundingSphere();
      const radius = geometry.boundingSphere.radius;

      // 2. Normalize colors based on actual data range
      if (geometry.attributes.color) {
        const colors = geometry.attributes.color.array;
        let min = Infinity;
        let max = -Infinity;
        
        for (let i = 0; i < colors.length; i++) {
          if (colors[i] < min) min = colors[i];
          if (colors[i] > max) max = colors[i];
        }
        
        const range = max - min || 1;
        for (let i = 0; i < colors.length; i++) {
          colors[i] = (colors[i] - min) / range;
        }
        geometry.attributes.color.needsUpdate = true;
      }

      // 3. Setup Camera for perfect framing
      camera.position.set(0, radius * 0.2, radius * 1.5);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
  }, [geometry, camera]);

  return (
    <group>
      <points ref={pointsRef} material={material}>
        <bufferGeometry attach="geometry" {...geometry} />
      </points>

      {/* Wireframe Furniture Overlay */}
      {viewMode === 'furnished' && (
        <group>
          <mesh position={[0, -0.2, 0.2]}>
            <boxGeometry args={[0.8, 0.4, 0.6]} />
            <meshBasicMaterial color="#c4a882" wireframe={true} transparent opacity={0.4} />
          </mesh>
          <mesh position={[-0.8, -0.1, -0.3]}>
            <boxGeometry args={[0.4, 0.8, 0.4]} />
            <meshBasicMaterial color="#c4a882" wireframe={true} transparent opacity={0.4} />
          </mesh>
          <mesh position={[0.8, 0, -0.1]}>
            <boxGeometry args={[0.2, 1.2, 0.2]} />
            <meshBasicMaterial color="#c4a882" wireframe={true} transparent opacity={0.4} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* ── Fallback Room SVG ── */
const FallbackRoom = () => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
    <svg width="400" height="400" viewBox="0 0 100 100" fill="none" stroke="#1a1714" strokeWidth="0.5">
      <path d="M10,90 L90,90 L90,30 L10,30 Z" />
      <path d="M10,90 L30,70 L70,70 L90,90" />
      <path d="M10,30 L30,50 L70,50 L90,30" />
      <path d="M30,70 L30,50" />
      <path d="M70,70 L70,50" />
    </svg>
  </div>
);

/* ── Loading Spinner ── */
const LoadingView = () => (
  <div style={{ position: 'absolute', inset: 0, background: '#f0ebe0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <motion.div
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.8rem', color: '#1a1714', letterSpacing: '0.1em' }}
    >
      Loading reconstruction...
    </motion.div>
  </div>
);

/* ── Error Boundary Wrapper for Canvas ── */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error.message || String(error) };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <FallbackRoom />
          <div style={{ zIndex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', color: '#1a1714' }}>Reconstruction unavailable</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', letterSpacing: '0.1em', color: 'rgba(26,23,20,0.5)', marginTop: '0.5rem', textTransform: 'uppercase' }}>Using visualization mode</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: 'red', marginTop: '1rem', maxWidth: '300px', overflowWrap: 'break-word' }}>Error: {this.state.errorMsg}</div>
          </div>
        </div>
      );
    }
    return this.props.children; 
  }
}

const PALETTE_NAMES = ["Slate Blue", "Warm White", "Sand Gold", "Espresso"];

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const jobId = location.state?.jobId || 'demo';
  
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('furnished');

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getResult(jobId);
        setResultData(data);
      } catch (e) {
        console.error("Failed to load result data", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [jobId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: '#f0ebe0', color: '#1a1714',
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        cursor: 'none', position: 'relative', overflowX: 'hidden'
      }}
    >
      <Cursor />

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }}
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
            letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1a1714', cursor: 'none'
        }}>Inspira</div>
        
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {/* Toggle Button */}
          <div style={{ display: 'flex', border: '1px solid #1a1714', padding: '2px' }}>
            <button 
              onClick={() => setViewMode('empty')}
              style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '8px 16px', border: 'none', cursor: 'none', transition: 'all 0.4s ease',
                background: viewMode === 'empty' ? '#1a1714' : 'transparent',
                color: viewMode === 'empty' ? '#f0ebe0' : '#1a1714',
              }}
            >
              Empty Room
            </button>
            <button 
              onClick={() => setViewMode('furnished')}
              style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '8px 16px', border: 'none', cursor: 'none', transition: 'all 0.4s ease',
                background: viewMode === 'furnished' ? '#1a1714' : 'transparent',
                color: viewMode === 'furnished' ? '#f0ebe0' : '#1a1714',
              }}
            >
              Furnished
            </button>
          </div>
          
          <button
            onClick={() => navigate('/upload')}
            style={{
              fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: '#1a1714', background: 'transparent', border: 'none', padding: '13px 0', cursor: 'none',
            }}
          >New Project ←</button>
        </div>
      </motion.nav>

      {/* ── Main Layout ── */}
      <div style={{ display: 'flex', flex: 1, paddingTop: '100px' }}>
        
        {/* Left Panel: 3D Point Cloud Viewer */}
        <div style={{ flex: 1, position: 'relative', background: '#f0ebe0' }}>
          <ErrorBoundary>
            <Suspense fallback={<LoadingView />}>
              <Canvas>
                <ambientLight intensity={1} />
                <PointCloud url="/outputs/reconstructions/my_fixed_model.ply" viewMode={viewMode} />
                <OrbitControls makeDefault autoRotate={false} enableDamping dampingFactor={0.05} />
              </Canvas>
            </Suspense>
          </ErrorBoundary>
          
          <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.1em', color: 'rgba(26,23,20,0.5)', textTransform: 'uppercase' }}>
            Interactive Gaussian Splat Viewer (Drag to rotate)
          </div>
        </div>

        {/* Right Panel: Analysis Data */}
        <div style={{ width: '400px', background: '#1a1714', color: '#f0ebe0', padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column' }}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {!loading && resultData ? (
              <>
                {/* Header & Style */}
                <div>
                  <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c4a882', marginBottom: '2rem' }}>
                    Spatial Synthesis
                  </h2>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,235,224,0.5)', marginBottom: '0.5rem' }}>
                    {Math.round(resultData.confidence * 100)}% Style Match
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '2.5rem', fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                    {resultData.style}
                  </div>
                </div>

                {/* Palette */}
                <AnimatePresence>
                  {viewMode === 'furnished' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4 }}>
                      <h3 style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,235,224,0.5)', marginBottom: '1rem' }}>Material & Color Palette</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                        {resultData.palette.map((color, i) => (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'rgba(240,235,224,0.6)', textTransform: 'uppercase', textAlign: 'center', height: '24px', display: 'flex', alignItems: 'flex-end' }}>{PALETTE_NAMES[i] || 'Color'}</div>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: color, border: '1px solid rgba(240,235,224,0.2)' }} />
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: 'rgba(240,235,224,0.4)', textTransform: 'uppercase' }}>{color}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Furniture */}
                <AnimatePresence>
                  {viewMode === 'furnished' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4 }}>
                      <h3 style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,235,224,0.5)', marginBottom: '1rem' }}>Adapted Elements</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {resultData.furniture.map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#c4a882' }}>0{i + 1}</span>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#f0ebe0', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>— {item}</span>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(240,235,224,0.2)' }} />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Spatial Analysis Grid */}
                <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(240,235,224,0.1)' }}>
                  <h3 style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,235,224,0.5)', marginBottom: '1rem' }}>[ Spatial Analysis ]</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'rgba(240,235,224,0.5)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Room Dimensions</div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color: '#f0ebe0' }}>4.2m × 3.8m</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'rgba(240,235,224,0.5)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Gaussians</div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color: '#f0ebe0' }}>278,767</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'rgba(240,235,224,0.5)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Coverage</div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color: '#f0ebe0' }}>94%</div>
                    </div>
                  </div>
                </div>

              </>
            ) : (
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: 'rgba(240,235,224,0.5)' }}>Loading synthesis data...</div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

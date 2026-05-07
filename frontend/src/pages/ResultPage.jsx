import React, { useEffect, useState, useRef, Suspense, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// eslint-disable-next-line
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
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
  }, [mx, my]);;

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

/* ── Custom Gaussian Splat PLY Parser ── */
// The PLY file uses Gaussian Splat format with SH coefficients (f_dc_0/1/2)
// not standard RGB. Three.js PLYLoader doesn't handle this — we parse manually.
async function loadGaussianSplatPLY(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // 1. Parse text header
  let headerEnd = 0;
  for (let i = 0; i < bytes.length - 10; i++) {
    // Look for 'end_header\n'
    if (bytes[i] === 101 && bytes[i+1] === 110 && bytes[i+2] === 100 &&
        bytes[i+3] === 95 && bytes[i+4] === 104) {
      while (i < bytes.length && bytes[i] !== 10) i++;
      headerEnd = i + 1;
      break;
    }
  }

  const header = new TextDecoder().decode(bytes.slice(0, headerEnd));
  console.log('[PLY] Header:', header);

  // 2. Parse vertex count and property offsets from header
  const lines = header.split('\n').map(l => l.trim()).filter(Boolean);
  let numVertices = 0;
  const properties = [];
  for (const line of lines) {
    if (line.startsWith('element vertex')) numVertices = parseInt(line.split(' ')[2]);
    if (line.startsWith('property float')) properties.push(line.split(' ')[2]);
  }

  console.log(`[PLY] ${numVertices} vertices, properties:`, properties);

  const stride = properties.length * 4; // all float32 = 4 bytes each
  const propIndex = {};
  properties.forEach((name, i) => { propIndex[name] = i; });

  // 3. Read binary data
  const dataView = new DataView(arrayBuffer, headerEnd);
  const positions = new Float32Array(numVertices * 3);
  const colors    = new Float32Array(numVertices * 3);

  const xi  = propIndex['x'];
  const yi  = propIndex['y'];
  const zi  = propIndex['z'];
  const r0i = propIndex['f_dc_0'];
  const g0i = propIndex['f_dc_1'];
  const b0i = propIndex['f_dc_2'];

  // SH to RGB conversion: DC coefficient * SH_C0 + 0.5
  // SH_C0 = 0.28209479177387814
  const SH_C0 = 0.28209479177387814;

  for (let i = 0; i < numVertices; i++) {
    const base = i * stride;
    const getF = (propIdx) => dataView.getFloat32(base + propIdx * 4, true);

    positions[i*3]   = getF(xi);
    positions[i*3+1] = getF(yi);
    positions[i*3+2] = getF(zi);

    // Convert SH DC coefficients to [0,1] RGB
    const rawR = r0i != null ? getF(r0i) : 0;
    const rawG = g0i != null ? getF(g0i) : 0;
    const rawB = b0i != null ? getF(b0i) : 0;

    colors[i*3]   = Math.max(0, Math.min(1, rawR * SH_C0 + 0.5));
    colors[i*3+1] = Math.max(0, Math.min(1, rawG * SH_C0 + 0.5));
    colors[i*3+2] = Math.max(0, Math.min(1, rawB * SH_C0 + 0.5));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  console.log(`[PLY] Loaded ${numVertices} points. BoundingSphere:`, geometry.boundingSphere);
  return geometry;
}

/* ── 3D Point Cloud Component ── */
function PointCloud({ url, viewMode }) {
  const { camera } = useThree();
  const pointsRef = useRef();
  const [geoState, setGeoState] = useState({ geo: null, error: null });
  const geo = geoState.geo;

  // Load the PLY asynchronously
  useEffect(() => {
    let cancelled = false;
    console.log('[PointCloud] Loading:', url);
    loadGaussianSplatPLY(url)
      .then(g => {
        if (cancelled) return;
        setGeoState({ geo: g, error: null });
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[PointCloud] Load failed:', err);
        setGeoState({ geo: null, error: err.message });
      });
    return () => { cancelled = true; };
  }, [url]);

  // Setup camera when geometry is ready
  useEffect(() => {
    if (!geo) return;
    const sphere = geo.boundingSphere;
    const r = (sphere && !isNaN(sphere.radius) && sphere.radius > 0) ? sphere.radius : 5;
    console.log('[PointCloud] Framing camera at radius', r);
    // Place camera outside the cloud for a good initial view
    camera.position.set(0, r * 0.5, r * 2);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [geo, camera]);

  const material = useMemo(() => new THREE.PointsMaterial({
    size: 0.02,
    vertexColors: true,
    sizeAttenuation: true,
    depthWrite: false,
  }), []);

  if (geoState.error) {
    console.error('[PointCloud] Render error:', geoState.error);
    return null;
  }
  if (!geo) return null;

  const center = geo.boundingBox ? geo.boundingBox.getCenter(new THREE.Vector3()) : new THREE.Vector3();

  return (
    <group position={[-center.x, -center.y, -center.z]}>
      <points ref={pointsRef} geometry={geo} material={material} />
      {viewMode === 'furnished' && (
        <group>
          <mesh position={[0, -0.2, 0.2]}>
            <boxGeometry args={[0.8, 0.4, 0.6]} />
            <meshBasicMaterial color="#c4a882" wireframe transparent opacity={0.4} />
          </mesh>
          <mesh position={[-0.8, -0.1, -0.3]}>
            <boxGeometry args={[0.4, 0.8, 0.4]} />
            <meshBasicMaterial color="#c4a882" wireframe transparent opacity={0.4} />
          </mesh>
          <mesh position={[0.8, 0, -0.1]}>
            <boxGeometry args={[0.2, 1.2, 0.2]} />
            <meshBasicMaterial color="#c4a882" wireframe transparent opacity={0.4} />
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
  const jobId = location.state?.job_id || location.state?.jobId;

  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('furnished');

  useEffect(() => {
    if (!jobId) {
      setError("No job ID provided.");
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const data = await getResult(jobId);
        setResultData(data);
      } catch (e) {
        console.error("Failed to load result data", e);
        setError(e.response?.data?.detail || e.message || "Failed to load result");
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
          {error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
              <FallbackRoom />
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', color: '#1a1714' }}>Result unavailable</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: 'rgba(26,23,20,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{error}</div>
              <button onClick={() => navigate('/upload')} style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', border: '1px solid #1a1714', background: 'transparent', cursor: 'none', marginTop: '1rem' }}>New Project</button>
            </div>
          ) : !resultData && !loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.8rem', color: 'rgba(26,23,20,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>No result data found</div>
            </div>
          ) : (
            <ErrorBoundary>
              <Suspense fallback={<LoadingView />}>
                <Canvas
                  gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
                  onCreated={({ gl }) => {
                    console.log("WebGL Renderer created successfully:", gl.getContextAttributes());
                    gl.domElement.addEventListener('webglcontextlost', (event) => {
                      event.preventDefault();
                      console.error("FATAL: WebGL Context Lost! The GPU has crashed or reset.");
                    }, false);
                    gl.domElement.addEventListener('webglcontextrestored', () => {
                      console.log("WebGL Context Restored. Reloading scene...");
                      window.location.reload();
                    }, false);
                  }}
                >
                  <ambientLight intensity={1} />
                  {resultData && <PointCloud url={resultData.modelUrl || "/outputs/reconstructions/room_final.ply"} viewMode={viewMode} />}
                  <OrbitControls
                    makeDefault
                    autoRotate={false}
                    enableDamping
                    dampingFactor={0.05}
                    enableZoom={true}
                    enablePan={true}
                    minDistance={0.1}
                  />
                </Canvas>
              </Suspense>
            </ErrorBoundary>
          )}
          
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

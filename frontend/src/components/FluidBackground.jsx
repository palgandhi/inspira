import { useEffect, useRef } from 'react'

const VERT = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2  u_resolution;

vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.,i1.z,i2.z,1.))
    +i.y+vec4(0.,i1.y,i2.y,1.))
    +i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(
    dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(
    dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(
    dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

// Fake environment map reflection — makes it look like liquid metal
vec3 envColor(vec3 normal) {
  // Simulate a dark studio environment with one bright overhead light
  float up    = max(dot(normal, vec3(0.0, 1.0, 0.2)), 0.0);
  float side  = max(dot(normal, vec3(0.7, 0.3, 0.0)), 0.0);
  float back  = max(dot(normal, vec3(-0.5, 0.0, 0.8)), 0.0);

  vec3 col = vec3(0.02, 0.02, 0.025); // ambient dark
  col += vec3(0.35, 0.38, 0.50) * pow(up, 2.5);    // overhead — blue-white
  col += vec3(0.15, 0.12, 0.10) * pow(side, 3.0);  // side — warm
  col += vec3(0.08, 0.10, 0.18) * pow(back, 2.0);  // back — cool

  return col;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p  = uv * 2.0 - 1.0;
  p.x    *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.10;

  // --- Layer 1: large slow waves ---
  vec2 q = vec2(
    snoise(vec3(p * 0.8,           t * 0.40)),
    snoise(vec3(p * 0.8 + 5.2,     t * 0.40))
  );

  // --- Layer 2: medium waves warped by layer 1 ---
  vec2 r = vec2(
    snoise(vec3(p * 1.4 + 1.7*q,   t * 0.35 + 1.7)),
    snoise(vec3(p * 1.4 + 1.7*q + 8.3, t * 0.35 + 9.2))
  );

  // --- Layer 3: fine detail warped by layer 2 ---
  float f = snoise(vec3(p * 2.0 + 1.8*r, t * 0.45 + 5.1));

  // Combine for surface height
  float h = 0.50*q.x + 0.30*r.x + 0.20*f;

  // --- Compute surface normal from height field ---
  float eps = 0.008;
  float hx = snoise(vec3((p + vec2(eps, 0.0)) * 1.5 + r, t * 0.45))
           - snoise(vec3((p - vec2(eps, 0.0)) * 1.5 + r, t * 0.45));
  float hy = snoise(vec3((p + vec2(0.0, eps)) * 1.5 + r, t * 0.45))
           - snoise(vec3((p - vec2(0.0, eps)) * 1.5 + r, t * 0.45));

  vec3 normal = normalize(vec3(-hx / (2.0*eps), -hy / (2.0*eps), 0.15));

  // --- Environment mapping --- gives the liquid metal look
  vec3 envCol = envColor(normal);

  // --- Base dark colour modulated by height ---
  // Deep dark base
  vec3 dark = vec3(0.028, 0.028, 0.035);
  // Mid tones — dark blue-charcoal
  vec3 mid  = vec3(0.065, 0.070, 0.100);
  // Highlight — brighter dark blue-grey (visible!)
  vec3 high = vec3(0.160, 0.170, 0.240);

  float ht = smoothstep(-0.8, 0.8, h);
  vec3 base = mix(dark, mid, smoothstep(-0.8, 0.0, h));
  base      = mix(base, high, smoothstep(0.0, 0.8, h));

  // --- Specular highlight ---
  // View direction (screen-space approximation)
  vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
  vec3 lightDir = normalize(vec3(0.3, 0.8, 0.5));
  vec3 halfDir  = normalize(lightDir + viewDir);
  float spec    = pow(max(dot(normal, halfDir), 0.0), 32.0);

  // Sharp specular streak — the glossy shine
  vec3 specCol = vec3(0.5, 0.55, 0.8) * spec * 0.35;

  // Soft specular — broad glow
  float softSpec = pow(max(dot(normal, halfDir), 0.0), 4.0);
  vec3 softCol   = vec3(0.15, 0.17, 0.28) * softSpec * 0.12;

  // --- Combine ---
  vec3 col = base + envCol * 0.32 + specCol + softCol;

  // --- Vignette ---
  float vig = 1.0 - length(uv - 0.5) * 1.4;
  col *= clamp(vig, 0.0, 1.0);

  // Slight gamma
  col = pow(clamp(col, 0.0, 1.0), vec3(0.9));

  gl_FragColor = vec4(col, 1.0);
}
`

export default function FluidBackground() {
  const canvasRef = useRef()
  const rafRef    = useRef()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    })
    if (!gl) { console.warn('WebGL not available'); return }

    const makeShader = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        console.error('Shader compile error:', gl.getShaderInfoLog(s))
      return s
    }

    const prog = gl.createProgram()
    gl.attachShader(prog, makeShader(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      console.error('Program link error:', gl.getProgramInfoLog(prog))
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),
      gl.STATIC_DRAW)

    const loc = gl.getAttribLocation(prog, 'position')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uRes  = gl.getUniformLocation(prog, 'u_resolution')

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w   = window.innerWidth
      const h   = window.innerHeight
      canvas.width  = w * dpr
      canvas.height = h * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }

    resize()
    window.addEventListener('resize', resize)

    const start = performance.now()
    const render = () => {
      gl.uniform1f(uTime, (performance.now() - start) * 0.001)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw',
        height: '100vh',
        display: 'block',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

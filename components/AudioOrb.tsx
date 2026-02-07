'use client';

import { useRef, useEffect } from 'react';
import type { SessionState } from '../lib/constants';

interface AudioOrbProps {
  state: SessionState;
  isSpeaking: boolean;
  getCaptureAnalyser?: () => Uint8Array | null;
  getPlaybackAnalyser?: () => Uint8Array | null;
}

const F3 = 1.0 / 3.0;
const G3 = 1.0 / 6.0;
const grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
const perm = new Uint8Array(512);
const permMod12 = new Uint8Array(512);
(function () {
  const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod12[i] = perm[i] % 12; }
})();

function dot3(g: number[], x: number, y: number, z: number) { return g[0]*x+g[1]*y+g[2]*z; }

function simplex3(xin: number, yin: number, zin: number): number {
  const s=(xin+yin+zin)*F3;
  const i=Math.floor(xin+s),j=Math.floor(yin+s),k=Math.floor(zin+s);
  const t=(i+j+k)*G3;
  const x0=xin-(i-t),y0=yin-(j-t),z0=zin-(k-t);
  let i1:number,j1:number,k1:number,i2:number,j2:number,k2:number;
  if(x0>=y0){if(y0>=z0){i1=1;j1=0;k1=0;i2=1;j2=1;k2=0;}else if(x0>=z0){i1=1;j1=0;k1=0;i2=1;j2=0;k2=1;}else{i1=0;j1=0;k1=1;i2=1;j2=0;k2=1;}}
  else{if(y0<z0){i1=0;j1=0;k1=1;i2=0;j2=1;k2=1;}else if(x0<z0){i1=0;j1=1;k1=0;i2=0;j2=1;k2=1;}else{i1=0;j1=1;k1=0;i2=1;j2=1;k2=0;}}
  const x1=x0-i1+G3,y1=y0-j1+G3,z1=z0-k1+G3;
  const x2=x0-i2+2*G3,y2=y0-j2+2*G3,z2=z0-k2+2*G3;
  const x3=x0-1+3*G3,y3=y0-1+3*G3,z3=z0-1+3*G3;
  const ii=i&255,jj=j&255,kk=k&255;
  let n0=0,n1=0,n2=0,n3=0;
  let t0=0.6-x0*x0-y0*y0-z0*z0;if(t0>=0){t0*=t0;n0=t0*t0*dot3(grad3[permMod12[ii+perm[jj+perm[kk]]]],x0,y0,z0);}
  let t1=0.6-x1*x1-y1*y1-z1*z1;if(t1>=0){t1*=t1;n1=t1*t1*dot3(grad3[permMod12[ii+i1+perm[jj+j1+perm[kk+k1]]]],x1,y1,z1);}
  let t2=0.6-x2*x2-y2*y2-z2*z2;if(t2>=0){t2*=t2;n2=t2*t2*dot3(grad3[permMod12[ii+i2+perm[jj+j2+perm[kk+k2]]]],x2,y2,z2);}
  let t3=0.6-x3*x3-y3*y3-z3*z3;if(t3>=0){t3*=t3;n3=t3*t3*dot3(grad3[permMod12[ii+1+perm[jj+1+perm[kk+1]]]],x3,y3,z3);}
  return 32*(n0+n1+n2+n3);
}

const orbVertexShader = `uniform float uTime;
uniform float uAudioLevel;
uniform float uBassLevel;
uniform float uMidLevel;
uniform float uErrorBlend;
uniform float uConnecting;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying float vFresnel;

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main(){
  vNormal=normalize(normalMatrix*normal);
  vPosition=position;
  float slowTime=uTime*0.35;
  float baseNoise=snoise(position*1.2+slowTime)*0.5+0.5;
  float audioNoise=snoise(position*2.5+uTime*0.8);
  float bassNoise=snoise(position*1.0+uTime*0.5);
  float midNoise=snoise(position*3.5+uTime*1.2);
  float idleDisp=baseNoise*0.08+sin(uTime*0.8)*0.02;
  float audioDisp=audioNoise*uAudioLevel*0.35+bassNoise*uBassLevel*0.45+midNoise*uMidLevel*0.2;
  float connectPulse=sin(uTime*4.0)*0.12+sin(uTime*6.5)*0.06;
  float errorShake=sin(uTime*20.0)*0.05*uErrorBlend;
  float displacement=idleDisp+audioDisp+connectPulse*uConnecting+errorShake;
  vDisplacement=displacement;
  vec3 newPosition=position+normal*displacement;
  vec4 mvPosition=modelViewMatrix*vec4(newPosition,1.0);
  vec3 viewDir=normalize(-mvPosition.xyz);
  vec3 worldNormal=normalize(normalMatrix*normal);
  vFresnel=pow(1.0-max(dot(viewDir,worldNormal),0.0),3.0);
  gl_Position=projectionMatrix*mvPosition;
}`;

const orbFragmentShader = `uniform float uTime;
uniform float uAudioLevel;
uniform float uBassLevel;
uniform float uErrorBlend;
uniform float uConnecting;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying float vFresnel;

void main(){
  vec3 purpleCore=vec3(0.424,0.227,0.929);
  vec3 blueAccent=vec3(0.231,0.510,0.965);
  vec3 brightPurple=vec3(0.580,0.345,1.0);
  vec3 white=vec3(1.0);
  vec3 errorRed=vec3(0.937,0.267,0.267);
  float gradientFactor=clamp(vDisplacement*3.0+0.5,0.0,1.0);
  vec3 baseColor=mix(purpleCore,blueAccent,gradientFactor);
  float audioBright=1.0+uAudioLevel*0.6+uBassLevel*0.3;
  float shimmer=dot(normalize(vNormal),normalize(vec3(sin(uTime*0.5),cos(uTime*0.3),0.5)));
  shimmer=shimmer*0.5+0.5;
  baseColor+=shimmer*0.08*blueAccent;
  vec3 fresnelColor=mix(brightPurple,white,vFresnel*0.6);
  float fresnelStrength=vFresnel*(0.7+uAudioLevel*0.8);
  float connectPulse=sin(uTime*3.5)*0.5+0.5;
  float connectBright=1.0+connectPulse*0.4*uConnecting;
  baseColor=mix(baseColor,errorRed,uErrorBlend*0.7);
  vec3 finalColor=baseColor*audioBright*connectBright;
  finalColor=mix(finalColor,fresnelColor,fresnelStrength);
  float centerGlow=max(1.0-length(vPosition.xy)*0.5,0.0);
  finalColor+=purpleCore*centerGlow*0.15;
  finalColor=clamp(finalColor,0.0,1.5);
  float alpha=0.92+vFresnel*0.08;
  gl_FragColor=vec4(finalColor,alpha);
}`;

function getAudioLevels(data: Uint8Array | null) {
  if (!data || data.length === 0) return { overall: 0, bass: 0, mid: 0, high: 0 };
  const len = data.length;
  let sum=0,bassSum=0,midSum=0,highSum=0;
  const bassEnd=Math.floor(len*0.15),midEnd=Math.floor(len*0.5);
  for(let i=0;i<len;i++){const v=data[i]/255;sum+=v;if(i<bassEnd)bassSum+=v;else if(i<midEnd)midSum+=v;else highSum+=v;}
  return{overall:sum/len,bass:bassEnd>0?bassSum/bassEnd:0,mid:(midEnd-bassEnd)>0?midSum/(midEnd-bassEnd):0,high:(len-midEnd)>0?highSum/(len-midEnd):0};
}
function lerp(a: number, b: number, t: number) { return a+(b-a)*t; }

const particleVS = `attribute float size;
uniform float uTime;
uniform float uAudioLevel;
varying float vAlpha;
void main(){
  vec3 p = position;
  float orbitSpeed = 0.3 + uAudioLevel * 0.5;
  float angle = uTime * orbitSpeed;
  float c = cos(angle); float s = sin(angle);
  vec3 rotated = vec3(p.x*c - p.z*s, p.y, p.x*s + p.z*c);
  vec4 mvPos = modelViewMatrix * vec4(rotated, 1.0);
  float dist = length(rotated);
  vAlpha = smoothstep(2.5, 1.2, dist) * (0.4 + uAudioLevel * 0.6);
  gl_PointSize = size * (200.0 / -mvPos.z) * (1.0 + uAudioLevel * 0.5);
  gl_Position = projectionMatrix * mvPos;
}`;

const particleFS = `varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - vec2(0.5));
  if(d > 0.5) discard;
  float glow = 1.0 - smoothstep(0.0, 0.5, d);
  gl_FragColor = vec4(0.58, 0.34, 1.0, glow * vAlpha);
}`;


export default function AudioOrb({ state, isSpeaking, getCaptureAnalyser, getPlaybackAnalyser }: AudioOrbProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef(state);
  const isSpeakingRef = useRef(isSpeaking);
  const captureRef = useRef(getCaptureAnalyser);
  const playbackRef = useRef(getPlaybackAnalyser);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { captureRef.current = getCaptureAnalyser; }, [getCaptureAnalyser]);
  useEffect(() => { playbackRef.current = getPlaybackAnalyser; }, [getPlaybackAnalyser]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let frameId = 0;

    // Smoothed audio values
    let sAudio = 0, sBass = 0, sMid = 0, sError = 0, sConnect = 0;

    async function init() {
      const THREE = await import('three');
      if (disposed || !container) return;

      const w = container.clientWidth;
      const h = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);

      // Scene
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
      camera.position.z = 3.5;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(dpr);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      // Orb
      const orbGeo = new THREE.IcosahedronGeometry(1, 5);
      const orbUniforms = {
        uTime: { value: 0 },
        uAudioLevel: { value: 0 },
        uBassLevel: { value: 0 },
        uMidLevel: { value: 0 },
        uErrorBlend: { value: 0 },
        uConnecting: { value: 0 },
      };
      const orbMat = new THREE.ShaderMaterial({
        vertexShader: orbVertexShader,
        fragmentShader: orbFragmentShader,
        uniforms: orbUniforms,
        transparent: true,
        depthWrite: false,
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      scene.add(orb);

      // Particles
      const pCount = 200;
      const pPositions = new Float32Array(pCount * 3);
      const pSizes = new Float32Array(pCount);
      for (let i = 0; i < pCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1.3 + Math.random() * 1.0;
        pPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pPositions[i * 3 + 2] = r * Math.cos(phi);
        pSizes[i] = 1.5 + Math.random() * 2.5;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
      pGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));
      const pUniforms = {
        uTime: { value: 0 },
        uAudioLevel: { value: 0 },
      };
      const pMat = new THREE.ShaderMaterial({
        vertexShader: particleVS,
        fragmentShader: particleFS,
        uniforms: pUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);

      // Handle resize
      const onResize = () => {
        if (disposed || !container) return;
        const nw = container.clientWidth;
        const nh = container.clientHeight;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };
      window.addEventListener('resize', onResize);

      // Animation loop
      const clock = new THREE.Clock();

      function animate() {
        if (disposed) return;
        frameId = requestAnimationFrame(animate);

        const t = clock.getElapsedTime();
        const dt = Math.min(clock.getDelta(), 0.05);
        const smoothing = 1 - Math.exp(-8 * dt || -0.13);
        const currentState = stateRef.current;

        // Get audio data based on state
        let audioData: Uint8Array | null = null;
        if (currentState === 'listening' && captureRef.current) {
          audioData = captureRef.current();
        } else if ((currentState === 'speaking') && playbackRef.current) {
          audioData = playbackRef.current();
        }
        const levels = getAudioLevels(audioData);

        // Target values
        const tError = currentState === 'error' ? 1 : 0;
        const tConnect = currentState === 'connecting' ? 1 : 0;
        const tAudio = (currentState === 'listening' || currentState === 'speaking') ? levels.overall : (currentState === 'processing' ? 0.15 : 0);
        const tBass = levels.bass;
        const tMid = levels.mid;

        // Smooth interpolation
        sAudio = lerp(sAudio, tAudio, smoothing);
        sBass = lerp(sBass, tBass, smoothing);
        sMid = lerp(sMid, tMid, smoothing);
        sError = lerp(sError, tError, smoothing);
        sConnect = lerp(sConnect, tConnect, smoothing);

        // Update orb uniforms
        orbUniforms.uTime.value = t;
        orbUniforms.uAudioLevel.value = sAudio;
        orbUniforms.uBassLevel.value = sBass;
        orbUniforms.uMidLevel.value = sMid;
        orbUniforms.uErrorBlend.value = sError;
        orbUniforms.uConnecting.value = sConnect;

        // Orb scale
        const targetScale = currentState === 'speaking' ? 1.05 + sAudio * 0.1 :
          currentState === 'processing' ? 0.92 :
          currentState === 'error' ? 0.95 : 1.0;
        orb.scale.setScalar(lerp(orb.scale.x, targetScale, smoothing));

        // Gentle orb rotation
        orb.rotation.y += 0.002;
        orb.rotation.x = Math.sin(t * 0.2) * 0.05;

        // Update particles
        pUniforms.uTime.value = t;
        pUniforms.uAudioLevel.value = sAudio;

        // Particle rotation varies by state
        const pSpeed = currentState === 'processing' ? 0.008 :
          currentState === 'speaking' ? 0.003 + sAudio * 0.005 :
          currentState === 'listening' ? 0.002 + sAudio * 0.003 : 0.001;
        particles.rotation.y += pSpeed;
        particles.rotation.x += pSpeed * 0.3;

        renderer.render(scene, camera);
      }

      animate();

      // Cleanup function
      return () => {
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(frameId);
        orbGeo.dispose();
        orbMat.dispose();
        pGeo.dispose();
        pMat.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    }

    let cleanupFn: (() => void) | undefined;
    init().then(fn => { cleanupFn = fn; });

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      if (cleanupFn) cleanupFn();
    };
  }, []);

  return (
    <div className="relative flex items-center justify-center">
      {/* Ambient glow behind orb */}
      <div
        className={`absolute w-48 h-48 md:w-64 md:h-64 rounded-full transition-all duration-700 ${
          state === 'speaking'
            ? 'bg-purple-600/30 blur-[60px] scale-110'
            : state === 'listening'
            ? 'bg-purple-600/20 blur-[50px] scale-105'
            : state === 'processing'
            ? 'bg-purple-500/25 blur-[45px] scale-95'
            : state === 'error'
            ? 'bg-red-500/20 blur-[40px] scale-95'
            : 'bg-purple-600/10 blur-[40px] scale-100'
        }`}
      />
      {/* Three.js canvas container */}
      <div
        ref={containerRef}
        className="relative w-[280px] h-[280px] md:w-[350px] md:h-[350px]"
      />
    </div>
  );
}

uniform vec3  uColor;
uniform float uTime;
uniform float uWetness;   // 0-1 wet street reflections
uniform float uRoughness;

varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vWorldPos;

// ── simple hash / noise ─────────────────────────────────────
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(
    mix(hash(i), hash(i+vec2(1,0)), f.x),
    mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for(int i=0;i<4;i++) { v+=a*noise(p); p*=2.1; a*=0.5; }
  return v;
}

void main() {
  // ── base concrete wall colour ─────────────────────────────
  float grain = fbm(vUv * 80.0) * 0.08;
  vec3 base = uColor * (0.85 + grain);

  // ── grime streaks ─────────────────────────────────────────
  float streak = fbm(vec2(vUv.x * 4.0, vUv.y * 18.0 + 0.3)) * 0.25;
  base = mix(base, base * 0.55, streak * 0.6);

  // ── neon colour bleed from environment ───────────────────
  float cyanBleed  = smoothstep(0.55, 1.0, fbm(vUv * 3.0 + vec2(uTime*0.04, 0.0)));
  float magentaBleed = smoothstep(0.55, 1.0, fbm(vUv * 3.5 + vec2(0.0, uTime*0.03)));
  base += vec3(0.0, 1.0, 1.0) * cyanBleed * 0.18;
  base += vec3(1.0, 0.1, 0.5) * magentaBleed * 0.14;

  // ── wetness reflection shimmer ────────────────────────────
  float shimmer = fbm(vUv * 60.0 + uTime * 0.8) * uWetness * 0.35;
  base += vec3(0.0, 0.9, 1.0) * shimmer;

  // ── ambient edge darkening ────────────────────────────────
  float edgeV = 1.0 - smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
  float edgeH = 1.0 - smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.96, vUv.y);
  base *= (1.0 - edgeV*0.4) * (1.0 - edgeH*0.3);

  gl_FragColor = vec4(base, 1.0);
}

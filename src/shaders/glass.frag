uniform float uTime;
uniform vec3  uTint;

varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vWorldPos;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}

void main() {
  // ── base tint: dark blue-grey glass ─────────────────────
  vec3 col = vec3(0.04, 0.08, 0.14);

  // ── interior warm light bleed ────────────────────────────
  float interior = smoothstep(0.35, 0.0, length(vUv - vec2(0.5,0.4)));
  col += vec3(1.0, 0.6, 0.2) * interior * 0.45;

  // ── neon reflections on glass surface ────────────────────
  float t = uTime * 0.25;
  float ref1 = noise(vUv * 4.0 + vec2(t, -t*0.7)) * 0.5 + 0.5;
  float ref2 = noise(vUv * 6.0 + vec2(-t*0.5, t*1.1)) * 0.5 + 0.5;
  col += uTint * ref1 * 0.12;
  col += vec3(1.0, 0.1, 0.5) * ref2 * 0.09;

  // ── rain streak reflections ──────────────────────────────
  float rain = noise(vec2(vUv.x * 60.0, vUv.y * 8.0 - uTime * 1.2));
  rain = step(0.77, rain) * 0.25;
  col += vec3(0.2, 0.9, 1.0) * rain;

  // ── fresnel-like edge brightening ───────────────────────
  vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);
  col += uTint * fresnel * 0.3;

  gl_FragColor = vec4(col, 0.72);
}

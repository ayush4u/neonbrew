uniform float uTime;

varying vec2  vUv;
varying vec3  vWorldPos;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p) {
  float v=0.0, a=0.5;
  for(int i=0;i<3;i++){v+=a*noise(p);p*=2.1;a*=0.5;}
  return v;
}

void main() {
  // ── wet asphalt base ──────────────────────────────────────
  float grain = fbm(vUv * 120.0) * 0.09;
  vec3 asphalt = vec3(0.07 + grain, 0.07 + grain, 0.08 + grain);

  // ── puddle / wet mirror reflection ───────────────────────
  // reflection gets brighter near top of street (near building)
  float wetMask = smoothstep(0.0, 0.6, vUv.y);

  // reflected neon colors
  float t = uTime * 0.18;
  float neonCyan    = smoothstep(0.5,1.0, fbm(vUv * 3.0 + vec2(t, 0.0)));
  float neonMagenta = smoothstep(0.5,1.0, fbm(vUv * 3.5 + vec2(0.0, t)));
  float neonOrange  = smoothstep(0.5,1.0, fbm(vUv * 2.8 + vec2(-t*0.7, t*0.5)));
  float orange      = smoothstep(0.5,1.0, fbm(vUv * 4.0 + vec2(t*0.5, -t)));

  vec3 reflection = vec3(0.0);
  reflection += vec3(0.0, 1.0, 1.0)  * neonCyan    * 0.55;
  reflection += vec3(1.0, 0.1, 0.5)  * neonMagenta * 0.45;
  reflection += vec3(1.0, 0.45, 0.0) * neonOrange  * 0.35;
  reflection += vec3(1.0, 0.7, 0.1)  * orange      * 0.25;

  // rain-ripple distortion
  float ripple = noise(vec2(vUv.x * 30.0, vUv.y * 10.0 + uTime * 0.6)) * 0.05;
  reflection *= (0.8 + ripple);

  vec3 col = mix(asphalt, reflection, wetMask * 0.8);

  // ── painted lane lines ────────────────────────────────────
  float line = step(0.497, fract(vUv.x * 5.0)) * step(fract(vUv.x * 5.0), 0.503);
  col = mix(col, vec3(0.28, 0.28, 0.28), line * 0.5);

  // ── distant fade to dark ──────────────────────────────────
  float fog = 1.0 - smoothstep(0.0, 1.0, vUv.y);
  col = mix(col, vec3(0.01, 0.01, 0.02), fog * 0.35);

  gl_FragColor = vec4(col, 1.0);
}

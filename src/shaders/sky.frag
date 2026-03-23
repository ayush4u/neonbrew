uniform float uTime;
varying vec2  vUv;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}

void main() {
  // ── deep night sky gradient ──────────────────────────────
  vec3 top    = vec3(0.01, 0.01, 0.04);
  vec3 mid    = vec3(0.03, 0.01, 0.07);
  vec3 bottom = vec3(0.06, 0.02, 0.10); // purple haze near horizon
  float t = vUv.y;
  vec3 sky = mix(bottom, mix(mid, top, smoothstep(0.3, 0.8, t)), t);

  // ── cloud wisps ──────────────────────────────────────────
  float cloud = noise(vUv * vec2(4.0, 2.0) + vec2(uTime * 0.02, 0.0));
  cloud = smoothstep(0.55, 0.75, cloud) * (1.0 - vUv.y) * 0.18;
  sky += vec3(0.3, 0.0, 0.5) * cloud;

  // ── city haze glow at horizon ────────────────────────────
  float haze = smoothstep(0.3, 0.0, vUv.y) * 0.5;
  sky += vec3(0.05, 0.0, 0.15) * haze;
  sky += vec3(1.0, 0.1, 0.4) * haze * 0.3;

  gl_FragColor = vec4(sky, 1.0);
}

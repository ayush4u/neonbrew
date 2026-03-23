uniform vec3  uColor;
uniform float uTime;
uniform float uFlicker; // 0-1 intensity

varying vec2  vUv;
varying vec3  vWorldPos;

void main() {
  // ── tube glow profile: bright core, soft halo ────────────
  vec2 c = vUv - 0.5;
  float dist = length(c * vec2(8.0, 1.0)); // stretched on x for tube shape
  float core   = smoothstep(0.12, 0.0, dist);
  float halo   = smoothstep(1.0, 0.0, dist * 1.4);

  // ── flicker ──────────────────────────────────────────────
  float flick = 1.0 - uFlicker * (
    step(0.97, fract(uTime * 7.3)) * 0.6 +
    step(0.99, fract(uTime * 13.1)) * 0.3
  );

  float glow = (core * 2.5 + halo * 0.6) * flick;

  vec3 col = uColor * glow;

  // bloom-friendly: additive alpha
  float alpha = clamp(halo * flick, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}

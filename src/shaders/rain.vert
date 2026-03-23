// Rain drop instanced shader
varying float vAlpha;
void main() {
  vAlpha = position.z; // z stores alpha per instance
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy, 0.0, 1.0);
  gl_PointSize = 1.5;
}

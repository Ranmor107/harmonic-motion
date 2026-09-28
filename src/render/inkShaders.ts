// Static paper marks. Grain depends on local coordinates and stable IDs, never frame history.
const grain = `
float grain(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(grain(i),grain(i+vec2(1,0)),f.x),mix(grain(i+vec2(0,1)),grain(i+vec2(1,1)),f.x),f.y);
}`

export const inkMarkVertex = `
attribute vec3 inkParams;
varying vec2 markUv;
varying vec3 markParams;
void main() {
  markUv = uv; markParams = inkParams;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`
export const inkMarkFragment = `
uniform vec3 inkColor;
varying vec2 markUv;
varying vec3 markParams;
${grain}
void main() {
  vec2 p = markUv*2.0-1.0;
  float n = noise(p*8.0+markParams.y*73.0);
  float r = length(p) + (n-.5)*.17;
  float core = 1.0-smoothstep(.32,.76,r);
  float feather = (1.0-smoothstep(.53,.98,r))*.2;
  float alpha = (core+feather)*(0.82+noise(p*55.0)*.18);
  if (markParams.z > .5 && markParams.z < 1.5) {
    // Tapered bamboo brush, anchored to the same accompaniment note.
    float edge = abs(p.y) + pow(abs(p.x),1.4)*.88;
    alpha = (1.0-smoothstep(.55,.84,edge+(n-.5)*.12))*.9;
  }
  if (markParams.z > 1.5) alpha = (1.0-smoothstep(.15,.98,r))*(.6+n*.4);
  alpha *= markParams.x;
  if (alpha < .004) discard;
  gl_FragColor = vec4(inkColor, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
export const inkStrokeVertex = `
attribute vec4 inkColor;
varying vec4 strokeColor;
varying vec2 strokeUv;
varying vec3 strokePosition;
void main() {
  strokeColor = inkColor; strokeUv = uv; strokePosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`
export const inkStrokeFragment = `
varying vec4 strokeColor;
varying vec2 strokeUv;
varying vec3 strokePosition;
${grain}
void main() {
  float edge = abs(strokeUv.y*2.0-1.0);
  float dry = noise(vec2(strokePosition.x*19.0,strokeUv.y*13.0));
  float alpha = (1.0-smoothstep(.52+dry*.2,1.0,edge))*(.68+dry*.32)*strokeColor.a;
  gl_FragColor = vec4(strokeColor.rgb,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

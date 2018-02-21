precision highp float;

attribute vec2 coords;
attribute vec3 quad;

uniform sampler2D posTex;
uniform sampler2D fbTex;
uniform vec2 dims;
uniform mat4 perspective;
uniform mat4 rotation;

varying vec3 color;
varying vec2 quadCoord;

void main(void) {
  quadCoord = quad.xy;
  color = abs(normalize(texture2D(fbTex,coords*dims).rgb));
  vec4 pos = vec4(0.01*quad + (rotation*texture2D(posTex,coords*dims)).xyz,1);
  gl_Position = perspective*pos;
}

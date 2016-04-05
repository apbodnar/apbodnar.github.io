precision highp float;
attribute vec2 coords;
uniform sampler2D posTex;
uniform sampler2D fbTex;
uniform vec2 dims;
uniform mat4 perspective;

varying vec3 color;

void main(void) {
  color = abs(normalize(texture2D(fbTex,coords*dims).rgb))*2.0;
  gl_Position = perspective*texture2D(posTex,coords*dims);
}

precision highp float;
uniform sampler2D fbTex;
uniform sampler2D imageTex;
uniform vec2 dims;

varying vec3 color;

void main(void) {
  gl_FragColor = vec4(color,1);
}

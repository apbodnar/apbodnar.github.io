precision highp float;
uniform sampler2D fbTex;
uniform sampler2D imageTex;
uniform vec2 dims;

void main(void) {
  vec4 cell = texture2D(fbTex,gl_FragCoord.xy/dims).rrra;
  vec4 color = texture2D(imageTex,gl_FragCoord.xy/dims);
  gl_FragColor = cell*color*1.2;
}

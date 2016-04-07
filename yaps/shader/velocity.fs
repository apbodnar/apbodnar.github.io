precision highp float;
uniform int tick;
uniform vec2 dims;
uniform vec3 center;
uniform sampler2D fbTex;
uniform sampler2D posTex;

void main(void) {
  vec3 pos = texture2D(posTex,gl_FragCoord.xy*dims).xyz;
  vec3 diff = center - pos;
  float r = length(diff);
  vec3 acc = normalize(diff);
  vec3 vel = texture2D(fbTex,gl_FragCoord.xy*dims).xyz;

  gl_FragColor = vec4(vel + acc*0.0005,1);
}

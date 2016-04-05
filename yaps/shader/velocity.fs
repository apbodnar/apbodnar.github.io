precision highp float;
uniform int tick;
uniform vec2 dims;
uniform sampler2D fbTex;
uniform sampler2D posTex;

void main(void) {
  vec3 pos = texture2D(posTex,gl_FragCoord.xy*dims).xyz;
  vec3 diff = vec3(0,0,-1.5) - pos;
  float r = length(diff);
  vec3 acc = normalize(diff)/(r);
  vec3 vel = texture2D(fbTex,gl_FragCoord.xy*dims).xyz;

  gl_FragColor = vec4(vel + acc*0.0001,1);
  //gl_FragColor = vec4(vec3(0.01),1);
}

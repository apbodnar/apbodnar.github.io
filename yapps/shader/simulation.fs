#extension GL_EXT_draw_buffers : require

precision highp float;

uniform int tick;
uniform vec2 dims;
uniform vec3 center;
uniform sampler2D fbTex;
uniform sampler2D posTex;

vec3 acceleration(vec3 pos){
  vec3 diff = center - pos;
  float r = length(diff);
  return normalize(diff);
}

void main(void) {
float dt = 0.02;
  vec3 pos_t0 = texture2D(posTex,gl_FragCoord.xy*dims).xyz;
  vec3 vel_t0 = texture2D(fbTex,gl_FragCoord.xy*dims).xyz;
  vec3 acc_t0 = acceleration(pos_t0);
  vec3 pos_t1 = pos_t0 + vel_t0 * dt + 0.5 * acc_t0 * dt * dt;
  vec3 acc_t1 = acceleration(pos_t1);
  vec3 vel_t1 = vel_t0 + 0.5 * (acc_t0 + acc_t1) * dt;

  gl_FragData[0] = vec4(pos_t1, 1); // position
  gl_FragData[1] = vec4(vel_t1,1); // velocity
}

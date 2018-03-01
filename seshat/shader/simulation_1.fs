#extension GL_EXT_draw_buffers : require

precision highp float;

uniform vec2 invDims;
uniform sampler2D accTex;
uniform sampler2D velTex;
uniform sampler2D posTex;

const float DELTA_T = 0.02;

vec4 texelFetch(sampler2D tex, vec2 coords){
  return texture2D(tex, (gl_FragCoord.xy + coords)*invDims);
}

void main(void) {
  vec3 pos_t0 = texelFetch(posTex, vec2(0)).xyz;
  vec3 vel_t0 = texelFetch(velTex, vec2(0)).xyz;
  vec3 acc_t0 = texelFetch(accTex, vec2(0)).xyz;
  vec3 pos_t1 = pos_t0 + vel_t0 * DELTA_T + 0.5 * acc_t0 * DELTA_T * DELTA_T;
  gl_FragData[0] = vec4(pos_t1, 1); // position
  gl_FragData[1] = vec4(vel_t0, 1); // velocity
  gl_FragData[2] = vec4(acc_t0, 1); // acceleration
}

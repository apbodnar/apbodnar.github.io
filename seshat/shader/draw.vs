precision highp float;

attribute vec2 coords;

uniform sampler2D posTex;
uniform sampler2D velTex;
uniform sampler2D accTex;
uniform vec2 invDims;
uniform mat4 perspective;
uniform mat4 rotation;

varying vec3 color;

vec3 getNormal(vec3 pos){
  vec3 n0 = texture2D(posTex,(coords + vec2(0,1))*invDims).xyz;
  vec3 n1 = texture2D(posTex,(coords + vec2(1,0))*invDims).xyz;
  vec3 n2 = texture2D(posTex,(coords + vec2(0,-1))*invDims).xyz;
  vec3 n3 = texture2D(posTex,(coords + vec2(-1,0))*invDims).xyz;
  vec3 c1 = normalize(cross(n0 - pos, n1 - pos));
  vec3 c2 = normalize(cross(n2 - pos, n3 - pos));
  return normalize((c1 + c2) * 0.5);
}

void main(void) {
  //quadCoord = quad.xy;
  //color = abs(normalize(texture2D(accTex,coords*invDims).rgb));
  vec4 pos = texture2D(posTex,coords*invDims);
  color = getNormal(pos.xyz);
  vec4 posTrans = vec4((rotation*pos).xyz,1);
  gl_Position = perspective*posTrans;
}

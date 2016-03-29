precision highp float;
uniform int tick;
uniform vec2 dims;
uniform sampler2D fbTex;

int getCell(float x,float y){
  vec2 tc = (gl_FragCoord.xy + vec2(x,y))/dims;
  return texture2D(fbTex,tc).r > 0.0 ? 1 : 0;
}

vec4 conway(){
  int neighbors = 0;
  for(int i=-1; i<2; i++){
    for(int j=-1; j<2; j++){
      neighbors += (i == 0 && j == 0) ? 0 : getCell(float(j),float(i));
    }
  }
  float living = int(-0.5*dims.y + gl_FragCoord.y + 0.5*dims.y*sin((gl_FragCoord.x + float(tick))*0.01)) == 0 ? 1.0 : -1.0;
  //float living = -1.0;
  bool cell = texture2D(fbTex,gl_FragCoord.xy/dims).r > 0.0;
  if((neighbors == 2 && cell) || neighbors == 3){
    living = 1.0;
  }
  return vec4(living,living,living,1);
}

void main(void) {
  gl_FragColor = conway();
}

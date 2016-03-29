"use strict";
function Conway(){
  var gl;
  var programs = {};
  var buffers = [];
  var textures = [];
  var framebuffers = [];
  var pingpong = 0;
  var scale = 2;

  var paths = [
    "shader/conway.vs",
    "shader/conway.fs",
    "shader/draw.vs",
    "shader/draw.fs",
    "texture/matterhorn.jpg"
  ];

  var assets = {};

  function initGL(canvas) {
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width = window.innerWidth;
    gl.viewportHeight = canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
  }

  function getShader(gl, str, id) {
    var shader = gl.createShader(gl[id]);
    gl.shaderSource(shader, str);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function createFloatTexture(array) {
    var t = gl.createTexture();
    gl.getExtension('OES_texture_float');
    //gl.getExtension('OES_texture_float_linear');
    gl.bindTexture( gl.TEXTURE_2D, t ) ;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.viewportWidth/scale, gl.viewportHeight/scale, 0, gl.RGB, gl.FLOAT, array);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    gl.bindTexture( gl.TEXTURE_2D, null );
    return t;
  }

  function creatImageTexture(img){
    var t = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, t ) ;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.bindTexture( gl.TEXTURE_2D, null );
    return t;
  }

  function createFramebuffer(tex){
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return fbo;
  }

  function initProgram(path, uniforms, attributes) {
    var fs = getShader(gl, assets[path+".fs"],"FRAGMENT_SHADER");
    var vs = getShader(gl, assets[path+".vs"],"VERTEX_SHADER");
    var program = gl.createProgram();
    program.uniforms = {};
    program.attributes = {};
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    uniforms.forEach(function(name){
      program.uniforms[name] = gl.getUniformLocation(program, name);
    });
    attributes.forEach(function(name){
      program.attributes[name] = gl.getAttribLocation(program, name);
    });

    return program;
  }

  function initConwayBuffer(){
    var program = programs.conway;
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    var vertices = [
      1.0,  1.0,  0.0,
     -1.0,  1.0,  0.0,
      1.0, -1.0,  0.0,
     -1.0, -1.0,  0.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    var v1 = new Float32Array(gl.viewportWidth*gl.viewportHeight*3);
    for ( var i=0; i<gl.viewportWidth*gl.viewportHeight*3; i+=3 ){
      v1[i] = Math.random() - 0.5;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    buffers.push(buffer);
    textures.push(createFloatTexture(v1));
    textures.push(createFloatTexture(v1));
    textures.push(creatImageTexture(assets["texture/matterhorn.jpg"]));
    framebuffers.push(createFramebuffer(textures[0]));
    framebuffers.push(createFramebuffer(textures[1]));
  }

  function initDrawBuffer(){
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  }

  function initBuffers(){
    initConwayBuffer();
    initDrawBuffer();
  }

  function initPrograms(){
    programs.conway = initProgram("shader/conway",["fbTex","dims","tick","scale"],["position"]);
    programs.draw = initProgram("shader/draw",["fbTex","imageTex","dims"],["position"]);
  }

  function callConway(i){
    var program = programs.conway;
    gl.useProgram(program);
    gl.uniform1f(program.uniforms.scale, scale);
    gl.uniform1i(program.uniforms.fbTex, 0);
    gl.uniform1i(program.uniforms.tick, i);
    gl.uniform2f(program.uniforms.dims, gl.viewportWidth/scale, gl.viewportHeight/scale);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[(i+1)%2]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[i%2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[0]);
    gl.vertexAttribPointer(program.attributes.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.position);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function callDraw(i){
    var program = programs.draw;
    gl.useProgram(program);
    gl.uniform1i(program.uniforms.fbTex, 0);
    gl.uniform1i(program.uniforms.imageTex, 1);
    gl.uniform2f(program.uniforms.dims, gl.viewportWidth, gl.viewportHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[i%2]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures[2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[0]);
    gl.vertexAttribPointer(program.attributes.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.position);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }


  function tick() {
    requestAnimationFrame(tick);
    pingpong++;
    callConway(pingpong);
    callDraw(pingpong);
  }

  function start(res) {
    assets = res;
    var canvas = document.getElementById("trace");
    initGL(canvas);
    initPrograms();
    initBuffers();
    tick();
  }

  loadAll(paths,start);
};

new Conway();


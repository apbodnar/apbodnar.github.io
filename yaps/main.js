"use strict";
function Particles(){
  var gl;
  var programs = {};
  var buffers = {};
  var textures = {position: [], velocity: []};
  var framebuffers = {position: [], velocity: []};
  var pingpong = 0;
  var scale = 1;
  var texDims = 512;
  var invTexDims = 1/texDims;
  var numPoints = texDims*texDims;
  var perspective = mat4.perspective(mat4.create(), 1.6, window.innerWidth/window.innerHeight, 0.1, 100);

  var paths = [
    "shader/velocity.vs",
    "shader/velocity.fs",
    "shader/position.vs",
    "shader/position.fs",
    "shader/draw.vs",
    "shader/draw.fs"
  ];

  var assets = {};

  function initGL(canvas) {
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
  }

  function getShader(gl, str, id) {
    var shader = gl.createShader(gl[id]);
    gl.shaderSource(shader, str);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(id + gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function createFloatTexture(array) {
    var t = gl.createTexture();
    gl.getExtension('OES_texture_float');
    //gl.getExtension('OES_texture_float_linear');
    gl.bindTexture( gl.TEXTURE_2D, t ) ;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, texDims, texDims, 0, gl.RGB, gl.FLOAT, array);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
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

  function createQuadBuffer(){
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    var vertices = [
      1.0,  1.0,  0.0,
     -1.0,  1.0,  0.0,
      1.0, -1.0,  0.0,
     -1.0, -1.0,  0.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
  }

  function createCoordBuffer(){
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    var vertices = [];
    for(var i=0;i<texDims;i++){
      for(var j=0;j<texDims;j++){
        vertices.push(j,i);
      }
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
  }

  function initSimBuffer(){
    var program = programs.sim;
    var v0 = new Float32Array(numPoints*3);
    var v1 = new Float32Array(numPoints*3);
    for ( var i=0; i<numPoints*3; i+=3 ){
      v0[i] = 0.0;
      v0[i+1] = 0.01;
      v0[i+2] = 0.0;
    }
    for ( var i=0; i<numPoints*3; i+=3 ){
      v1[i] = Math.random() - 0.5;
      v1[i+1] = Math.random() - 0.5;
      v1[i+2] = -Math.random() - 0.5;
    }

    buffers.quad = createQuadBuffer();
    buffers.coords = createCoordBuffer();
    textures.velocity.push(createFloatTexture(v0));
    textures.velocity.push(createFloatTexture(v0));
    framebuffers.velocity.push(createFramebuffer(textures.velocity[0]));
    framebuffers.velocity.push(createFramebuffer(textures.velocity[1]));
    textures.position.push(createFloatTexture(v1));
    textures.position.push(createFloatTexture(v1));
    framebuffers.position.push(createFramebuffer(textures.position[0]));
    framebuffers.position.push(createFramebuffer(textures.position[1]));
  }

  function initBuffers(){
    initSimBuffer();
  }

  function initPrograms(){
    programs.position = initProgram("shader/position",["fbTex","posTex","dims","tick"],["quad"]);
    programs.velocity = initProgram("shader/velocity",["fbTex","posTex","dims","tick"],["quad"]);
    programs.draw = initProgram("shader/draw",["fbTex","imageTex","dims","perspective"],["coords"]);
  }

  function callVelocitySim(i){
    var program = programs.velocity;
    gl.useProgram(program);
    gl.uniform1f(program.uniforms.scale, scale);
    gl.uniform1i(program.uniforms.fbTex, 0);
    gl.uniform1i(program.uniforms.posTex, 1);
    gl.uniform1i(program.uniforms.tick, i);
    gl.uniform2f(program.uniforms.dims, invTexDims, invTexDims);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity[(i+1)%2]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.position[i%2]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.velocity[i%2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.quad);
    gl.vertexAttribPointer(program.attributes.quad, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.quad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function callPositionSim(i){
    var program = programs.position;
    gl.useProgram(program);
    gl.uniform1f(program.uniforms.scale, scale);
    gl.uniform1i(program.uniforms.posTex, 0);
    gl.uniform1i(program.uniforms.fbTex, 1);
    gl.uniform1i(program.uniforms.tick, i);
    gl.uniform2f(program.uniforms.dims, invTexDims, invTexDims);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.position[(i+1)%2]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity[i%2]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.position[i%2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.quad);
    gl.vertexAttribPointer(program.attributes.quad, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.quad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function callSim(i){
    callVelocitySim(i);
    callPositionSim(i);
  }

  function callDraw(i){
    var program = programs.draw;
    gl.useProgram(program);
    gl.uniform1i(program.uniforms.posTex, 0);
    gl.uniform1i(program.uniforms.fbTex, 1);
    gl.uniform2f(program.uniforms.dims, invTexDims, invTexDims);
    gl.uniformMatrix4fv(program.uniforms.perspective, false, perspective);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.position[i%2]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity[i%2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.coords);
    gl.vertexAttribPointer(program.attributes.coords, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.coords);
    gl.drawArrays(gl.POINTS, 0, numPoints);
  }

  function tick() {
    requestAnimationFrame(tick);
    pingpong++;
    callSim(pingpong);
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

new Particles();


var gl;
var active = false;

function initGL(canvas) {
  gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  gl.viewportWidth = canvas.width = window.innerWidth;
  gl.viewportHeight = canvas.height = window.innerHeight;
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
}

function getShader(gl, id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript) {
    return null;
  }

  var str = "";
  var k = shaderScript.firstChild;
  while (k) {
    if (k.nodeType == 3) {
      str += k.textContent;
    }
    k = k.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
      shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
      return null;
  }

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

var shaderProgram;

function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log("Could not initialise shaders");
  }

  gl.useProgram(shaderProgram);
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexTrans");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.tickUniform = gl.getUniformLocation(shaderProgram, "tick");
  shaderProgram.countUniform = gl.getUniformLocation(shaderProgram, "count");
  shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}

function handleTextureLoaded(image, texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR ) ;
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR ) ;
  gl.bindTexture(gl.TEXTURE_2D, null);
}

function initTexture() {
  cubeTexture = gl.createTexture();
  cubeImage = new Image();
  cubeImage.onload = function() { handleTextureLoaded(cubeImage, cubeTexture); }
  cubeImage.src = "matterhorn.jpg";
}

var squareVertexPositionBuffer;
var squareVertexTransBuffer;
var num_vertices;
var max_vertices;

function initBuffers() {
  squareVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  var vertices = [
  1.0,  1.0,  0.0,
  -1.0,  1.0,  0.0,
  1.0, -1.0,  0.0,
  1.0, -1.0,  0.0,
  -1.0,  1.0,  0.0,
  -1.0,  -1.0, 0.0
  ];

  var vbo = new Float32Array(max_vertices*2*9);
  for(var i=0; i<max_vertices; i++){
    for(var j=0; j<18; j++){
      vbo[i*18+j] = vertices[j];
    }
  }
  gl.bufferData(gl.ARRAY_BUFFER, vbo, gl.STATIC_DRAW);

  squareVertexPositionBuffer.itemSize = 3;
  squareVertexPositionBuffer.numItems = 3*max_vertices*2;

  squareVertexTransBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexTransBuffer);

  var trans = [];
  for (var i=0; i < max_vertices; i++) {
	  var c = [2*(Math.random()-0.5),2*( Math.random()-0.5)]
	  for(var j=0; j<6; j++){
		trans.push(c[0]);
		trans.push(c[1]);
	  }
      //trans = trans.concat(c,c,c,c,c,c);
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(trans), gl.STATIC_DRAW);
  squareVertexTransBuffer.itemSize = 2;
  squareVertexTransBuffer.numItems = 3*max_vertices*2;
}

var lastTime = 0;
var elapsed = 0.0;

function animate() {
  var timeNow = new Date().getTime();
  if (lastTime != 0) {
      elapsed += timeNow - lastTime;
  }
  lastTime = timeNow;
}

function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexTransBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, squareVertexTransBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
  gl.uniform1i(shaderProgram.samplerUniform,0);

  gl.uniform1f(shaderProgram.tickUniform, elapsed);
  gl.uniform1i(shaderProgram.countUniform, num_vertices);

  gl.drawArrays(gl.TRIANGLES, 0, num_vertices % max_vertices);
}

function draw(){
  drawScene();
  animate();
  num_vertices += 12;
  num_vertices %= max_vertices;
}

function tick() {
  requestAnimationFrame(tick);
  if(active){
    draw()
  }
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : parseInt(decodeURIComponent(results[1].replace(/\+/g, " ")));
}

function webGLStart() {
  window.addEventListener("mouseover",function(){ active = true; })
  window.addEventListener("mouseout",function(){ active = false; })
  num_vertices = 6;//parseInt(document.getElementById('sites').value);
  max_vertices = getParameterByName("verts") || 60000;
  var canvas = document.getElementById("voronoi_canvas");
  initGL(canvas);
  initShaders();
  initBuffers();
  initTexture();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  draw();
  tick();
  //drawScene();
}

webGLStart()
;

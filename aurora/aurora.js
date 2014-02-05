

var gl;
var num_quads = 200;
var num_strips = 7;
var crunch = 0.06;
var offsets = [{}];
var persp = mat4.create();
mat4.perspective(persp,90.0, screen.width/screen.height, 1.0, 15.0);
var rotation = mat4.create();
mat4.rotateX(rotation, rotation, -0.1);
mat4.translate(rotation, rotation, [0,2,-3.0]);

var squareVertexPositionBuffer = [num_strips];
var squareVertexTransBuffer;

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  } catch (e) {
  }
  if (!gl) {
    console.log("Could not initialise WebGL, sorry :-(");
  }
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
  
  shaderProgram.tickUniform = gl.getUniformLocation(shaderProgram, "tick");
  shaderProgram.crunchUniform = gl.getUniformLocation(shaderProgram, "crunch");
  shaderProgram.countUniform = gl.getUniformLocation(shaderProgram, "num_quads");
  shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
  shaderProgram.perspectiveUniform = gl.getUniformLocation(shaderProgram, "PM");
  shaderProgram.rotationUniform = gl.getUniformLocation(shaderProgram, "R");
  shaderProgram.oszUniform = gl.getUniformLocation(shaderProgram, "osz");

}

function generateStrip(num_quads, crunch) {
  var osy = 0.0;
  var osz = (Math.random() -0.5)*2.0;
  offsets.push({osy: osy, osz: osz});

  vertices = [];
  for(var i=0; i< 2*num_quads+1; i+=2){
    vert1 = [(i*crunch-(crunch*num_quads)), 1*(((i+1)%2) - 0.5), -osz];
    vert2 = [(i*crunch-(crunch*num_quads)), 1*((i%2) -0.5)   ,  -osz];
    vertices = vertices.concat(vert1,vert2);
  }
  return vertices;
}

function initBuffers() {
	var vertices =[];
	for(var i=0; i< num_strips; i++){
		squareVertexPositionBuffer[i] = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer[i]);
		vertices = [];
		vertices = generateStrip(num_quads, crunch);

		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		squareVertexPositionBuffer[i].itemSize = 3;
		squareVertexPositionBuffer[i].numItems = 2*num_quads+2;
	}
	console.log(squareVertexPositionBuffer.length);
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

  for(var i=1 ; i< num_strips; i++){
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer[i]);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer[i].itemSize, gl.FLOAT, false, 0, 0);

    gl.uniform1f(shaderProgram.tickUniform, elapsed);
    gl.uniform1f(shaderProgram.crunchUniform, crunch);
    gl.uniform1f(shaderProgram.countUniform, num_quads);
    gl.uniformMatrix4fv(shaderProgram.perspectiveUniform, false, persp);
    gl.uniformMatrix4fv(shaderProgram.rotationUniform, false, rotation);
    gl.uniform1f(shaderProgram.osyUniform, offsets[i].osy);
    gl.uniform1f(shaderProgram.oszUniform, offsets[i].osz);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer[i].numItems);
  }
}

function tick() {
  requestAnimFrame(tick);
  drawScene();
  animate();
}

function webGLStart() {
  
  var canvas = document.getElementById("aurora_canvas");
  canvas.width = screen.width;
  canvas.height= screen.height;
  initGL(canvas);
  initShaders();
  initBuffers();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_COLOR, gl.ONE);
  tick();
}
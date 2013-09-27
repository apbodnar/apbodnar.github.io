var gl;

    function initGL(canvas) {
        try {
            gl = canvas.getContext("experimental-webgl");
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

        shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexTrans");
        gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
		
		shaderProgram.tickUniform = gl.getUniformLocation(shaderProgram, "tick");
		shaderProgram.countUniform = gl.getUniformLocation(shaderProgram, "count");
		shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    }
	
	function handleLoadedTexture(texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    var vTexture;
    function initTexture() {
        vTexture = gl.createTexture();
        vTexture.image = new Image();
        vTexture.image.onload = function () {
            handleLoadedTexture(vTexture)
        }

        vTexture.image.src = "flower.jpg";
    }

    var squareVertexPositionBuffer;
	var num_triangles;
    function initBuffers() {
        squareVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
        vertices = [
			1.0,  1.0,  0.0,
			-1.0,  1.0,  0.0,
			1.0, -1.0,  0.0,
			1.0, -1.0,  0.0,
			-1.0,  1.0,  0.0,
			-1.0,  -1.0, 0.0
        ];
		
		var vbo = new Float32Array(num_triangles*2*9);
		for(var i=0; i<num_triangles; i++){
			for(var j=0; j<18; j++){
				vbo[i*18+j] = vertices[j];
			}
		}
		gl.bufferData(gl.ARRAY_BUFFER, vbo, gl.STATIC_DRAW);
		//*/
		/*
		var vbo = [];
		for(var i=0; i<num_triangles; i++){
			vbo = vbo.concat(vertices);
		}
		
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vbo), gl.STATIC_DRAW);
		//*/
		
        squareVertexPositionBuffer.itemSize = 3;
        squareVertexPositionBuffer.numItems = 3*num_triangles*2;

        squareVertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
        colors = [];
        for (var i=0; i < num_triangles; i++) {
			var c = [2*(Math.random()-0.5),2*( Math.random()-0.5), 0, 1.0]
            colors = colors.concat(c,c,c,c,c,c);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        squareVertexColorBuffer.itemSize = 4;
        squareVertexColorBuffer.numItems = 3*num_triangles*2;
    }

	 var lastTime = 0;
	 var elapsed = 0;

    function animate() {
        var timeNow = new Date().getTime();
        if (lastTime != 0) {
            elapsed += timeNow - lastTime;
        }
        lastTime = timeNow;
    }
	
	var delta = 1.0;
	
    function drawScene() {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, squareVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
		
		gl.uniform1f(shaderProgram.tickUniform, elapsed/10.0);
		gl.uniform1i(shaderProgram.countUniform, num_triangles);
		gl.uniform1i(shaderProgram.samplerUniform,0);
        gl.drawArrays(gl.TRIANGLES, 0, squareVertexPositionBuffer.numItems);
    }
	
	function tick() {
		requestAnimFrame(tick);
		drawScene();
		animate();
	}

    function webGLStart() {
		num_triangles = parseInt(document.getElementById('sites').value);
        var canvas = document.getElementById("LICcanvas");
        initGL(canvas);
        initShaders();
        initBuffers();
		initTexture();

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
	
		tick();
        //drawScene();
    }
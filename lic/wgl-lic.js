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
        shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
		
		shaderProgram.tickUniform = gl.getUniformLocation(shaderProgram, "tick");
		shaderProgram.aUniform = gl.getUniformLocation(shaderProgram, "a");

    }

    var squareVertexPositionBuffer;

    function initBuffers() {
        squareVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
        vertices = [
             1.0,  1.0,  0.0,
            -1.0,  1.0,  0.0,
             1.0, -1.0,  0.0,
            -1.0, -1.0,  0.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        squareVertexPositionBuffer.itemSize = 3;
        squareVertexPositionBuffer.numItems = 4;

        squareVertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
        colors = [];
        for (var i=0; i < 4; i++) {
            colors = colors.concat([0.5, 0.5, 1.0, 1.0]);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        squareVertexColorBuffer.itemSize = 4;
        squareVertexColorBuffer.numItems = 4;
    }

	function initTexture() {
		var b = new ArrayBuffer(512*512*4);
		var v1 = new Uint8Array(b);

		for ( var i=0; i<512*512*4; i+=4 ){
			v1[i] = Math.floor((Math.random()*255)+1);
			v1[i+1] = Math.floor((Math.random()*255)+1);
			v1[i+2] = Math.floor((Math.random()*255)+1);
			v1[i+3] = 255;
		}
		var texture = gl.createTexture () ;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture  ( gl.TEXTURE_2D, texture ) ;
		gl.texParameteri ( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR ) ;
		gl.texParameteri ( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR ) ;
		gl.texParameteri ( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT ) ;
		gl.texParameteri ( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT ) ;
		gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, v1);
		gl.generateMipmap ( gl.TEXTURE_2D ) ;
		gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);
	}

	function handleTextureLoaded(image, texture) {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
	
	function stringToCoef(s){
		var inc = 0.1;
		var a = [];
		for(i=0; i<12; i++){
			a.push((s.charCodeAt(i)-65)*inc);
		}
		return a;
	}
	console.log("A".charCodeAt(0));
	var astring = ["LUFBBFISGJYS","UWACXDQIGKHF"];
	var delta = 1.0;
	//var a = [12]; for(i=0; i < 12; i++){a[i] = Math.random();}
	var a = stringToCoef(astring[1]);
	var rv = [Math.random(),Math.random(),Math.random(),Math.random()];
	var rs = [Math.random(),Math.random(),Math.random(),Math.random()];
	
    function drawScene() {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
		gl.uniform1f(shaderProgram.tickUniform, delta+=1.0);
		gl.uniform1fv(shaderProgram.aUniform, a);
		gl.uniform4f(gl.getUniformLocation(shaderProgram, "rv"), rv[0],  rv[1],  rv[2], rv[3]);
		gl.uniform4f(gl.getUniformLocation(shaderProgram, "rs"), rs[0],  rs[1],  rs[2], rs[3]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
    }
	
	function tick() {
		requestAnimFrame(tick);
		drawScene();
	}


    function webGLStart() {
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
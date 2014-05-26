//babymen use three.js

function Renderer(canvas){
	var gl;
	var program;
	
	var cubeBuffer;
	var normalBuffer;
    var indexBuffer;

	var CM = mat4.create();
	var MVM = mat4.create();
    var PM = mat4.create();
	var GM = mat4.create();
    var plane_res = 20;
    var plane = [];
    var plane_indices = [];
    var start = new Date().getTime();
	
    function initGL(canvas) {
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		gl.viewportWidth = canvas.width = window.innerWidth;
		gl.viewportHeight = canvas.height = window.innerHeight;
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

    function initShaders() {
        var fs = getShader(gl, "shader-fs");
        var vs = getShader(gl, "shader-vs");

        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            alert("you broke it");
        }

        gl.useProgram(program);
        program.vertexAttribute = gl.getAttribLocation(program, "inVertex");
        gl.enableVertexAttribArray(program.vertexAttribute);
        program.pmUniform = gl.getUniformLocation(program, "PM");
        program.mvmUniform = gl.getUniformLocation(program, "MVM");
		program.widthUniform = gl.getUniformLocation(program, "width");
		program.heightUniform = gl.getUniformLocation(program, "height");
        program.timeUniform = gl.getUniformLocation(program, "time");
		program.vmodeUniform = gl.getUniformLocation(program, "vmode");
		program.fmodeUniform = gl.getUniformLocation(program, "fmode");
    }

    function generatePlane(){
    	var two_pi = Math.PI*2;
    	for(var j=0; j< plane_res; j++){
    		for(var i=0; i<plane_res; i++){
    			x = two_pi*(i/plane_res)*((plane_res+1)/plane_res);
    			y = two_pi*(j/plane_res)*((plane_res+1)/plane_res);
    			plane = plane.concat([x,y,0]);
    		}
    	}
    }

    function generateIndices(){
    	for(var j=0; j< plane_res-1; j++){
    		for(var i=0; i<plane_res-1; i++){
    			plane_indices = plane_indices.concat([i+(j*plane_res),i+((j+1)*plane_res),i+((j+1)*plane_res)+1]);
    			plane_indices = plane_indices.concat([i+((j+1)*plane_res)+1,i+(j*plane_res)+1,i+(j*plane_res)]);
    		}
    	}
    }
	
	function initBuffers() {

		generatePlane();
		generateIndices();

        cubeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(plane), gl.STATIC_DRAW);
        cubeBuffer.itemSize = 3;
        cubeBuffer.numItems = plane.length/cubeBuffer.itemSize;

        indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(plane_indices), gl.STATIC_DRAW);
        indexBuffer.itemSize = 1;
        indexBuffer.numItems = plane_indices.length;
    }

    function drawPlane(PM ,MVM, width, length, mode){
    	gl.uniformMatrix4fv(program.pmUniform, false, PM);
		gl.uniformMatrix4fv(program.mvmUniform, false, MVM);

		gl.uniform1f(program.widthUniform, width);
		gl.uniform1f(program.heightUniform, length);
        gl.uniform1f(program.timeUniform, time);
		gl.uniform1i(program.vmodeUniform, mode);
		gl.uniform1i(program.fmodeUniform, mode);

		gl.drawElements(gl.TRIANGLES, indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
	
	function drawCore(crawler){
		mat4.identity(MVM);
		mat4.translate(MVM, MVM, crawler.core.origin.p);

        drawPlane(PM, MVM, crawler.core.width, crawler.core.width, true);
	}
	
	function getAngle(a){
		var a1 = vec3.normalize(vec3.create(),a);
		var b = vec3.fromValues(0.0,1.0,0.0);
		return Math.atan2(vec3.length(vec3.cross(vec3.create(),a1,b)),a1[1]);
	}

	function drawSegment(crawler, id){
		var origin = crawler.chromosome.segments[id].origin;
		var end = crawler.chromosome.segments[id].end;
		var seg = vec3.normalize(vec3.create(),vec3.sub(vec3.create(),end.p,origin.p));
		var axis = vec3.normalize(vec3.create(),vec3.cross(vec3.create(),seg,[0.0,1.0,0.0]));
		var angle = getAngle(seg);
		var r1 = mat4.rotate(mat4.create(), mat4.create(), -angle, axis);
		mat4.identity(MVM);
		var t2 = mat4.translate(mat4.create(), mat4.create(), origin.p);
		var t1 = mat4.translate(mat4.create(), mat4.create(), [0,crawler.chromosome.segments[id].length/2,0]);

		mat4.multiply(MVM,t2,mat4.multiply(mat4.create(),r1,t1));
		drawPlane(PM, MVM, crawler.core.width/4, crawler.chromosome.segments[id].length/2 + 0.03, true);
	}

	function drawLegs(crawler){
		for(var i=0; i<crawler.segment_ids.length; i++){
			for(var j=0; j<crawler.segment_ids[i].length; j++){
				var id1 = crawler.segment_ids[i][j];
				(id1 !== undefined) && drawSegment(crawler, id1);
			}
		}
	}
	
	function drawGround(ground){
		mat4.identity(GM);
		var t = mat4.translate(mat4.create(), mat4.create(), [-Math.PI*25,ground-0.01,Math.PI*25]);
		var r = mat4.rotateX(mat4.create(), mat4.create(), -Math.PI/2);
		var s = mat4.scale(mat4.create(), mat4.create(), [0.25,0.25,0.25]);
		mat4.multiply(GM,t,mat4.multiply(mat4.create(),r,s));
        drawPlane(PM, GM, crawler.core.width, crawler.core.width, false);
	}
	
	function initRenderer(canvas){
		initGL(canvas);
		initShaders();
		initBuffers();
		initInputHandlers();
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
		gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
        gl.vertexAttribPointer(program.vertexAttribute, cubeBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		mat4.perspective(PM, 45*(Math.PI/180), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
	}
	
	this.drawCrawler = function(crawler,ground) {
        time = new Date().getTime() - start;
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		drawCore(crawler);
		drawLegs(crawler)
		drawGround(ground);
    }
	
	function initInputHandlers(){
		window.addEventListener("keydown", onKeyDown, false);
		window.addEventListener("keyup", onKeyUp, false);
		var cam_pos = [0,0,8];
		var cam_vel = [0,0,0];
		var cam_dir = [0,0,-1];
		var up = [0,1,0];
		var c_trans = mat4.translate(mat4.create(), mat4.create(), cam_pos);
		var c_rot = mat4.create();
		var keyD = 0;
		var keyS = 0;
		var keyA = 0;
		var keyW = 0;
		//mat4.identity(MVM);
		//var t2 = mat4.translate(mat4.create(), mat4.create(), origin.p);
		//var t1 = mat4.translate(mat4.create(), mat4.create(), [0,crawler.chromosome.segments[id].length/2,0]);

		//mat4.multiply(MVM,t2,mat4.multiply(mat4.create(),r1,t1));
		
		function calcCamTransform(){
			
		}
		
		function calcCamVelocity(dir,val){
			var sideways = vec3.cross(vec3.create(),up,cam_dir);
			vec3.add(cam_pos,cam_pos,vec3.scale(vec3.create(),dir,val));
			vec3.add(cam_pos,cam_pos,vec3.scale(vec3.create(),sideways,keyD));
			vec3.add(cam_pos,cam_pos,vec3.scale(vec3.create(),cam_dir,keyW));
			vec3.add(cam_pos,cam_pos,vec3.scale(vec3.create(),cam_dir,keyS));
			vec3.add(cam_pos,cam_pos,vec3.scale(vec3.create(),sideways,keyA));
		}

		function onKeyUp(event){
			var keyCode = event.keyCode;
			switch(keyCode){
			case 68:  //d
				keyD = 0;
				vec3.set(cam_vel,0,0,0);
			break;
			case 83:  //s
				keyS = 0;
				vec3.set(cam_vel,0,0,0);
			break;
			case 65: //a
				keyA = 0;
				vec3.set(cam_vel,0,0,0);
			break;
			case 87: //w
				keyW = 0;
				vec3.set(cam_vel,0,0,0);
			break;
			}
		}
		function onKeyDown(event){
			var keyCode = event.keyCode;
			switch(keyCode){
			case 68:  //d
				keyD = 1;
				calcCamVelocity(sideways,keyD);
			break;
			case 83:  //s
				keyS = -1;
				calcCamVelocity(cam_dir,keyS);
			break;
			case 65: //a
				keyA = -1;
				calcCamVelocity(sideways,keyA);
			break;
			case 87: //w
				keyW = 1;
				calcCamVelocity(cam_dir,keyW);
			break;
			}
		}	
	}
	
	initRenderer(canvas);
}
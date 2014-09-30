var gl,
	letter_program,
	blob_program,
	time = 0,
	plane_res = 200,
	vmode = 0,
	fmode = vmode,
	letters = [],
	vert_buffers = [],
	index_buffers = [],
	blob_buffer,
	blob_indices,
	PM = mat4.create(),
	MVM = mat4.create(),
	t0 = mat4.create(),
	r = mat4.create(),
	tr = mat4.create(),
	t1 = mat4.create(),
	text = "type",
	warp = new Float32Array(10);
	
var char_map = {
	a:27,b:26,c:25,d:24,e:23,f:22,g:21,h:20,i:19,j:18,k:17,l:16,m:15,
	n:14,o: 0,p: 1,q: 2,r: 3,s: 4,t: 5,u: 6,v: 7,w: 8,x: 9,y:10,z:11
}

function handleObjects(el){
	for(var i=0;i<el.length;i++){
		var e = el[0] ? el[i] : el,
			id = e.id,
			positions = e.querySelector("#"+id+"-positions-array").innerHTML,
			normals = e.querySelector("#"+id+"-normals-array").innerHTML,
			indices = e.querySelector('p').innerHTML,
			vcount = e.querySelector('vcount').innerHTML,
			vcount_array = vcount.split(" ").map(parseFloat),
			counts = getIndexSizes(vcount_array),
			pos_array = squashZ(positions.split(" ").map(parseFloat)),
			index_array = getIndices(indices.split(" ").map(parseFloat),0,2,counts.threes,counts.fours);
		letters.push({	vertices: new Float32Array(pos_array),
						indices: new Uint16Array(index_array), 
						vcount: vcount_array, 
						threes: counts.threes,
						fours: counts.fours});
	}
	initRenderer();
}

function squashZ(array){
	for(var i=0 ;i<array.length; i+=3){
		array[i+2] *= 0.5;
	}
	return array;
}

function getIndexSizes(array){
	var threes = 0, fours = 0;
	array.forEach(function(e){
		if(e === 3 )
			threes++;
		else if(e === 4)
			fours++;
	});
	return {threes:threes, fours:fours};
}

function getIndices(array,offset,num_attrs,threes,fours){
	var a = [];
	var cap3 = threes*3*num_attrs;
	var cap4 = fours*4*num_attrs;
	for(var i=0; i<cap3; i+=num_attrs){
		a.push(array[i]);
	}
	for(var i=cap3; i<cap3+cap4; i+=num_attrs*4){
		a.push(array[0*num_attrs+i]);
		a.push(array[1*num_attrs+i]);
		a.push(array[2*num_attrs+i]);
		a.push(array[2*num_attrs+i]);
		a.push(array[3*num_attrs+i]);
		a.push(array[0*num_attrs+i]);
	}
	return a;
}

function generatePlane(){
	var pi = Math.PI+0.0005,
		two_pi = pi*2+0.0005,
		plane = [];
	var push = function(e){
		plane.push(e);
	};
	for(var j=0; j< plane_res; j++){
		for(var i=0; i<plane_res; i++){
			var x = two_pi*(i/plane_res)*((plane_res+1)/plane_res);
			var z = pi*(j/plane_res)*((plane_res+1)/plane_res);
			[x,0,z].forEach(push);
		}
	}
	return plane;
}

function generateIndices(){
	var plane_indices = [];
	var push = function(e){
		plane_indices.push(e);
	};
	for(var j=0; j< plane_res-1; j++){
		for(var i=0; i<plane_res-1; i++){
			[i+(j*plane_res),i+((j+1)*plane_res),i+((j+1)*plane_res)+1].forEach(push);
			[i+((j+1)*plane_res)+1,i+(j*plane_res)+1,i+(j*plane_res)].forEach(push);
		}
	}
	return plane_indices;
}

function getXml(path){
	var oReq = new XMLHttpRequest();
	var parser = new DOMParser();
	oReq.onload = function(r){
		var doc = r.currentTarget.responseXML || parser.parseFromString(r.currentTarget.responseText,"text/xml"),
			geo = doc.getElementsByTagName('geometry');
		handleObjects(geo);
	};
	oReq.open("get", path, true);
	oReq.send();
}

function initBlobBuffer(){
	blob_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, blob_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(generatePlane()), gl.STATIC_DRAW);
	
	blob_indices = gl.createBuffer();
	var indices = generateIndices();
	blob_indices.length = indices.length;
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, blob_indices);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
}

function initLetterBuffers(){
	for(var i=0; i<letters.length; i++){
		vert_buffers.push(gl.createBuffer());
		gl.bindBuffer(gl.ARRAY_BUFFER, vert_buffers[i]);
		gl.bufferData(gl.ARRAY_BUFFER, letters[i].vertices, gl.STATIC_DRAW);

		index_buffers.push(gl.createBuffer());
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffers[i]);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, letters[i].indices, gl.STATIC_DRAW);
	}
}

function start(){
	//getXml("cube.xml");
	//getXml("./alphabetbigtnr.dae");
	getXml("./alphabetsmalltnr.dae");
}

function initGL() {
	var canvas = document.getElementById("c"),
		input = document.getElementById("user");
	gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	gl.viewportWidth = canvas.width = window.innerWidth;
	gl.viewportHeight = canvas.height = window.innerHeight;
	document.onclick = function(){
		input.focus();
	}
	
	input.oninput = function(e){
		inputHandler(e);
	};
}

function inputHandler(e){
	text = e.target.value || "";
	text = text.toLowerCase();
	vmode = fmode = text == "jeanette" ? 1 : 0;
	for(var i=0; i<text.length; i++){
		warp[i] = text.charCodeAt(i)-96;
	}
	for(var i=text.length; i<10; i++){
		warp[i] = 1.0;
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

function initPrograms(){
	letter_program = gl.createProgram();
	initProgram(letter_program, "letter");
	blob_program = gl.createProgram();
	initProgram(blob_program, "blob");
}

function initProgram(program, type) {
	var fs = getShader(gl, type+"-shader-fs");
	var vs = getShader(gl, type+"-shader-vs");

	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	
	gl.useProgram(program);
	program.vertexAttribute = gl.getAttribLocation(program, "inVertex");
	gl.enableVertexAttribArray(program.vertexAttribute);
	program.pmUniform = gl.getUniformLocation(program, "PM");
	program.mvmUniform = gl.getUniformLocation(program, "MVM");
	program.timeUniform = gl.getUniformLocation(program, "time");
	program.warpUniform = gl.getUniformLocation(program, "warp");
	program.vmodeUniform = gl.getUniformLocation(program, "vmode");
	program.fmodeUniform = gl.getUniformLocation(program, "fmode");
}

function initRenderer(){
	initGL();
	initPrograms();
	initLetterBuffers();
	initBlobBuffer();
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	mat4.perspective(PM, 45*(Math.PI/180), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
	animate();
}

function drawBlob(){
	gl.useProgram(blob_program);
	gl.bindBuffer(gl.ARRAY_BUFFER, blob_buffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, blob_indices);
	gl.vertexAttribPointer(blob_program.vertexAttribute, 3, gl.FLOAT, false, 0, 0);
	mat4.identity(MVM);
	mat4.rotateY(MVM, MVM, -time/179.0);
	if(!vmode){
		mat4.rotateX(MVM, MVM, time/245.2);
		mat4.rotateZ(MVM, MVM, time/309.7);
	}
	mat4.translate(MVM, MVM, [0,0,-10]);
	gl.uniformMatrix4fv(blob_program.pmUniform, false, PM);
	gl.uniformMatrix4fv(blob_program.mvmUniform, false, MVM);
	gl.uniform1fv(blob_program.warpUniform, warp);
	gl.uniform1f(blob_program.timeUniform, time);
	gl.uniform1i(blob_program.vmodeUniform, vmode);
	gl.uniform1i(blob_program.fmodeUniform, fmode);
	gl.drawElements(gl.TRIANGLES,blob_indices.length, gl.UNSIGNED_SHORT, 0);
}

function drawLetters(text, y){
	gl.useProgram(letter_program);
	for(var i=0; i<text.length; i++){
		var buffer_index = char_map[text.charAt(i)];
		gl.bindBuffer(gl.ARRAY_BUFFER, vert_buffers[buffer_index]);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffers[buffer_index]);
		gl.vertexAttribPointer(letter_program.vertexAttribute, 3, gl.FLOAT, false, 0, 0);
		mat4.identity(MVM);
		mat4.identity(t0);
		mat4.identity(t1);
		mat4.identity(r);
		mat4.translate(t0, t0, [0.6*(i-text.length/2),0,0]);
		mat4.rotateY(r, r, time/200.0);
		mat4.translate(t1, t1, [0,y,-10]);
		mat4.mul(tr, t1, r);
		mat4.mul(MVM, tr, t0);
		gl.uniformMatrix4fv(letter_program.pmUniform, false, PM);
		gl.uniformMatrix4fv(letter_program.mvmUniform, false, MVM);
		gl.uniform1f(letter_program.timeUniform, time);
		gl.drawElements(gl.TRIANGLES,letters[buffer_index].threes*3+letters[buffer_index].fours*6, gl.UNSIGNED_SHORT, 0);
	}
}

function draw(){
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	drawLetters(text, -3);
	if(vmode){
		drawLetters("adam", 3);
	}
	drawBlob();
}

function animate(){
	window.requestAnimationFrame(animate);
	draw();
	time++;
};


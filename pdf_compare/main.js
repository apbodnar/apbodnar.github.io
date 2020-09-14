// If absolute URL from the remote server is provided, configure the CORS
// header on that server.
// Loaded via <script> tag, create shortcut to access PDF.js exports.
let PDFJS = window['pdfjs-dist/build/pdf'];

function loadFromInputAndRender(fileInput, canvas) {
    fileInput.onchange = function (event) {
        var file = event.target.files[0];
        //Step 2: Read the file using file reader
        var fileReader = new FileReader();
        fileReader.onload = function () {
            //Step 4:turn array buffer into typed array
            let typedarray = new Uint8Array(this.result);
            //Step 5:PDFJS should be able to read this
            PDFJS.getDocument(typedarray).promise.then(function (pdf) {
                console.log('PDF loaded');
                // Fetch the first page
                let pageNumber = 1;
                pdf.getPage(pageNumber).then(function (page) {
                    console.log('Page loaded');
                    let viewport = page.getViewport({ scale: 1 });
                    // Prepare canvas using PDF page dimensions
                    let context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    // Render PDF page into canvas context
                    let renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    let renderTask = page.render(renderContext);
                    renderTask.promise.then(function () {
                        console.log('Page rendered');
                    });
                });
            }, function (reason) {
                // PDF loading error
                console.error(reason);
            });
        };
        //Step 3:Read the file as ArrayBuffer
        fileReader.readAsArrayBuffer(file);
    }
}

function drawDiff(canvas1, canvas2, diffCanvas) {
    let fragmentElement = document.getElementById('fragment')
    let vertexElement = document.getElementById('vertex')
    diffCanvas.width = Math.max(canvas1.width, canvas1.height);
    diffCanvas.height = Math.max(canvas1.width, canvas1.height);
    let gl = diffCanvas.getContext("webgl2", {
        preserveDrawingBuffer: true,
        antialias: false,
        powerPreference: "high-performance"
    });

    function getShader(str, id) {
        let shader = gl.createShader(gl[id]);
        gl.shaderSource(shader, str);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log(id + gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    let tex1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas1);

    let tex2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex2);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas2);

    let fs = getShader(fragmentElement.textContent, "FRAGMENT_SHADER");
    let vs = getShader(vertexElement.textContent, "VERTEX_SHADER");
    let program = gl.createProgram();
    let uniforms = ["tex1", "tex2"];
    let attributes = ["corner"]
    program.uniforms = {};
    program.attributes = {};
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    uniforms.forEach(function (name) {
        program.uniforms[name] = gl.getUniformLocation(program, name);
    });
    attributes.forEach(function (name) {
        program.attributes[name] = gl.getAttribLocation(program, name);
    });

    let squareBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareBuffer);
    let vertices = [
        -1.0, 3.0, 0.0,
        3.0, -1.0, 0.0,
        -1.0, -1.0, 0.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(program, 3, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, diffCanvas.width, diffCanvas.height);
    gl.enableVertexAttribArray(program.attributes.corner);
    gl.uniform1i(program.uniforms.tex1, 0);
    gl.uniform1i(program.uniforms.tex2, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

let canvas1 = document.getElementById('pdf1');
let canvas2 = document.getElementById('pdf2');
let diffCanvas = document.getElementById('diff');
let input1 = document.getElementById('input1');
let input2 = document.getElementById('input2');
let compare = document.getElementById('compare');

loadFromInputAndRender(input1, canvas1);
loadFromInputAndRender(input2, canvas2);

compare.addEventListener('click', (e) => {
    drawDiff(canvas1, canvas2, diffCanvas)
})
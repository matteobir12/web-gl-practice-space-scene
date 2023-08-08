let gl;
let canvas;
let vao, vao2, vao3,BackgroundVao;
let modelShaderProgram, lightShaderProgram,backgroundProgram;
let cow_pos = vec3(4,40,-100);
let camera_matrix = mat4();
let cowNormals;
let lightOnePos = vec3(50,5,-50);
let lightTwoPos = vec3(0, 6, 6);
let lightTwoDirection = vec3(0, 0.5, 0.5);
let Xtheta = 0;
let Ytheta = 0;
let Ztheta = 0;
let fov = 35;
let lightingAngle = 10;
let lOneRot = true;
let lTwoPan = true;
let d = new Date().getTime();
let startPos = 1.57;
let nStartPos = 0;
let textures = {};
let modelsData = {};
let vertices, faces,uMatLoc,lightuMatLoc;
let uWorld,uWorldInverseTranspose,uLightPosition,uLightDirection,uLightIsOn,uLightColor,uLightIsDirectional, uViewerWorldPosition,shininessLocation,lightCuttoffLocation,shininess = 100,ambientLightLoc,uUseTextureLoc,uTextureLoc,inColorLoc;
let skyboxLocation,viewDirectionProjectionInverseLocation;
async function setup() {
    initializeContext();
    translateCamera([44,28,-32]);
    Ytheta = -20;
    Xtheta = 145;
    rotateCamera()
    // Set event listeners
    setEventListeners();
    const shaderPaths = [
        './shaders/sceneObject.vert',
        './shaders/sceneObject.frag',
        './shaders/unaffecteByLighting.vert',
        './shaders/unaffecteByLighting.frag',
        './shaders/background.vert',
        './shaders/background.frag',
    ];
    let shader_files = (await Promise.all(shaderPaths.map(loadShaderFile))).map((e,i) => {
        return [shaderPaths[i], e];
    });
    let models = []
    let modelNames = ['shuttle','moon','cloud'];
    loadModels(modelNames,models);
    
    modelShaderProgram = compileShaders([shader_files[0],shader_files[1]]);
    lightShaderProgram = compileShaders([shader_files[2],shader_files[3]]);
    backgroundProgram = compileShaders([shader_files[4],shader_files[5]]);

    vertices = get_vertices();
    faces = get_faces();
    cowNormals = Array(vertices.length);
    faces.forEach((e) => {
        let v1 = normalize(subtract(vertices[e[0]-1],vertices[e[1]-1]));
        let v2 = normalize(subtract(vertices[e[0]-1],vertices[e[2]-1]));
        let norm = normalize(cross(v1,v2));
        for (let i = 0; i <3;i++){
            if (cowNormals[e[i]-1]){
                cowNormals[e[i]-1] = add(cowNormals[e[i]-1],norm).map(z=>z/2); 
            }else{
                cowNormals[e[i]-1] = vec3(...norm);
            }
        }
        
        
    });
    let bgprom = createBackgroundTexture();
    cowNormals = flatten(cowNormals);
    vertices = flatten(vertices);
    faces = flatten(faces).map((e) => {
        return e - 1;
      });

    // cow
    
    let aPositionLocation = gl.getAttribLocation(modelShaderProgram, 'aPosition');
    let uNormalLocation = gl.getAttribLocation(modelShaderProgram, 'aNormal');
    let texCoordLocation = gl.getAttribLocation(modelShaderProgram, 'aTextCoord');
    shininessLocation = gl.getUniformLocation(modelShaderProgram, "uShininess");
    uMatLoc = gl.getUniformLocation(modelShaderProgram, 'uMat');
    uWorld = gl.getUniformLocation(modelShaderProgram, 'uWorld');
    lightCuttoffLocation = gl.getUniformLocation(modelShaderProgram, 'lightCuttoff');
    uWorldInverseTranspose = gl.getUniformLocation(modelShaderProgram, 'uWorldInverseTranspose');
    uLightPosition = gl.getUniformLocation(modelShaderProgram, 'uLightPosition');
    uLightDirection = gl.getUniformLocation(modelShaderProgram, 'uLightDirection');
    uLightIsOn = gl.getUniformLocation(modelShaderProgram, 'uLightIsOn');
    uLightColor = gl.getUniformLocation(modelShaderProgram, 'uLightColor');
    uLightIsDirectional = gl.getUniformLocation(modelShaderProgram, 'uLightIsDirectional');
    uViewerWorldPosition = gl.getUniformLocation(modelShaderProgram, 'uViewerWorldPosition');
    ambientLightLoc = gl.getUniformLocation(modelShaderProgram, 'ambientLight');
    uUseTextureLoc = gl.getUniformLocation(modelShaderProgram, 'uUseTexture');
    uTextureLoc = gl.getUniformLocation(modelShaderProgram, 'uTexture');
    inColorLoc = gl.getUniformLocation(modelShaderProgram, 'inColor');
    // for models
    models = await Promise.all(models);
    models.forEach((model, i) => {
        modelsData[modelNames[i]] = {};
        const [objData,mtlData] = model;
        loadTextures(mtlData.materialsData);
        
        for (const element of objData.geometries){

            let color = mtlData.materialsData[element.material]['d'] || vec4(0,0,0,1);
            if (color.length != 4){
                if (color.length == 3){
                    color.push(1);
                } else {
                    color =  vec4(0,0,0,1);
                }
            }
            // VAO
            let modelVao = gl.createVertexArray();
            gl.bindVertexArray(modelVao);

            let vertexBuffer = gl.createBuffer();
            let texcoordBuf = gl.createBuffer();
            let normalBuffer = gl.createBuffer();

            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(element.data.position), gl.STATIC_DRAW); 
    
            gl.enableVertexAttribArray(aPositionLocation);
            gl.vertexAttribPointer(aPositionLocation, 3, gl.FLOAT, false, 0, 0);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(element.data.texcoord), gl.STATIC_DRAW);

            gl.enableVertexAttribArray(texCoordLocation);
            gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
    
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(element.data.normal), gl.STATIC_DRAW);
            
            gl.enableVertexAttribArray(uNormalLocation);
            gl.vertexAttribPointer(uNormalLocation, 3, gl.FLOAT, false, 0, 0);
            
            modelsData[modelNames[i]][element.material] = createModel(modelVao,element.data.position.length/3,color,textures[element.material] || false);
        }       
    });
    // scene setup
    let c = modelsData['cloud']['cloud'];
    let scm = mult(scalem(0.08,0.08,0.08),c.modelMatrix)
    scm[0][3] = 6;
    scm[1][3] = -2;
    scm[2][3] = -1;
    c.modelMatrix = mult(rotate(90,[0,1,0]),scm);
    modelsData['cloud']['cloud2'] = createModel(c.modelVao,c.modelLen,c.diffuseColor,c.texture,mat4(...c.modelMatrix),vec3());

    // let reflectMat = mat4();
    // reflectMat[0][0] = -1;
    // modelsData['cloud']['cloud2'].modelMatrix= mult(reflectMat,modelsData['cloud']['cloud2'].modelMatrix);
    modelsData['cloud']['cloud2'].modelMatrix[0][3] = 2.5;

    let m = modelsData['moon']['moon'];
    scm = mult(scalem(20,20,20),m.modelMatrix)
    scm[0][3] = -100;
    scm[1][3] = 7;
    scm[2][3] = 6;
    m.modelMatrix = mult(rotate(90,[0,1,0]),scm);
    modelsData['earth'] = {}
    scm = mult(scalem(1.5,1.5,1.5),scm)
    scm = mult(rotate(20,[0,1,0]),scm);
    scm[0][3] = 6;
    scm[1][3] = 7;
    scm[2][3] = -100;
    
    let fakeMTL = {'earth':{'tex':'./textures/earth/base color.jpg'}}
    loadTextures(fakeMTL);
    modelsData['earth']['earth'] = createModel(m.modelVao,m.modelLen,m.diffuseColor,textures['earth'] || false,mat4(...scm),vec3());
    // wireframe
    let lightaPositionLocation = gl.getAttribLocation(lightShaderProgram, 'a_position');
    lightuMatLoc = gl.getUniformLocation(lightShaderProgram, 'uMat');

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // cow buffs and VAO
    let vertexBuffer = gl.createBuffer();
    let faceBuffer = gl.createBuffer();
    let normalBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW); 
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faceBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(aPositionLocation);
    gl.vertexAttribPointer(aPositionLocation, 3, gl.FLOAT, false, 0, 0);
    
    
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cowNormals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(uNormalLocation);
    gl.vertexAttribPointer(uNormalLocation, 3, gl.FLOAT, false, 0, 0);

    // cube buffs and VAO
    vao2 = gl.createVertexArray();
    gl.bindVertexArray(vao2);

    let cubeVertexBuffer = gl.createBuffer();
    let cubeFaceBuffer = gl.createBuffer();


    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(getWireFrameVerts()), gl.STATIC_DRAW); 

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeFaceBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(getWireFrameFaces()), gl.STATIC_DRAW);
    
    gl.enableVertexAttribArray(lightaPositionLocation);
    gl.vertexAttribPointer(lightaPositionLocation, 3, gl.FLOAT, false, 0, 0);
    
    vao3 = gl.createVertexArray();
    gl.bindVertexArray(vao3);

    let coneVertexBuffer = gl.createBuffer();
    let coneFaceBuffer = gl.createBuffer();


    gl.bindBuffer(gl.ARRAY_BUFFER, coneVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(getWireFrameConeVerts()), gl.STATIC_DRAW); 

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, coneFaceBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(getWireFrameConeFaces()), gl.STATIC_DRAW);
    
    gl.enableVertexAttribArray(lightaPositionLocation);
    gl.vertexAttribPointer(lightaPositionLocation, 3, gl.FLOAT, false, 0, 0);

    // Background
    BackgroundVao = gl.createVertexArray();
    gl.bindVertexArray(BackgroundVao);

    let backVertexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, backVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, BackgroundPositions(), gl.STATIC_DRAW);

    let backaPositionLocation = gl.getAttribLocation(backgroundProgram, 'aPosition');
    gl.enableVertexAttribArray(backaPositionLocation);
    gl.vertexAttribPointer(backaPositionLocation, 2, gl.FLOAT, false, 0, 0);

    skyboxLocation = gl.getUniformLocation(backgroundProgram, "uSkybox");
    viewDirectionProjectionInverseLocation = gl.getUniformLocation(backgroundProgram, "uViewDirectionProjectionInverse");
    await Promise.all( [bgprom ]);
    document.getElementById('load').innerHTML = '';
    requestAnimFrame(render);
};

async function loadShaderFile(url) {
    return fetch(url).then(response => response.text());
}


window.onload = setup;
document.oncontextmenu = (event) => {
    event.preventDefault();
};
// Sets up the canvas and WebGL context.
function initializeContext() {
    canvas = document.getElementById('canvas');
    canvas.height = 800;
    canvas.width = 1800;
    canvas.style.border = '5px solid';

    gl = canvas.getContext('webgl2');

    // Set the viewport size
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Set the clear color to white.
    // Set the line width to 1.0.
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    //gl.clearColor(0.0,0.0,0.0, 1);
    gl.enable(gl.CULL_FACE);
    
    gl.lineWidth(1.0);
    
    console.log("WebGL initialized.");
}

// Compile the GLSL shader stages and combine them
// into a shader program.
function compileShaders(shader_files) {
    const createShader = (type, name,source) => {
        let shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            logError('An error occurred compiling the shader '+name+': ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
    let vertexShader = createShader(gl.VERTEX_SHADER, ...shader_files[0]);
    let fragmentShader = createShader(gl.FRAGMENT_SHADER, ...shader_files[1]);
    
    let shaderProgram = gl.createProgram();
    
    if (vertexShader)
        gl.attachShader(shaderProgram, vertexShader);

    if (fragmentShader)
        gl.attachShader(shaderProgram, fragmentShader);

    gl.linkProgram(shaderProgram);

    if ( !gl.getProgramParameter(shaderProgram, gl.LINK_STATUS) ) {
        const msg = "Shader program failed to link.  The error log is:"
            + "<pre>" + gl.getProgramInfoLog( shaderProgram ) + "</pre>";
        alert( msg );
    }

    console.log("Shader program compiled successfully.");
    return shaderProgram;
}
let fnAvg = {rc: 0,smpv:0,dc:0,dm:0,dl:0,dcl:0,mvm:0,db:0};
let debug = false;
let cnt = 0;
function render(){
    start = window.performance.now();
    
    rotateCamera();

    if(debug){
        let curTime = window.performance.now();
        fnAvg.rc = Math.trunc((fnAvg.rc + (curTime - start))/2);
        start = curTime;

    }
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let viewMat = inverse(camera_matrix);
    let projectionMatrix = perspective(fov, canvas.width / canvas.height, 0.1, 1000.0);

    // draw models
    gl.useProgram(modelShaderProgram);
    setModelProgramVals();
    if(debug){
        let curTime = window.performance.now();
        fnAvg.smpv = Math.trunc((fnAvg.smpv + (curTime - start))/2);
        start = curTime;
    }

    draw_cow(viewMat,projectionMatrix);
    if(debug){
        let curTime = window.performance.now();
        fnAvg.dc = Math.trunc((fnAvg.dc + (curTime - start))/2);
        start = curTime;
    }

    drawModels(viewMat,projectionMatrix);
    if(debug){
        let curTime = window.performance.now();
        fnAvg.dm = Math.trunc((fnAvg.dm + (curTime - start))/2);
        start = curTime;
    }

    // draw else
    gl.useProgram(lightShaderProgram);

    // moveFirstLight();
    // panSecondLight();
    moveModels();
    if(debug){
        let curTime = window.performance.now();
        fnAvg.mvm = Math.trunc(((fnAvg.mvm + (curTime - start))/2)*10);
        start = curTime;
    }

    // draw background
    drawBackground(viewMat);
    if(debug){
        let curTime = window.performance.now();
        fnAvg.db = Math.trunc((fnAvg.db + (curTime - start))/2);
        start = curTime;
    }

    if (debug) {
        if (cnt %120) {
            console.log(window.performance.now());
            updateAvgs();
        }
        cnt+=1;
    }
    window.requestAnimationFrame(render);
}

let rclbl = document.getElementById('rc')
let smpvlbl = document.getElementById('smpv')
let dclbl = document.getElementById('dc')
let dmlbl = document.getElementById('dm')
let dllbl = document.getElementById('dl')
let dcllbl = document.getElementById('dcl')
let mvmlbl = document.getElementById('mvm')
let dblbl = document.getElementById('db')
function updateAvgs(){
    rclbl.innerText = "rc: " + fnAvg.rc;
    smpvlbl.innerText = "smpv: " + fnAvg.smpv;
    dclbl.innerText = "dc: " + fnAvg.dc;
    dmlbl.innerText = "dm: " + fnAvg.dm;
    dllbl.innerText = "dl: " + fnAvg.dl;
    dcllbl.innerText = "dcl: " + fnAvg.dcl;
    mvmlbl.innerText = "mvm: " + fnAvg.mvm;
    dblbl.innerText = "db: " + fnAvg.db;

}

function setModelProgramVals(){
    gl.uniform3fv(uLightPosition,new Float32Array([...lightOnePos,...lightTwoPos]));
    gl.uniform3fv(uLightDirection,new Float32Array([0,0,0,...lightTwoDirection]));
    gl.uniform3fv(uLightColor,new Float32Array([.04,.04,.04],[.04,.04,.04]));
    gl.uniform1f(lightCuttoffLocation, Math.cos(radians(lightingAngle)));
    gl.uniform3f(uViewerWorldPosition,camera_matrix[3][0],camera_matrix[3][1],camera_matrix[3][2]);
    gl.uniform1iv(uLightIsDirectional, [false,true].map(value => value ? 1 : 0));
    gl.uniform1iv(uLightIsOn, [true,false].map(value => value ? 1 : 0));
    gl.uniform1f(shininessLocation, shininess);
    gl.uniform1f(ambientLightLoc, .4);

    
}

function moveModels(){
    for (const model in modelsData){
        for (const geo in modelsData[model]){
            const geoOb = modelsData[model][geo];
            const x = geoOb.modelMatrix[0][3];
            const y = geoOb.modelMatrix[1][3];
            const z = geoOb.modelMatrix[2][3];
            // if (Ytheta) {
            //     let rotationMatrixY = mat4();
        
            //     rotationMatrixY = mult(rotate(Ytheta, [1, 0, 0]), rotationMatrixY);
        
            //     camera_matrix = mult(camera_matrix, rotationMatrixY);
            //     Ytheta = 0;
            // }
            // if (Xtheta) {
            //     let rotationMatrixX = mat4();
            //     rotationMatrixX = mult(rotate(Xtheta, [0, 1, 0]), rotationMatrixX);
            //     camera_matrix = mult(rotationMatrixX,camera_matrix);
            //     Xtheta = 0;
            // }
            geoOb.modelMatrix[0][3] = x + geoOb.modelVelo[0];
            geoOb.modelMatrix[1][3] = y + geoOb.modelVelo[1];
            geoOb.modelMatrix[2][3] = z + geoOb.modelVelo[2];
        }
        
    }
   
}

function rotateCamera() {
    const x = camera_matrix[0][3]
    const y = camera_matrix[1][3]
    const z = camera_matrix[2][3]
    if (Ytheta) {
        let rotationMatrixY = mat4();

        rotationMatrixY = mult(rotate(Ytheta, [1, 0, 0]), rotationMatrixY);

        camera_matrix = mult(camera_matrix, rotationMatrixY);
        Ytheta = 0;
    }
    if (Xtheta) {
        let rotationMatrixX = mat4();
        rotationMatrixX = mult(rotate(Xtheta, [0, 1, 0]), rotationMatrixX);
        camera_matrix = mult(rotationMatrixX,camera_matrix);
        Xtheta = 0;
    }
    camera_matrix[0][3] = x;
    camera_matrix[1][3] = y;
    camera_matrix[2][3] = z;
}

function drawBackground(viewMat){

    // Subtract the previous time from the current time

    gl.useProgram(backgroundProgram);
    gl.bindVertexArray(BackgroundVao);
    let projectionMatrix = perspective(fov, canvas.width / canvas.height, 1, 2000);
 
    // camera going in circle 2 units from origin looking at origin
    // let cameraPosition = [Math.cos(time * .1), 0, Math.sin(time * .1)];
    // Compute the camera's matrix using look at.
    //let cameraMatrix = lookAt(normalize(vec3(cam_pos)), target, up);
    
    // Make a view matrix from the camera matrix.
    let viewMatrix = mat4(...viewMat);
    // We only care about direction so remove the translation
    viewMatrix[0][3] = 0;
    viewMatrix[1][3] = 0;
    viewMatrix[2][3] = 0;
    //console.log(viewMatrix)
    let viewDirectionProjectionMatrix = mult(projectionMatrix, viewMatrix);
    let viewDirectionProjectionInverseMatrix = inverse(viewDirectionProjectionMatrix);
    // Set the uniforms
    gl.uniformMatrix4fv(viewDirectionProjectionInverseLocation, false, flatten(viewDirectionProjectionInverseMatrix));
    
    // Tell the shader to use texture unit 0 for u_skybox
    gl.uniform1i(skyboxLocation, 0);

    // let our quad pass the depth test at 1.0
    gl.depthFunc(gl.LEQUAL);

    // Draw the geometry.
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
}

let diff = 0.01;
function panSecondLight(){
    if (!lTwoPan)
        return;
    lightTwoDirection[0] += diff;
    if (lightTwoDirection[0] > 1 || lightTwoDirection[0] < -1){
        diff *=-1;
    }
}

function drawLight(lightPos,viewMat){
    let projectionMatrix = perspective(fov, canvas.width / canvas.height, 0.1, 100.0);
    let modelMatrix = mat4(
                        1.0, 0.0, 0.0,  lightPos[0],
                        0.0, 1.0, 0.0,  lightPos[1],
                        0.0, 0.0, 1.0,  lightPos[2],
                        0.0, 0.0, 0.0, 1.0);
    let trans = mult(projectionMatrix,mult(viewMat,modelMatrix))

    gl.uniformMatrix4fv(lightuMatLoc, false, flatten(trans));
    
    gl.drawElements(gl.LINES, 24, gl.UNSIGNED_SHORT, 0);
}
function drawConeLight(lightPos,viewMat){
    let projectionMatrix = perspective(fov, canvas.width / canvas.height, 0.1, 100.0);
    let modelMatrix = translate(lightPos[0],lightPos[1],lightPos[2])
    modelMatrix = mult(rotate(90,[0,0,1]),modelMatrix);
    let trans = mult(projectionMatrix,mult(viewMat,modelMatrix))

    gl.uniformMatrix4fv(lightuMatLoc, false, flatten(trans));
    
    gl.drawElements(gl.LINE_LOOP, 12, gl.UNSIGNED_SHORT, 0);
}

function drawModels(viewMat,projectionMatrix) {

    for (const model in modelsData){
        for (const geo in modelsData[model]){
            const geoOb = modelsData[model][geo];
            gl.bindVertexArray(geoOb.modelVao)
            let modelMatrix = geoOb.modelMatrix;
            let trans = mult(projectionMatrix,mult(viewMat,modelMatrix))
            if (geoOb.texture){
                gl.bindTexture(gl.TEXTURE_2D, geoOb.texture);
                gl.uniform1i(uUseTextureLoc,1);
                gl.uniform1i(uTextureLoc, 0);
            } else {
                gl.uniform1i(uUseTextureLoc,0);
            }

            gl.uniformMatrix4fv(uWorld, false, flatten(modelMatrix));
            gl.uniformMatrix4fv(uWorldInverseTranspose, false, flatten(transpose(inverse(modelMatrix))));
            gl.uniformMatrix4fv(uMatLoc, false, flatten(trans));
            gl.uniform4f(inColorLoc, ...geoOb.diffuseColor);
            gl.drawArrays(gl.TRIANGLES, 0,geoOb.modelLen);
        }
    }
    
}

function draw_cow(viewMat,projectionMatrix) {
    gl.bindVertexArray(vao);
    let modelMatrix = mat4(
                    1.0, 0.0, 0.0,  cow_pos[0],
                    0.0, 1.0, 0.0,  cow_pos[1],
                    0.0, 0.0, 1.0,  cow_pos[2],
                    0.0, 0.0, 0.0, 1.0);
    // modelMatrix = mult(mult(rotate(Xtheta,[1,0,0]),mult(rotate(Ytheta,[0,1,0]),rotate(Ztheta,[0,0,1]))),modelMatrix);

    let trans = mult(projectionMatrix,mult(viewMat,modelMatrix))

    gl.uniformMatrix4fv(uWorld, false, flatten(modelMatrix));
    gl.uniformMatrix4fv(uWorldInverseTranspose, false, flatten(transpose(inverse(modelMatrix))));
    gl.uniformMatrix4fv(uMatLoc, false, flatten(trans));
    
    gl.drawElements(gl.TRIANGLES, faces.length, gl.UNSIGNED_SHORT, 0);
    
}

function setEventListeners() {
    let speed = .2;
    window.addEventListener('keydown', function (event) {
        switch(event.key) {
            case 'w':
            case 'ArrowUp':
                translateCamera([0, 0, -speed]);
            break;
            case 's':
            case 'ArrowDown':
                translateCamera([0, 0, speed]);
            break;
            case 'a':
            case 'ArrowLeft':
                translateCamera([-speed, 0, 0]);
            break;
            case 'd':
            case 'ArrowRight':
                translateCamera([speed, 0, 0]);
            break;
            case 'q':
                translateCamera([0, speed, 0]);
            break;
            case 'e':
                translateCamera([0, -speed, 0]);
            break;
            case 'r':
                Xtheta = 0;
                Ytheta = 0;
                Ztheta = 0;
                camera_matrix = mat4();
                translateCamera([0,0,30]);
            break;
            case 'p':
                d = new Date().getTime();
                startPos = nStartPos;
                lOneRot = !lOneRot;
            break;
            case ']':
                lTwoPan = !lTwoPan;
            break;
        } 
        updateCamPosLbl();
    });
    let down = false;
    let rightDown = false
    let startLoc = [0,0]
    document.addEventListener(
        'mousedown', (e) => {
            if (e.button == 0){
                if (down)
                    return
                down = true
                startLoc[0] = e.clientX
                startLoc[1] = e.clientY
            } else if (e.button == 2){
                if (rightDown)
                    return
                rightDown = true
                startLoc[0] = e.clientX
                startLoc[1] = e.clientY
            }
            
        });
    document.addEventListener(
    'mousemove', (e) => {
        if (rightDown){
            Xtheta += (startLoc[0]-e.clientX)/10;
            Ytheta += (startLoc[1]-e.clientY)/10;

            startLoc[0] = e.clientX;
            startLoc[1] = e.clientY;
            
        }
        
    });
    document.addEventListener(
        'mouseup', (e) =>{
            if (e.button == 0){
                down = false;
            }
            if (e.button == 2){
                rightDown = false;
            }
        });
}
let camplbl = document.getElementById('campos')
function updateCamPosLbl(){
    camplbl.innerText = 'cam pos: '+ Math.trunc(100*camera_matrix[0][3])/100+', '+ Math.trunc(100*camera_matrix[1][3])/100+', '+ Math.trunc(100*camera_matrix[2][3])/100
}

function getWireFrameVerts(){
    let verts = [
        -1, -1, -1,
         1, -1, -1,
         1,  1, -1,
        -1,  1, -1,
        -1, -1,  1,
         1, -1,  1,
         1,  1,  1,
        -1,  1,  1,
    ];
    
    return verts.map(e => {
        return e/4
    });
}

function getWireFrameFaces(){
    return [
        0, 1,
        1, 2,
        2, 3,
        3, 0,
        4, 5,
        5, 6,
        6, 7,
        7, 4,
        0, 4,
        1, 5,
        2, 6,
        3, 7,
    ];
}

let radius = 10

function moveFirstLight(){
    if (!lOneRot)
        return;
    let seconds = (d - new Date().getTime())/1000
    lightOnePos[0] = radius * Math.cos(startPos+seconds) + 3
    lightOnePos[2] = radius * Math.sin(startPos+seconds)
    nStartPos = startPos+seconds;
}


function getWireFrameConeVerts(){
    let verts = [1.5, 0, 0, 
        -1.5, 1, 0, 
        -1.5, 0.809017,	0.587785,
        -1.5, 0.309017,	0.951057, 
        -1.5, -0.309017, 0.951057, 
        -1.5, -0.809017, 0.587785,
        -1.5, -1, 0, 
        -1.5, -0.809017, -0.587785,
        -1.5, -0.309017, -0.951057, 
        -1.5, 0.309017,	-0.951057, 
        -1.5, 0.809017,	-0.587785];;
    
    return verts.map(e => {
        return e/2
    });
}

function getWireFrameConeFaces(){
    return [0, 1, 2,
        0, 2, 3,
        0, 3, 4,
        0, 4, 5,
        0, 5, 6,
        0, 6, 7,
        0, 7, 8,
        0, 8, 9,
        0, 9, 10,
        0, 10, 1];
}

function BackgroundPositions() {
    return new Float32Array(
      [
        -1, -1, 
         1, -1, 
        -1,  1, 
        -1,  1,
         1, -1,
         1,  1,
      ]);

  }

  async function createBackgroundTexture(){
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faceInfos = [
        {
        target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
        url: './textures/background/pos-x.jpg',
        },
        {
        target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
        url: './textures/background/neg-x.jpg',
        },
        {
        target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
        url: './textures/background/pos-y.jpg',
        },
        {
        target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        url: './textures/background/neg-y.jpg',
        },
        {
        target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
        url: './textures/background/pos-z.jpg',
        },
        {
        target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
        url: './textures/background/neg-z.jpg',
        },
    ];
    faceInfos.forEach((faceInfo) => {
        const {target, url} = faceInfo;

        // Upload the canvas to the cubemap face.
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 2048;
        const height = 2048;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;

        // setup each face so it's immediately renderable
        gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

        // Asynchronously load an image
        const image = new Image();
        image.src = url;
        image.addEventListener('load', function() {
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.texImage2D(target, level, internalFormat, format, type, image);
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        });
    });
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  }

function translateCamera(translation) {
     
    let translationMatrix = translate(translation);
    
    camera_matrix = mult(camera_matrix, translationMatrix);
}

async function loadTextures(textureObj){
    for (const tex in textureObj){
        if (!textureObj[tex]['tex']){
            continue;
        }
        
        let texture = gl.createTexture();
        textures[tex] = texture;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const width = 4096;
        const height = 4096;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, format, type, null);
        // Asynchronously load an image
        let image = new Image();
        image.src = textureObj[tex]['tex'];
        image.addEventListener('load', () => {
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, format, type, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        });
    }
}
async function loadModels(modelNames, models){
    modelNames.forEach((e) =>{
            let objData = fetch('./models/'+e+'.obj').then(async (o)=>{
                const t = await o.text();
                return parseOBJ(t);
             });
             let mtlData = fetch('./models/'+e+'.mtl').then(async (o)=>{
                const t = await o.text();
                 return parseMTL(t);
             });
             models.push(Promise.all([objData,mtlData]));
    });
}
function detach() {
    delete modelsData['cloud']
    modelsData['shuttle']['Material.001'].modelVelo = vec3(0,0,-.0504);
    modelsData['shuttle']['Material.002'].modelVelo = vec3(0,0,-.05);
    modelsData['shuttle']['Material.003'].modelVelo = vec3(0,0,-.0454);
    modelsData['shuttle']['fuel_tank_pruge'].modelVelo = vec3(0,0,-.05);
    let td = ['fuel_tank_main.001','fuel_tank_pruge.002','fuel_tank_zuto.001','fuel_tank_top_black.001','side_boosters_white_shiny.001','crveno_boosters.002','silverish_grey.001','fuel_tank_top_black.002','fuel_tank_main.002']
    for (const m in td){
        delete modelsData['shuttle'][td[m]]
    }
    
    
}
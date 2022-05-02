"use strict";

var canvas;
var gl, program;

// --- Rotation ---
var axis = 0;
var rotSpeed = 100;
var rotDir = 1.0;
var theta = vec3(0, 0, 0);
var flag = true;

const RotationAxis = {
  X: 0,
  Y: 1,
  Z: 2
};

// --- Model ---
var numPositions = 36;
var positionsArray = [];
var colorsArray = [];
var indices = [];

var vBuffer, nBuffer, cBuffer, tBuffer;
var colorLoc, positionLoc, normalLoc, texCoordLoc;

var vertices = [
  vec4(-1, -1,  1, 1.0),
  vec4(-1,  1,  1, 1.0),
  vec4(1,  1,  1, 1.0),
  vec4(1, -1,  1, 1.0),
  vec4(-1, -1, -1, 1.0),
  vec4(-1,  1, -1, 1.0),
  vec4(1,  1, -1, 1.0),
  vec4(1, -1, -1, 1.0)
];
var positions = [
  vec3(0, 0, 1.14),
  vec3(0.8, -0.8, 0.14),
  vec3(0.8, 0.8, 0.14),
  vec3(-0.8, 0.8, 0.14),
  vec3(-0.8, -0.8, 0.14)
];
var scales = [
  vec3(1, 1, 0.08),
  vec3(0.08, 0.08, 1)
];
var vertexColors = [
  vec4(0.8, 0.4, 0.0, 1.0),  
  vec4(0.8, 0.4, 0.0, 1.0),  
  vec4(0.8, 0.4, 0.0, 1.0),  
  vec4(0.8, 0.4, 0.0, 1.0),  
  vec4(0.8, 0.4, 0.0, 1.0),  
  vec4(0.8, 0.4, 0.0, 1.0),  
  vec4(0.8, 0.4, 0.0, 1.0),  
  vec4(0.8, 0.4, 0.0, 1.0),  
];

var normalsArray = [];

// --- Texture ---
var textureFlag = true;
let currTexFlag = false;
var textureFlagLoc;
var textureWood;
var texSize = 256;

var texCoord = [
  vec2(0, 0),
  vec2(0, 1),
  vec2(1, 1),
  vec2(1, 0)
];
var texCoordsArray = [];

// --- Motion Blur ---
var texturePastFrame, textureCurrFrame, framebuffer;
var depthBuffer, programMB;
var motionBlurFlag = true, mbSwitchFlag = false, mbReady = false;
var bVertsMB, bTexCoordsMB, posLocMB, mbTextureLoc, texCoordLocMB;
var speedLoc;

var mbPositions = [
  vec2(-1, -1),
  vec2(-1, 1),
  vec2(1, 1),
  vec2(1, 1),
  vec2(1, -1),
  vec2(-1, -1)
];
var mbTextCoords = [
  vec2(0, 0),
  vec2(0, 1),
  vec2(1, 1),
  vec2(1, 1),
  vec2(1, 0),
  vec2(0, 0)
];

// --- Material ---
var shaderFlag = false;
var matShininessLoc;
let matShininess = 50.0;

var absorptionDiffuseLoc, absorptionSpecularLoc;
let absorptionDiffuse = vec4(1,1,1, 1);
let absorptionSpecular = vec4(0.5, 0.5, 0.5, 1.0);

// --- Spotlight ---
let lightDirection = vec3(0,-1,0);
var lightPhi = 0.0, lightTheta = 0.0;
var lightPosition = vec4(0, 7, 0, 1);
let lightCutoff = 7.5, lightAttenuation = 200.0;
var spotlightSwitch = true;
var spotlightIntensity = 3.0;
let ambientLightColor = vec4(1,1,1,1);
let ambientLightIntensity = 0.2;
var ambientLightLoc, shadeVertexFlagLoc;
var lightDirectionLoc, lightAttenuationLoc, lightCutoffLoc;
var lightPositionLoc, lightRotationLoc, spotlightIntensityLoc;

// --- Camera ---
var near = 0.6;
var far = 6.4;
var radius = 4.7;
var camTheta = 0.0;
var phi = 90.0;
var dr = 5.0 * Math.PI/180.0;

var rotationOrigin = vec3(0, 0, 0);
var fovy = 45.0;  // Field-of-view in Y direction angle (in degrees)
var aspect;       // Viewport aspect ratio

var modelMatrixLoc, projectionMatrixLoc;
var viewMatrixLoc, rotationMatrixLoc, eyeLoc;
var eye;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

// --- Utility ---
let then = 0;

// --- Functions ---

// --- Init ---

function init(){
  // generate cube
  colorCube();

  // setup webgl and aspect ratio
  canvas = document.getElementById("gl-canvas");
  
  gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
  if (!gl) alert("WebGL 2.0 isn't available");
  
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.enable(gl.DEPTH_TEST);

  aspect =  canvas.width/canvas.height;

  //  Load shaders and initialize attribute buffers
  program = initShaders(gl, "vertex-shader", "fragment-shader");
  programMB = initShaders(gl, "vertex-shader-mb", "fragment-shader-mb");

  // configure motion blur shader
  configureMotionBlur();

  // configure normal shader
  configureShader();

  // go back to normal program
  gl.useProgram(program);

  // event listeners for buttons
  setEventListeners();

  requestAnimationFrame(render);
}


// --- Shader Configuration ---

function configureShader(){
  gl.useProgram(program);

  // colors buffer
  cBuffer = gl.createBuffer();
  colorLoc = gl.getAttribLocation( program, "aColor" );

  // vertices buffer
  vBuffer = gl.createBuffer();
  positionLoc = gl.getAttribLocation(program, "aPosition");

  // normals buffer
  nBuffer = gl.createBuffer();
  normalLoc = gl.getAttribLocation(program, "aNormal");

  // scale and translation uniforms
  projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");
  rotationMatrixLoc = gl.getUniformLocation(program, "uRotationMatrix");
  modelMatrixLoc = gl.getUniformLocation(program, "uModelMatrix");
  viewMatrixLoc = gl.getUniformLocation(program, "uViewMatrix");
  textureFlagLoc = gl.getUniformLocation(program, "uTextureFlag");

  // light and material uniforms
  ambientLightLoc = gl.getUniformLocation(program, "uAmbientLight");
  matShininessLoc = gl.getUniformLocation(program, "uMatShininess");
  lightAttenuationLoc = gl.getUniformLocation(program, "uLightAttenuation");
  lightDirectionLoc = gl.getUniformLocation(program, "uLightDirection");
  lightPositionLoc = gl.getUniformLocation(program, "uLightPosition");
  lightCutoffLoc = gl.getUniformLocation(program, "uLightCutoff");
  shadeVertexFlagLoc = gl.getUniformLocation(program, "uShadeVertexFlag");
  absorptionDiffuseLoc = gl.getUniformLocation(program, "Kd");
  absorptionSpecularLoc = gl.getUniformLocation(program, "Ks");
  eyeLoc = gl.getUniformLocation(program, "uEye");
  lightRotationLoc = gl.getUniformLocation(program, "uLightRotation");
  spotlightIntensityLoc = gl.getUniformLocation(program, "uLightIntensity");

  gl.uniform4fv(lightPositionLoc, flatten(lightPosition));

  // setup texture
  tBuffer = gl.createBuffer();
  texCoordLoc = gl.getAttribLocation(program, "aTexCoord");
  
  textureWood = gl.createTexture();
  loadTexture("texWood", textureWood);

  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);
  gl.vertexAttribPointer( colorLoc, 4, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray( colorLoc );

  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
  gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(normalLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(texCoordLoc);

  gl.uniform1i( gl.getUniformLocation(program, "uTextureMap"), 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textureWood);
}

function setShaderConfig(){
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.vertexAttribPointer( colorLoc, 4, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray( colorLoc );

  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
  gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(normalLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(texCoordLoc);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textureWood);
}


// --- Motion Blur Configuration ---

function configureMotionBlur(){
  gl.useProgram(programMB);

  // create 2 empty textures
  texturePastFrame = gl.createTexture();
  textureCurrFrame = gl.createTexture();

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texturePastFrame);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  // create framebuffer
  framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  framebuffer.width = canvas.width;
  framebuffer.height = canvas.height;

  // attach texture to framebuffer
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D,  texturePastFrame, 0);

  var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if(status != gl.FRAMEBUFFER_COMPLETE) alert('Frame Buffer Not Complete');

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texturePastFrame);
  
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textureCurrFrame);
  
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  bVertsMB = gl.createBuffer();
  posLocMB = gl.getAttribLocation(programMB, "aPosition");
  bTexCoordsMB = gl.createBuffer();
  texCoordLocMB = gl.getAttribLocation( programMB, "aTexCoord");
  speedLoc = gl.getUniformLocation(programMB, "uSpeed");

  gl.bindBuffer( gl.ARRAY_BUFFER, bVertsMB);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(mbPositions), gl.STATIC_DRAW);

  gl.vertexAttribPointer(posLocMB, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray( posLocMB );

  gl.bindBuffer( gl.ARRAY_BUFFER, bTexCoordsMB);
  gl.bufferData( gl.ARRAY_BUFFER, flatten(mbTextCoords), gl.STATIC_DRAW);

  gl.vertexAttribPointer( texCoordLocMB, 2, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray( texCoordLocMB );

  gl.uniform1i( gl.getUniformLocation(programMB, "uTextureBg"), 0);
  gl.uniform1i( gl.getUniformLocation(programMB, "uTextureNewFrame"), 1);
  gl.uniform1f( gl.getUniformLocation(programMB, "uWidth"), canvas.width);
  gl.uniform1f( gl.getUniformLocation(programMB, "uHeight"), canvas.height);

  // create a depth renderbuffer
  depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function setConfigurationMB(deltaTime){
  gl.useProgram(programMB);
  var speed;
  if(flag)
    speed = deltaTime * rotSpeed;
  else
    speed = 0;
  gl.uniform1f(speedLoc, speed);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texturePastFrame);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textureCurrFrame);

  gl.bindBuffer( gl.ARRAY_BUFFER, bVertsMB);
  gl.vertexAttribPointer(posLocMB, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray( posLocMB );

  gl.bindBuffer( gl.ARRAY_BUFFER, bTexCoordsMB);
  gl.vertexAttribPointer( texCoordLocMB, 2, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray( texCoordLocMB );
}

// --- Render ---

function render(now){
  now *= 0.001;  // convert to seconds
  const deltaTime = now - then; // num of seconds since last frame
  then = now;    // save the for the next frame

  // update rotation angle about the selected axis
  if(flag){
    theta[axis] += rotDir * rotSpeed * deltaTime;
  }

  setCamera();
  setMaterialAndLight();
  
  if(motionBlurFlag){
    drawMotionBlur(deltaTime);
  }
  else{
    if(mbReady) mbReady = false;
    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    setShaderConfig();
    draw();
  }

  requestAnimationFrame(render);
}


// --- Motion Blur Drawing ---

function drawMotionBlur(deltaTime){
  if(!mbReady){
    // draw table on screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(program);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    setShaderConfig();
    draw();

    // copy what's on screen to texturePastFrame
    gl.bindTexture(gl.TEXTURE_2D, texturePastFrame);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, canvas.width, canvas.height);
    
    mbReady = true; 
  } 
  else {
    // draw on framebuffer the new frame and save it to textureNewFrame
    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D,  textureCurrFrame, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    setShaderConfig();
    draw();

    // draw table on screen with motion blur
    gl.useProgram(programMB);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    setConfigurationMB(deltaTime);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // copy current frame to texturePastFrame
    gl.bindTexture(gl.TEXTURE_2D, texturePastFrame);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, canvas.width, canvas.height);
  }

  gl.useProgram(program);
  setShaderConfig();
}


// --- Setting Camera ---

function setCamera(){
  // calculate matrix and send to webgl
  eye = vec3(radius*Math.sin(camTheta)*Math.cos(phi),
      radius*Math.sin(camTheta)*Math.sin(phi), radius*Math.cos(camTheta));
  var projectionMatrix = perspective(fovy, aspect, near, far);

  gl.uniform3fv(eyeLoc, eye);
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
}

function setMaterialAndLight(){

  if(currTexFlag != textureFlag){
    currTexFlag = textureFlag;
    gl.uniform1i(textureFlagLoc, textureFlag);
  }

  // Material
  gl.uniform1f(matShininessLoc, matShininess);
  gl.uniform4fv(absorptionDiffuseLoc, flatten(absorptionDiffuse));
  gl.uniform4fv(absorptionSpecularLoc, flatten(absorptionSpecular));
  
  // Spotlight
  var lightRotation = rotate(lightTheta, vec3(0, 0, 1));
  lightRotation = mult(lightRotation, rotate(lightPhi, vec3(1, 0, 0)));
  gl.uniformMatrix4fv(lightRotationLoc, false, flatten(lightRotation));

  gl.uniform3fv(lightDirectionLoc, flatten(normalize(lightDirection)));
  gl.uniform1f(lightAttenuationLoc, lightAttenuation);
  gl.uniform1f(lightCutoffLoc, Math.cos(radians(lightCutoff)));
  gl.uniform1i(shadeVertexFlagLoc, shaderFlag);
  
  if(spotlightSwitch)
    gl.uniform1f(spotlightIntensityLoc, spotlightIntensity);
  else
    gl.uniform1f(spotlightIntensityLoc, 0);
  
  // Ambient Light
  let ambientLight = vec4(ambientLightColor[0] * ambientLightIntensity, ambientLightColor[1] * ambientLightIntensity, ambientLightColor[2] * ambientLightIntensity, 1);
  gl.uniform4fv(ambientLightLoc, flatten(ambientLight));
}


// --- Scene drawing ---

function draw(){
  // Compute rotation and lookAt matrices
  var rotation = rotateMat(theta, rotationOrigin)
  var lookAtMatrix = lookAt(eye, at , up);

  // draw table plane
  var modelMatrix = mat4(scales[0][0], 0, 0, positions[0][0],
    0, scales[0][1], 0, positions[0][1],
    0, 0, scales[0][2], positions[0][2],
    0, 0, 0, 1
    );

  gl.uniformMatrix4fv(rotationMatrixLoc, false, flatten(rotation));
  gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
  gl.uniformMatrix4fv(viewMatrixLoc, false, flatten(lookAtMatrix));

  gl.drawArrays(gl.TRIANGLES, 0, numPositions);

  // draw table feet
  for(var i=1; i<5; i++){
    modelMatrix = mat4(
      scales[1][0], 0, 0, positions[i][0],
      0, scales[1][1], 0, positions[i][1],
      0, 0, scales[1][2], positions[i][2],
      0, 0, 0, 1
    );

    gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, numPositions);
  } 
}

// --- Setting Event Listeners ---

function setEventListeners(){
  // Camera
  document.getElementById("Button1").onclick = function(){
    near *= 0.9; far *= 0.9;};
  document.getElementById("Button2").onclick = function(){
    near  *= 1.1; far *= 1.1;};
    document.getElementById("Button3").onclick = function(){radius *= 0.75;};
  document.getElementById("Button4").onclick = function(){radius *= 1.25;};
  document.getElementById("Button5").onclick = function(){camTheta -= dr;};
  document.getElementById("Button6").onclick = function(){camTheta += dr;};
  document.getElementById("Button7").onclick = function(){phi -= dr;};
  document.getElementById("Button8").onclick = function(){phi += dr;};

  // Rotation
  document.getElementById("ButtonT").onclick = function() {
    flag = !flag;
  };
  document.getElementById("ButtonRotDirection").onclick = function() {
    rotDir *= -1;
  };
  document.getElementById("xButton").onclick = function () {
    axis = RotationAxis.X;
  };
  document.getElementById("yButton").onclick = function () {
    axis = RotationAxis.Y;
  };
  document.getElementById("zButton").onclick = function () {
    axis = RotationAxis.Z;
  };

  document.getElementById("originXSlider").onmousemove = function(event) {
    rotationOrigin[0] = event.target.value;
  };
  document.getElementById("originYSlider").onmousemove = function(event) {
    rotationOrigin[1] = event.target.value;
  };
  document.getElementById("originZSlider").onmousemove = function(event) {
    rotationOrigin[2] = event.target.value;
  };
  document.getElementById("rotSpeed").onmousemove = function(event) {
    rotSpeed = event.target.value;
  };
  document.getElementById("originXSlider").onchange = function(event) {
    rotationOrigin[0] = event.target.value;
  };
  document.getElementById("originYSlider").onchange = function(event) {
    rotationOrigin[1] = event.target.value;
  };
  document.getElementById("originZSlider").onchange = function(event) {
    rotationOrigin[2] = event.target.value;
  };
  document.getElementById("rotSpeed").onchange = function(event) {
    rotSpeed = event.target.value;
  };
  
  // Texture
  document.getElementById("ButtonTexture").onclick = function(){
    textureFlag = !textureFlag;
  };

  // Shader
  document.getElementById("ButtonShader").onclick = function(){
    shaderFlag = !shaderFlag;
  };

  // Motion Blur
  document.getElementById("ButtonMB").onclick = function(){
    motionBlurFlag = !motionBlurFlag;
  };

  // Spotlight
  document.getElementById("lightDirTSlider").onmousemove = function(event) {
    lightTheta = event.target.value;
  };
  document.getElementById("lightDirPSlider").onmousemove = function(event) {
    lightPhi = event.target.value;
  };
  document.getElementById("lightCutoff").onmousemove = function(event) {
    lightCutoff = event.target.value;
  };
  document.getElementById("spotlightIntensitySlider").onmousemove = function(event) {
    spotlightIntensity = event.target.value;
  };
  document.getElementById("lightDirTSlider").onchange = function(event) {
    lightTheta = event.target.value;
  };
  document.getElementById("lightDirPSlider").onchange = function(event) {
    lightPhi = event.target.value;
  };
  document.getElementById("lightCutoff").onchange = function(event) {
    lightCutoff = event.target.value;
  };
  document.getElementById("spotlightIntensitySlider").onchange = function(event) {
    spotlightIntensity = event.target.value;
  };
  document.getElementById("spotlightSwitch").onchange = function(event) {
    spotlightSwitch = event.target.checked; 
  };

  // Material
  document.getElementById("matShininess").onmousemove = function(event) {
    matShininess = event.target.value;
  };
  document.getElementById("matShininess").onchange = function(event) {
    matShininess = event.target.value;
  };
}

function quad(a, b, c, d) {
  var t1 = subtract(vertices[b], vertices[a]);
  var t2 = subtract(vertices[c], vertices[b]);
  var normal = cross(t1, t2);
  normal = vec3(normal);

  positionsArray.push(vertices[a]);
  colorsArray.push(vertexColors[a]);
  texCoordsArray.push(texCoord[0]);
  normalsArray.push(normal);

  positionsArray.push(vertices[b]);
  colorsArray.push(vertexColors[a]);
  texCoordsArray.push(texCoord[1]);
  normalsArray.push(normal);

  positionsArray.push(vertices[c]);
  colorsArray.push(vertexColors[a]);
  texCoordsArray.push(texCoord[2]);
  normalsArray.push(normal);

  positionsArray.push(vertices[a]);
  colorsArray.push(vertexColors[a]);
  texCoordsArray.push(texCoord[0]);
  normalsArray.push(normal);

  positionsArray.push(vertices[c]);
  colorsArray.push(vertexColors[a]);
  texCoordsArray.push(texCoord[2]);
  normalsArray.push(normal);

  positionsArray.push(vertices[d]);
  colorsArray.push(vertexColors[a]);
  texCoordsArray.push(texCoord[3]);
  normalsArray.push(normal);
}

function colorCube()
{
  quad(1, 0, 3, 2);
  quad(2, 3, 7, 6);
  quad(3, 0, 4, 7);
  quad(6, 5, 1, 2);
  quad(4, 5, 6, 7);
  quad(5, 4, 0, 1);
}

// TODO: rotate around the axis in the origin position
function rotateMat(theta, origin){
  if (theta.type != 'vec3')
    throw "theta isn't a vec3";
    
  if (origin.type != 'vec3')
    throw "origin isn't a vec3";

  var rx = rotateX(theta[0]);
  var ry = rotateY(theta[1]);
  var rz = rotateZ(theta[2]);

  var rotation = mult(rz, mult(ry, rx));
  var translation = translate(origin[0], origin[1], origin[2]);
  var translation_neg = translate(-origin[0], -origin[1], -origin[2]);

  return mult(translation_neg, mult(rotation, translation));
}

function loadTexture(id, texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  var image = document.getElementById(id);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB,
    gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
                    gl.NEAREST_MIPMAP_LINEAR );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

window.onload = init;
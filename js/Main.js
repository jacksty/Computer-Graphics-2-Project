"use strict"

var gl;
var vbuff;
var ibuff;

function getInProjectPath(type, path){
	if(type === "s")
		return "shader/"+path;
	if(type === "j")
		return "js/"+path;
	if(type === "m")
		return "mesh/"+path;
	if(type === "t")
		return "tex/"+path;
}

function loadShaders(loader, names){
	for(var i = 0; i < names.length; ++i)
		main[names[i][0]] = new tdl.Program(loader, getInProjectPath("s", names[i][1]), getInProjectPath("s", names[i][2]));
}

function main(){
	var cvs = document.getElementById("cvs");
    document.getElementsByTagName("body")[0].addEventListener("keydown", 
    	function(ev){
    		ev.preventDefault();
    		main.keyDict[ev.keyCode] = true;
    	});
    document.getElementsByTagName("body")[0].addEventListener("keyup", 
    	function(ev){
			ev.preventDefault();
			main.keyDict[ev.keyCode] = false;
		});
    gl = tdl.setupWebGL(cvs,{alpha:false,stencil:true,preserveDrawingBuffer:true});
    console.log("fragdepth: " + gl.getExtension("EXT_frag_depth"));
    console.log("drawbuffers: " + gl.getExtension("WEBGL_draw_buffers"));
    console.log("depthtexture: " + gl.getExtension("WEBGL_depth_texture"));
    
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendEquation(gl.FUNC_ADD);
	gl.depthFunc(gl.LEQUAL);
    
	main.time = new Date();
	main.keyDict = {};
    var loader = new tdl.Loader(function(){setInterval(update, 24)});
    var shaders = [
                   ["buffer", "vsBuffer.glsl", "fsBuffer.glsl"],
                   ["deferred", "vsDeferred.glsl", "fsDeferred.glsl"],
                   ["transparent", "vsBuffer.glsl", "fsTransparent.glsl"],
				   ["billboard", "billboardVertexShader.txt", "fsBuffer.glsl"],
				   ["water", "vsWater.glsl", "fsWater.glsl"]
                  ];
    loadShaders(loader, shaders);
    
    Tank.initialize(loader);
    main.worldMat = tdl.translation([0,0,0,1]);
    main.cam = new Camera({
    	hfov:90,
    	hither:0.1,
    	yon:1000,
    	antilook:[0,0,1,0],
    	up:[0,1,0,0],
    	eye:[0,2,3,1]
    });
    main.cameraMode = 1;
    main.amb = [0.05,0.05,0.05];
    main.lightattr = ["pos", "col", "dir", "atten", "brightness"];
    main.lights = [];
    main.lights.push([[0,0,0,0],[0,0,0,-1],[0,0,0],[1,0,0],0]);
    main.lights.push([ //sun
                 [100,100,100,0], //position
                 [1,1,1,-1], //color
                 [0,0,0], //direction
                 [1,0,0], //attenuation
                 1 //brightness
    ]);
    main.lights.push([
                      [10,10,-5,1], //problem with positional lights
                      [1,1,1,-1],//[0.5,1,0.5,-1],
                      [0,0,0],
                      [0,0,0],
                      0.5
                      ]);
    main.deferredFBO = new tdl.Framebuffer(gl.canvas.width, gl.canvas.height, {
    	format: [
    	         	[gl.RGBA, gl.UNSIGNED_BYTE],
    	         	[gl.RGBA, gl.UNSIGNED_BYTE],
    	         	[gl.RGBA, gl.UNSIGNED_BYTE],
    	         	[gl.RGBA, gl.UNSIGNED_BYTE]
    	         ],
    	depthtexture:true
    });
    main.us = new UnitSquare();
    main.dummytex = new tdl.textures.SolidTexture([0,0,0,0]);
    main.tank = new Tank([0,0,-3,1]);
    
    main.entities = [
                     new Mesh(loader, "ground.mesh", {scaling: [20, 20, 20]}),
                     main.tank
                    ];
    main.billboards = [
                       new Tree(loader, [0,0,0], [1, 1], 10)
                       ];
    main.transEnt = [
                     new Mesh(loader, "barrel.mesh", {alpha: 0.5, position: [-3,0,-2,1]})
                     ];
    
    main.wat = [
                  new HeightMap(256,256,50,50, {pos:[-10,10,-10,1], dir:[tdl.normalize([1,0,-0.33]), [1,0,0]]})
                  ];
    
    gl.clearColor(0,0,0,0);
    loader.finish();
    setInterval(updateTransparency, 96);
}


main.setLight = function(prog, idx, multlights){
	for(var i = 0; i < main.lightattr.length; ++i)
		prog.setUniform("light"+ (multlights === true ? "["+idx+"]." : ".") + main.lightattr[i], main.lights[idx][i]);
}

main.keyHandler = function(dtime){
	var d = dtime * 0.02;
	var r = Math.PI/180 * 2 * d;
	
	if(main.keyDict[49] === true) //1
		main.cameraMode = 1;
	if(main.keyDict[50] === true){ //2
		main.cameraMode = 2;
		main.cam.right = main.tank.right;
		main.cam.up = main.tank.up;
		main.cam.antilook = main.tank.back;
		main.cam.eye = [main.tank.pos[0], main.tank.pos[1], main.tank.pos[2], 1];
		main.cam.eye = tdl.add(main.cam.eye, tdl.mul(main.tank.back, -.05));
		main.cam.eye = tdl.add(main.cam.eye, tdl.mul(main.tank.up, 2));
		main.cam.computeVPM();
	}
	if(main.keyDict[51] === true){ //3
		main.cameraMode = 3;
		main.cam.orientFromCOI(main.tank.pos, [0,1,0,0]);
	}
	if(main.keyDict[87] === true) //w
		main.move("strafe", tdl.mul(main.cam.antilook, -d), tdl.mul(main.tank.back, -d));
	if(main.keyDict[65] === true){ //a
		main.move("strafe", tdl.mul(main.cam.right, -d), [0,0,0,0]);
		main.move("turn", 0, r);
	}
	if(main.keyDict[83] === true) //s
		main.move("strafe", tdl.mul(main.cam.antilook, d), tdl.mul(main.tank.back, d));
	if(main.keyDict[68] === true){ //d
		main.move("strafe", tdl.mul(main.cam.right, d), [0,0,0,0]);
		main.move("turn", 0, -r);
	}
	if(main.keyDict[16] === true) //shift
		main.move("strafe", tdl.mul(main.cam.up, d), [0,0,0,0]);
	if(main.keyDict[17] === true) //ctrl
		main.move("strafe", tdl.mul(main.cam.up, -d), [0,0,0,0]);
	if(main.keyDict[37] === true) //left
		main.move("turn", r, 0);
	if(main.keyDict[39] === true) //right
		main.move("turn", -r, 0);
	if(main.keyDict[38] === true) //up
		main.move("tilt", r, 0);
	if(main.keyDict[40] === true) //down
		main.move("tilt", -r, 0);
	if(main.keyDict[81] === true) //q
		main.move("lean", r, 0);
	if(main.keyDict[69] === true) //e
		main.move("lean", -r, 0);
	if(main.keyDict[74] === true) //j
		main.move("turnt", 0, r);
	if(main.keyDict[76] === true) //l
		main.move("turnt", 0, -r);
	if(main.keyDict[75] === true) //k
		main.move("tiltg", 0, -r);
	if(main.keyDict[73] === true) //i
		main.move("tiltg", 0, r);
}

main.move = function(type, amtCam, amtAst){
	if(type === "strafe"){
		if(main.cameraMode !== 3 && !(main.cameraMode === 2 && Math.abs(amtCam[0]) === Math.abs(main.cam.right[0]) && 
									  Math.abs(amtCam[1]) === Math.abs(main.cam.right[1]) &&
									  Math.abs(amtCam[2]) === Math.abs(main.cam.right[2])))
			main.cam.strafe(amtCam);
		if(main.cameraMode !== 1)
			main.tank.strafe(amtAst);
	}
	
	if(type === "turn"){
		if(main.cameraMode !== 3)
			main.cam.turn(amtCam);
		if(main.cameraMode !== 1)
			main.tank.turn(amtAst);
	}
	
	if(type === "tilt"){
		if(main.cameraMode !== 3)
			main.cam.tilt(amtCam);
	}
	
	if(type === "lean"){
		if(main.cameraMode !== 3)
			main.cam.lean(amtCam);
	}
	
	if(type === "turnt")
		main.tank.turnTurret(amtAst);
	
	if(type === "tiltg")
		main.tank.tiltGun(amtAst);
	
	if(main.cameraMode === 3)
		main.cam.orientFromCOI(main.tank.pos, [0,1,0,0]);
	else if(main.cameraMode === 2){
		main.cam.eye = [main.tank.pos[0], main.tank.pos[1], main.tank.pos[2], 1];
		main.cam.eye = tdl.add(main.cam.eye, tdl.mul(main.tank.back, -.1));
		main.cam.eye = tdl.add(main.cam.eye, tdl.mul(main.tank.up, 2));
	}
}

function setDeferredUniforms(prog, cam){
	cam.draw(prog);
	prog.setUniform("normalTex", main.deferredFBO.textures[0]);
    prog.setUniform("colorTex", main.deferredFBO.textures[1]);
    prog.setUniform("emissiveTex", main.deferredFBO.textures[2]);
    prog.setUniform("specularTex", main.deferredFBO.textures[3]);
    prog.setUniform("depth_texture", main.deferredFBO.depthtexture);
    prog.setUniform("invViewMatrix", cam.viewMatrixInverse);
    prog.setUniform("ambient", tdl.math.divVectorScalar(main.amb, main.lights.length == 0 ? 1 : main.lights.length)); //ambient light value is adjusted by number of passes so that the final ambient lighting stays constant
    prog.setUniform("winSizeVFOV", [gl.canvas.width, gl.canvas.height, main.cam.vfov]);
    prog.setUniform("hitherYon", [main.cam.hither, main.cam.yon]);
}

function setTransparencyUniforms(prog, cam){
	cam.draw(prog);
	prog.setUniform("ambient", main.amb);
}

function setWaterUniforms(prog, cam){
	cam.draw(prog);
	prog.setUniform("depth_texture", main.deferredFBO.depthtexture);
    prog.setUniform("invViewMatrix", cam.viewMatrixInverse);
    prog.setUniform("ambient", main.amb);
    prog.setUniform("winSizeVFOV", [gl.canvas.width, gl.canvas.height, main.cam.vfov]);
    prog.setUniform("hitherYon", [main.cam.hither, main.cam.yon]);
    prog.setUniform("AFSpSt", [1,0.3,0.8,2]);
    prog.setUniform("time", t++/5);
}
var t = 0;

function setDummyTex(prog){
	prog.setUniform("normalTex", main.dummytex);
    prog.setUniform("colorTex", main.dummytex);
    prog.setUniform("emissiveTex", main.dummytex);
    prog.setUniform("specularTex", main.dummytex);
    prog.setUniform("depth_texture", main.dummytex);
}

function drawOpaqueObjects(prog){
    for(var i = 0; i < main.entities.length; i++)
		main.entities[i].draw(prog);
	main.billboard.use();
	main.billboard.setUniform("normalMap", main.dummytex);
	main.billboard.setUniform("emitMap", main.dummytex);
	main.cam.draw(main.billboard);
	for(var i = 0; i < main.billboards.length; ++i)
		main.billboards[i].draw(main.billboard);
	prog.use();
}

function drawTransparentObjects(prog){
    gl.colorMask(0,0,0,0);
    for(var i = 0; i < main.transEnt.length; ++i)
    	main.transEnt[i].draw(prog);
    gl.colorMask(1,1,1,1);
    for(var i = 0; i < main.transEnt.length; ++i)
    	main.transEnt[i].draw(prog);
}

function drawWater(prog){
	gl.colorMask(0,0,0,0);
    for(var i = 0; i < main.transEnt.length; ++i){
    	prog.setUniform("directions", main.wat[i].dirs);
    	main.wat[i].draw(prog);
    }
    gl.colorMask(1,1,1,1);
    for(var i = 0; i < main.transEnt.length; ++i)
    	main.wat[i].draw(prog);
}

function update(){
	var newTime = new Date();
	var dtime = newTime.getTime() - main.time.getTime();
	main.time = newTime;
	main.keyHandler(dtime);
	requestAnimationFrame(draw);
	
	
	main.transEnt[0].alpha += 0.005 * dir;
	main.lights[2][1][2] += 0.005 * dir;
	main.lights[2][1][1] -= 0.01 * dir;
	main.lights[2][1][0] += 0.005 * dir;
	if(main.transEnt[0].alpha > 0.95 || main.transEnt[0].alpha < 0.5)
		dir = -dir;
}
var dir = 1;

function updateTransparency(){
	main.transEnt.sort(
			function(a, b){
				var aa = tdl.subVector(a.position, main.cam.eye);
				aa = [aa[0] * aa[0] + aa[1] * aa[1] + aa[2] * aa[2]];
				var bb = tdl.subVector(b.position, main.cam.eye);
				bb = [bb[0] * bb[0] + bb[1] * bb[1] + bb[2] * bb[2]];
				
				return aa - bb;
			}
	);
}

function draw(){
	//pass 1
	gl.disable(gl.BLEND);
	main.deferredFBO.bind();
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    main.buffer.use();
    main.cam.draw(main.buffer);
    drawOpaqueObjects(main.buffer);
    main.deferredFBO.unbind();
    
    //pass 2
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    main.deferred.use();
    setDeferredUniforms(main.deferred, main.cam);
    for(var i = 0; i < main.lights.length; ++i){
    	main.setLight(main.deferred, i);
        main.us.draw(main.deferred);
    }
    setDummyTex(main.deferred);
    
    //pass 3
    gl.enable(gl.CULL_FACE);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    //water
    main.water.use();
    setWaterUniforms(main.water, main.cam);
    for(var i = 0; i < main.lights.length; ++i)
    	main.setLight(main.water, i, true);
    drawWater(main.water);
    //other transparent objects
    main.transparent.use();
    setTransparencyUniforms(main.transparent, main.cam);
    for(var i = 0; i < main.lights.length; ++i)
    	main.setLight(main.transparent, i, true);
    drawTransparentObjects(main.transparent);
    gl.disable(gl.CULL_FACE);
}
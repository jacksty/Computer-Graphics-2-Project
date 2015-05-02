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
    document.getElementsByTagName("body")[0].addEventListener("keydown", keyHandler);
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
    var loader = new tdl.Loader(function(){setInterval(update, 41)});
    var shaders = [
                   ["buffer", "vsBuffer.glsl", "fsBuffer.glsl"],
                   ["deferred", "vsDeferred.glsl", "fsDeferred.glsl"],
                   ["transparent", "vsBuffer.glsl", "fsTransparent.glsl"],
				   ["billboard", "billboardVertexShader.txt", "fsBuffer.glsl"]
                  ];
    loadShaders(loader, shaders);
    
    Tank.initialize(loader);
    main.worldMat = tdl.translation([0,0,0,0]);
    main.cam = new Camera({
    	hfov:90,
    	hither:0.1,
    	yon:1000,
    	antilook:[0,0,1,0],
    	up:[0,1,0,0],
    	eye:[0,2,3,1]
    });
    main.cameraMode = 3;
    main.entities = [];
	main.billboards = [];
    main.transEnt = [];
	//main.billboards.push(new Tree(loader, [0,0,0], [1, 1], 10));
	main.tree = new Tree(loader, [0,0,0,1], [100, 100], 1);
	//main.tree.addTree([[0,0,-10], [0,0,-1], [0,0,-5]]);
	main.tank = new Tank([0,0,-3,1]);
    main.ground = new Mesh(loader, "ground.obj.mesh");
    main.ground.WM = tdl.scaling(20,20,20);
    main.amb = [0.05,0.05,0.05];
    main.lightattr = ["pos", "col", "dir", "atten", "brightness"];
    main.lights = [];
    main.lights.push([ //sun
                 [20,100,12,0], //position
                 [1,1,1,-1], //color
                 [0,0,0], //direction
                 [1,0,0], //attenuation
                 1 //brightness
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
    main.dummytex = new tdl.textures.SolidTexture([0,0,0,0.1]);
    
    gl.clearColor(0,0,0,0);
    loader.finish();
}

function setLight(prog, idx, multlights){
	for(var i = 0; i < main.lightattr.length; ++i)
		prog.setUniform("light"+ (multlights === true ? "["+idx+"]." : ".") + main.lightattr[i], main.lights[idx][i]);
}

function keyHandler(ev){
	var r = Math.PI/180 * 2;
	
	switch(ev.keyCode){
		case 52: toggleStereo(); break; //4
		case 70: main.tank.shoot(); break; //f
		case 32: ev.preventDefault(); //space
			Asteroid.newRoid(); 
			break;
		
		case 49: main.cameraMode = 1; break; //1
		case 50: main.cameraMode = 2; //2
			main.cam.right = main.tank.right;
			main.cam.up = main.tank.up;
			main.cam.antilook = main.tank.back;
			main.cam.eye = [main.tank.pos[0], main.tank.pos[1], main.tank.pos[2], 1];
			main.cam.eye = tdl.add(main.cam.eye, tdl.mul(main.tank.back, -.05));
			main.cam.eye = tdl.add(main.cam.eye, tdl.mul(main.tank.up, 2));
			main.cam.computeVPM();
			break; 
		case 51: main.cameraMode = 3; //3
			main.cam.orientFromCOI(main.tank.pos, [0,1,0,0]);
			break;
		
		case 87: move("strafe", tdl.mul(main.cam.antilook, -1), tdl.mul(main.tank.back, -1)); break; //w
		case 65: 
			move("strafe", tdl.mul(main.cam.right, -1), [0,0,0,0]);
			move("turn", 0, r);
			break; //a
		case 83: move("strafe", main.cam.antilook, main.tank.back); break; //s
		case 68: 
			move("strafe", main.cam.right, [0,0,0,0]);
			move("turn", 0, -r);
			break; //d
		case 16: move("strafe", main.cam.up, [0,0,0,0]); break; //shift
		case 17: move("strafe", tdl.mul(main.cam.up, -1), [0,0,0,0]); break; //ctrl
		
		case 37: ev.preventDefault(); //left
			move("turn", r, 0); 
			break;
		case 39: ev.preventDefault(); //right
			move("turn", -r, 0);
			break;
		
		case 38: ev.preventDefault(); //up
			move("tilt", r, 0);
			break;
		case 40: ev.preventDefault(); //down
			move("tilt", -r, 0);
			break;
		
		case 81: move("lean", r, 0); break; //q
		case 69: move("lean", -r, 0); break; //e
		case 74: move("turnt", 0, r); break; //j
		case 76: move("turnt", 0, -r); break; //l
		case 75: move("tiltg", 0, -r); break; //k
		case 73: move("tiltg", 0, r); break; //i
	}
	move("", undefined, undefined);
}

function move(type, amtCam, amtAst){
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
		main.cam.orientFromCOI(main.tank.pos, main.cam.up);
	else if(main.cameraMode === 2){
		main.cam.eye = [main.tank.pos[0], main.tank.pos[1], main.tank.pos[2], 1];
		main.cam.eye = tdl.add(main.cam.eye, tdl.mul(main.tank.back, -.1));
		main.cam.eye = tdl.add(main.cam.eye, tdl.mul(main.tank.up, 2));
	}
}

function setDeferredUniforms(prog, cam){
	prog.setUniform("normalTex", main.deferredFBO.textures[0]);
    prog.setUniform("colorTex", main.deferredFBO.textures[1]);
    prog.setUniform("emissiveTex", main.deferredFBO.textures[2]);
    prog.setUniform("specularTex", main.deferredFBO.textures[3]);
    prog.setUniform("depth_texture", main.deferredFBO.depthtexture);
    prog.setUniform("invViewMatrix", cam.viewMatrixInverse);
    prog.setUniform("cameraPos", cam.eye);
    prog.setUniform("ambient", tdl.math.divVectorScalar(main.amb, main.lights.length == 0 ? 1 : main.lights.length)); //ambient light value is adjusted by number of passes so that the final ambient lighting stays constant
    prog.setUniform("winSizeVfov", [gl.canvas.width, gl.canvas.height, main.cam.vfov]);
    prog.setUniform("hitherYon", [main.cam.hither, main.cam.yon]);
}

function setDummyTex(prog){
	prog.setUniform("normalTex", main.dummytex);
    prog.setUniform("colorTex", main.dummytex);
    prog.setUniform("emissiveTex", main.dummytex);
    prog.setUniform("specularTex", main.dummytex);
    prog.setUniform("depth_texture", main.dummytex);
}

function drawOpaqueObjects(prog){
	prog.setUniform("worldMatrix", main.ground.WM);
    main.ground.draw(prog);
    prog.setUniform("worldMatrix", main.worldMat);
    main.tank.draw(prog);
    for(var i = 0; i < main.entities.length; i++){
		main.entities[i].draw(prog);
	}
	main.billboard.use();
	main.billboard.setUniform("lightMode", 1);
	main.cam.draw(main.billboard);
	main.tree.draw(main.billboard);
	
}

function drawTransparentObjects(prog){
    gl.colorMask(0,0,0,0);
    for(var i = 0; i < main.transEnt.length; ++i)
    	main.transEnt[i].draw(prog);
    gl.colorMask(true,true,true,true);
    for(var i = 0; i < main.transEnt.length; ++i)
    	main.transEnt[i].draw(prog);
}

function update(){
	requestAnimationFrame(draw);
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
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    main.deferred.use();
    setDeferredUniforms(main.deferred, main.cam);
    for(var i = 0; i < main.lights.length; ++i){
    	setLight(main.deferred, i);
        main.us.draw(main.deferred);
    }
    setDummyTex(main.deferred);
    
    /*
    //pass 3
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    main.transparent.use();
    main.cam.draw(main.transparent);
    for(var i = 0; i < main.lights.length; ++i)
    	setLight(main.transparent, i, true);
    drawTransparentObjects(main.transparent);
    gl.disable(gl.CULL_FACE);
    */
}
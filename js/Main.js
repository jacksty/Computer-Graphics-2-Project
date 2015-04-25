"use strict"

var gl;
var vbuff;
var ibuff;


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
    var loader = new tdl.Loader(init);
    var shaders = [
                   ["buffer", "vsBuffer.glsl", "fsBuffer.glsl"],
                   ["deferred", "vsDeferred.glsl", "fsDeferred.glsl"],
                   ["transparent", "vsBuffer.glsl", "fsTransparent.glsl"],
				   ["billboard", "billboardVertexShader.txt", "fsBuffer.glsl"],
				   ["water", "vsWater.glsl", "fsWater.glsl"],
				   ["sky", "vsSky.glsl", "fsSky.glsl"],
				   ["square", "vsSquare.glsl", "fsSquare.glsl"],
				   ["addTex", "vsSquare.glsl", "fsAddTex.glsl"],
				   ["selfEmissive", "vsBuffer.glsl", "fsSquare.glsl"]
                  ];
    loadShaders(loader, shaders);
    
    Tank.initialize(loader);
    DynamicWater.init();
    main.worldMat = tdl.translation([0,0,0,1]);
    main.cam = new Camera({
    	hfov:90,
    	hither:0.1,
    	yon:1000,
    	eye:[0,5,0,1]
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
                      [0.5,1,0.5,-1],
                      [0,0,0],
                      [1,0.03,0],
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
    main.reflectionFBO = new tdl.Framebuffer(gl.canvas.width, gl.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE);
    
	main.glowFBO1 = new tdl.Framebuffer(gl.canvas.width, gl.canvas.height);
	main.glowFBO2 = new tdl.Framebuffer(gl.canvas.width, gl.canvas.height);
	main.glowFBO3 = new tdl.Framebuffer(gl.canvas.width, gl.canvas.height);
	
    main.us = new UnitSquare();
    main.dummytex = new tdl.textures.SolidTexture([0,0,0,0]);
    main.tank = new Tank([10,10,7,1]);
	
	Skybox.initialize(loader, ["sky/+x.png","sky/-x.png","sky/+y.png","sky/-y.png","sky/+z.png","sky/-z.png"]);
	main.skybox = new Skybox({});
    
    main.entities = [
                     new Mesh(loader, "ground.mesh", {position: [0,-20,0,1], scaling: [20, 20, 20]}),
                     main.tank
                    ];
    main.billboards = [
                       new Tree(loader, [10,10,10], [1, 1], 10)
                       ];
    main.transEnt = [
                     new Mesh(loader, "barrel.mesh", {alpha: 0.5, position: [7,5,8,1]})
                     ];
					 
	var emissivePatch = new Mesh(loader, "ground.mesh", {position: [-10,0,0,1], scaling: [20, 20, 20]});
	emissivePatch.texture = emissivePatch.frame.texture = new tdl.SolidTexture([110,200,110,255]);
	main.glowingEnt = [
					 emissivePatch
					];
    
    main.wat = [ //verts/size = 1.5 per direction shows no obvious edges (even close up) on gently rolling waves (still shows if frequency is high)
                  InfiniteWater(5,5,50,50, {position:[0,-10,0,1], directions:[tdl.normalize([1,0,-0.33]), [1,0,0]], amplitude:0.8, frequency:0.3, speed:0.004, steepness:2})
                  ];
    main.wt = 0;
    main.watReflMatrix = [1,0,0,0,
                          0,-1,0,0,
                          0,0,1,0,
                          0,0,0,1];
    gl.clearColor(0,0,0,0);
    loader.finish();
    setInterval(updateTransparency, 96);
}

function init()
{
	setInterval(update, 16);
	draw();
}


main.setLight = function(prog, idx, multlights){
	for(var i = 0; i < main.lightattr.length; ++i)
		prog.setUniform("light"+ (multlights === true ? "["+idx+"]." : ".") + main.lightattr[i], main.lights[idx][i]);
}


function update(){
	var newTime = new Date();
	var dtime = newTime.getTime() - main.time.getTime();
	main.time = newTime;
	main.wt += dtime;
	keyHandler(dtime);
	
	
	main.transEnt[0].alpha += 0.005 * dir;
	main.lights[2][1][2] += 0.005 * dir;
	main.lights[2][1][1] -= 0.01 * dir;
	main.lights[2][1][0] += 0.005 * dir;
	if(main.transEnt[0].alpha > 0.95 || main.transEnt[0].alpha < 0.5)
		dir = -dir;
}
var dir = 1;

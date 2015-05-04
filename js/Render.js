function draw(){
	drawToShadowBuffer(main.shadowcam, main.shadowFBO, main.blurFBO, main.shadowProg, main.blurProg, true);
	gl.clearColor(0, 0, 0, 0);
	//return;
	//pass 1
	if(main.wat[0] !== undefined)
		fillReflectionFBO(main.wat[0]);
	gl.disable(gl.BLEND);
	main.deferredFBO.bind();
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    main.buffer.use();
    main.cam.draw(main.buffer);
    main.buffer.setUniform("clipPlane", [0,0,0,0]);
    drawOpaqueObjects(main.buffer);
	main.particleSystem.draw(main.buffer, main.cam);
    main.billboard.use();
    main.cam.draw(main.billboard);
    drawBillboards(main.billboard);
    main.deferredFBO.unbind();
    
    //pass 2
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    main.deferred.use();
    setDeferredUniforms(main.deferred, main.cam);
    for(var i = 0; i < main.lights.length; ++i)
    	main.setLight(main.deferred, i, true);
	main.us.draw(main.deferred);
    setDummyTex(main.deferred);
	
    //pass 3 (forward rendering)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    /*
     * ORDER:
     * 
     * Skybox must render before water, otherwise the water will have dark edges due to having transparency and blending with the clear color at the yon plane.
     * Water should render before other transparent objects, otherwise there would appear to be a hole in the water where you're looking through the other object.
     * Unfortunately, this means that transparent objects will not show through water.
     */
    
    //skybox
	main.sky.use();
	main.cam.draw(main.sky);
	main.sky.setUniform("reflection", 1);
	main.skybox.draw(main.sky);
	
	//water
	gl.enable(gl.CULL_FACE);
    main.water.use();
    setWaterUniforms(main.water, main.cam);
    for(var i = 0; i < main.lights.length; ++i)
    	main.setLight(main.water, i, true);
    drawWater(main.water, main.cam);
    main.water.setUniform("reflection", main.dummytex);
    
    //other transparent objects
    main.transparent.use();
    setTransparencyUniforms(main.transparent, main.cam);
    for(var i = 0; i < main.lights.length; ++i)
    	main.setLight(main.transparent, i, true);
    drawTransparentObjects(main.transparent);
	gl.disable(gl.CULL_FACE);
	
	gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	
	//glowing objects
	drawGlowingObjects(main.selfEmissive);
	main.square.use();
	main.square.setUniform("blur", false);
	main.square.setUniform("tex", main.glowFBO2);
	main.us.draw(main.square);
	
	if (main.cam.eye[1] <= main.wat[0].position[1] + 1)
	{
		main.square.use();
		main.square.setUniform("blur", false);
		main.square.setUniform("tex", main.overlayFBO);
		main.us.draw(main.square);
	}
	
	tdl.requestAnimationFrame(draw);
}

//DRAW HELPER FUNCTIONS
function drawOpaqueObjects(prog){
    for(var i = 0; i < main.entities.length; i++)
		main.entities[i].draw(prog);
}

function drawParticles(prog, camera)
{
	main.particleSystem.draw(camera);
}

function drawBillboards(prog){
	prog.setUniform("normalMap", main.dummytex);
	prog.setUniform("emitMap", main.dummytex);
	main.cam.draw(prog);
	main.tree.draw(prog);
}

function drawTransparentObjects(prog){
    gl.colorMask(0,0,0,0);
    for(var i = 0; i < main.transEnt.length; ++i)
    	main.transEnt[i].draw(prog);
    gl.colorMask(1,1,1,1);
    for(var i = 0; i < main.transEnt.length; ++i)
    	main.transEnt[i].draw(prog);
}

function drawGlowingObjects(prog){
	main.glowFBO1.bind();
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	main.buffer.use();
	drawOpaqueObjects(main.buffer);
	main.particleSystem.draw(prog, main.cam);
	gl.clear(gl.COLOR_BUFFER_BIT);
	prog.use();
	main.cam.draw(prog);
	prog.setUniform("blur", false);
	
	for (var i = 0; i < main.glowingEnt.length; ++i)
	{
		if (i == 0)
		{
			prog.setUniform("noisescale", 14.0);
			prog.setUniform("noisetime", main.wt * 0.001);
		}
		main.glowingEnt[i].draw(prog);
	}
	
	prog.setUniform("tex", main.dummytex);
	main.glowFBO1.unbind();
	
	main.square.use();
	
	for (var j = 0; j < 2; ++j)
	{
		var tex = (j == 0) ? main.glowFBO1.texture : main.glowFBO3.texture;
		main.glowFBO2.bind();
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		main.square.setUniform("tex", tex);
		main.square.setUniform("blur", true);
		main.square.setUniform("blur_deltas", [1.5, 0]);
		main.us.draw(main.square);
		main.square.setUniform("tex", main.dummytex);
		main.glowFBO2.unbind();
		
		main.glowFBO3.bind();
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		main.square.setUniform("tex", main.glowFBO2.texture);
		main.square.setUniform("blur", true);
		main.square.setUniform("blur_deltas", [0, 1.5]);
		main.us.draw(main.square);
		main.square.setUniform("tex", main.dummytex);
		main.glowFBO3.unbind();
	}
	main.addTex.use();
	main.glowFBO2.bind();
	//gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	main.addTex.setUniform("tex1", main.glowFBO1.texture);
	main.addTex.setUniform("tex2", main.glowFBO3.texture);
	main.us.draw(main.addTex);
	main.addTex.setUniform("tex1", main.dummytex);
	main.addTex.setUniform("tex2", main.dummytex);
	main.glowFBO2.unbind();
}

function drawWater(prog, cam){
	gl.colorMask(0,0,0,0);
    for(var i = 0; i < main.wat.length; ++i){
    	main.wat[i].draw(prog, cam);
    }
    gl.colorMask(1,1,1,1);
    for(var i = 0; i < main.wat.length; ++i)
    	main.wat[i].draw(prog, cam);
}

function drawToShadowBuffer(camera, use_blur)
{
	if (use_blur == undefined)
		use_blur = true;
	
	main.mc = 5;
    main.sf = 20;
	
	main.shadowFBO.texture.setParameter(gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    
    main.shadowFBO.bind();
    gl.clearColor(1,1,1,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    main.shadow.use();
    main.shadow.setUniform("scale_factor", main.sf);
	camera.draw(main.shadow);
    drawOpaqueObjects(main.shadow);
    main.shadowFBO.unbind();
	//return;
    main.blur.use();
    main.blur.setUniform("scale_factor",1.0);
    main.blurFBO.bind();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    main.blur.setUniform("tex", main.shadowFBO.texture);
    if(use_blur)
        main.blur.setUniform("deltas",[1,0]);
    else
        main.blur.setUniform("deltas",[0,0]);
    main.us.draw(main.blur);
    main.blurFBO.unbind();
    main.blur.setUniform("tex", main.blurFBO.texture);
    main.shadowFBO.bind();
    if(use_blur)
        main.blur.setUniform("deltas",[0,1]);
    else
        main.blur.setUniform("deltas",[0,0]);
        
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    main.us.draw(main.blur);
    main.shadowFBO.unbind();
    main.blur.setUniform("tex", main.dummytex);
}

function fillReflectionFBO(water){
	gl.disable(gl.BLEND);
	main.deferredFBO.bind();
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    main.buffer.use();
    main.cam.draw(main.buffer);
    main.buffer.setUniform("reflectionMatrix", water.reflection);
    main.buffer.setUniform("clipPlane", water.position);
    drawOpaqueObjects(main.buffer);
    main.billboard.use();
    main.cam.draw(main.billboard);
    main.billboard.setUniform("reflectionMatrix", water.reflection);
    main.billboard.setUniform("clipPlane", water.position);
    drawBillboards(main.billboard);
    main.deferredFBO.unbind();
	
	main.reflectionFBO.bind();
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	main.deferred.use();
	setDeferredUniforms(main.deferred, main.cam);
	for(var i = 0; i < main.lights.length; ++i)
		main.setLight(main.deferred, i, true);
	main.us.draw(main.deferred);
	setDummyTex(main.deferred);
	
	gl.disable(gl.BLEND);
    main.sky.use();
	main.cam.draw(main.sky);
	main.sky.setUniform("reflection", -1);
	main.skybox.draw(main.sky);
	
	main.transparent.use();
	gl.enable(gl.BLEND);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CW);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    setTransparencyUniforms(main.transparent, main.cam);
    main.transparent.setUniform("clipPlane", water.position);
    main.transparent.setUniform("reflectionMatrix", water.reflection);
    for(var i = 0; i < main.lights.length; ++i)
    	main.setLight(main.transparent, i, true);
    drawTransparentObjects(main.transparent);
    gl.disable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    
	main.reflectionFBO.unbind();
}

//UNIFORM SETTERS
function setDeferredUniforms(prog, cam){
	cam.draw(prog);
	prog.setUniform("shadowbuffer", main.shadowFBO.texture);
	prog.setUniform("normalTex", main.deferredFBO.textures[0]);
    prog.setUniform("colorTex", main.deferredFBO.textures[1]);
    prog.setUniform("emissiveTex", main.deferredFBO.textures[2]);
    prog.setUniform("specularTex", main.deferredFBO.textures[3]);
    prog.setUniform("depth_texture", main.deferredFBO.depthtexture);
    prog.setUniform("invViewMatrix", cam.viewMatrixInverse);
    prog.setUniform("invProjMatrix", cam.inverseProjectionMatrix);
    prog.setUniform("ambient", tdl.math.divVectorScalar(main.amb, main.lights.length == 0 ? 1 : main.lights.length)); //ambient light value is adjusted by number of passes so that the final ambient lighting stays constant
    prog.setUniform("winSizeVFOV", [gl.canvas.width, gl.canvas.height, main.cam.vfov]);
    prog.setUniform("hitherYon", [main.cam.hither, main.cam.yon]);
	prog.setUniform("fogDensity", 0.006);
	prog.setUniform("fogDark", 0.1);
	prog.setUniform("fogColor", [0.74, 0.69, 0.69]);
	prog.setUniform("c2", [0.45, 0.8, 0.2]);
	prog.setUniform("light_hitheryon",[main.shadowcam.hither, main.shadowcam.yon, main.shadowcam.yon - main.shadowcam.hither]);
    prog.setUniform("light_viewMatrix",main.shadowcam.viewMatrix);
    prog.setUniform("light_projMatrix",main.shadowcam.projMatrix);
	prog.setUniform("magic_constant", main.mc);
    prog.setUniform("scale_factor", main.sf);
}

function setTransparencyUniforms(prog, cam){
	cam.draw(prog);
	prog.setUniform("ambient", main.amb);
	prog.setUniform("clipPlane", [0,0,0,0]);
	prog.setUniform("fogDensity", 0.006);
	prog.setUniform("fogDark", 0.1);
	prog.setUniform("fogColor", [0.74, 0.69, 0.69]);
	prog.setUniform("c2", [0.45, 0.8, 0.2]);
}

function setWaterUniforms(prog, cam){
	cam.draw(prog);
	prog.setUniform("depth_texture", main.deferredFBO.depthtexture);
    prog.setUniform("ambient", main.amb);
    prog.setUniform("winSizeVFOV", [gl.canvas.width, gl.canvas.height, main.cam.vfov]);
    prog.setUniform("hitherYon", [main.cam.hither, main.cam.yon]);
    prog.setUniform("invViewMatrix", cam.viewMatrixInverse);
    prog.setUniform("invProjMatrix", cam.inverseProjectionMatrix);
    prog.setUniform("reflection", main.reflectionFBO.texture);
    prog.setUniform("specmtl", 32);
	prog.setUniform("fogDensity", 0.006);
	prog.setUniform("fogDark", 0.1);
	prog.setUniform("fogColor", [0.74, 0.69, 0.69]);
	prog.setUniform("G", main.G);
	prog.setUniform("P", main.G);
	prog.setUniform("noisescale", 5.0);
	prog.setUniform("noisetime", 0.0002 * main.wt);
}

function setDummyTex(prog){
	prog.setUniform("normalTex", main.dummytex);
    prog.setUniform("colorTex", main.dummytex);
    prog.setUniform("emissiveTex", main.dummytex);
    prog.setUniform("specularTex", main.dummytex);
    prog.setUniform("depth_texture", main.dummytex);
	prog.setUniform("shadow_buffer", main.dummytex);
}
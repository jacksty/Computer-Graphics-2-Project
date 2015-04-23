function draw(){
	//pass 1
	fillReflectionFBO(main.wat[0]);
	gl.disable(gl.BLEND);
	main.deferredFBO.bind();
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    main.buffer.use();
    main.cam.draw(main.buffer);
    main.buffer.setUniform("clipPlane", [0,0,0,0]);
    drawOpaqueObjects(main.buffer);
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
    for(var i = 0; i < main.lights.length; ++i){
    	main.setLight(main.deferred, i);
        main.us.draw(main.deferred);
    }
    setDummyTex(main.deferred);
	
    //pass 3 (forward rendering)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    /*
     * ORDER:
     * 
     * Skybox must render before water, otherwise the water will have dark edges due to having transparency and blending with the clear color at the yon plane.
     * Water should render before other transparent objects, otherwise there would appear to be a hole in the water where you're looking through the other object.
     * Unfortunately, this means that transparent objects that are underwater will not render unless the camera is also underwater.
     */
    
    //skybox
	main.sky.use();
	main.cam.draw(main.sky);
	main.sky.setUniform("reflection", 1);
	main.skybox.draw(main.sky);
	
	//water
    main.water.use();
    setWaterUniforms(main.water, main.cam);
    for(var i = 0; i < main.lights.length; ++i)
    	main.setLight(main.water, i, true);
    drawWater(main.water, main.cam);
    main.water.setUniform("reflection", main.dummytex);
    
    //other transparent objects
    gl.enable(gl.CULL_FACE);
    main.transparent.use();
    setTransparencyUniforms(main.transparent, main.cam);
    for(var i = 0; i < main.lights.length; ++i)
    	main.setLight(main.transparent, i, true);
    drawTransparentObjects(main.transparent);
    gl.disable(gl.CULL_FACE);
}

//DRAW HELPER FUNCTIONS
function drawOpaqueObjects(prog){
    for(var i = 0; i < main.entities.length; i++)
		main.entities[i].draw(prog);
}

function drawBillboards(prog){
	prog.setUniform("normalMap", main.dummytex);
	prog.setUniform("emitMap", main.dummytex);
	main.cam.draw(prog);
	for(var i = 0; i < main.billboards.length; ++i)
		main.billboards[i].draw(prog);
}

function drawTransparentObjects(prog){
    gl.colorMask(0,0,0,0);
    for(var i = 0; i < main.transEnt.length; ++i)
    	main.transEnt[i].draw(prog);
    gl.colorMask(1,1,1,1);
    for(var i = 0; i < main.transEnt.length; ++i)
    	main.transEnt[i].draw(prog);
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
	for(var i = 0; i < main.lights.length; ++i){
		main.setLight(main.deferred, i);
		main.us.draw(main.deferred);
	}
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
}

function setTransparencyUniforms(prog, cam){
	cam.draw(prog);
	prog.setUniform("ambient", main.amb);
	prog.setUniform("clipPlane", [0,0,0,0]);
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
}

function setDummyTex(prog){
	prog.setUniform("normalTex", main.dummytex);
    prog.setUniform("colorTex", main.dummytex);
    prog.setUniform("emissiveTex", main.dummytex);
    prog.setUniform("specularTex", main.dummytex);
    prog.setUniform("depth_texture", main.dummytex);
}
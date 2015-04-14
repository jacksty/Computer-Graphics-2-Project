function Skybox(opts) {
	this.pos = [0,0,0,1];
	this.right = [1,0,0,0];
	this.up = [0,1,0,0];
	this.antiforward = [0,0,1,0];
		
	this.computeWM();
}

Skybox.initialize = function(loader, images) {
	
	for (var i = 0; i < images.length; ++i) {
		images[i] = getInProjectPath("t", images[i]);
	}
	
	Skybox.cubemap = new tdl.CubeMap(loader, {
		px: images[0],
		nx: images[1],
		py: images[2],
		ny: images[3],
		pz: images[4],
		nz: images[5]
	});
	
	Skybox.skycube = new Mesh(loader, "skybox.mesh");
}

Skybox.prototype.computeWM = function() {
	var RM = [
		this.right[0], 		 this.right[1], 	  this.right[2], 0,
		this.up[0], 		 this.up[1], 		  this.up[2], 0,
		this.antiforward[0], this.antiforward[1], this.antiforward[2], 0,
		0, 0, 0, 1
	];
	
	var TM = tdl.translation(this.pos);
	
	this.worldMat = tdl.mul(tdl.scaling(20,20,20), tdl.mul(RM, TM));
	
}

Skybox.prototype.draw = function(prog) {
	if (prog === undefined)
		throw new Error("Skybox.draw(prog) expects a program object");
	
	prog.setUniform("worldMat", this.worldMat);
	prog.setUniform("basetexture", Skybox.cubemap);
	Skybox.skycube.draw(prog);
	
}

Skybox.prototype.setPos = function(pos) {
	this.pos = pos;
	this.computeWM();
}
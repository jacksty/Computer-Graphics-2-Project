"use strict";

function Camera(opts){
	this.hither = opts.hither !== undefined ? opts.hither : 0.1;
	this.yon = opts.yon !== undefined ? opts.yon : 1000;
	this.eye = opts.eye !== undefined ? opts.eye : [0,0,0,1];
	this.aspectRatio = opts.aspect !== undefined ? opts.aspect : gl.canvas.width/gl.canvas.height;
	
	if(opts.hfov !== undefined){
		this.fov = opts.hfov;
		this.ah = this.fov * Math.PI/360;
		this.av = 1/this.aspectRatio * this.ah;
		this.vfov = 1/this.aspectRatio * this.fov;
	}else{ 
		if(opts.vfov !== undefined)
			this.fov = opts.vfov;
		else this.fov = 50.625;
		this.av = this.fov * Math.PI/360
		this.ah = this.aspectRatio * this.av;
		this.vfov = this.fov;
	}
	
	if(opts.coi !== undefined && opts.up !== undefined){
		this.orientFromCOI(opts.coi, opts.up);
	}else if(opts.antilook !== undefined && opts.up !== undefined){
		this.antilook = tdl.normalize(opts.antilook);
		this.right = tdl.normalize(tdl.cross(opts.up, this.antilook));
		this.up = tdl.cross(this.antilook, this.right);
	}else{
		this.antilook = [0,0,1,0];
		this.right = [-1, 0, 0, 0];
		this.up = [0, 1, 0, 0];
	}
	this.computePM();
	this.computeVPM();
}

Camera.prototype.recalc = function(opts){
	this.hither = opts.hither !== undefined ? opts.hither : this.hither;
	this.yon = opts.yon !== undefined ? opts.yon : this.yon;
	this.eye = opts.eye !== undefined ? opts.eye : this.eye;
	this.aspectRatio = opts.aspect !== undefined ? opts.aspect : gl.canvas.width/gl.canvas.height;
	
	if(opts.hfov !== undefined){
		this.fov = opts.hfov;
		this.ah = this.fov * Math.PI/360;
		this.av = 1/this.aspectRatio * this.ah;
	}else if(opts.vfov !== undefined){ 
		this.fov = opts.vfov;
		this.av = this.fov * Math.PI/360
		this.ah = this.aspectRatio * this.av;
	}
	
	if(opts.coi !== undefined && opts.up !== undefined){
		this.orientFromCOI(opts.coi, opts.up);
	}else if(opts.antilook !== undefined && opts.up !== undefined){
		this.antilook = tdl.normalize(opts.antilook);
		this.right = tdl.normalize(tdl.cross(opts.up, this.antilook));
		this.up = tdl.cross(this.antilook, this.right);
	}
	
	this.computePM();
	this.computeVPM();
}

Camera.prototype.correctLen = function(){
	if(this.up.length === 3)
		this.up.push(0);
	if(this.right.length === 3)
		this.right.push(0);
	if(this.antilook.length == 3)
		this.antilook.push(0);
	if(this.eye.length === 3)
		this.eye.push(1);
}

Camera.prototype.orientFromCOI = function(coi, up){
	this.antilook = tdl.normalize(tdl.sub(this.eye, coi));
	this.right = tdl.normalize(tdl.cross(up, this.antilook));
	this.up = tdl.cross(this.antilook, this.right);
	this.computeVPM();
}

Camera.prototype.computePM = function(){
	var T, L, B, R;
	
	T = this.hither * Math.tan(this.av);
	B = -this.hither * Math.tan(this.av);
	L = -this.hither * Math.tan(this.ah);
	R = this.hither * Math.tan(this.ah);
	
	this.projMatrix = [2*this.hither/(R-L), 0, 0, 0,
                       0, 2*this.hither/(T-B), 0, 0,
                       1+2*L/(R-L), 1+2*B/(T-B), this.yon/(this.hither-this.yon), -1,
                       0, 0, this.hither*this.yon/(this.hither-this.yon), 0];
}

Camera.prototype.computeVPM = function(){
	this.correctLen();
	
	var viewTranslate = [1, 0, 0, 0,
		                 0, 1, 0, 0,
		                 0, 0, 1, 0,
		                 -this.eye[0], -this.eye[1], -this.eye[2], 1];
		
	var viewRotate = [this.right[0], this.up[0], this.antilook[0], 0,
	              this.right[1], this.up[1], this.antilook[1], 0,
	              this.right[2], this.up[2], this.antilook[2], 0,
	              0, 0, 0, 1];
	
	this.viewMatrix = tdl.mul(viewTranslate, viewRotate);
	this.viewProjMatrix = tdl.mul(this.viewMatrix, this.projMatrix);
	
	for(var i = 12; i < 15; ++i)
		viewTranslate[i] = -viewTranslate[i];
	viewRotate = [this.right[0], this.right[1], this.right[2], 0,
	              this.up[0], this.up[1], this.up[2], 0,
	              this.antilook[0], this.antilook[1], this.antilook[2], 0,
	              0, 0, 0, 1];
	
	this.viewMatrixInverse = tdl.mul(viewRotate, viewTranslate);
}

Camera.prototype.strafe = function(vec){
	var tmp = tdl.mul(tdl.dot(vec, this.right), this.right);
	tmp = tdl.add(tmp, tdl.mul(tdl.dot(vec, this.up), this.up));
	tmp = tdl.add(tmp, tdl.mul(tdl.dot(vec, this.antilook), this.antilook));
	var M = tdl.translation(tmp);
	this.eye = tdl.mul(this.eye, M);
	this.computeVPM();
}

Camera.prototype.turn = function(rads){
	var M = tdl.mul(
			tdl.translation(tdl.mul(-1, this.eye)),
			tdl.axisRotation(this.up, rads),
			tdl.translation(this.eye)
		);
	this.antilook = tdl.normalize(tdl.mul(this.antilook, M));
	this.right = tdl.cross(this.up, this.antilook);
	this.computeVPM();
}

Camera.prototype.tilt = function(rads){
	var M = tdl.mul(
			tdl.translation(tdl.mul(-1, this.eye)),
			tdl.axisRotation(this.right, rads),
			tdl.translation(this.eye)
		);
	this.up = tdl.normalize(tdl.mul(this.up, M));
	this.antilook = tdl.cross(this.right, this.up);
	this.computeVPM();
}

Camera.prototype.lean = function(rads){
	var M = tdl.mul(
			tdl.translation(tdl.mul(-1, this.eye)),
			tdl.axisRotation(this.antilook, rads),
			tdl.translation(this.eye)
		);
	this.up = tdl.normalize(tdl.mul(this.up, M));
	this.right = tdl.cross(this.up, this.antilook);
	this.computeVPM();
}

Camera.prototype.draw = function(program){
	program.setUniform("viewProjMat", this.viewProjMatrix);
	program.setUniform("cameraPos", main.cam.eye);
	program.setUniform("cameraU", this.right);
	program.setUniform("cameraV", this.up);
	program.setUniform("cameraW", tdl.mul(-1, this.antilook));
}
"use strict"

function Tank(pos){
	this.pos = pos;
	this.up = [0,1,0,0];
	this.right = [1,0,0,0];
	this.back = [0,0,1,0];
	
	this.tright = [1,0,0,0];
	this.tback = [0,0,1,0];
	
	this.gup = [0,1,0,0];
	this.gback = [0,0,1,0];
	
	this.base = [-0.45,-1.15,0,1];
	this.updateGun = false;
	
	this.computeWM();
	this.computeTWM();
	this.computeGWM();
}

Tank.initialize = function(loader){
	Tank.mesh = [];
	Tank.mesh.push(new Mesh(loader, "lefttread.mesh"));
	Tank.mesh.push(new Mesh(loader, "righttread.mesh"));
	Tank.mesh.push(new Mesh(loader, "tankbody.mesh"));
	Tank.mesh.push(new Mesh(loader, "tanktread.mesh"));
	Tank.mesh.push(new Mesh(loader, "tankturret.mesh"));
	Tank.mesh.push(new Mesh(loader, "tankgun.mesh"));
}

Tank.prototype.correctLen = function(){
	if(this.pos.length === 3)
		this.pos.push(1);
	if(this.up.length === 3)
		this.up.push(0);
	if(this.right.length === 3)
		this.right.push(0);
	if(this.back.length === 3)
		this.back.push(0);
	if(this.tright.length === 3)
		this.tright.push(0);
	if(this.tback.length === 3)
		this.tback.push(0);
	if(this.gup.length === 3)
		this.gup.push(0);
	if(this.gback.length === 3)
		this.gback.push(0);
}

Tank.prototype.strafe = function(vec){
	var tmp = tdl.mul(tdl.dot(vec, this.right), this.right);
	tmp = tdl.add(tmp, tdl.mul(tdl.dot(vec, this.up), this.up));
	tmp = tdl.add(tmp, tdl.mul(tdl.dot(vec, this.back), this.back));
	var M = tdl.translation(tmp);
	this.pos = tdl.mul(this.pos, M);
	this.computeWM();
	this.computeTWM();
}

Tank.prototype.turn = function(rads){
	var M = tdl.mul(
			tdl.translation(tdl.mul(-1, this.pos)),
			tdl.axisRotation(this.up, rads),
			tdl.translation(this.pos)
		);
	this.back = tdl.normalize(tdl.mul(this.back, M));
	this.right = tdl.cross(this.up, this.back);
	this.computeWM();
}

Tank.prototype.turnTurret = function(rads){
	var M = tdl.mul(
			tdl.translation(tdl.mul(-1, this.pos)),
			tdl.axisRotation(this.up, rads),
			tdl.translation(this.pos)
		);
	this.tback = tdl.normalize(tdl.mul(this.tback, M));
	this.gback = tdl.normalize(tdl.mul(this.gback, M));
	this.tright = tdl.cross(this.up, this.tback);
	this.computeTWM();
}

Tank.prototype.tiltGun = function(rads){
	var M = tdl.mul(
			tdl.translation(tdl.mul(-1, this.pos)),
			tdl.axisRotation(this.tright, rads),
			tdl.translation(this.pos)
		);
	this.gup = tdl.normalize(tdl.mul(this.gup, M));
	this.gback = tdl.cross(this.tright, this.gup);
	this.computeGWM();
}

Tank.prototype.tilt = function(rads){
	var M = tdl.mul(
			tdl.translation(tdl.mul(-1, this.pos)),
			tdl.axisRotation(this.right, rads),
			tdl.translation(this.pos)
		);
	this.up = tdl.normalize(tdl.mul(this.up, M));
	this.back = tdl.cross(this.right, this.up);
	this.computeWM();
}

Tank.prototype.lean = function(rads){
	var M = tdl.mul(
			tdl.translation(tdl.mul(-1, this.pos)),
			tdl.axisRotation(this.back, rads),
			tdl.translation(this.pos)
		);
	this.right = tdl.normalize(tdl.mul(this.right, M));
	this.up = tdl.cross(this.back, this.right);
	this.computeWM();
}

Tank.prototype.computeWM = function(){
	this.correctLen();
	var translate = tdl.translation(this.pos);
	var rotate = [-this.back[0], -this.back[1], -this.back[2], 0,
	              this.up[0], this.up[1], this.up[2], 0,
	              this.right[0], this.right[1], this.right[2], 0,
	              0, 0, 0, 1];
	this.worldMatrix = tdl.mul(rotate, translate);
	this.computeTWM();
}

Tank.prototype.computeTWM = function(){
	this.correctLen();
	var translate = tdl.translation(this.pos);
	var rotate = [-this.tback[0], -this.tback[1], -this.tback[2], 0,
	              this.up[0], this.up[1], this.up[2], 0,
	              this.tright[0], this.tright[1], this.tright[2], 0,
	              0, 0, 0, 1];
	
	this.turretMatrix = tdl.mul(rotate, translate);
	this.computeGWM();
}

Tank.prototype.computeGWM = function(){
	this.correctLen();
	var gorig = tdl.translation(this.base);
	var g2 = tdl.add([0,1.15,0,0], tdl.mul(-0.45, this.gback));
	var translate = tdl.translation(this.pos);
	var rotate = [-this.gback[0], -this.gback[1], -this.gback[2], 0,
	              this.gup[0], this.gup[1], this.gup[2], 0,
	              this.tright[0], this.tright[1], this.tright[2], 0,
	              0, 0, 0, 1];
	this.gunMatrix = tdl.mul(gorig, rotate, translate, tdl.translation(g2));
}

Tank.prototype.draw = function(prog){
	prog.setUniform("worldMatrix", this.worldMatrix);
	for(var i = 0; i < 4; ++i){
		Tank.mesh[i].draw(prog);
	}
	prog.setUniform("worldMatrix", this.turretMatrix);
	Tank.mesh[4].draw(prog);
	prog.setUniform("worldMatrix", this.gunMatrix);
	Tank.mesh[5].draw(prog);
}


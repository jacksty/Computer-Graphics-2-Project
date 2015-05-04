"use strict"

function UFO(loader, pos){
	this.pos = [pos[0], pos[1], pos[2], 1]; //center of area
	this.axis = [0, 1, 0];
	this.angle = 0;
	this.ufoTex = new tdl.Texture2D(loader,"media/ufo.png");
	this.billboard = new Billboard({pos: this.pos, texture: this.ufoTex});
}

UFO.prototype.draw = function(prog){
	this.rotateMatrix = tdl.axisRotation(this.axis, tdl.degToRad(this.angle));
	this.trans1Matrix = tdl.translation([-50,0,0]);
	//this.worldMatrix = this.trans1Matrix;
	this.worldMatrix = tdl.mul(tdl.translation(tdl.mul(-1, this.pos)), this.trans1Matrix, this.rotateMatrix, tdl.translation(this.pos));
	this.billboard.draw(prog, this.worldMatrix);
}

UFO.prototype.update = function(dtime){
	this.angle = this.angle + dtime * .0125;
}
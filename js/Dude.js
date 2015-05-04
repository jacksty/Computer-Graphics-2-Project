function Dude(pos) 
{
	this.pos = pos;
	this.up = [0,1,0,0];
	this.right = [1,0,0,0];
	this.antiforward = [0,0,1,0];
	this.scale = 0.2;
	this.currframe = 0;
	this.computeWM();
}

Dude.initialize = function(loader)
{
	Dude.mesh = new Mesh(loader, "dude.mesh");
}

Dude.prototype.correctLen = function()
{
	if(this.pos.length === 3)
		this.pos.push(1);
	if(this.up.length === 3)
		this.up.push(0);
	if(this.right.length === 3)
		this.right.push(0);
	if(this.antiforward.length === 3)
		this.antiforward.push(0);
}

Dude.prototype.computeWM = function()
{
	this.correctLen();
	var translate = tdl.translation(this.pos);
	var rotate = [this.right[0], this.right[1], this.right[2], 0,
				  -this.antiforward[0], -this.antiforward[1], -this.antiforward[2], 0,
				  this.up[0], this.up[1], this.up[2], 0,
	              0, 0, 0, 1];
	var scale = tdl.scaling(this.scale, this.scale, this.scale);
	this.worldMatrix = tdl.mul(tdl.mul(rotate, scale), translate);
}

Dude.prototype.strafe = function(val, elapsed)
{
	var vec = tdl.mul(this.antiforward, -0.5);
	var tmp = tdl.mul(tdl.dot(vec, this.right), this.right);
	tmp = tdl.add(tmp, tdl.mul(tdl.dot(vec, this.up), this.up));
	tmp = tdl.add(tmp, tdl.mul(tdl.dot(vec, this.back), this.back));
	var M = tdl.translation(tmp);
	this.pos = tdl.mul(this.pos, M);
	this.computeWM();
}

Dude.prototype.turn = function(rads, elapsed)
{
	var M = tdl.mul(
			tdl.translation(tdl.mul(-1, this.pos)),
			tdl.axisRotation(this.up, rads),
			tdl.translation(this.pos)
		);
	this.back = tdl.normalize(tdl.mul(this.back, M));
	this.right = tdl.cross(this.up, this.back);
	this.computeWM();
}

Dude.prototype.update = function(elapsed)
{
	this.currframe += elapsed * 0.12;
	if (this.currframe > 100)
		this.currframe -= 100;
}

Dude.prototype.draw = function(prog) 
{
	prog.use();
	Dude.mesh.matrix = this.worldMatrix;
	Dude.mesh.draw(prog, this.currframe);
}
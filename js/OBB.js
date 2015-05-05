"use strict";

function OBB(p, U, V, W)
{
	this.p = tdl.sub(p, tdl.mul(.5, U), tdl.mul(.5, V), tdl.mul(.5, W));
	this.ap = this.p;
	this.axes = [U, V, W];
	this.aaxes = this.axes;
	this.length = [this.axes[0][0], this.axes[1][1], this.axes[2][2]];
	this.calcNormals();
	this.currentCell;
}

OBB.prototype.calcNormals = function()
{
	this.faceNormals = [tdl.normalize(tdl.cross(this.axes[1], this.axes[2])), tdl.normalize(tdl.cross(this.axes[2], this.axes[0])), tdl.normalize(tdl.cross(this.axes[0], this.axes[1]))];
}

OBB.prototype.projectToAxis = function(o, v)
{
	var R = [1/0, -1/0];
	for (var i = 0; i < 2; ++i)
	{
		for (var j = 0; j < 2; ++j)
		{
			for (var k = 0; k < 2; ++k)
			{
				var q = tdl.add(this.p, tdl.mul(i, this.axes[0]), tdl.mul(j, this.axes[1]), tdl.mul(k, this.axes[2]));
				var qp = tdl.dot(v, tdl.sub(q, o));
				if (qp < R[0])
					R[0] = qp;
				if (qp > R[1])
					R[1] = qp;
			}
		}
	}
	return R;
}

OBB.prototype.draw = function(matrix)
{
	this.p = tdl.sub(matrix, tdl.mul(0.5, this.aaxes[0]), tdl.mul(0.5, this.aaxes[1]), tdl.mul(0.5, this.aaxes[2]))
	//this.p = tdl.mul(this.ap, matrix);
	//this.axes = [tdl.mul(this.aaxes[0], matrix), tdl.mul(this.aaxes[1], matrix), tdl.mul(this.aaxes[2], matrix)];
	//this.calcNormals();
}

OBB.prototype.updateCell = function(cell)
{
	this.currentCell = cell;
}
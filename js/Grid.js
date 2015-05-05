"use strict";

function Grid(xmin, xmax, zmin, zmax, S)
{
	this.xmin = xmin;
	this.xmax = xmax;
	this.zmin = zmin;
	this.zmax = zmax;
	this.G = [];
	this.S = S; //size
	this.pSystems = [];
}

Grid.prototype.put = function(x, z, obj, oldcell)
{
	var i = Math.floor((x - this.xmin) / this.S);
	var j = Math.floor((z - this.zmin) / this.S);
	if (oldcell && i === oldcell[0] && j === oldcell[1])
		return oldcell;
	if (oldcell !== undefined)
	{
		this.G[oldcell[0]][oldcell[1]];
	}
	if (this.G[i] === undefined)
		this.G[i] = [];
	if (this.G[i][j] == undefined)
		this.G[i][j] = [];
	this.G[i][j].push(obj);
	return[i, j];
}

Grid.prototype.getProximate = function(cell)
{
	var L = [];
	for (var i = cell[0] - 1; i <= cell[0] + 1; ++i)
	{
		if (i < 0 || i >= this.G.length || this.G[i] == undefined)
			continue;
		for (var j = cell[1] - 1; j <= cell[1] + 1; j++)
		{
			if (this.G[i][j] !== undefined)
			{
				for (var k = 0; k < this.G[i][j].length; ++k)
				{
					L.push(this.G[i][j][k]);
				}
			}
		}
	}
	return L;
}

Grid.prototype.getCollisions = function(buildingOBB, dudeOBB)
{	
	var collide = true;
	var A = []; //Axes
	var cellEntities = [] //All entities in current cell
	//for (var i = 0; i < buildingOBB.length; i++)
	//{
		//entities[i].updateCell(this.put(entities[i].pos[0], entities[i].pos[2], entities[i], entities[i].currentCell));
		//cellEntities = this.getProximate(entities[i].currentCell);
		//for (var j = 0; j < cellEntities.length; j++)
		//{
			A = [];
			//if (entities[i] == cellEntities[j])
			//	continue;
			for (var k = 0; k < 6; k++)
			{
				if (k <= 2)
				{
					A.push(dudeOBB.faceNormals[k]);
				}
				else
				{
					A.push(tdl.mul(-1, dudeOBB.faceNormals[k - 3]));
				}
			}
			for (var l = 0; l < 6; l++)
			{
				if (l <= 2)
				{
					A.push(buildingOBB.faceNormals[l]);
				}
				else
				{
					A.push(tdl.mul(-1, buildingOBB.faceNormals[l - 3]));
				}
			}
			for (var m = 0; m < 12; m++)
			{
				
				var r1 = dudeOBB.projectToAxis(dudeOBB.p, A[m]);
				var r2 = buildingOBB.projectToAxis(dudeOBB.p, A[m]);
				if (!ranges_overlap(r1, r2))
				{
					collide = false;
					break;
				}
			}
			if (!collide)
			{
				return true;
			}
			else
			{
				return false;
				collide = true;
			}
		//}
	//}
}

Grid.prototype.collide = function()
{
	console.log("Hit");
}
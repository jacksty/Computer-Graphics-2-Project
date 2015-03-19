"use strict"

function Tree(loader, pos, area, numTrees){
	this.area = area; //width and height to be populated with trees ex: 50 x 100 [50, 100]
	this.center = [pos[0], pos[1] - 2.5, pos[2]]; //center of area
	this.trees = [];
	this.trees.push(this.center);
	this.antilook = [0, 0, 1, 0];
	this.right = [1, 0, 0, 0]
	this.up = [0, 1, 0, 0]
	this.axis = [0, 1, 0];
	this.angle = 0;	
	this.scale = [1, 1, 1];
	this.opacity = 1;
	this.spec = 16;
	this.tree1 = new tdl.Texture2D(loader, getInProjectPath("t", "tree1.png"));
	this.tree1size = [5,5];
	this.tree2 = new tdl.Texture2D(loader, getInProjectPath("t", "tree2.png"));
	this.tree2size = [5,5];
	this.tree3 = new tdl.Texture2D(loader, getInProjectPath("t", "tree3.png"));
	this.tree3size = [5,5];
	this.tree4 = new tdl.Texture2D(loader, getInProjectPath("t", "tree4.png"));
	this.tree4size = [5,5];
	this.billboard = new Billboard({pos: this.pos, area: this.area, locations: this.trees, size: this.tree2size, texture: this.tree2, numbb: numTrees});
	
}

Tree.prototype.draw = function(prog){
	this.prog = prog;
	this.billboard.draw(prog);
}

Tree.prototype.addTree = function(locs){
	for (var i = 0; i < locs.length; i++)
	{
		locs[i][1] -= 2.5;
	}
	this.billboard.addInstance(locs);
}


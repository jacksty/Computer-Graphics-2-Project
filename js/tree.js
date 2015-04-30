"use strict"

function Tree(loader, pos){
	this.pos = [pos[0], pos[1] - 2.5, pos[2], 1]; //center of area
	this.tree1 = new tdl.Texture2D(loader,"media/tree1.png");
	this.tree2 = new tdl.Texture2D(loader,"media/tree2.png");
	this.tree3 = new tdl.Texture2D(loader,"media/tree3.png");
	this.tree4 = new tdl.Texture2D(loader,"media/tree4.png");
	this.billboard = new Billboard({pos: this.pos, texture: this.tree2});
}

Tree.prototype.draw = function(prog){
	this.prog = prog;
	this.billboard.draw(prog);
}


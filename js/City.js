function City(opts) {
	this.width = (opts.width === undefined) ? 5 : opts.width;
	this.height = (opts.height === undefined) ? 5 : opts.height;
	this.pos = (opts.pos === undefined) ? [0, 0, 0, 1] : opts.pos;
	
	this.buildings = new Array(this.width);

	for (var i = 0; i < this.width; ++i)
	{
		this.buildings[i] = new Array(this.height);
		
		for (var j = 0; j < this.height; ++j)
		{
			var t = tdl.translation(10.0 * i - 5.0 * this.width, -5.0, 10.0 * j - 5.0 * this.height);
			var s = tdl.scaling(1.0, 1.0 * Math.random() + 1.0, 1.0);
			var wm = tdl.mul(s, t);
			var tex = ((Math.random() * 10 < 5) ? City.textures[0] : City.textures[1]);
			
			this.buildings[i][j] = [wm, tex];
		}
	}
}

City.initialize = function(loader, dir, textures) {
	City.skyscraper = new Mesh(loader, dir);
	City.textures = textures;
}

City.prototype.draw = function(prog) {
	prog.use();
	
	for (var i = 0; i < this.width; ++i)
	{
		for (var j = 0; j < this.height; ++j)
		{
			City.skyscraper.matrix = tdl.mul(tdl.translation(this.pos), this.buildings[i][j][0]);
			City.skyscraper.texture = this.buildings[i][j][1];
			City.skyscraper.draw(prog);
		}
	}
}
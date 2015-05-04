function City(opts) {
	this.width = (opts.width === undefined) ? 5 : opts.width;
	this.height = (opts.height === undefined) ? 5 : opts.height;
	this.pos = (opts.pos === undefined) ? [0, 0, 0, 1] : opts.pos;
	
	this.buildings = new Array(this.width);
	
	var mid = [Math.ceil(this.width / 2) - 1,
			Math.ceil(this.height / 2) - 1];

	for (var i = 0; i < this.width; ++i)
	{
		this.buildings[i] = new Array(this.height);
		
		for (var j = 0; j < this.height; ++j)
		{
			var t = tdl.translation(10.0 * i - 5.0 * this.width, -5.0, 10.0 * j - 5.0 * this.height);
			var s = tdl.scaling(1.0, 1.0 * Math.random() + 1.2, 1.0);
			var tex = ((Math.random() * 10 < 5) ? City.textures[0] : City.textures[1]);
			
			if (i == mid[0] && j == mid[1])
				s = tdl.scaling(2.5, 2.5, 2.5);
			
			if (i == mid[0] && j == mid[1] + 1)
				s = tdl.scaling(1.0, 1.4, 1.0);
			if (i == mid[0] && j == mid[1] + 2)
				s = tdl.scaling(1.0, 1.3, 1.0);
			if (i == mid[0] && j == mid[1] + 3)
				s = tdl.scaling(1.0, 1.25, 1.0);
			
			var wm = tdl.mul(s, t);
			
			this.buildings[i][j] = [wm, tex];
		}
	}
}

City.initialize = function(loader, dir, textures) {
	City.skyscraper = new Mesh(loader, dir);
	main.skyscraperBump = new tdl.Texture2D(loader, "tex/skyscraperNormal.png");
	main.skyscraperSpec = new tdl.Texture2D(loader, "tex/skyscraperSpecular.png");
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
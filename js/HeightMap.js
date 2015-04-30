function DynamicWater(verts, size, args){
	if(args !== undefined)
		args.dyWater = true;
	else
		args = {dyWater: true};
	this.grid = new HeightMap(verts, verts, size, size, args);
	this.position = args !== undefined && args.position !== undefined ? args.position: [0,0,0,1];
	this.fbos = [
	             new tdl.Framebuffer(size, size, gl.LUMINANCE, gl.FLOAT),
	             new tdl.Framebuffer(size, size, gl.LUMINANCE, gl.FLOAT),
	             new tdl.Framebuffer(size, size, gl.LUMINANCE, gl.FLOAT)
	             ];
	this.idx = 0;
}

DynamicWater.prototype.update = function(prog, dtime){
	this.idx = ++this.idx % 3;
	this.fbos[this.idx].bind();
	gl.clear(gl.COLOR_BUFFER_BIT);
	prog.setUniform("prev", this.fbos[(idx+1) % 3]);
	prog.setUniform("curr", this.fbos[(idx+2) % 3]);
	
	main.us.draw(prog);
	prog.setUniform("prev", main.dummytex);
	prog.setUniform("curr", main.dummytex);
	this.fbos[this.idx].unbind();
}

DynamicWater.prototype.draw = function(prog){
	this.grid.draw(prog);
}

DynamicWater.init = function(){
	DynamicWater.fbos = [];
}

function InfiniteWater(rows, cols, xsize, zsize, args){
	var water = new StaticWater(rows, cols, xsize, zsize, args);
	water.xsize = xsize;
	water.zsize = zsize;
	
	water.draw = function(prog, cam){
		var yonCorners = [];
		var min = [];
		var max = [];
		var yonCenter = tdl.add(cam.eye, tdl.mul(-cam.yon, cam.antilook));
		var distYC = [tdl.mul(cam.right, Math.tan(cam.ah), cam.yon), tdl.mul(cam.up, Math.tan(cam.av), cam.yon)]; //distance from yon center point [horizontal, vertical]
		
		yonCorners.push(tdl.add(distYC[0], distYC[1], yonCenter)); //top-right
		yonCorners.push(tdl.add(distYC[0], tdl.mul(distYC[1], -1), yonCenter))//bottom-right
		yonCorners.push(tdl.add(tdl.mul(distYC[0], -1), tdl.mul(distYC[1], -1), yonCenter));//bottom-left
		yonCorners.push(tdl.add(tdl.mul(distYC[0], -1), distYC[1], yonCenter));//top-left
		
		min.push(cam.eye[0], cam.eye[1], cam.eye[2]);
		max.push(cam.eye[0], cam.eye[1], cam.eye[2]);
		
		for(var i = 1; i < 4; ++i){
			min[0] = Math.min(min[0], yonCorners[i][0]);
			min[1] = Math.min(min[1], yonCorners[i][1]);
			min[2] = Math.min(min[2], yonCorners[i][2]);
			
			max[0] = Math.max(max[0], yonCorners[i][0]);
			max[1] = Math.max(max[1], yonCorners[i][1]);
			max[2] = Math.max(max[2], yonCorners[i][2]);
		}
		
		min = [Math.floor(min[0] / this.xsize), Math.floor(min[2] / this.zsize)];
		max = [Math.ceil(max[0] / this.xsize), Math.ceil(max[2] / this.zsize)];
		
		//console.log("min: ", min, "max: ", max, "cam: ", [cam.eye[0] / this.xsize, cam.eye[2] / this.zsize]);
		
		
		
		for(var i = min[0]; i <= max[0]; ++i)
			for(var j = min[1]; j <= max[1]; ++j){
				var tx = i * this.xsize;
				var tz = j * this.zsize;
				this.setPos([tx, this.position[1], tz, 1]);
				this.render(prog);
			}
	}
	return water;
}



function StaticWater(rows, cols, xsize, zsize, args){
	this.prog = main.water;
	this.position = [0,0,0,1];
	this.grid = new HeightMap(rows, cols, xsize, zsize, args);
	this.grid.matrix = tdl.translation(this.position);
	var dir = [0,0,0,0];
	var maxdirs = 4;
	this.directions = [1,0,0,0].concat(dir,dir,dir);
	var names = ["amplitude", "frequency", "speed", "steepness"];
	if(args !== undefined){
		this.position = args.position !== undefined ? args.position : this.position;
		for(var i = 0; i < names.length; ++i)
			this[names[i]] = args[names[i]];
		if(args.directions !== undefined)
			for(var i = 0; i < Math.min(args.directions.length, 4); ++i)
				for(var j = 0; j < 3; ++j)
					this.directions[i*4+j] = args.directions[i][j];
		if(args.murkiness !== undefined)
			this.murkiness = args.murkiness;
	}
	
	for(var i = 0; i < names.length; ++i)
		if(this[names[i]] === undefined)
			this[names[i]] = 1.0;
	this.setPos(this.position);
	this.murkiness = this.murkiness === undefined ? 0.05 : this.murkiness; //transparency factor for the water: 1 = completely opaque, 0 = clear
	this.directions = new tdl.ColorTexture({width:maxdirs, height:1, pixels:new Float32Array(this.directions), type:gl.FLOAT});
}

StaticWater.prototype.setPos = function(newpos){
	this.position = newpos;
	this.reflection = [
	                   1,0,0,0,
	                   0,-1,0,0,
	                   0,0,1,0,
	                   0,this.position[1]*2,0,1
	                   ];
	this.grid.matrix = tdl.translation(newpos);
}

StaticWater.prototype.render = function(prog){
	prog.setUniform("afts", [this.amplitude, this.frequency, this.speed * main.wt, this.steepness]);
	prog.setUniform("directions", this.directions);
	prog.setUniform("murkiness", this.murkiness);
	this.grid.draw(prog);
}

StaticWater.prototype.draw = StaticWater.prototype.render;


function HeightMap(rows, cols, xsize, zsize, args){
	var dyWater = false;
	if(args!== undefined){
		this.matrix = args.position;
		this.texture = args.tex;
		if(args.dyWater !== undefined)
			dyWater = args.dyWater;
	}
	this.matrix = tdl.translation(this.matrix === undefined ? [0,0,0,1] : this.matrix);
	this.texture = this.texture === undefined ? new tdl.textures.SolidTexture([50,125,225,255]) : this.texture;
	
	if(rows * cols > 65536)
		throw new Error("Heightmap too large!");
	
	var vdata = [], idata = [];
	for(var i = 0; i < rows; ++i){
		var z = i / (rows-1) * zsize;
		var t = dyWater ? i/zsize : ((rows-i-1)+0.5)/rows;
		
		for(var j = 0; j < cols; ++j){
			var x = j/(cols-1) * xsize;
			var s = dyWater ? j / xsize : (j+0.5)/cols;
			vdata.push(x,z,s,t);
		}
	}
	vdata = new Float32Array(vdata);
	
	var initial, fin, inc;
	for(var i = 0; i < rows-1; ++i){
		if(i % 2 === 0){ //->
			initial = 0;
			fin = cols;
			inc = 1;
		}
		else{ // <-
			initial = cols-1;
			fin = -1;
			inc = -1;
		}
		
		for(var j = initial; j != fin; j += inc){
			idata.push(cols*i+j);
			idata.push(cols*(i+1)+j);
		}
		if(i != rows -2)
			idata.push(idata[idata.length-1]);
	}
	this.ni = idata.length;
	idata = new Uint16Array(idata);
	
	
	this.vbuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    gl.bufferData(gl.ARRAY_BUFFER, vdata, gl.STATIC_DRAW);
    this.ibuff = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idata, gl.STATIC_DRAW);
}

HeightMap.prototype.draw = function(prog){
	prog.setUniform("worldMatrix", this.matrix);
	prog.setUniform("tex", this.texture);
	
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
    
    prog.setVertexFormat("position",2,gl.FLOAT,"coords",2,gl.FLOAT);
    gl.drawElements(gl.TRIANGLE_STRIP,this.ni,gl.UNSIGNED_SHORT,0);
}
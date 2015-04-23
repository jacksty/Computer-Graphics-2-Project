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
		var qrst = []; //yon plane corners
		var min = [];
		var max = [];
		var yoncenter = tdl.add(cam.eye, tdl.mul(cam.yon, tdl.mul(cam.antilook, -1)));
		var distfromyc = [tdl.mul(cam.right, Math.tan(cam.ah), cam.yon), tdl.mul(cam.up, Math.tan(cam.av), cam.yon)]; //distance from yon center point
		
		qrst.push(tdl.add(distfromyc[0], distfromyc[1], yoncenter)); //top-right
		qrst.push(tdl.add(distfromyc[0], tdl.mul(distfromyc[1], -1), yoncenter))//bottom-right
		qrst.push(tdl.add(tdl.mul(distfromyc[0], -1), tdl.mul(distfromyc[1], -1), yoncenter));//bottom-left
		qrst.push(tdl.add(tdl.mul(distfromyc[0], -1), distfromyc[1], yoncenter));//top-left
		
		min.push(cam.eye[0], cam.eye[1], cam.eye[2]);
		max.push(cam.eye[0], cam.eye[1], cam.eye[2]);
		
		for(var i = 1; i < 4; ++i){
			min[0] = Math.min(min[0], qrst[i][0]);
			min[1] = Math.min(min[1], qrst[i][1]);
			min[2] = Math.min(min[2], qrst[i][2]);
			
			max[0] = Math.max(max[0], qrst[i][0]);
			max[1] = Math.max(max[1], qrst[i][1]);
			max[2] = Math.max(max[2], qrst[i][2]);
		}
		
		min = [min[0] / this.xsize, min[2] / this.zsize];
		max = [max[0] / this.xsize, max[2] / this.zsize];
		
		var threshold = 0.0002; //correct for floating point error
		for(var i = 0; i < 2; ++i){
			var minSign = min[i] < threshold ? (min[i] < -threshold ? -1 : 0) : 1;
			var maxSign = max[i] < threshold ? (max[i] < -threshold ? -1 : 0) : 1;
			min[i] = Math.ceil(Math.abs(min[i])) * minSign;
			max[i] = Math.ceil(Math.abs(max[i])) * maxSign;
		}
		
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
	this.murkiness = this.murkiness === undefined ? 0.01 : this.murkiness; //transparency factor for the water: 1 = completely opaque. 0.005 - 0.05 is probably a good starting range
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

StaticWater.prototype.draw = StaticWater.prototype.render;

StaticWater.prototype.render = function(prog){
	prog.setUniform("afts", [this.amplitude, this.frequency, this.speed * main.wt, this.steepness]);
	prog.setUniform("directions", this.directions);
	prog.setUniform("murkiness", this.murkiness);
	this.grid.draw(prog);
}


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
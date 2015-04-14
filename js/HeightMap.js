function HeightMap(rows, cols, xsize, zsize, args){
	if(args!== undefined){
		this.matrix = args.pos;
		this.texture = args.tex;
	}
	if(args !== undefined && args.dir !== undefined && args.dir.length > 0){
		var dir = [];
		var max = 3;
		var elements = args.dir.length > max ? max : args.dir.length;
		for(var i = 0; i < elements; ++i)
			dir.push(args.dir[i][0], args.dir[i][1], args.dir[i][2], 0);
		for(var i = dir.length; i < 12; ++i)
			dir.push(0);
		this.dirs = new tdl.ColorTexture({width:max, height:1, pixels:new Float32Array(dir), type:gl.FLOAT});
	}
	else
		this.dirs = new tdl.SolidTexture([0,0,0,0]);
	this.matrix = tdl.translation(this.matrix === undefined ? [0,0,0,1] : this.matrix);
	this.texture = this.texture === undefined ? new tdl.textures.SolidTexture([0,150,255,255]) : this.texture;
	
	if(rows * cols > 65536)
		throw new Error("Heightmap too large!");
	
	var vdata = [], idata = [];
	for(var i = 0; i < rows; ++i){
		var z = i / rows * zsize;
		var t = ((rows-i-1)+0.5)/rows;
		
		for(var j = 0; j < cols; ++j){
			var x = j/cols * xsize;
			var s = (j+0.5)/cols;
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
 var instancingExtension;
 
 function Billboard(opts){
	
	this.center = (opts.pos !== undefined) ? opts.pos : [0,0,0,1];
	this.area = (opts.area !== undefined) ? opts.area : [1, 1];
	this.locations = opts.locations;
	this.size = (opts.size !== undefined) ? opts.size : [1, 1];
	this.texture = (opts.texture !== undefined) ? opts.texture : undefined;
	if (this.locations === undefined)
	{
		this.numbb = (opts.numbb !== undefined) ? opts.numbb : 1;
		this.hasLocations = false;
	}
	else if(this.locations.length === 1)
	{
		this.numbb = (opts.numbb !== undefined) ? opts.numbb : 1;
		this.hasLocations = true;
	}
	else
	{
		this.numbb = this.locations.length;
		this.hasLocations = true;
	}
	
	this.vertexData = [];
	instancingExtension = gl.getExtension("ANGLE_instanced_arrays");
	
	if(!instancingExtension)
		throw new Error("Instancing not supported");
	
	if (!this.texture)
		throw new Error("Texture Required");
				
	var indexData = [1,3,2, 0,3,1];
	
	var tmp = [0,0, this.size[0],this.size[1],
				1,0, this.size[0],this.size[1],
				1,1, this.size[0],this.size[1],
				0,0, this.size[0],this.size[1],
				1,1, this.size[0],this.size[1],
				0,1, this.size[0],this.size[1],
				];

	var idata = new Uint16Array(indexData);
	
	this.vb_common = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vb_common);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tmp), gl.STATIC_DRAW);
	
	this.ibuff = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuff);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idata, gl.STATIC_DRAW);
	
	this.updateBuffer();
}

Billboard.prototype.addInstance = function(locs){
	for (var i = 0; i < locs.length; i++)
	{
		this.locations.push(locs[i]);
	}
	this.numbb += locs.length;
	this.updateBuffer();
}

Billboard.prototype.updateBuffer = function(){
	this.vertexData = [];
	for(var i = 0; i < this.numbb; i++)
	{
		if (this.hasLocations)
		{
			this.vertexData.push(this.locations[i][0]);
			this.vertexData.push(this.locations[i][1]);
			this.vertexData.push(this.locations[i][2]);
		}
		else
		{
		var pos = [this.center[0] + randomIntFromInterval(-this.area[0]/2,this.area[0]/2), this.center[1], this.center[2] + randomIntFromInterval(-this.area[1]/2,this.area[1]/2)];
		this.vertexData.push(pos[0]);
		this.vertexData.push(pos[1]);
		this.vertexData.push(pos[2]);
		}
	}

	this.vb_percopy = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vb_percopy);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertexData), gl.STATIC_DRAW);
}

Billboard.prototype.draw = function(prog){
	prog.setUniform("tex", this.texture);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	prog.setVertexFormatInstanced(
							[this.vb_common, 0, "coords", 2, gl.FLOAT, "size", 2, gl.FLOAT],
							[this.vb_percopy, 1, "position", 3, gl.FLOAT]);

	instancingExtension.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, this.numbb);
}

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}
 var instancingExtension;
 
 function Billboard(opts){
	
	this.pos = (opts.pos !== undefined) ? opts.pos : [0,0,0,1];
	this.size = (opts.size !== undefined) ? opts.size : [1, 1];
	this.texture = (opts.texture !== undefined) ? opts.texture : undefined;
	
	this.vertexData = [];
	instancingExtension = gl.getExtension("ANGLE_instanced_arrays");
	
	if(!instancingExtension)
		throw new Error("Instancing not supported");
	
	if (!this.texture)
		throw new Error("Texture Required");
				
	var indexData = [1,3,2, 0,3,1];
	
	var tmp = [this.pos[0], this.pos[1], this.pos[2],0,0,
				this.pos[0], this.pos[1], this.pos[2],1,0,
				this.pos[0], this.pos[1], this.pos[2],1,1,
				this.pos[0], this.pos[1], this.pos[2],0,0,
				this.pos[0], this.pos[1], this.pos[2],1,1,
				this.pos[0], this.pos[1], this.pos[2],0,1,
				];

	var idata = new Uint16Array(indexData);
	
	this.vb_common = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vb_common);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tmp), gl.STATIC_DRAW);
	
	this.ibuff = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuff);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idata, gl.STATIC_DRAW);
}

Billboard.prototype.draw = function(prog){
	//this.texture = new tdl.SolidTexture([0,255,0,255])
	//this.texture = new tdl.Texture2D(loader,"media/tree4.png");
	prog.setUniform("tex", this.texture);
	prog.setUniform("lightmode", 2.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	prog.setVertexFormatInstanced([this.vb_common, 0, "position", 3, gl.FLOAT, "coords", 2, gl.FLOAT]);

	instancingExtension.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, 1);
}

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}
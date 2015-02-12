"use strict";

function Mesh(loader,fname){
	this.objs = [];
	this.alpha = 1.0;
    var that=this;
    loader.loadArrayBuffer(getInProjectPath("m",fname),function(a){
        that.setup(loader, a);
    });
}

Mesh.prototype.setup = function(loader, ab){
    var dv = new DataView(ab);
    var idx = 0;
    
    function readLine(){
        var s = "";
        while(idx < dv.byteLength){
            var c = dv.getUint8(idx++);
            c = String.fromCharCode(c);
            if( c == '\n' )
                break;
            else if ( c == '\r' )
                ;
            else
                s += c;
        }
        return s;
    } 
       
    var line;
    
    line = readLine();
    if( line !== "mesh_3" )
        throw new Error("Not correct mesh header");

    var nv;
    var ni;
    
    while(1){
        line = readLine();
        var lst = line.split(" ");
        if( line === "end" )
            break;
        else if(lst[0] === "object"){
        	this.objs.push(new MeshObject(lst));
        }
        else if( lst[0] === "vertices" )
            nv = parseInt(lst[1],10);       //num vertices * num floats per vert
        else if( lst[0] === "indices" )
            this.ni = parseInt(lst[1],10);
        else if( lst[0] === "vertex_data"){
            var vdata = new Float32Array(ab,idx,nv);
            idx += vdata.byteLength;
        }
        else if( lst[0] === "index_data"){
            var idata = new Uint16Array(ab,idx,this.ni);
            idx += idata.byteLength;
        }
        else if(lst[0] === "texture_file"){
        	this.texture = new tdl.Texture2D(loader, getInProjectPath("t",lst[1]));
        }
        else{
            console.log("UNEX",lst,line.length,line);
            throw new Error("Unexpected");
        }
    }
    
    if( this.texture === undefined ) 
    	this.texture = new tdl.SolidTexture([0,255,0,255]);
    
    this.texture.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    this.texture.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    this.vbuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    gl.bufferData(gl.ARRAY_BUFFER, vdata, gl.STATIC_DRAW);
    this.ibuff = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idata, gl.STATIC_DRAW);
}

Mesh.prototype.draw = function(prog){
	if(this.alpha !== 1.0)
    	prog.setUniform("alpha", this.alpha);
	
    if(this.lightMode === undefined)
    	this.lightMode = 1;
    if(this.specmtl === undefined)
    	this.specmtl = [0,0,0,32];
    if(this.emitTex === undefined)
    	this.emitTex = new tdl.textures.SolidTexture([0,0,0,1]);
    
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
    
    prog.setVertexFormat("position",3,gl.FLOAT,"coords",2,gl.FLOAT,"norm",3,gl.FLOAT);
    
    prog.setUniform("tex", this.texture);
    prog.setUniform("lightMode", this.lightMode);
    prog.setUniform("specmtl", this.specmtl);
    prog.setUniform("emitTex", this.emitTex);
    
    gl.drawElements(gl.TRIANGLES,this.ni,gl.UNSIGNED_SHORT,0);
}

function MeshObject(vals){
	this.name = vals[1].slice(0);
	this.len = parseInt(vals[2], 10);
	var vec3String = vals[3].split(",");
	this.centroid = [parseFloat(vec3String[0]), parseFloat(vec3String[1]), parseFloat(vec3String[2]), 1];
}


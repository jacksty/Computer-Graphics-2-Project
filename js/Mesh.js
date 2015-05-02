"use strict";


function Frame(parent, args){ //utility subclass for determining mesh position/size/orientation
	this.parent = parent;
	if(args !== undefined){
		parent.right = args.right !== undefined ? tdl.normalize(args.right) : [1,0,0,0];
		parent.up = args.up !== undefined ? tdl.normalize(args.up) : [0,1,0,0];
		parent.back = args.back !== undefined ? tdl.normalize(args.back) : [0,0,1,0];
		parent.position = args.position !== undefined ? args.position : [0,0,0,1];
		parent.scaling = args.scaling !== undefined ? tdl.scaling(args.scaling) : tdl.scaling(1,1,1);
	}
	parent.right = parent.right === undefined ? [1,0,0,0] : parent.right;
	parent.up = parent.up === undefined ? [0,1,0,0]: parent.up;
	parent.back = parent.back === undefined ? [0,0,1,0]: parent.back;
	parent.position = parent.position === undefined ? [0,0,0,1]: parent.position;
	parent.scaling = parent.scaling === undefined ? tdl.scaling(1,1,1): parent.scaling;
	this.computeWorldMatrix();
}

Frame.prototype.computeWorldMatrix = function(){
	var translate = tdl.mul(this.parent.scaling, tdl.translation(this.parent.position));
	var rotate = [-this.parent.back[0], -this.parent.back[1], -this.parent.back[2], 0,
	              this.parent.up[0], this.parent.up[1], this.parent.up[2], 0,
	              this.parent.right[0], this.parent.right[1], this.parent.right[2], 0,
	              0, 0, 0, 1];
	this.parent.matrix = tdl.mul(rotate, translate);
}

Frame.prototype.setPosition = function(position){
	this.parent.position = position;
	this.computeWorldMatrix();
}

Frame.prototype.setOrientation = function(right, up, back){
	this.parent.right = tdl.normalize(right);
	this.parent.up = tdl.normalize(up);
	this.parent.back = tdl.normalize(back);
	this.computeWorldMatrix();
}

Frame.prototype.setScaling = function(scaling){
	this.parent.scaling = tdl.scaling(scaling);
	this.computeWorldMatrix();
}

function Mesh(loader,fname, args){
	this.objs = [];
	if(args !== undefined)
		this.alpha = args.alpha;
	this.alpha = this.alpha === undefined ? 1.0 : this.alpha;
	this.frame = new Frame(this, args);
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
    if( line !== "mesh_5" )
        throw new Error("Not correct mesh header");

    var nv;
    var ni;
	this.hasbones = true;
	this.centroids = {};
    
    while(true){
        line = readLine();
        var lst = line.split(" ");
        if( line === "end" )
            break;
        else if(lst[0] === "object")
		{
        	this.objs.push(new MeshObject(lst));
        }
        else if( lst[0] === "vertices" )
            nv = parseInt(lst[1],10);       //num vertices * num floats per vert
        else if( lst[0] === "indices" )
            this.ni = parseInt(lst[1],10);
        else if( lst[0] === "vertex_data")
		{
            var vdata = new Float32Array(ab,idx,nv);
            idx += vdata.byteLength;
        }
        else if( lst[0] === "index_data")
		{
            var idata = new Uint16Array(ab,idx,this.ni);
            idx += idata.byteLength;
        }
		else if( lst[0] === "centroid" )
		{
            this.centroids[lst[1]] = [parseFloat(lst[2]),
                parseFloat(lst[3]), parseFloat(lst[4])];
        }
        else if( lst[0] === "numbones" )
            this.numbones = parseInt(lst[1],10);
        else if ( lst[0] === "numframes" )
		{
            this.numframes = parseInt(lst[1],10);
            console.log(this.numframes,"frames");
        }
        else if( lst[0] === "maxdepth" )
            ;
        else if( lst[0] === "bonenames" )
            ;//var bonenames = lst.slice(1);
        else if(lst[0] === "texture_file")
        	this.texture = new tdl.Texture2D(loader, getInProjectPath("t",lst[1]));
        else if(lst[0] === "normal_map")
        	this.bump = new tdl.Texture2D(loader, getInProjectPath("t", lst[1]));
        else if(lst[0] === "specular_map")
        	this.specmtl = new tdl.Texture2D(loader, getInProjectPath("t", lst[1]));
        else if(lst[0] === "emissive_map")
        	this.emitTex = new tdl.Texture2D(loader, getInProjectPath("t", lst[1]));
		else if( lst[0] === "heads" || lst[0] === "tails" || lst[0] === "quaternions" || lst[0] === "translations" ||
            lst[0] === "matrices" )
		{
            var numbytes = parseInt(lst[1],10);
            try{
                var X = new Float32Array( ab, idx, numbytes/4 );
            }
            catch(e){
                console.log(lst,ab,idx,numbytes/4);
                throw(e);
            }
                
            idx += numbytes;
            if( lst[0] === "heads" ){
                this.bonetex = new tdl.ColorTexture({
                    width: this.numbones,
                    height: 1,
                    pixels: X,
                    format: gl.RGBA,
                    type: gl.FLOAT
                });
                var headdata=X;
            }
            else if( lst[0] === "quaternions" ){
                this.quattex = new tdl.ColorTexture({
                    width: this.numbones,
                    height: this.numframes,
                    pixels: X,
                    format: gl.RGBA,
                    type: gl.FLOAT
                });

            }
            else if( lst[0] === "matrices" ){
                this.mattex = new tdl.ColorTexture({
                    width: this.numbones*4,
                    height: this.numframes,
                    pixels: X,
                    format: gl.RGBA,
                    type: gl.FLOAT
                });
            }
        }
        else
		{
            console.log("UNEX",lst,line.length,line);
            //throw new Error("Unexpected");
        }
    }
    
    if(this.lightMode === undefined)
    	this.lightMode = 1;
    if( this.texture === undefined ) 
    	this.texture = new tdl.SolidTexture([225,225,110,255]);
    if(this.specmtl === undefined)
    	this.specmtl = new tdl.textures.SolidTexture([255,255,255,16]);
    if(this.emitTex === undefined)
    	this.emitTex = new tdl.textures.SolidTexture([0,0,0,255]);
    if(this.bump === undefined)
    	this.bump = new tdl.textures.SolidTexture([255,255,255,0]);
	if(!this.bonetex)
	{
        this.bonetex = new tdl.SolidTexture([0,0,0,255]);
		this.quattex = new tdl.SolidTexture([0,0,0,255]);
		this.transtex = new tdl.SolidTexture([0,0,0,255]);
		this.hasbones = false;
		this.numbones = 0;
		this.numframes = 0;
	}
	if(!this.quattex)
        this.quattex = new tdl.SolidTexture([0,0,0,255]);
	if(!this.transtex)
        this.transtex = new tdl.SolidTexture([0,0,0,255]);
    
    this.texture.setParameter(gl.TEXTURE_WRAP_S, gl.REPEAT);
    this.texture.setParameter(gl.TEXTURE_WRAP_T, gl.REPEAT);
    this.texture.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    this.vbuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    gl.bufferData(gl.ARRAY_BUFFER, vdata, gl.STATIC_DRAW);
    this.ibuff = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idata, gl.STATIC_DRAW);
}

Mesh.prototype.draw = function(prog, currframe){
    prog.setUniform("alpha", this.alpha, true);
	prog.setUniform("worldMatrix", this.matrix);
	prog.setUniform("texture",this.texture);
    prog.setUniform("bonetex",this.bonetex);
    prog.setUniform("quattex",this.quattex);
	prog.setUniform("hasbones",this.hasbones);
	prog.setUniform("currframe", currframe === undefined ? 0 : currframe);
	
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
    
    prog.setVertexFormat(
        "a_position", 3, gl.FLOAT,
        "a_texcoord", 2, gl.FLOAT,
        "a_normal", 3, gl.FLOAT,
        "a_weight", 4, gl.FLOAT,
        "a_boneidx", 4, gl.FLOAT,
		"a_tang", 3, gl.FLOAT
    );
	//prog.setVertexFormat("position",3,gl.FLOAT,"coords",2,gl.FLOAT,"norm",3,gl.FLOAT,"tang",3,gl.FLOAT);
	/*prog.setVertexFormat(
        "position", 3, gl.FLOAT,
        "coords", 2, gl.FLOAT,
        "norm", 3, gl.FLOAT,
        "a_weight", 4, gl.FLOAT,
        "a_boneidx", 4, gl.FLOAT,
		"tang", 3, gl.FLOAT
    );*/
    
    prog.setUniform("tex", this.texture);
    prog.setUniform("lightMode", this.lightMode);
    prog.setUniform("specMap", this.specmtl);
    prog.setUniform("emitMap", this.emitTex);
    prog.setUniform("normalMap", this.bump);
    
    gl.drawElements(gl.TRIANGLES,this.ni,gl.UNSIGNED_SHORT,0);
}

function MeshObject(vals){
	this.name = vals[1].slice(0);
	this.len = parseInt(vals[2], 10);
	var vec3String = vals[3].split(",");
	this.centroid = [parseFloat(vec3String[0]), parseFloat(vec3String[1]), parseFloat(vec3String[2]), 1];
}


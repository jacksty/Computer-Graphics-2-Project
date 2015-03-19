"use strict";

//very simple obj2mesh: No materials; no vertex condensing,
//no triangulation

var fs = require("fs");

function Writer(fname){
    this.stream = fs.createWriteStream(fname);
    this.offset=0;
}

Writer.prototype.write = function(x){
    //might not work if x is a string with international characters
    this.stream.write(x);
    this.offset += x.length;
}

Writer.prototype.tell = function(){
    return this.offset;
}

Writer.prototype.end = function(x){
    this.stream.end(x);
}

function sub(a,b,len){
	var c = [];
	len = len !== undefined ? len : 3;
	for(var i = 0; i < len; ++i)
		c.push(a[i]-b[i]);
	return c;
}

function main(){
    var infile = process.argv[2];
    var outfile = infile.split(".");
    outfile.pop();
    outfile.push(".mesh");
    for(var i = 1; i < outfile.length; ++i)
    	outfile[0] += outfile[i];
    outfile = outfile[0];
    
    var objdata = fs.readFileSync(infile,{encoding:"utf8"});
    objdata = objdata.split("\n");
    

    var vertexdata = [];
    var triangles = [];
    var texturedata = [];
    var vdata = [], idata = [];
    var vmap = {}, mdict = {};
    var nv = 0;
    var currmtl;
    var objects = [];
    var numVerts = [];
    var xSum = [], ySum = [], zSum = [];
    var normalData = [];
    
    console.log("Reading " + infile + "...");
    for(var oi=0;oi<objdata.length;++oi){
        var L = objdata[oi].split(" ");
        if( L[0] === "o" ){
        	objects.push(L[1]);
        	numVerts.push(0);
        	xSum.push(0);
        	ySum.push(0);
        	zSum.push(0);
        }
        else if( L[0] === "v" ){
        	vertexdata.push([parseFloat(L[1]), parseFloat(L[2]), parseFloat(L[3])]);
        	++numVerts[objects.length-1];
        	xSum[objects.length-1] += vertexdata[vertexdata.length-1][0];
        	ySum[objects.length-1] += vertexdata[vertexdata.length-1][1];
        	zSum[objects.length-1] += vertexdata[vertexdata.length-1][2];
        }
        else if(L[0] === "vn"){
        	normalData.push([parseFloat(L[1]), parseFloat(L[2]), parseFloat(L[3])]);
        }
        else if(L[0] === "vt"){
        	texturedata.push([parseFloat(L[1]), parseFloat(L[2])]);
        }
        else if( L[0] === "f" ){
        	var t = [];
            if( L.length !== 4 )
                console.log("Warning: Non-triangles present");
            
            for(var i=1;i<4;++i){
                var tmp = L[i].split("/");
                var ti = tmp[1];
                var vi=parseInt(tmp[0],10)-1;
                var ni = tmp[2];
                
                if(ti === undefined || ti.length === 0){
                	throw new Error("No texture coordinates");
                }else{
                	ti = parseInt(ti,10)-1;
                }
                if(ni === undefined || ni.length === 0)
                	throw new Error("No normal data");
                else
                	ni = parseInt(ni,10)-1;
                
                t.push(vi, ti, ni);
            }
            triangles.push(t);
        }
        else if(L[0] === "mtllib"){
        	var ml = fs.readFileSync(L[1], {encoding:"utf8"});
        	var mname;
        	ml = ml.split("\n");
        	for(var m = 0; m < ml.length; m++){
        		var tmp = ml[m].split(" ");
        		if(tmp[0] === "newmtl"){
        			mname = tmp[1];
        			mdict[mname] = {};
        		}
        		else if(tmp[0] === "map_Kd")
        			mdict[mname].map_Kd = tmp[1];
        		else if(tmp[0] === "map_Bump")
        			mdict[mname].map_Bump = tmp[1];
        	}
        }
        else if(L[0] === "usemtl"){
        	currmtl = L[1];
        }
    }
    
    console.log("Recording verts and indices...")
    for(var i = 0; i < triangles.length; i++){
    	var t = triangles[i];
    	for(var j = 0; j < 3; ++j){
    		var vi = t[j*3];
    		var ti = t[j*3+1];
    		var ni = t[j*3+2];
    		var key = vi+","+ti+","+ni;
    		if(vmap[key] === undefined){
    			vmap[key]=nv;
    			vdata.push(
    					vertexdata[vi][0],
    					vertexdata[vi][1],
    					vertexdata[vi][2],
    					texturedata[ti][0],
    					texturedata[ti][1],
    					normalData[ni][0],
    					normalData[ni][1],
    					normalData[ni][2],
    					0,0,0 //tangent placeholder
    					);
    			nv++;
    		}
    		idata.push(vmap[key]);
    	}
    }
    
    console.log("Computing tangent vectors...");
    for(var triIdx = 0; triIdx < idata.length; ++triIdx){
    	//q,r,s = triangle vertices
    	var qrsIdx = [idata[triIdx] * 11, idata[++triIdx] * 11, idata[++triIdx] * 11];
    	var q = vdata.slice(qrsIdx[0], qrsIdx[0]+5);
    	var r = vdata.slice(qrsIdx[1], qrsIdx[1]+5);
    	var s = vdata.slice(qrsIdx[2], qrsIdx[2]+5);
    	var qTex = [0, q.pop()];
    	var rTex = [0, r.pop()];
    	var sTex = [0, s.pop()];
    	
    	qTex[0] = q.pop();
    	rTex[0] = r.pop();
    	sTex[0] = s.pop();
    	
    	r = sub(r, q); //R'xyz
    	s = sub(s, q); //S'xyz
    	rTex = sub(rTex, qTex, 2); //R'st
    	sTex = sub(sTex, qTex, 2); //S'st
    	
    	/*
    	 * [Tx Ty Tz]     [R's R't]^-1    [R'x R'y R'z]
    	 * [Bx By Bz]  =  [S's S't]    *  [S'x S'y S'z]
    	 * 
    	 * A = 1/(R's*S't-R't*S's) [S't -R't]
    	 * 
    	 * [Tx Ty Tz]  =  A  *  [R'x R'y R'z]
    	 *                      [S'x S'y S'z]
    	 */
    	
    	var tmp = 1/(rTex[0] * sTex[1] - rTex[1] * sTex[0]);
    	var A = [tmp * sTex[1], tmp * -rTex[1]];
    	var T = [
    	         A[0] * r[0] + A[1] * s[0],
    	         A[0] * r[1] + A[1] * s[1],
    	         A[0] * r[2] + A[1] * s[2]
    	         ];
    	
    	for(var i = 0; i < 3; ++i){
    		vdata[qrsIdx[0]+8+i] += T[i];
    		vdata[qrsIdx[1]+8+i] += T[i];
    		vdata[qrsIdx[2]+8+i] += T[i];
    	}
    }
    
    for(var i = 0; i < vdata.length; i+=11){
    	var xyz = vdata.slice(i+8, i+11);
    	var len = Math.sqrt(xyz[0]*xyz[0] + xyz[1]*xyz[1] + xyz[2]*xyz[2]);
    	for(var j = 0; j < 3; ++j)
    		vdata[i+8+j] = xyz[j] / len;
    }
    
    //output geometry data
    console.log("Writing to file...");
    var ofp = new Writer(outfile);

    ofp.write("mesh_4\n");
    
    if(mdict[currmtl].map_Kd !== undefined)
    	ofp.write("texture_file " + mdict[currmtl].map_Kd + "\n");
    if(mdict[currmtl].map_Bump !== undefined)
    	ofp.write("normal_map " + mdict[currmtl].map_Bump + "\n")
    
    for(var i = 0; i < objects.length; ++i){
    	ofp.write("object " + objects[i] + " " + numVerts[i] + " " + xSum[i]/numVerts[i] + "," + ySum[i]/numVerts[i] + "," + zSum[i]/numVerts[i] + "\n");
    }
    
    //first, write all vertices
    
    //this is count of num floats per vertex * num vertices 
    ofp.write("vertices "+vdata.length+"\n");
    ofp.write("indices "+idata.length+"\n");

    ofp.write("vertex_data");
    //must pad to 4 byte boundary
    while( (ofp.tell()+1) % 4 !== 0 )
        ofp.write(" ");
    ofp.write("\n");
    
    //write all vertices
    var b = new Buffer(vdata.length*4);
    for(var i=0;i<vdata.length;++i){
        b.writeFloatLE(vdata[i],i*4);
    }
    ofp.write(b);
       
    ofp.write("index_data");
    while( (ofp.tell()+1) % 4 !== 0 )
        ofp.write(" ");
    ofp.write("\n");

    //next, write all triangles
    var b = new Buffer(idata.length*2);
    for(var i=0;i<idata.length;++i){
        b.writeUInt16LE(idata[i],i*2);
    }
    ofp.write(b);
    ofp.write("end\n");
    ofp.end();
    console.log(outfile + " successfully created!");
}

main()

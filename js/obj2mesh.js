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

function main(){
    var infile = process.argv[2];
    var outfile = infile+".mesh";
    
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
        	}
        }
        else if(L[0] === "usemtl"){
        	currmtl = L[1];
        }
    }
    
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
    					normalData[ni][2]
    					);
    			nv++;
    		}
    		idata.push(vmap[key]);
    	}
    }
    
    //output geometry data
    var ofp = new Writer(outfile);

    ofp.write("mesh_3\n");
    
    if(mdict[currmtl].map_Kd !== undefined){
    	ofp.write("texture_file " + mdict[currmtl].map_Kd + "\n");
    }
    
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
}

main()

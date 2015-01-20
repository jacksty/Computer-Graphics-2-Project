"use strict";

//load a 2d texture and draw it

(function(){

var tt = tdl.test.test("instancing");
var glpix;
var cvspix;
var prog;
var gl;

function done(){
    
    var I = gl.getExtension("ANGLE_instanced_arrays");
    if(!I){
        tdl.test.fail(tt);
        return;
    }
        
    gl.clearColor(0.5,0.8,0.2,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    //x,y,z for two triangles, back to back like a diamond
    var vd = [ -0.2,0,0,  0.2,0,0, 0,0.2,0, 0.2,0,0, -0.2,0,0, 0,-0.2,0 ];
    var vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vd), gl.STATIC_DRAW);
    
    //translation for triangles: x,y translations for 4 triangles
    var vd2 = [ -0.5,0.5, 0.5,0.5, 0.5,-0.5, -0.5,-0.5];
    var vb2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vb2);
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vd2), gl.STATIC_DRAW);
    
    //color data: two triangles in one color, two in another
    var vd3 = [ 0.7,0.4,0.2,1.0,   0.2,0.4,0.7,1.0 ];
    var vb3 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vb3);
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vd3), gl.STATIC_DRAW);
   
    prog.use();
    prog.setVertexFormatInstanced(
        [vb, 0, "a_position",3,gl.FLOAT],
        [vb2, 1, "a_translation",2,gl.FLOAT],
        [vb3, 2, "a_color",4,gl.FLOAT]
    );
    
    I.drawArraysInstancedANGLE(gl.TRIANGLES,0,6,4);
    
    tdl.test.compareImages(gl,"instance.png") ;
}

function main(){
    var cvs = document.createElement("canvas");
    document.body.appendChild(cvs);
    cvs.width=64;
    cvs.height=64;
    gl = tdl.setupWebGL(cvs,{preserveDrawingBuffer:true});
    var L = new tdl.Loader(done);
    prog = new tdl.Program(L,"instancevs.txt","instancefs.txt");
    L.finish();
}

main();

})();

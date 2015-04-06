"use strict";

function UnitSquare(){
    var vdata;
    vdata=new Float32Array(
          [ -1, 1,0,   0,1,
            -1,-1,0,   0,0,
             1, 1,0,   1,1,
             1,-1,0,   1,0] );
    var vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);
    gl.bufferData(gl.ARRAY_BUFFER,vdata,gl.STATIC_DRAW);
    this.vbuff=vb;
}

UnitSquare.prototype.draw = function(prog){
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    prog.setVertexFormat(
        "a_position",3,gl.FLOAT,
        "a_coord",2,gl.FLOAT);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
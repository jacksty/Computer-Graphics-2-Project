"use strict";

//load a 2d texture and draw it

(function(){

var tt = tdl.test.test("texture2d");
var glpix;
var cvspix;
var prog;
var tex;
var gl;

var img = new Image();
img.onload = function(){
    var cvs2 = document.createElement("canvas");
    document.body.appendChild(cvs2);
    cvs2.width = img.width;
    cvs2.height = img.height;
    var ctx = cvs2.getContext("2d");
    ctx.drawImage(img,0,0);
    cvspix = ctx.getImageData(0,0,cvs2.width,cvs2.height);
    var cvs = document.createElement("canvas");
    cvs.width=64;
    cvs.height=64;
    document.body.appendChild(cvs);
    gl = tdl.setupWebGL(cvs);
    var L = new tdl.Loader(done);
    tex = new tdl.Texture2D(L,"flower1.png");
    prog = new tdl.Program(L,"texturetestvs.txt","texturetestfs.txt");
    L.finish();
}
img.src="flower1.png";

function done(){
    gl.clearColor(0.5,0.8,0.2,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    var M = new tdl.primitives.Mesh( 
        tdl.primitives.createPlane(2,2,1,1),
        {   "position" : { name: "a_position", number: 3 } ,
            "texCoord" : { name: "a_texcoord", number: 2 }
        });
    prog.use();
    prog.setUniform("tex",tex);
    M.draw(prog);
    glpix = new Uint8Array(img.width*img.height*4);
    gl.readPixels(0,0,img.width,img.height,gl.RGBA,gl.UNSIGNED_BYTE,glpix);

    
    var np = img.width*img.height;
    var j=0;
    for(var i=0;i<np;++i){
        var gred = glpix[j];
        var cred = cvspix.data[j];
        j++;
        var ggreen = glpix[j];
        var cgreen = cvspix.data[j];
        j++;
        var gblue = glpix[j];
        var cblue = cvspix.data[j];
        ++j;
        var galpha = glpix[j];
        var calpha = cvspix.data[j];
        
        if( gred !== cred  || ggreen !== cgreen || gblue !== cblue || galpha !== calpha ){
            console.log("i=",i,"gl=",gred,ggreen,gblue,galpha,"  cvs=",
                cred,cgreen,cblue,calpha);
            tdl.test.fail();
            return;
        }
    }
    tdl.test.pass();
}

    
})();

(function(){

var L;
var t = tdl.test.test("loader done");
L = new tdl.Loader(function(){ 
} );

var t3 = tdl.test.test("loadArrayBuffer");
L.loadArrayBuffer("octagon.obj.mesh",function(ab){
    var u8 = new Uint8Array(ab);
    var h="mesh_0\nvertices 75";
    for(var i=0;i<h;++i){
        if( u8[i] != h.charCodeAt(i) ){
            tdl.test.fail();
        }
    }
    tdl.test.pass();
});

L.finish();

})();

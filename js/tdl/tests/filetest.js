(function(){

var L;
var t = tdl.test.test("loader done");
L = new tdl.Loader(function(){ 
    tdl.test.pass(t); 
} );
L.finish();

})();

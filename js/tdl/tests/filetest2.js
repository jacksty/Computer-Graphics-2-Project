(function(){

var L;
var t = tdl.test.test("loader done");
L = new tdl.Loader(function(){ } );

var t1 = tdl.test.test("loadTextFile");
L.loadTextFile("textfile.txt",
    function callback(txt){
        var expected = [
            "//<b>This should not be bold</b>",
            "precision highp float;",
            "",
            "void main(){",
            "    if( v_pw.x < 2 && v_pw.y > 3 ){",
            "        gl_FragColor.a = 100;   //test for parsing",
            "    }",
            "    //<b>this should not be bold</b>",
            "    gl_FragColor.a = 1.0;",
            "}",
            ""];
        expected = expected.join("\n");
        if( txt === expected )
            tdl.test.pass();
        else{
            tdl.test.fail();
        }
    }
);

})();


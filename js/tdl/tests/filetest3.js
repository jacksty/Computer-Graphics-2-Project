(function(){

var L;
var t = tdl.test.test("loader done");
L = new tdl.Loader(function(){ 
} );

var t2 = tdl.test.test("loadImage");
L.loadImage("flower1.png",
    function(img){
        var cvs = document.createElement("canvas");
        cvs.style.display="none";
        document.body.appendChild(cvs);
        cvs.width=img.width;
        cvs.height = img.height;
        var ctx = cvs.getContext("2d");
        ctx.drawImage(img,0,0);
        cvs.toBlob(function(b){
            var r = new FileReader();
            r.addEventListener("loadend",function(){
                var u8 = new Uint8Array(r.result);
                if( u8[0] === 137 && u8[1] === 80 && u8[2] === 78 )
                    tdl.test.pass();
                else
                    tdl.test.fail();
            });
            r.readAsArrayBuffer(b);
        });
        
    }
);

})();

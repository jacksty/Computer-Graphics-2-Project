//jh wrote: Convenience wrapper for tdl

//In Chrome, if you are using file:// url's, you must start Chrome with
//the --allow-file-access-from-files option.

//In Firefox, symbolic links may be counted as non-same-origin with file:// URL's.


"use strict";

var tdl;
if( tdl === undefined )
    tdl = {};
    
(function(){

    //get our location
    var sl = document.getElementsByTagName("script");
    var i,basepath;
    var re = /(.*)(^|\/)tdl.js$/i;
    for(i=0;i<sl.length;++i){
        var m = re.exec(sl[i].src);
        if( m ){
            basepath=m[1];
            if( basepath.length > 0 ){
                if( basepath[basepath.length-1] !== '/' )
                    basepath += "/";
            }
            tdl.basepath = basepath;
            break;
        }
    }
    var tmp=[];
    tmp=[
        "base","misc",
        "math","log","webgl",
        "quaternions","string",
        "loader","textures","programs",
        "framebuffers","primitives","populate"];
        
    var s = [];
    for(var i=0;i<tmp.length;++i){
        s.push( '<script type="text/javascript" src="'+basepath+tmp[i]+'.js"></script>');
    }
    s=s.join("\n");

    document.write( s );
        //'<script type="text/javascript" src="'+basepath+'base.js"></script>' +
        //'<script type="text/javascript" src="'+basepath+'loadall.js"></script>'+
        //'<script type="text/javascript" src="'+basepath+'populate.js"></script>'
        
    return;
    
})();

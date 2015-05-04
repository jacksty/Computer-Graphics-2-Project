function getInProjectPath(type, path){
	if(type === "s")
		return "shader/"+path;
	if(type === "j")
		return "js/"+path;
	if(type === "m")
		return "mesh/"+path;
	if(type === "t")
		return "tex/"+path;
}

function loadShaders(loader, names){
	for(var i = 0; i < names.length; ++i)
		main[names[i][0]] = new tdl.Program(loader, getInProjectPath("s", names[i][1]), getInProjectPath("s", names[i][2]));
}

function updateTransparency(){
	main.transEnt.sort(
			function(a, b){
				var aa = tdl.subVector(a.position, main.cam.eye);
				aa = [aa[0] * aa[0] + aa[1] * aa[1] + aa[2] * aa[2]];
				var bb = tdl.subVector(b.position, main.cam.eye);
				bb = [bb[0] * bb[0] + bb[1] * bb[1] + bb[2] * bb[2]];
				
				return bb - aa;
			}
	);
}

function randomRange(n,x){
    return n + Math.random() * (x-n);
}
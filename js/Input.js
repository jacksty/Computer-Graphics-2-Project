function keyHandler(dtime){
	var d = dtime * 0.02;
	var r = Math.PI/180 * 2 * d;
	
	if(main.keyDict[49] === true) //1
		{
			main.cameraMode = 1;
			main.particleSystem.init({startpos: [0, 15, 40, 1], color: [1,1,1,1], initialVelocity: [0,0,0], initialVelocityMod: [1,1,1], gravity: [0, -1, 0], gravityMod: [1,1,1], life: 500000, size: 5.0});
		}
	if(main.keyDict[50] === true){ //2
		main.cameraMode = 2;
		main.cam.right = main.tank.right;
		main.cam.up = main.tank.up;
		main.cam.antilook = main.tank.back;
		main.cam.eye = [main.tank.pos[0], main.tank.pos[1], main.tank.pos[2], 1];
		main.cam.eye = tdl.add(main.cam.eye, tdl.mul(main.tank.back, -.05));
		main.cam.eye = tdl.add(main.cam.eye, tdl.mul(main.tank.up, 2));
		main.cam.computeVPM();
	}
	if(main.keyDict[51] === true){ //3
		main.cameraMode = 3;
		main.cam.orientFromCOI(main.tank.pos, [0,1,0,0]);
	}
	if(main.keyDict[87] === true) //w
		move("strafe", tdl.mul(main.cam.antilook, -d), tdl.mul(main.tank.back, -d));
	if(main.keyDict[65] === true){ //a
		move("strafe", tdl.mul(main.cam.right, -d), [0,0,0,0]);
		move("turn", 0, r);
	}
	if(main.keyDict[83] === true) //s
		move("strafe", tdl.mul(main.cam.antilook, d), tdl.mul(main.tank.back, d));
	if(main.keyDict[68] === true){ //d
		move("strafe", tdl.mul(main.cam.right, d), [0,0,0,0]);
		move("turn", 0, -r);
	}
	if(main.keyDict[16] === true) //shift
		move("strafe", tdl.mul(main.cam.up, d), [0,0,0,0]);
	if(main.keyDict[17] === true) //ctrl
		move("strafe", tdl.mul(main.cam.up, -d), [0,0,0,0]);
	if(main.keyDict[37] === true) //left
		move("turn", r, 0);
	if(main.keyDict[39] === true) //right
		move("turn", -r, 0);
	if(main.keyDict[38] === true) //up
		move("tilt", r, 0);
	if(main.keyDict[40] === true) //down
		move("tilt", -r, 0);
	if(main.keyDict[81] === true) //q
		move("lean", r, 0);
	if(main.keyDict[69] === true) //e
		move("lean", -r, 0);
	if(main.keyDict[74] === true) //j
		move("turnt", 0, r);
	if(main.keyDict[76] === true) //l
		move("turnt", 0, -r);
	if(main.keyDict[75] === true) //k
		move("tiltg", 0, -r);
	if(main.keyDict[73] === true) //i
		move("tiltg", 0, r);
}

//tank movement
function move(type, amtCam, amtAst){
	if(type === "strafe"){
		if(main.cameraMode !== 3 && !(main.cameraMode === 2 && Math.abs(amtCam[0]) === Math.abs(main.cam.right[0]) && 
									  Math.abs(amtCam[1]) === Math.abs(main.cam.right[1]) &&
									  Math.abs(amtCam[2]) === Math.abs(main.cam.right[2])))
			main.cam.strafe(amtCam);
		if(main.cameraMode !== 1)
			main.tank.strafe(amtAst);
	}
	
	if(type === "turn"){
		if(main.cameraMode !== 3)
			main.cam.turn(amtCam);
		if(main.cameraMode !== 1)
			main.tank.turn(amtAst);
	}
	
	if(type === "tilt"){
		if(main.cameraMode !== 3)
			main.cam.tilt(amtCam);
	}
	
	if(type === "lean"){
		if(main.cameraMode !== 3)
			main.cam.lean(amtCam);
	}
	
	if(type === "turnt")
		main.tank.turnTurret(amtAst);
	
	if(type === "tiltg")
		main.tank.tiltGun(amtAst);
	
	if(main.cameraMode === 3)
		main.cam.orientFromCOI(main.tank.pos, [0,1,0,0]);
	else if(main.cameraMode === 2){
		main.cam.eye = [main.tank.pos[0], main.tank.pos[1], main.tank.pos[2], 1];
		main.cam.eye = tdl.add(main.cam.eye, tdl.mul(main.tank.back, -.1));
		main.cam.eye = tdl.add(main.cam.eye, tdl.mul(main.tank.up, 2));
	}
}
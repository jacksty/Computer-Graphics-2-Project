"use strict";

function ParticleSystem(np){
    this.idx=0;
	
	//round number of particles to multiple of 100
    var w = 100;
    var h = Math.floor(np/100);
    var np = w*h;
    
    this.w=w;
    this.h=h;
    this.idx=0;
    this.lifeleft = 0;
    this.nump = np;
    
    this.pos=[];
    this.vel=[];
    
    for(var i = 0; i < 2; ++i){
        var f = new tdl.Framebuffer(w, h, { depth: false, format: [[gl.RGBA,gl.FLOAT]]});
        f.texture.setParameter(gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        f.texture.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        f.texture.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        f.texture.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.pos.push(f);
        f = new tdl.Framebuffer(w,h, { depth: false, format: [[gl.RGBA,gl.FLOAT]]});
        f.texture.setParameter(gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        f.texture.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        f.texture.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        f.texture.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.vel.push(f);
    }
    
    //Theoretically, we can support fireworks with different numbers of particles...
    //For this demo, we don't use that functionality.
    if( ParticleSystem.vbuffers[np] === undefined ){
        var vdata = [];
        for(var i = 0; i < h; ++i){
            for(var j = 0; j < w; ++j){
                vdata.push((j + 0.5) / w, (i + 0.5) / h );
            }
        }
        ParticleSystem.vbuffers[np] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ParticleSystem.vbuffers[np]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vdata), gl.STATIC_DRAW);
    }
}

//load all the common data once
ParticleSystem.load = function(loader){
    ParticleSystem.updateprog = new tdl.Program(loader,"particleSystemVertexShaderUpdate.txt","particleSystemFragmentShaderUpdate.txt");
    ParticleSystem.drawprog = new tdl.Program(loader,"particleSystemVertexShader.txt","particleSystemFragmentShader.txt");
    ParticleSystem.usq = new UnitSquare();
    ParticleSystem.vbuffers=[];
    ParticleSystem.dummytex = new tdl.SolidTexture([255,255,255,255]);
}

ParticleSystem.prototype.randrange = function(n,x){
    return n + Math.random() * (x-n);
}

//starting position of the particles, color of particles
ParticleSystem.prototype.init = function(opts){
	this.alive = true;
	this.startpos = (opts.startpos !== undefined) ? opts.startpos : [0,0,-10,1];
	var color = (opts.color !== undefined) ? opts.color : [1,1,1,1];
	var initialVelocity = (opts.initialVelocity !== undefined) ? opts.initialVelocity : [0,1,0];
	var initialVelocityMod = (opts.initialVelocityMod !== undefined) ? opts.initialVelocityMod : [1,1,1];
	this.gravity = (opts.gravity !== undefined) ? opts.gravity : [0,-1,0];
	this.gravityMod = (opts.gravityMod !== undefined) ? opts.gravityMod : [1,1,1];
	this.lifeleft = (opts.life !== undefined) ? opts.life : 5000; //in msec
	this.size = (opts.size !== undefined) ? opts.size : 1.0;
	this.emitter = (opts.emitter !== undefined) ? opts.emitter : 1.0;
	this.gravity = tdl.mul(this.gravity, [0,.000001,0], this.gravityMod);
	initialVelocity = tdl.mul(initialVelocity, [.001, .001, .001], initialVelocityMod);
	this.maxlife = this.lifeleft;
    this.idx=0;
    
    //all the starting positions are the same
    var tmp = this.startpos.slice(0,3).concat(0);
    this.pos[0].clear( tmp );

    //make a bunch of random velocities + lifetimes
    var V=[];
    for(var i = 0; i < this.nump; ++i){
        var v = [
            this.randrange(initialVelocity[0] - .001 * initialVelocityMod[0], initialVelocity[0] + .001 * initialVelocityMod[0]),
            this.randrange(initialVelocity[1] + .001 * initialVelocityMod[1], initialVelocity[1] + .002 * initialVelocityMod[1]),
            this.randrange(initialVelocity[2] - .001 * initialVelocityMod[2], initialVelocity[2] + .001 * initialVelocityMod[2]),
            this.randrange(0.2 * this.lifeleft, 1.0 * this.lifeleft)
        ];
        V.push(v[0], v[1], v[2], v[3]);
    }
    this.vel[0].initializeData(V);
    this.color = color;
}

ParticleSystem.prototype.update = function(elapsed){
    //if(this.lifeleft <= 0)
    //    return;

    gl.disable(gl.BLEND);
    ParticleSystem.updateprog.use();
    ParticleSystem.updateprog.setUniform("postex",this.pos[this.idx]);
    ParticleSystem.updateprog.setUniform("veltex",this.vel[this.idx]);
	ParticleSystem.updateprog.setUniform("startpos",this.startpos);
	
    
    //gravity: units per msec
    ParticleSystem.updateprog.setUniform("g", this.gravity);
    
    //in msec
    ParticleSystem.updateprog.setUniform("elapsed",elapsed);
    
	//console.log(elapsed);
	ParticleSystem.updateprog.setUniform("emitter",this.emitter);
	ParticleSystem.updateprog.setUniform("maxlife",this.maxlife);
    //update positions
    ParticleSystem.updateprog.setUniform("mode",1);
    this.pos[1-this.idx].bind();
    ParticleSystem.usq.draw(ParticleSystem.updateprog);
    this.pos[1 - this.idx].unbind();
    
    //update velocities + life left
    ParticleSystem.updateprog.setUniform("mode",0);
    this.vel[1 - this.idx].bind();
    ParticleSystem.usq.draw(ParticleSystem.updateprog);
    this.vel[1 - this.idx].unbind();
    
    this.idx = 1 - this.idx;
    this.lifeleft -= elapsed;
    gl.enable(gl.BLEND);
}

ParticleSystem.prototype.draw = function(camera){
    //if(this.lifeleft <= 0)
    //    return;

    ParticleSystem.drawprog.use();
    camera.draw(ParticleSystem.drawprog);
    ParticleSystem.drawprog.setUniform("color",this.color);
	ParticleSystem.drawprog.setUniform("size",this.size);
    ParticleSystem.drawprog.setUniform("postex",this.pos[this.idx]);
    ParticleSystem.drawprog.setUniform("veltex",this.vel[this.idx]);
    gl.bindBuffer(gl.ARRAY_BUFFER, ParticleSystem.vbuffers[this.nump]);
    ParticleSystem.drawprog.setVertexFormat("position",2,gl.FLOAT);
    gl.drawArrays(gl.POINTS,0,this.nump);
    
    //make sure we can update the pos and vel textures on the next go-round
    ParticleSystem.drawprog.setUniform("postex",ParticleSystem.dummytex);
    ParticleSystem.drawprog.setUniform("veltex",ParticleSystem.dummytex);
    
}
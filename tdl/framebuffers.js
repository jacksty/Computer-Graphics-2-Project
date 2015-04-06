//modified by jh at ssu 2013, 2014
"use strict"

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
//"use strict";

/**
 * @fileoverview This file contains objects to manage
 *               framebuffers.
 */

tdl.provide('tdl.framebuffers');

tdl.require('tdl.textures');

/**
 * A module for framebuffers.
 * @namespace
 */
tdl.framebuffers = tdl.framebuffers || {};


tdl.framebuffers.BackBuffer = function(canvas) {
    this.depth = true;
    this.buffer = null;
};

tdl.framebuffers.BackBuffer.prototype.bind = function() {
    tdl.gl.bindFramebuffer(tdl.gl.FRAMEBUFFER, null);
    tdl.gl.viewport(0, 0, this.width, this.height);
};

if (Object.prototype.__defineSetter__) {
    tdl.framebuffers.BackBuffer.prototype.__defineGetter__(
        'width',
        function () {
          return tdl.gl.drawingBufferWidth || tdl.gl.canvas.width;
        }
    );

    tdl.framebuffers.BackBuffer.prototype.__defineGetter__(
        'height',
        function () {
          return tdl.gl.drawingBufferHeight || tdl.gl.canvas.height;
        }
    );
}

// Use this where you need to pass in a framebuffer, but you really
// mean the backbuffer, so that binding it works as expected.
tdl.framebuffers.getBackBuffer = function(canvas) {
    return new tdl.framebuffers.BackBuffer(canvas)
};

/** Create a framebuffer object.
 *  Note: If the format is floating point, mipmapping will be disabled; you can
 *     reenable it with fbo.texture.setParameter(gl.TEXTURE_MIN_FILTER, ...)
 * @param width The width of the FBO
 * @param height The height of the FBO
 * @param opts An optional dictionary with these items:
 *          format: A list of [format,type] pairs.
 *                  The length of this list must be one if
 *                  your browser does not have the draw_buffers extension
 *                  Default: [tdl.gl.RGBA, tdl.gl.UNSIGNED_BYTE]
 *          depth: True if the FBO should have a depth buffer; false if not. 
 *                  Default: true
 *          depthtexture: True if a depth texture should be used for
 *                  the depth buffer; false if not. Default: false
 *          cubemap: True if this should be a cubemap; false if not. Default: false
 *          name: For debugging: A string. Default: ""
 */
tdl.framebuffers.Framebuffer = function(width, height, opts) {
    
    //for debugging: So we have a list of all fbo's
    if( tdl.framebuffers.allframebuffers === undefined ){
        tdl.framebuffers.allframebuffers = [];
        tdl.framebuffers.uniquefbid=0;
    }
        
    if( opts === undefined )
        opts={};
    if( opts === true || opts === false)
        throw new Error("opts must be a dictionary");
    if( !width || !height ){
        throw new Error("Bad Framebuffer size: "+width+" "+height);
    }
 
    if( opts.formats && !opts.format ){
        console.warn("Framebuffer wants option 'format', not 'formats'")
    }

    //if this framebuffer is for internal (TDL) use only,
    //don't add it to the global list of framebuffers
    if( !opts.internaluseonly )
        tdl.framebuffers.allframebuffers.push(this);

    this.formats = (opts.format===undefined ) ? [ [tdl.gl.RGBA,tdl.gl.UNSIGNED_BYTE] ] : opts.format;
    for(var i=0;i<this.formats.length;++i){
        if( this.formats[i].length !== 2 ){
            throw new Error("Format must be list of pairs, but we found: "+this.formats);
        }
    }
    
    this.depth =  (opts.depth === undefined ) ? true : opts.depth;
    this.use_depthtexture = (opts.depthtexture === undefined) ? false: opts.depthtexture;
    this.name = (opts.name === undefined) ? "" : opts.name;
    this.width = width;
    this.height = height;
    this.cubemap = (opts.cubemap === undefined) ? false : opts.cubemap;
    
    
    this.textures=[];       //all the textures for the fbo (several if using MRT)
    this.texture=undefined; //alias of textures[0]
    this.depthtextures=[];  //used if use_depthtexture == true. Multiple entries if cubemap.
    this.depthbuffers=[];   //used if use_depthtexture == false. Multiple entries if cubemap.
    this.framebuffers=[];   //multiple entries if cubemap: One per cubemap side
    
    if( this.cubemap && width !== height ){
        throw new Error("Cubemaps must be square");
    }
    
    this.recoverFromLostContext();
};

/** Clear the framebuffer to some specified value. Note: It's more efficient
    to use gl.clear() if the value is between 0...1 (use gl.clearColor()).
    @param p The value to clear to. Default: [0,0,0,0]
    @param target the MRT target to clear. Default: 0
*/
tdl.framebuffers.Framebuffer.prototype.clear = function( p, targetnumber){

    if( p===undefined )
        p=[0,0,0,0];
         
    if( targetnumber === undefined ) 
        targetnumber = 0;
        
    //FIXME: Why does color clear clamp its values even when the standard says it shouldn't?
    tdl.gl.clear(tdl.gl.DEPTH_BUFFER_BIT | tdl.gl.STENCIL_BUFFER_BIT );
    var nc;
    var f = this.formats[targetnumber][0];
    if(f === tdl.gl.LUMINANCE || f === tdl.gl.ALPHA )
        nc=1;
    else if( f === tdl.gl.LUMINANCE_ALPHA )
        nc=2;
    else if( f === tdl.gl.RGB )
        nc=3;
    else if( f === tdl.gl.RGBA )
        nc=4;
    else
        throw new Error("Bad format");
        
    var D = new Array(this.width*this.height*nc);
    for(var c=0;c<D.length;){
        D[c++] = p[0];
        D[c++] = p[1];
        D[c++] = p[2];
        D[c++] = p[3];
    }
    this.initializeData(D);

    return;
    
    
    var oldclear = tdl.gl.getParameter(tdl.gl.COLOR_CLEAR_VALUE);
    this.bind();
    tdl.gl.clearColor(p[0],p[1],p[2],p[3]);
    tdl.gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT );
    this.unbind();
    tdl.gl.clearColor(oldclear[0],oldclear[1],oldclear[2],oldclear[3]);
}

/** Dispose of all resources associated with this FBO */
tdl.framebuffers.Framebuffer.prototype.dispose = function(){
    this.textures.forEach( function(t){
        t.dispose();
    });
    this.framebuffers.forEach( function(f){
        tdl.gl.deleteFramebuffer(f);
    });
    this.depthtextures.forEach( function(f){
        tdl.gl.deleteTexture(f);
    });
    this.depthbuffers.forEach( function(d){
        tdl.gl.deleteRenderbuffer(d);
    });
}

/** Make this fbo the active render target.
    @param face: The cubemap face to make active. Only valid if this is a cubemap. Should be 0...5
*/
tdl.framebuffers.Framebuffer.prototype.bind = function(face) {
    
    if( face !== undefined && !this.cubemap )
        throw new Error("Not a cubemap; must not bind a face");
    
    //list of the attachments we must set    
    var tmp = [];
    
    for(var i=0;i<this.textures.length;++i){
        if( this.textures[i].isBound() ){
            var u = this.textures[i].getBoundUnits();
            //console.trace();
            console.error("Tried to bind FBO "+this.name+", texture "+i+" as destination, but its texture is active on units: "+u.join(","));
            for(var i=0;i<u.length;++i){
                tdl.framebuffers.dummytex.bindToUnit(u[i]);
            }
        }
        tmp.push(gl.COLOR_ATTACHMENT0+i);
    }
    
    
    if( tdl.framebuffers.active_fbo === this ){
        console.warn("Warning: "+this.name+" Binding the same FBO twice");
    }
    
    if( face === undefined )
        face=0;
        
    tdl.gl.bindFramebuffer(tdl.gl.FRAMEBUFFER, this.framebuffers[face]);
    tdl.gl.viewport(0, 0, this.width, this.height);
    tdl.framebuffers.active_fbo = this;
    if( this.textures.length > 1 ){
        this.dbextension.drawBuffersWEBGL(tmp);
    }
};

/** Static function: Unbind FBOs: Return rendering to the screen. */
tdl.framebuffers.Framebuffer.unbind = function() {
    tdl.gl.bindFramebuffer(tdl.gl.FRAMEBUFFER, null);
    tdl.gl.viewport(
        0, 0,
        tdl.gl.drawingBufferWidth || tdl.gl.canvas.width,
        tdl.gl.drawingBufferHeight || tdl.gl.canvas.height);
    tdl.framebuffers.active_fbo=undefined;
};

/** Associate texture 'texnum' with texture unit 'unit'.
    @param unit: One of the GL texture units. Value: 0...n, where n is usually 16 or 32
    @param texnum: The texture target for this FBO. Zero, unless this FBO uses MRTs.
*/
tdl.framebuffers.Framebuffer.prototype.bindToUnit = function(unit,texnum){
    if( tdl.framebuffers.active_fbo === this ){
        throw new Error("FBO can't be attached to a texture unit while it's the active render target");
        //tdl.framebuffers.dummytex2.bindToUnit(unit);
    }
    else{
        if( texnum === undefined )
            texnum=0;
        this.textures[texnum].bindToUnit(unit);
    }
}
        

tdl.framebuffers.Framebuffer.prototype.unbind = function() {
  tdl.framebuffers.Framebuffer.unbind();
};


/** Draw the contents of the FBO (as a quad) to the current render target.
FIXME: This doesn't work with cubemaps yet.
@param index: Integer: The fbo target, for multiple render targets. Default=0
@param min: vec4: The values that will be mapped to zero in the output. Default=[0,0,0,0]
@param max: vec4: The values that will be mapped to one in the output. Default=[1,1,1,1]
@param channels: String: Should have exactly three characters from "rgbax".
    Example: Draw the alpha channel of the fbo to the red channel of the output; write zero to green and blue: Use "axx".
    Example: Draw the green channel only, making it greyscale: Use "ggg".
    Default value: "rgb"
    Note that the output always has an alpha value of 1.
Note: This function changes the current active program to be its own internal one.
*/
tdl.framebuffers.Framebuffer.prototype.draw = function(index,min,max,channels){
    //FIXME: Make this a class attribute, but able to handle
    //multiple GL contexts
    
    var gl = tdl.gl;
    
    if( index === undefined )
        index = 0;
    if( min === undefined )
        min=[0,0,0,0];
    else if( min.length === undefined )
        min = [min,min,min,min];
        
    if( max=== undefined)
        max=[1,1,1,1];
    else if( max.length === undefined )
        max=[max,max,max,max];
        
    if( channels === undefined )
        channels="rgb";
    
    if( tdl.framebuffers.Framebuffer.drawprog === undefined ){
        var L = [
"attribute vec2 a_position;",
"attribute vec2 a_texcoord;",
"varying vec2 v_texcoord;",
"void main(){",
" gl_Position = vec4(a_position.xy,0.0,1.0);",
" v_texcoord = a_texcoord;",
"}"];
        var vs = L.join("\n");
        var L = [
"precision highp float;",
"uniform sampler2D texture;",
"varying vec2 v_texcoord;",
"uniform vec4 min;",
"uniform vec4 max;",
"uniform mat4 colorMatrix;",
"void main(){",
" vec4 c = texture2D(texture,v_texcoord);",
" vec4 t = (c - min) / (max-min);",
" vec4 t2 = t * colorMatrix; ",
" gl_FragColor = vec4(t2.rgb,1.0);",
"}"
];

        var fs = L.join("\n");
        tdl.framebuffers.Framebuffer.drawprog = new tdl.Program(null,vs,fs,{params_are_source:true});
        var vdata=new Float32Array(
            [ 
                -1, 1,    0,1,
                -1,-1,    0,0,
                 1, 1,    1,1,
                 1,-1,    1,0,
            ]
        );
        var vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,vb);
        gl.bufferData(gl.ARRAY_BUFFER,vdata,gl.STATIC_DRAW);
        tdl.framebuffers.Framebuffer.drawvb=vb;
        tdl.framebuffers.Framebuffer.drawdummy = new tdl.SolidTexture([0,0,0,0]);
    }
    
    
    if( channels.length !== 3 )
        throw new Error("Bad channels");
        
    var colormatrix=[0,0,0,0,  0,0,0,0,  0,0,0,0,   0,0,0,0 ];
    for(var i=0;i<3;++i){
        if( channels[i] === 'r' )
            colormatrix[i]=1;        //row 0, column i
        else if( channels[i] === "g" )
            colormatrix[4+i]=1;    //row 1, column i
        else if( channels[i] === 'b' )
            colormatrix[8+i]=1;   //row 2, column i
        else if( channels[i] === 'a' )
            colormatrix[12+i]=1;
        else if( channels[i] === 'x' )
            ;
        else
            throw new Error("Bad channel");
    }
    
    
    
    var dither = tdl.gl.getParameter(tdl.gl.DITHER);
    tdl.gl.disable(tdl.gl.DITHER);
    var blend = tdl.gl.getParameter(tdl.gl.BLEND);
    tdl.gl.disable(tdl.gl.BLEND);
    var depthtest = tdl.gl.getParameter(tdl.gl.DEPTH_TEST);
    tdl.gl.disable(tdl.gl.DEPTH_TEST);
    
    var prog = tdl.framebuffers.Framebuffer.drawprog;
    
    prog.use();        //use our readback program
    tdl.gl.bindBuffer(gl.ARRAY_BUFFER, tdl.framebuffers.Framebuffer.drawvb);   
    prog.setVertexFormat("a_position",2,gl.FLOAT, "a_texcoord",2,gl.FLOAT);
    prog.setUniform("texture",this.textures[index]);  
    prog.setUniform("colorMatrix",colormatrix);
    gl.clear(gl.COLOR_BUFFER_BIT);
    prog.setUniform("min",min);
    prog.setUniform("max",max);
    tdl.gl.drawArrays(tdl.gl.TRIANGLE_STRIP,0,4);
    prog.setUniform("texture",tdl.framebuffers.Framebuffer.drawdummy);

    if( dither )
        tdl.gl.enable(tdl.gl.DITHER);
    if( blend )
        tdl.gl.enable(tdl.gl.BLEND);
    if( depthtest )
        tdl.gl.enable(tdl.gl.DEPTH_TEST);
    return;
}    
    

//For debugging: Read back the contents of the framebuffer as
//an array of items. Parameter index is the index of the buffer
//to read back (for multiple render targets).
tdl.framebuffers.Framebuffer.prototype.readback = function(index){
    //FIXME: Make this a class attribute, but able to handle
    //multiple GL contexts
    
    var gl = tdl.gl;
    
    if( index === undefined )
        index = 0;
        
    if( tdl.framebuffers.Framebuffer.readbackprog === undefined ){
        var L = [
"attribute vec2 a_position;",
"attribute vec2 a_texcoord;",
"varying vec2 v_texcoord;",
"void main(){",
" gl_Position = vec4(a_position.xy,0.0,1.0);",
" v_texcoord = a_texcoord;",
"}"];
        var vs = L.join("\n");
        var L = [
"precision highp float;",
"uniform sampler2D texture;",
"uniform float channel;",
"uniform float scale;",
"varying vec2 v_texcoord;",
"void main(){",
" vec4 c = texture2D(texture,v_texcoord);",
" float f;",
" if(channel == 0.0 ) f=c.r;", 
" if(channel == 1.0 ) f=c.g;",
" if(channel == 2.0 ) f=c.b;",
" if(channel == 3.0 ) f=c.a;",
" float r,g,b,a;",
" a = sign(f)*0.5 + 0.5;",
" f = abs(f);",
" f = f * scale;",
//get only the byte that is immediately left of the binary point
//right after we scale.
" f = floor(f);",
" g = float(f>=256.0);",
//get rid of everything above lowermost 8 bits
" f = fract(f/256.0);",
//scale it to proper range for output
" r = f*256.0/255.0;",
" gl_FragColor = vec4(r,g,0,a);",
"}"];
        var fs = L.join("\n");
        tdl.framebuffers.Framebuffer.readbackprog = new tdl.Program(null,vs,fs,{params_are_source:true});
        var vdata=new Float32Array(
            [ 
                -1, 1,    0,1,
                -1,-1,    0,0,
                 1, 1,    1,1,
                 1,-1,    1,0,
            ]
        );
        var vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,vb);
        gl.bufferData(gl.ARRAY_BUFFER,vdata,gl.STATIC_DRAW);
        this.readbackvb=vb;
        this.readbacktarget = new tdl.Framebuffer(this.width,this.height,{depth:false,
                format: [ [gl.RGBA,gl.UNSIGNED_BYTE] ] });
        this.readbackdummy = new tdl.SolidTexture([0,0,0,0]);
    }
    
    this.readbackprog = tdl.framebuffers.Framebuffer.readbackprog;
    
    var dither = tdl.gl.getParameter(tdl.gl.DITHER);
    tdl.gl.disable(tdl.gl.DITHER);
    var blend = tdl.gl.getParameter(tdl.gl.BLEND);
    tdl.gl.disable(tdl.gl.BLEND);
    
    this.readbacktarget.bind();     //render to a temporary buffer
    this.readbackprog.use();        //use our readback program
    tdl.gl.bindBuffer(gl.ARRAY_BUFFER, this.readbackvb);    //use readback vertex buffer
    this.readbackprog.setVertexFormat("a_position",2,gl.FLOAT, "a_texcoord",2,gl.FLOAT);
    this.readbackprog.setUniform("texture",this.textures[index]);  
    
    //staging area for the data
    var tmp = new Uint8Array(4*this.width*this.height);
    
    var rv = new Array(this.width*this.height*4);
    for(var i=0;i<rv.length;++i){
        rv[i]=0;
    }
    
    for(var channel=0;channel<4;++channel){
        this.readbackprog.setUniform("channel",channel);
        for(var s=-8;s<=8;s+=8){
            var scale = Math.pow(2.0,s);
            
            gl.clear(gl.COLOR_BUFFER_BIT);
            this.readbackprog.setUniform("scale",scale);
            tdl.gl.drawArrays(tdl.gl.TRIANGLE_STRIP,0,4);
            tdl.gl.readPixels(0,0,this.width,this.height,tdl.gl.RGBA,tdl.gl.UNSIGNED_BYTE,tmp);
            //console.log("channel",channel,"scale=",scale,"tmp=",[tmp[0],tmp[1],tmp[2],tmp[3]]);
            var c=0;
            var d=channel;
            for(var i=0;i<this.height;++i){
                for(var j=0;j<this.width;++j){
                    var r = tmp[c];
                    var a = tmp[c+3];
                    c+=4;
                    var v = r / scale;
                    if( a === 0 )
                        v = -v;
                    else if( (a===127 || a===128 ) && Math.abs(v) > 0.001 )
                        console.log("Got a=",a," but v=",v);
                    rv[d] += v;
                    d += 4;
                }
            }
        }
    }
    this.readbackprog.setUniform("texture",this.readbackdummy);
    this.readbacktarget.unbind();
    
    if( dither )
        tdl.gl.enable(tdl.gl.DITHER);
    if( blend )
        tdl.gl.enable(tdl.gl.BLEND);
        
    return rv;
}

tdl.framebuffers.Framebuffer.prototype.recoverFromLostContext = function() {
    if( !tdl.framebuffers.dummytex )
        tdl.framebuffers.dummytex = new tdl.textures.SolidTexture([255,0,255,255]);
    if( !tdl.framebuffers.dummytex2 )
        tdl.framebuffers.dummytex2 = new tdl.textures.SolidTexture([255,0,255,255]);

    //check if we will be able to make colorbuffer(s)
    if( this.formats.length > 1 ){
        this.dbextension = tdl.gl.getExtension("WEBGL_draw_buffers");
        if(!this.dbextension){
            console.log(this.formats);
            throw new Error("Program requested multiple FBO attachments, but this system doesn't support the WEBGL_draw_buffers extension");
        }
    }

    //see if we need the texture_float extension
    for(var i=0;i<this.formats.length;++i){
        if(this.formats[i][1] === tdl.gl.FLOAT ){
            if(!tdl.gl.getExtension("OES_texture_float") )
                throw new Error("Requesting float fbo, but this system does not support float textures");
            
            //the upcoming standards will require this for rendering to float FBO's.
            //older browsers don't need it yet, so we don't check if it fails.
            tdl.gl.getExtension("WEBGL_color_buffer_float");
            //likewise, newer browsers will start requiring this one
            //if we want to do linear filtering on float textures.
            tdl.gl.getExtension("OES_texture_float_linear");
        }
    }

    this.textures=[];
    
    

    
    for(var i=0;i<this.formats.length;++i){
        var format = this.formats[i][0];
        var type = this.formats[i][1];
        var tex;
        if( !this.cubemap ){
            tex = new tdl.textures.Texture2D( null, null, 
                { 
                    width: this.width, height: this.height,
                    format: format, type: type
                }
            );
            if( type !== gl.UNSIGNED_BYTE )
                tex.setParameter(gl.TEXTURE_MIN_FILTER,gl.LINEAR);
        }
        else{
            tex = new tdl.textures.CubeMap( null, { 
                size: this.width, format: format, type: type
            });
            tex.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            tex.setParameter(gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }    
        tex.debug="fbo_texture("+i+")";
        this.textures.push(tex);
    }        
    
    //shortcut for users of the fbo
    this.texture = this.textures[0];

    if( !this.cubemap ){
        this.make_and_setup_framebuffer(tdl.gl.TEXTURE_2D,this.textures);
    }
    else{
        var targets = [
          tdl.gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            tdl.gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            tdl.gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            tdl.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            tdl.gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            tdl.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
        ];
        //FIXME: does GL support mrt + cubemaps? Should test it...
        for(var i=0;i<6;++i){
            this.make_and_setup_framebuffer(targets[i],this.textures);
        }
    }

    var status = tdl.gl.checkFramebufferStatus(tdl.gl.FRAMEBUFFER);
    if (status != tdl.gl.FRAMEBUFFER_COMPLETE && !tdl.gl.isContextLost()) {
        var err = "Framebuffer setup error: " +tdl.webgl.glEnumToString(status);
        console.error(err);
        debugger;
        throw new Error(err);
    }
    tdl.gl.bindFramebuffer(tdl.gl.FRAMEBUFFER, null);
}

/** Internal function: Manufacture a GL framebuffer object which has as its render destination
    @param target Either TEXTURE_2D or one of CUBE_MAP_{POSITIVE,NEGATIVE}_{X,Y,Z}.
            This will append new entries to this.framebuffers and this.depthbuffers (or this.depthtextures).
    @param textures An array of textures. If this is an MRT fbo, there must be as many
        entries in textures as there are MRT targets.
    @return The GL framebuffer object.
*/
tdl.framebuffers.Framebuffer.prototype.make_and_setup_framebuffer = function(target,textures){
    var fb = tdl.gl.createFramebuffer();
    tdl.gl.bindFramebuffer(tdl.gl.FRAMEBUFFER, fb);
    this.framebuffers.push( fb );
    
    if (this.depth) {
        if( this.use_depthtexture){
            var exts=["WEBGL_depth_texture","WEBKIT_WEBGL_depth_texture",
                    "MOZ_WEBGL_depth_texture"];
            var x;
            for(var i=0;i<exts.length && !x; ++i){
                x = tdl.gl.getExtension(exts[i]);
            }
            if(!x)
                throw new Error("Framebuffer requested depth texture, but your system can't support it");
            
            var dt = new tdl.Texture2D(null,null,
                    { width: this.width, height: this.height,
                        format: tdl.gl.DEPTH_STENCIL, type: x.UNSIGNED_INT_24_8_WEBGL
                    });
            dt.setParameter(gl.TEXTURE_MIN_FILTER,gl.NEAREST);
            dt.setParameter(gl.TEXTURE_MAG_FILTER,gl.NEAREST);
            
            this.depthtextures.push(dt);
            if( this.depthtextures.length === 1 )
                this.depthtexture = this.depthtextures[0];
                
            tdl.gl.framebufferTexture2D(
                tdl.gl.FRAMEBUFFER,
                tdl.gl.DEPTH_STENCIL_ATTACHMENT,
                tdl.gl.TEXTURE_2D,
                this.depthtextures[this.depthtextures.length-1].texture,
                0);
        }
        else{
            //use a renderbuffer for depth buffer. This has potentially worse depth precision
            //than using a depth texture (16 bits vs 24).
            this.depthbuffers.push(tdl.gl.createRenderbuffer());
            tdl.gl.bindRenderbuffer(tdl.gl.RENDERBUFFER, this.depthbuffers[this.depthbuffers.length-1]);
            tdl.gl.renderbufferStorage(
                tdl.gl.RENDERBUFFER, tdl.gl.DEPTH_COMPONENT16, this.width, this.height);
            tdl.gl.framebufferRenderbuffer(
                tdl.gl.FRAMEBUFFER,
                tdl.gl.DEPTH_ATTACHMENT,
                tdl.gl.RENDERBUFFER,
                this.depthbuffers[this.depthbuffers.length-1]);
            tdl.gl.bindRenderbuffer(tdl.gl.RENDERBUFFER, null);
        }
    }
    
    for(var i=0;i<this.formats.length;++i){
        tdl.gl.framebufferTexture2D(
            tdl.gl.FRAMEBUFFER,
            tdl.gl.COLOR_ATTACHMENT0 + i,
            target,
            textures[i].texture,
            0
        );
    }
}

tdl.framebuffers.Framebuffer.prototype.initializeData = function(data,targetnumber){
    if(targetnumber === undefined )
        targetnumber=0;
    
    if( tdl.framebuffers.active_fbo === this ){
        throw new Error("FBO can't be initialized while it's the active render target");
        //tdl.framebuffers.dummytex2.bindToUnit(unit);
    }

    var n;
    if( this.formats[targetnumber][0] === gl.RGBA )
        n=4;
    else if( this.formats[targetnumber][0] === gl.RGB )
        n=3;
    else if( this.formats[targetnumber][0] === gl.LUMINANCE_ALPHA )
        n=2;
    else if( this.formats[targetnumber][0] === gl.LUMINANCE ||
            this.formats[targetnumber][0] === gl.ALPHA )
        n=1;
    else
        throw new Error("Unknown format");
        
    if( data.constructor === Float32Array ){
        if( this.formats[targetnumber][1] !== gl.FLOAT )
            throw new Error("Data is a Float32Array, but FBO does not have float format");
    }
    else if( data.constructor === Uint8Array ){
        if( this.formats[targetnumber][1] !== gl.UNSIGNED_BYTE)
            throw new Error("Data is Uint8Array, but FBO does not have unsigned byte format");
    }
    else if( data.constructor === Array ){
        if( this.formats[targetnumber][1] === gl.UNSIGNED_BYTE)
            data = new Uint8Array(data);
        else if( this.formats[targetnumber][1] === gl.FLOAT )
            data = new Float32Array(data);
        else
            throw new Error("Cannot convert array to FBO internal format");
    }
    else{
        throw new Error("data is not a Float32Array nor a Uint8Array nor a plain array");
    }
    
    var numentries = n*this.width*this.height;
    if( data.length !== numentries ){
        throw new Error("Not enough data entries for FBO: Expected "+
            this.width+"x"+this.height+" pixels, each with "+n+" items = "+
            numentries+", but got array with "+data.length+" entries");
    }            
    
    tdl.gl.bindTexture(tdl.gl.TEXTURE_2D, this.textures[targetnumber].texture);
    tdl.gl.texImage2D(tdl.gl.TEXTURE_2D,
                0,                 // level
                this.formats[targetnumber][0],              // internalFormat
                this.width,        // width
                this.height,       // height
                0,                 // border
                this.formats[targetnumber][0],            // format: rgba, luminance, etc
                this.formats[targetnumber][1],             // type: unsigned_byte, float, etc.
                data);             // data
    tdl.gl.bindTexture(tdl.gl.TEXTURE_2D,null);
}

/** Internal function */
/*
tdl.framebuffers.Framebuffer.prototype.initializeTexture = function(tex,format,type,cubeface){
    
    var target;
    if( cubeface === undefined )
        target=tdl.gl.TEXTURE_2D;
    else{
        target = cubeface;
        if( target !== gl.TEXTURE_CUBE_MAP_POSITIVE_X && 
            target !== gl.TEXTURE_CUBE_MAP_POSITIVE_Y && 
            target !== gl.TEXTURE_CUBE_MAP_POSITIVE_Z && 
            target !== gl.TEXTURE_CUBE_MAP_NEGATIVE_X &&  
            target !== gl.TEXTURE_CUBE_MAP_NEGATIVE_Y && 
            target !== gl.TEXTURE_CUBE_MAP_NEGATIVE_Z ){
                throw new Error("?");
        }
    }

    tex.bindToUnit(0);
    //tdl.gl.bindTexture(tdl.gl.TEXTURE_2D, tex.texture);
    
    tex.setParameter(tdl.gl.TEXTURE_MIN_FILTER, tdl.gl.LINEAR);
    tex.setParameter(tdl.gl.TEXTURE_MAG_FILTER, tdl.gl.LINEAR);
    tex.setParameter(tdl.gl.TEXTURE_WRAP_S, tdl.gl.CLAMP_TO_EDGE);
    tex.setParameter(tdl.gl.TEXTURE_WRAP_T, tdl.gl.CLAMP_TO_EDGE);

    
    tdl.gl.texImage2D(target,
                0,                  // mip level
                format,             // internalFormat
                this.width,         // width
                this.height,        // height
                0,                  // border
                format,             // format: rgba, luminance, etc
                type,               // type: unsigned_byte, float, etc.
                null );             // data
                
    tex.width = this.width;
    tex.height = this.height;
    tdl.gl.bindTexture(tdl.gl.TEXTURE_2D,null);
};
*/


/*
tdl.framebuffers.CubeFramebuffer = function(size, opts) {
    if(opts===undefined)
        opts={};
    this.size = size;
    this.depth = (opts.depth === undefined) ? true : opts.depth ;
    this.recoverFromLostContext();
};

tdl.framebuffers.CubeFramebuffer.prototype.bind = function(face) {
  tdl.gl.bindFramebuffer(tdl.gl.FRAMEBUFFER, this.framebuffers[face]);
  tdl.gl.viewport(0, 0, this.size, this.size);
};

tdl.framebuffers.CubeFramebuffer.unbind = function() {
  tdl.gl.bindFramebuffer(tdl.gl.FRAMEBUFFER, null);
  tdl.gl.viewport(
      0, 0,
      tdl.gl.drawingBufferWidth || tdl.gl.canvas.width,
      tdl.gl.drawingBufferHeight || tdl.gl.canvas.height);
};

tdl.framebuffers.CubeFramebuffer.prototype.unbind = function() {
  tdl.framebuffers.CubeFramebuffer.unbind();
};

tdl.framebuffers.CubeFramebuffer.prototype.recoverFromLostContext = function() {
  var tex = new tdl.textures.CubeMap(null,{size:this.size});
  tdl.gl.bindTexture(tdl.gl.TEXTURE_CUBE_MAP, tex.texture);
  tex.setParameter(tdl.gl.TEXTURE_MIN_FILTER, tdl.gl.LINEAR);
  tex.setParameter(tdl.gl.TEXTURE_MAG_FILTER, tdl.gl.LINEAR);
  tex.setParameter(tdl.gl.TEXTURE_WRAP_S, tdl.gl.CLAMP_TO_EDGE);
  tex.setParameter(tdl.gl.TEXTURE_WRAP_T, tdl.gl.CLAMP_TO_EDGE);
  for (var ff = 0; ff < 6; ++ff) {
    tdl.gl.texImage2D(tdl.textures.CubeMap.faceTargets[ff],
                  0,                 // level
                  tdl.gl.RGBA,           // internalFormat
                  this.size,         // width
                  this.size,         // height
                  0,                 // border
                  tdl.gl.RGBA,           // format
                  tdl.gl.UNSIGNED_BYTE,  // type
                  null);             // data
    tex.width = this.size;
    tex.height = this.size;
  }
  if (this.depth) {
    var db = tdl.gl.createRenderbuffer();
    tdl.gl.bindRenderbuffer(tdl.gl.RENDERBUFFER, db);
    tdl.gl.renderbufferStorage(
        tdl.gl.RENDERBUFFER, tdl.gl.DEPTH_COMPONENT16, this.size, this.size);
  }
  this.framebuffers = [];
  for (var ff = 0; ff < 6; ++ff) {
    var fb = tdl.gl.createFramebuffer();
    tdl.gl.bindFramebuffer(tdl.gl.FRAMEBUFFER, fb);
    tdl.gl.framebufferTexture2D(
        tdl.gl.FRAMEBUFFER,
        tdl.gl.COLOR_ATTACHMENT0,
        tdl.textures.CubeMap.faceTargets[ff],
        tex.texture,
        0);
    if (this.depth) {
      tdl.gl.framebufferRenderbuffer(
          tdl.gl.FRAMEBUFFER,
          tdl.gl.DEPTH_ATTACHMENT,
          tdl.gl.RENDERBUFFER,
          db);
    }
    var status = tdl.gl.checkFramebufferStatus(tdl.gl.FRAMEBUFFER);
    if (status != tdl.gl.FRAMEBUFFER_COMPLETE) {
      throw(new Error("Framebuffer not complete: " + WebGLDebugUtils.glEnumToString(status)));
    }
    this.framebuffers.push(fb);
  }
  tdl.gl.bindRenderbuffer(tdl.gl.RENDERBUFFER, null);
  this.texture = tex;
}

/*
tdl.framebuffers.Float32Framebuffer = function(width, height, opts) {
    if(!opts)
        opts={};
    opts.format=[ [tdl.gl.RGBA,tdl.gl.FLOAT] ];
    return new tdl.framebuffers.Framebuffer(width,height,opts);
}
tdl.base.inherit(tdl.framebuffers.Float32Framebuffer, tdl.framebuffers.Framebuffer);

tdl.framebuffers.Float32Framebuffer.prototype.setData = function(data){
    this.initializeTexture(this.texture,false,data);
}

tdl.framebuffers.Float32Framebuffer.prototype.initializeTexture = function(tex,isdepth,initialdata) {
    if( isdepth )
        throw new Error("Internal error: isdepth must be false for Float32 textures");
    
    var fmt;
    if( this.channels === 1 )
        fmt = tdl.gl.LUMINANCE;
    else if( this.channels === 2 )
        fmt = tdl.gl.LUMINANCE_ALPHA;
    else if( this.channels === 3 )
        fmt = tdl.gl.RGB;
    else if( this.channels === 4 )
        fmt = tdl.gl.RGBA;
    else
        throw new Error("Bad value for channels: "+this.channels);
    
        
    if( initialdata === undefined || initialdata===null ){
        initialdata = null;
    }
    else{
        if( initialdata.length !== this.channels * this.width * this.height )
            throw new Error("Bad initial data: Expected "+(this.channels*this.width*this.height)+" but got "+initialdata.length);
    }
    
    tdl.gl.bindTexture(tdl.gl.TEXTURE_2D, tex.texture);
    tex.setParameter(tdl.gl.TEXTURE_MIN_FILTER, tdl.gl.NEAREST);
    tex.setParameter(tdl.gl.TEXTURE_MAG_FILTER, tdl.gl.NEAREST);
    tex.setParameter(tdl.gl.TEXTURE_WRAP_S, tdl.gl.CLAMP_TO_EDGE);
    tex.setParameter(tdl.gl.TEXTURE_WRAP_T, tdl.gl.CLAMP_TO_EDGE);
    tdl.gl.texImage2D(tdl.gl.TEXTURE_2D,
                0,                 // level
                fmt,               // internalFormat
                this.width,        // width
                this.height,       // height
                0,                 // border
                fmt,               // format
                tdl.gl.FLOAT,          // type
                initialdata);             // data
    tex.width = this.width;
    tex.height = this.height;
};


tdl.framebuffers.debugAll = function(){
    var x = 0;
    var y = 0;
    for(var i=0;i<tdl.framebuffers.allframebuffers.length;++i){
        var p = [x,y];
        tdl.framebuffers.allframebuffers[i].debug(p);
        x += 25;
        y += 25;
    }
}

tdl.framebuffers.getAllState = function(){
    //FIXME: Do this
    return {};
}
tdl.framebuffers.restoreAllState = function(q){
    //FIXME
}

tdl.framebuffers.Framebuffer.prototype.debug = function(position){
    
    var subwin = $("<div>").appendTo("body");
    subwin.id = "fb___"+(tdl.framebuffers.uniquefbid++);
    
    //$("#"+subwin.id).dialog({width:300,height:300,title:this.width+"x"+this.height+" FBO"});
    
    var cvs = document.createElement("canvas");
    cvs.width = this.width;
    cvs.height = this.height;

    //subwin.appendChild(cvs);
    
    var ctx = cvs.getContext("2d");
    ctx.imageSmoothingEnabled=false;    //seems to be a no-op
    
    var pixdata=[];        //the pixel data, as float (regardless of
                            //actual FBO type). r,g,b,a,r,g,b,a,r,g,b,a,...
                            //If FBO is RGBA8, these are in range 0...1
                            //If FBO is Float32, these are the raw values.
    
    //FIXME: do this                        
    //var saved_tex = tdl.textures.getAllState();
    var saved_fb = tdl.framebuffers.getAllState();
    var depthtestenabled = tdl.gl.getParameter(tdl.gl.DEPTH_TEST);
    var stencilenabled = tdl.gl.getParameter(tdl.gl.STENCIL_TEST);
    var cprog = tdl.gl.tdl.currentProgram;
    var blendenabled = tdl.gl.getParameter(tdl.gl.BLEND);
    var ditherenabled = tdl.gl.getParameter(tdl.gl.DITHER);
    
    var ab; //buffer with data for onscreen display. 0...255: Uint8array
    
    function unpack(ipartarray,fpartarray,idx){
        var r=ipartarray[idx];
        var g=ipartarray[idx+1];
        var b=ipartarray[idx+2];
        var a=ipartarray[idx+3];
        var r2=fpartarray[idx];
        var g2=fpartarray[idx+1];
        var b2=fpartarray[idx+2];
        
        if( r === undefined )
            debugger;
            
        var q;
        if( r===0.0&&g===0.0&&b===0.0&&a===0.0)
            return 0.0;
            
        var ip=r*65536 + g*256 + b;
        var fp=r2/256.0+g2/65536.0+b2/16777216.0;
        q = ip+fp;
        if( a <= 128 )
            q=-q;
        
        return q;
    }
    
    if( this instanceof tdl.framebuffers.Float32Framebuffer ){
        //float32 fbo requires some extra work...
        var ab = new Uint8Array(this.width*this.height*4);
        if( !tdl.framebuffers.float32debugprog ){
            
            var tmpl=[
                "attribute vec4 position;",
                "varying vec2 texcoord;",
                "void main(){",
                "   gl_Position=vec4(position.xy,0,1);",
                "   texcoord=position.zw;",
                "}"];
            var vs_txt = tmpl.join("\n");
            tmpl=[
                "precision highp float;",
                "uniform sampler2D tex;",
                "uniform float channel;",
                "uniform float fractpartorintpart;",
                "varying vec2 texcoord;",
                "void main(){",
                "   vec4 c = texture2D(tex,texcoord);",
                "   float q;",
                "   if( channel == 0.0 ) q=c.r;",
                "   else if( channel == 1.0) q=c.g;",
                "   else if( channel == 2.0) q=c.b;",
                "   else q=c.a;",
                "   if( q == 0.0 )",
                "       gl_FragColor = vec4(0,0,0,0);",
                "   else{",
                "       if( q>0.0 )  gl_FragColor.a=0.75;",
                "       else gl_FragColor.a = 0.5;",
                "       q=abs(q);",
                "       if( q > 16777215.0 ) {",
                "           gl_FragColor.rgb = vec3(1.0,1.0,1.0);",
                "           return;",
                "       }",
                "       if(fractpartorintpart == 1.0 ){",
                "           q=fract(q);",
                "           q *= 256.0;",
                "           gl_FragColor.r = floor(q);",
                "           q=fract(q);",
                "           q *= 256.0;",
                "           gl_FragColor.g = floor(q);",
                "           q=fract(q);",
                "           q *= 256.0;",
                "           gl_FragColor.b = floor(q);",
                "           gl_FragColor.rgb *= 1.0/255.0;",
                "       }",
                "       else{",
                "           q = floor(q);",
                "           gl_FragColor.r = floor(256.0*fract(q/16777216.0)); ",
                "           gl_FragColor.g = floor(256.0*fract(q/65536.0));",
                "           gl_FragColor.b = floor(256.0*fract(q/256.0));",
                "           gl_FragColor.rgb *= 1.0/255.0;",
                "       }",
                "   }",
                "}"
                ];
            var fs_txt = tmpl.join("\n");
            
            tdl.framebuffers.float32debugprog=new tdl.programs.Program(
                null,
                vs_txt, fs_txt, { params_are_source:true });
            tdl.framebuffers.usq = new tdl.unitsquare.unitsquare();
        }
        
        this.texture.unbind();
        tdl.gl.disable(tdl.gl.DEPTH_TEST);
        tdl.gl.disable(tdl.gl.STENCIL_TEST);
        tdl.gl.disable(tdl.gl.BLEND);
        tdl.gl.disable(tdl.gl.DITHER);
        
        var tmpfbo = new tdl.framebuffers.Framebuffer(this.width,this.height,{internaluseonly:true});
        tmpfbo.bind();
        var p = tdl.framebuffers.float32debugprog;
        var usq = tdl.framebuffers.usq;
        p.use();
        p.setUniform("tex",this.texture);
        var abs=[];
        for(var c=0;c<4;++c){
            p.setUniform("channel",c);
            for(var ipfp=0;ipfp<=1;ipfp++){
                tdl.gl.clear(tdl.gl.COLOR_BUFFER_BIT);
                p.setUniform("fractpartorintpart",ipfp);
                usq.draw(p);
                var ar = new Uint8Array(this.width*this.height*4);
                tdl.gl.readPixels(0,0,this.width,this.height,tdl.gl.RGBA,tdl.gl.UNSIGNED_BYTE,ar);
                abs.push(ar);
            }
        }
        tmpfbo.unbind();
        tmpfbo.dispose();
        
        //conversion to usable data
        //FIXME: Only works with RGBA fbo32's, not luminance or other
        ab = new Uint8Array(this.width*this.height*4);
        var j=0;
        for(var i=0;i<abs[0].length;i+=4){
            var r = unpack(abs[0],abs[1],i);
            var g = unpack(abs[2],abs[3],i);
            var b = unpack(abs[4],abs[5],i);
            var a = unpack(abs[6],abs[7],i);
            pixdata.push(r)
            pixdata.push(g);
            pixdata.push(b);
            pixdata.push(a);
            r*=255;
            g*=255;
            b*=255;
            a*=255;
            r=Math.floor(r);
            g=Math.floor(g);
            b=Math.floor(b);
            a=Math.floor(a);
            r=Math.max(0,Math.min(r,255));
            g=Math.max(0,Math.min(g,255));
            b=Math.max(0,Math.min(b,255));
            a=Math.max(0,Math.min(a,255));
            ab[j++]=r;
            ab[j++]=g;
            ab[j++]=b;
            ab[j++]=a;
        }
    }
    else{
        this.texture.unbind();
        this.bind();
        //rgba8 fbo
        ab = new Uint8Array(this.width*this.height*4);
        tdl.gl.readPixels(0,0,this.width,this.height,tdl.gl.RGBA,tdl.gl.UNSIGNED_BYTE,ab);
        for(var i=0;i<ab.length;++i)
            pixdata.push(ab[i]/255.0);
    }
    
    //dumb... we can't send the raw data to the canvas...
    var id = ctx.createImageData(this.width,this.height);
    for(var i=0;i<id.data.length;++i){
        id.data[i]=ab[i];
    }
    ctx.putImageData(id,0,0);
    

    if( ditherenabled )
        tdl.gl.enable(tdl.gl.DITHER);
    if( blendenabled)
        tdl.gl.enable(tdl.gl.BLEND);
    if( stencilenabled )
        tdl.gl.enable( tdl.gl.STENCIL_TEST);
    if(depthtestenabled)
        tdl.gl.enable(tdl.gl.DEPTH_TEST);
    tdl.framebuffers.restoreAllState(saved_fb);
    
    //FIXME: Do this
    //tdl.textures.restoreAllState(saved_tex);
    
    
    var swatch = document.createElement("div");
    swatch.style.width="16px";
    swatch.style.height="16px";
    swatch.style.border="1px solid black";
    swatch.style.display="inline-block";
    
    var redcell = document.createElement("span");
    var greencell = document.createElement("span");
    var bluecell = document.createElement("span");
    var alphacell = document.createElement("span");
    var xycell=document.createElement("span");
    
    
    var that=this;
    
    var buttondown=false;
    
    
    var zoomfactor = 1;
    
    var cvs2 = document.createElement("canvas");
    cvs2.width = this.width;
    cvs2.height= this.height;
    cvs2.style.border = "1px dotted black";
    
    var ctx2 = cvs2.getContext("2d");
    ctx2.imageSmoothingEnabled=false;
    ctx2.putImageData(id,0,0);
    
    cvs2.addEventListener("mousedown",function(ev){
        buttondown=true;
        updateswatch(ev);
    });
    
    function updateswatch(ev){
        var re = cvs2.getBoundingClientRect();
        var x = Math.floor(0.5+ev.clientX-re.left);//cvs.offsetLeft+window.pageXOffset;
        var y = Math.floor(0.5+ev.clientY-re.top); //cvs.offsetTop+window.pageYOffset;

        //convert to the real underlying object's coordinates
        x /= zoomfactor;
        y /= zoomfactor;
        x=Math.floor(x);
        y=Math.floor(y);
        if( x < 0 || x >= that.width || y < 0 || y >= that.height )
            return;
        var idx = y*that.width*4+x*4;
        var r = pixdata[idx++];
        var g = pixdata[idx++];
        var b = pixdata[idx++];
        var a = pixdata[idx++];
        var r1 = (r).toFixed(4);
        var g1 = (g).toFixed(4);
        var b1 = (b).toFixed(4);
        var a1 = (a).toFixed(4);
        r=Math.floor(r*255);
        g=Math.floor(g*255);
        b=Math.floor(b*255);
        a=Math.floor(a*255);
        if( r>255) r=255;
        if( g>255) g=255;
        if( b>255) b=255;
        if( a>255) a=255;
        if( r<0) r=0;
        if( g<0) g=0;
        if( b<0) b=0;
        if( a<0) a=0;
        swatch.style.background = "rgb("+r+","+g+","+b+")";
        redcell.innerHTML=r1;
        greencell.innerHTML=g1;
        bluecell.innerHTML=b1;
        alphacell.innerHTML=a1;
        xycell.innerHTML=x+","+y;
    };
    cvs2.addEventListener("mouseup",function(ev){
        buttondown=false;
    });
    cvs2.addEventListener("mousemove",function(ev){
        //if( !buttondown )
        //    return;
        updateswatch(ev);
    });

    
    function updatecanvas2(){
        if( zoomfactor < 1 ){
            ctx2.setTransform(zoomfactor,0,0,zoomfactor,0,0);
            ctx2.drawImage(cvs,0,0);
        }
        else{
            //need to get crisp edges.
            //zoomfactor must be integer...
            //ideas from http://phrogz.net/tmp/canvas_image_zoom.html
            var i=0;
            var xx,yy;
            yy=0;
            for(var y=0;y<cvs.height;++y,yy+=zoomfactor){
                xx=0;
                for(var x=0;x<cvs.width;++x,xx+=zoomfactor){
                    ctx2.fillStyle="rgb("+ab[i++]+","+ab[i++]+","+ab[i++]+")";
                    ++i;
                    ctx2.fillRect(xx,yy,zoomfactor,zoomfactor);
                }
            }
        }
    }
    
    function zoomIn(){
        if( zoomfactor >= 256 )
            return;
            
        if( zoomfactor >= 1)
            zoomfactor += 2;
        else
            zoomfactor *= 2;
        cvs2.width = that.width*zoomfactor;
        cvs2.height = that.height*zoomfactor;
        updatecanvas2();
    }
    function zoomOut(){
        if( zoomfactor <= 1/256 )
            return;
        if( zoomfactor > 1 )
            zoomfactor -= 2;
        else
            zoomfactor /= 2;
            
        cvs2.width = that.width*zoomfactor;
        cvs2.height = that.height*zoomfactor;
        updatecanvas2();
    }
    

    var hh = this.height+50;
    if( hh < 200 )
        hh=200;
    subwin.dialog({
        width: "30em", 
        height: 256, title: this.width+"x"+this.height+" FBO "+this.name,
        position:position});

    
    //container for everything
    var outerdiv = document.createElement("div");
    outerdiv.style.textAlign="center";
    
    var b1=document.createElement("button");
    b1.addEventListener("click",zoomIn);
    b1.innerHTML="+";
    
    var b2=document.createElement("button");
    b2.addEventListener("click",zoomOut);
    b2.innerHTML="-";
    
    //info div
    var divvy = document.createElement("div");
    divvy.style.position="fixed";
    divvy.appendChild(swatch);
    divvy.appendChild(document.createTextNode("R:"));
    divvy.appendChild(redcell);
    divvy.appendChild(document.createTextNode(" G:"));
    divvy.appendChild(greencell);
    divvy.appendChild(document.createTextNode(" B:"));
    divvy.appendChild(bluecell);
    divvy.appendChild(document.createTextNode(" A:"));
    divvy.appendChild(alphacell);
    divvy.appendChild(document.createTextNode(" "));
    divvy.appendChild(xycell);
    
    outerdiv.appendChild(divvy);
    
    //the button div
    var divvy3 = document.createElement("div");
    divvy3.style.position="fixed";
    divvy3.style.paddingTop="2em";
    divvy3.appendChild(b1);
    divvy3.appendChild(b2);
    outerdiv.appendChild(divvy3);
    
    //canvas div
    var divvy2 = document.createElement("div");
    divvy2.style.paddingTop="4em";
    divvy2.style.textAlign="center";
    divvy2.appendChild(cvs2);
    
    outerdiv.appendChild(divvy2);
    
    subwin.append(outerdiv);
    //subwin.append(cvs2);
    //subwin.append(tbl);
    
    
}
*/

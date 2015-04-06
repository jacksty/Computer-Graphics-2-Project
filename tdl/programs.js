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
 * @fileoverview This file contains objects to deal with WebGL
 *               shader programs.
 */

tdl.provide('tdl.programs');

tdl.require('tdl.log');
tdl.require('tdl.string');
tdl.require('tdl.webgl');


/**
 * A module for programs.
 * @namespace
 */
tdl.programs = tdl.programs || {};

tdl.programs.makeProgramId = function(vertexShader, fragmentShader) {
    return vertexShader + "/" + fragmentShader;
};

/**
 * A object to manage a WebGL Program.
 * @constructor
 * @param loader: A tdl.Loader object (ignored if opts.params_are_source==true)
 * @param {string} vs_url The vertex shader url (or source code if opts.params_are_source===true)
 * @param {string} fs_url The fragment shader url (or source code if opts.params_are_source===true)
 * @param opts: Optional: Can contain the following fields:
 *          * boolean params_are_source: If true, vs_url and fs_url are the actual 
 *              source code of the shader rather than a URL. Default=false
 *          * defines: A list of [symbol,value] pairs. Default=[]
 */
tdl.programs.Program = function(loader,vs_url,fs_url,opts){
    var that=this;
    
    if( opts === true || opts === false)
        throw new Error("opts should not be a boolean");
    else if( opts === undefined )
        opts={};
    
    var params_are_source = (opts.params_are_source===undefined)?false:opts.params_are_source;
    if( opts.defines !== undefined ){
        this.defines = {};
        //make copies so if user changes data we don't see the changes
        for(var k in opts.defines){
            this.defines[k]=""+opts.defines[k];
        }
    }
    else{
        this.defines={};
    }
    tdl.programs.init_();
    
    this.sources={}
    this.sources["$defines$"]=[];
    
    if( opts.defines !== undefined ){
        var deflist=[]
        for( var k in opts.defines ){
            deflist.push("#define "+k+" "+opts.defines[k]);
        }
        this.sources["$defines$"]=deflist;
    }
    
    var subloader;
    if( loader )
        subloader = loader.createSubloader(function(){ that.finish_constructing_program();});
    
    if( params_are_source ){
        this.id = "(anonymous)";
        //FIXME - if the user didn't pass in a Loader, this will not be able
        //to handle #include'd files
        this.vs_url = "$vs$src";
        this.fs_url = "$fs$src";
        that.process_loaded_file(subloader,"$vs$",this.vs_url,vs_url);
        that.process_loaded_file(subloader,"$fs$",this.fs_url,fs_url);
    }
    else{
        this.id = vs_url+"+"+fs_url;
        this.vs_url = vs_url;
        this.fs_url = fs_url;
        if(!loader || loader.type_ !== "Loader" ){
            throw(new Error("First argument to program constructor must be a Loader"));
        }

        subloader.loadTextFile(vs_url,
            function(txt){
                that.process_loaded_file(subloader,"vs",vs_url,txt);
            }
        );
        subloader.loadTextFile(fs_url,
            function(txt){
                that.process_loaded_file(subloader,"fs",fs_url,txt);
            }
        );
    }
    
    if(subloader)
        subloader.finish();
    else
        that.finish_constructing_program();
}

//dummy object used within setVertexFormat functions
tdl.programs.Program.currentBufferSingleton = {};

//loader = a Loader object
//which = "vs" or "fs"
//url = where the file came from
//fcontent = content of the file
//This function will scan the file and retrieve nested #include'd files
tdl.programs.Program.prototype.process_loaded_file = function(loader,which,url,fcontent){
    
    //FIXME: Handle include's    
    var rex=/^\s*#\s*include\s+["<]([^>"]+)/m
   
    var lines = fcontent.split("\n");
    this.sources[url]=lines;
    var that=this;
    
    function make_callback(url2){
        return function(txt){
            that.process_loaded_file(loader,which,url2,txt);
        }
    }
    
    for(var i=0;i<lines.length;++i){
        var m = rex.exec(lines[i]);
        if( m ){
            var url2 = m[1];
            //console.log("include of",url2);
            if( this.sources[url2] === undefined ){
                loader.loadTextFile(url2,make_callback(url2));
            }
        }
    }
}

tdl.programs.Program.prototype.finish_constructing_program = function() {
    //we have all our files, but now we must put them together in a single string.
    var that=this;
    this.files=[];
    
    function process(url,output,nesting){
        var files = that.files;
        
        if( output.length === 0 ){
            output.push("#line 1 "+files.length);
            files.push("(defines)");
            for(var i=0;i<that.sources["$defines$"].length;++i)
                output.push(that.sources["$defines$"][i]);
        }
        
        var rex=/^\s*#\s*include\s+["<]([^>"]+)/m
        if( nesting === undefined )
            nesting = 0;
            
        if( nesting > 25 )
            throw new Error("Too many nested include's");
        var fileidx = files.length;
        
        output.push("#line 1 "+fileidx);
        files.push(url);
        
        var code = that.sources[url];
        if(code === undefined ){
            console.log(that.sources);
            throw new Error("No code for "+url);
        }
        for(var i=0;i<code.length;++i){
            var m = rex.exec(code[i]);
            if(m){
                var inclfile = m[1];
                process(inclfile,output,nesting+1);
                output.push("#line "+(i+2)+" "+fileidx);
            }
            else
                output.push(code[i]);
        }
    }
    
    var tmp = [];
    process(this.vs_url,tmp);
    this.vs_src = tmp.join("\n");
    tmp=[];
    process(this.fs_url,tmp);
    this.fs_src = tmp.join("\n");
    this.recoverFromLostContext();
}

tdl.programs.Program.prototype.recoverFromLostContext = function()
{
    var vs,fs,program;
    
    try{
        vs = this.loadShader(tdl.gl,this.vs_src,tdl.gl.VERTEX_SHADER);
        fs = this.loadShader(tdl.gl,this.fs_src,tdl.gl.FRAGMENT_SHADER);
        program = tdl.gl.createProgram();
        tdl.gl.attachShader(program,vs);
        tdl.gl.attachShader(program,fs);
        this.linkProgram(tdl.gl,program);
        this.createSetters(program);
        this.program=program;
    }
    catch(e){
        if(vs)
            tdl.gl.deleteShader(vs);
        if(fs)
            tdl.gl.deleteShader(fs);
        if(program)
            tdl.gl.deleteProgram(program);
        throw(e);
    }
}


/**
   * Loads a shader.
   * @param {!WebGLContext} gl The WebGLContext to use.
   * @param {string} shaderSource The shader source.
   * @param {number} shaderType The type of shader.
   * @return {!WebGLShader} The created shader.
*/
tdl.programs.Program.prototype.loadShader = function(gl, shaderSource, shaderType){
    var shader = tdl.gl.createShader(shaderType);
    tdl.gl.shaderSource(shader, shaderSource);
    tdl.gl.compileShader(shader);
    var compiled = tdl.gl.getShaderParameter(shader, tdl.gl.COMPILE_STATUS);
    if (!compiled && !tdl.gl.isContextLost()) {
        // Something went wrong during compilation; get the error
        tdl.programs.lastError = tdl.gl.getShaderInfoLog(shader);
        tdl.gl.deleteShader(shader);
        //jh added vertex/fragment string
        msg="*** Error compiling " +
            (shaderType == tdl.gl.VERTEX_SHADER ? "vertex" : "fragment") +
            " shader '" + 
            (shaderType == tdl.gl.VERTEX_SHADER ? this.vs_url : this.fs_url)+"':\n";
            
        var rex=/\bERROR:\s+/
        rex.lastIndex=0;
        var EL=tdl.programs.lastError.split(rex);
        var i=0;
        for( var i=0;i<EL.length;++i){
            //first digits are the file number; the second is the line.
            var rex2=/(\d+):(\d+):/;
            var m = rex2.exec(EL[i]);
            if(!m )
                msg += EL[i];
            else{
                var filenum=parseInt(m[1],10);
                var linenum=parseInt(m[2],10);
                var filename = this.files[filenum];
                msg += "In file '"+filename+"' at line "+linenum+": ";
                msg += EL[i].substr(m.index+m[0].length);
            }
        }
        throw new Error(msg);
    }
    return shader
}


/**
* Links a WebGL program, throws if there are errors.
* @param {!WebGLContext} gl The WebGLContext to use.
* @param {!WebGLProgram} program The WebGLProgram to link.
*/
tdl.programs.Program.prototype.linkProgram = function(gl,program)
{
    // Link the program
    tdl.gl.linkProgram(program);

    var linked = tdl.gl.getProgramParameter(program, tdl.gl.LINK_STATUS);
    if (!linked && !tdl.gl.isContextLost()) {
        // something went wrong with the link
        tdl.programs.lastError = tdl.gl.getProgramInfoLog (program);
        throw( new Error("*** Error in program linking for " + this.vs_url+"+"+this.fs_url+":"+tdl.programs.lastError)) ;
    }
};


tdl.programs.Program.prototype.createSetters = function(program){
    
    var that=this;
    
    // TODO(gman): remove the need for this.
    function flatten(array){
        var flat = [];
        for (var i = 0, l = array.length; i < l; i++) {
            var type = Object.prototype.toString.call(array[i]).split(' ').pop().split(']').shift().toLowerCase();
            if (type) { 
                flat = flat.concat(/^(array|collection|arguments|object)$/.test(type) ? 
                    flatten(array[i]) : 
                    array[i]);
            }
        }
        return flat;
    }

    // key=attribute name; value=attribute location
    var attribs = {    };
    // key=location; value=name
    var attribLocs = {    };

    function createAttribSetter(info, index) {
        if (info.size != 1) {
            throw("arrays of attribs not handled");
        }
        return function(b) {
            tdl.gl.bindBuffer(tdl.gl.ARRAY_BUFFER, b.buffer());
            tdl.gl.enableVertexAttribArray(index);
            tdl.gl.vertexAttribPointer(
                index, b.numComponents(), b.type(), b.normalize(), b.stride(), b.offset());
        };
    }

    this.uninitialized_attribs={};
    this.all_attribs={};
    var numAttribs = tdl.gl.getProgramParameter(program, tdl.gl.ACTIVE_ATTRIBUTES);
    for (var ii = 0; ii < numAttribs; ++ii) {
        var info = tdl.gl.getActiveAttrib(program, ii);
    
        if (!info) {
            //jh changed
            continue;  //break;
        }
      
        var name = info.name;
        if (tdl.string.endsWith(name, "[0]")) {
            name = name.substr(0, name.length - 3);
        }
        this.all_attribs[name]=true;
        this.uninitialized_attribs[name]=true;
        var index = tdl.gl.getAttribLocation(program, info.name);
        attribs[name] = createAttribSetter(info, index);
        attribLocs[name] = index
    }

    // Look up uniforms
    var numUniforms = tdl.gl.getProgramParameter(program, tdl.gl.ACTIVE_UNIFORMS);
    var uniforms = {
    };
    var textureUnit = 0;

    //jh added for more sane uniform matrices so
    //we can use row-major matrices and everything
    //works like we'd expect
    function transpose2(x){
        var r = [];
        var m00 = m[0 * 4 + 0];
        var m01 = m[0 * 4 + 1];
        var m10 = m[1 * 4 + 0];
        var m11 = m[1 * 4 + 1];
        r[ 0] = m00;
        r[ 1] = m10;
        r[ 2] = m01;
        r[ 3] = m11;
        return r;
    }   
    function transpose3(m){
        var r = [];
        var m00 = m[0 * 4 + 0];
        var m01 = m[0 * 4 + 1];
        var m02 = m[0 * 4 + 2];
        var m10 = m[1 * 4 + 0];
        var m11 = m[1 * 4 + 1];
        var m12 = m[1 * 4 + 2];
        var m20 = m[2 * 4 + 0];
        var m21 = m[2 * 4 + 1];
        var m22 = m[2 * 4 + 2];
        r[ 0] = m00;
        r[ 1] = m10;
        r[ 2] = m20;
        r[ 3] = m01;
        r[ 4] = m11;
        r[ 5] = m21;
        r[ 6] = m02;
        r[ 7] = m12;
        r[ 8] = m22;
        return r;
    }
    function transpose4(m){
        var r = [];
        var m00 = m[0];//0 * 4 + 0];
        var m01 = m[1];//0 * 4 + 1];
        var m02 = m[2];//0 * 4 + 2];
        var m03 = m[3];//0 * 4 + 3];
        var m10 = m[4];//1 * 4 + 0];
        var m11 = m[5];//1 * 4 + 1];
        var m12 = m[6];//1 * 4 + 2];
        var m13 = m[7];//1 * 4 + 3];
        var m20 = m[8];//2 * 4 + 0];
        var m21 = m[9];//2 * 4 + 1];
        var m22 = m[10];//2 * 4 + 2];
        var m23 = m[11];//2 * 4 + 3];
        var m30 = m[12];//3 * 4 + 0];
        var m31 = m[13];//3 * 4 + 1];
        var m32 = m[14];//3 * 4 + 2];
        var m33 = m[15];//3 * 4 + 3];
        r[ 0] = m00;
        r[ 1] = m10;
        r[ 2] = m20;
        r[ 3] = m30;
        r[ 4] = m01;
        r[ 5] = m11;
        r[ 6] = m21;
        r[ 7] = m31;
        r[ 8] = m02;
        r[ 9] = m12;
        r[10] = m22;
        r[11] = m32;
        r[12] = m03;
        r[13] = m13;
        r[14] = m23;
        r[15] = m33;
        return r;
    }
        
        
    function createUniformSetter(info) {
        var loc = tdl.gl.getUniformLocation(program, info.name);
        var type = info.type;
        var name = info.name;
        var size = info.size;
          
        function szcheck(v,nc){
            var le = v.length;
            if( le === undefined )
                le = 1;
            if( le !== nc*size )
                throw new Error("Setting uniform "+name+" in "+that.vs_url+"+"+that.fs_url+
                    ": Expected to get "+(nc*size)+" components, but got "+v.length);
        }
              
          
        if (info.size > 1 && tdl.string.endsWith(info.name, "[0]")) {
            if (type == tdl.gl.FLOAT)
                    return function(v) {
                        szcheck(v,1);
                        tdl.gl.uniform1fv(loc, v);
                    };
            if (type == tdl.gl.FLOAT_VEC2)
                return function(v) {
                    szcheck(v,2);
                    tdl.gl.uniform2fv(loc, v);
                };
            if (type == tdl.gl.FLOAT_VEC3)
                return function(v) {
                    szcheck(v,3);
                    tdl.gl.uniform3fv(loc, v);
                };
            if (type == tdl.gl.FLOAT_VEC4)
                return function(v) { 
                    szcheck(v,4);
                    tdl.gl.uniform4fv(loc, v); 
                };
            if (type == tdl.gl.INT)
                return function(v) { 
                    szcheck(v,1)
                    tdl.gl.uniform1iv(loc, v); 
                };
            if (type == tdl.gl.INT_VEC2)
                return function(v) { 
                    szcheck(v,2);
                    tdl.gl.uniform2iv(loc, v); 
                };
            if (type == tdl.gl.INT_VEC3)
                return function(v) { 
                    szcheck(v,3);
                    tdl.gl.uniform3iv(loc, v); 
                };
            if (type == tdl.gl.INT_VEC4)
              return function(v) { 
                  szcheck(v,4);
                  tdl.gl.uniform4iv(loc, v); 
                  };
            if (type == tdl.gl.BOOL)
                return function(v) { 
                    szcheck(v,1);
                    tdl.gl.uniform1iv(loc, v); 
                };
            if (type == tdl.gl.BOOL_VEC2)
                return function(v) { 
                    szcheck(v,2);
                    tdl.gl.uniform2iv(loc, v); 
                };
            if (type == tdl.gl.BOOL_VEC3)
                return function(v) { 
                    szcheck(v,3);
                    tdl.gl.uniform3iv(loc, v); 
                };
            if (type == tdl.gl.BOOL_VEC4)
                return function(v) {
                    szcheck(v,4);
                    tdl.gl.uniform4iv(loc, v); 
                };
            if (type == tdl.gl.FLOAT_MAT2)
                return function(v) { 
                  szcheck(v,4);
                  tdl.gl.uniformMatrix2fv(loc, false, transpose2(v) ); 
                  };
            if (type == tdl.gl.FLOAT_MAT3)
                return function(v) { 
                    szcheck(v,9);
                    tdl.gl.uniformMatrix3fv(loc, false, transpose3(v) ); 
                  };
            if (type == tdl.gl.FLOAT_MAT4)
                return function(v) { 
                    szcheck(v,16);
                    tdl.gl.uniformMatrix4fv(loc, false, transpose4(v) ); 
                };
            if (type == tdl.gl.SAMPLER_2D || type == tdl.gl.SAMPLER_CUBE) {
                szcheck(v,1);
                var units = [];
                for (var ii = 0; ii < info.size; ++ii) {
                    units.push(textureUnit++);
                }
                //need this function call so we don't get a closure over units
                return function(units) {
                    return function(v) {
                        tdl.gl.uniform1iv(loc, units);
                        v.bindToUnit(units);
                    };
                }(units);
            }
            throw ("unknown type: 0x" + type.toString(16));
          } else {
            if (type == tdl.gl.FLOAT)
              return function(v) {
                    szcheck(v,1);
                    tdl.gl.uniform1f(loc, v); 
                  };
            if (type == tdl.gl.FLOAT_VEC2)
              return function(v) { 
                    szcheck(v,2);
                    tdl.gl.uniform2fv(loc, v); 
                  };
            if (type == tdl.gl.FLOAT_VEC3)
              return function(v) { 
                    szcheck(v,3);
                    tdl.gl.uniform3fv(loc, v); 
                  };
            if (type == tdl.gl.FLOAT_VEC4)
                return function(v) {
                    szcheck(v,4);
                    tdl.gl.uniform4fv(loc, v);
                };
            if (type == tdl.gl.INT)
              return function(v) {
                  szcheck(v,1);
                   tdl.gl.uniform1i(loc, v);
                    };
            if (type == tdl.gl.INT_VEC2)
              return function(v) { 
                  szcheck(v,2);
                  tdl.gl.uniform2iv(loc, v);
                   };
            if (type == tdl.gl.INT_VEC3)
              return function(v) { 
                  szcheck(v,3);
                  tdl.gl.uniform3iv(loc, v);
                   };
            if (type == tdl.gl.INT_VEC4)
              return function(v) { 
                  szcheck(v,4);
                  tdl.gl.uniform4iv(loc, v);
                   };
            if (type == tdl.gl.BOOL)
              return function(v) { 
                  szcheck(v,1);
                  tdl.gl.uniform1i(loc, v); 
                  };
            if (type == tdl.gl.BOOL_VEC2)
              return function(v) { 
                  szcheck(v,2);
                  tdl.gl.uniform2iv(loc, v);
                   };
            if (type == tdl.gl.BOOL_VEC3)
              return function(v) { 
                  szcheck(v,3);
                  tdl.gl.uniform3iv(loc, v);
                   };
            if (type == tdl.gl.BOOL_VEC4)
              return function(v) {
                  szcheck(v,4);
                   tdl.gl.uniform4iv(loc, v);
                    };
            if (type == tdl.gl.FLOAT_MAT2)
              return function(v) { 
                  szcheck(v,4);
                  tdl.gl.uniformMatrix2fv(loc, false, transpose2(v) ); 
                  };
            if (type == tdl.gl.FLOAT_MAT3)
              return function(v) { 
                  szcheck(v,9);
                  tdl.gl.uniformMatrix3fv(loc, false, transpose3(v) ); 
                  };
            if (type == tdl.gl.FLOAT_MAT4)
              return function(v) { 
                  szcheck(v,16);
                  tdl.gl.uniformMatrix4fv(loc, false, transpose4(v) ); 
                  };
            if (type == tdl.gl.SAMPLER_2D || type == tdl.gl.SAMPLER_CUBE) {
                
                return function(unit) {

                    return function(v) {
                        szcheck(v,1);
                        tdl.gl.uniform1i(loc, unit);
                  
                        if( v.bindToUnit === undefined ){
                            throw new Error("You must pass a ***Texture*** object to setUniform('"+name+"',...)");
                        }
                        v.bindToUnit(unit);
                        var tmp = [v.width,v.height,1.0/v.width,1.0/v.height];
                        that.setUniform(name+"_size",tmp,true);
                        //console.log("Set",name+"_size","to",tmp,"for",v.name);
                    };
                } (textureUnit++);
            }
            throw ("unknown type: 0x" + type.toString(16));
          } //else if it's not an array
    } //function createUniformSetter

    var textures = {};
        
    this.uninitialized_uniforms={};
        
    for (var ii = 0; ii < numUniforms; ++ii) {
        var info = tdl.gl.getActiveUniform(program, ii);
        if (!info) {
            //jh changed from break to continue
          continue; //break;
        }
        name = info.name;
        if (tdl.string.endsWith(name, "[0]")) {
            name = name.substr(0, name.length - 3);
        }
        that.uninitialized_uniforms[name]=true;
        var setter = createUniformSetter(info);
        uniforms[name] = setter;
        if (info.type == tdl.gl.SAMPLER_2D || info.type == tdl.gl.SAMPLER_CUBE) {
            textures[name] = setter;
        }
    }

    this.textures = textures;
    this.attrib = attribs;
    this.attribLoc = attribLocs;
    this.uniform = uniforms;
}

tdl.programs.handleContextLost_ = function() {
  if (tdl.gl.tdl && tdl.gl.tdl.programs && tdl.gl.tdl.programs.shaderDB) {
    delete tdl.gl.tdl.programs.shaderDB;
    delete tdl.gl.tdl.programs.programDB;
  }
  delete this.compileok
};

tdl.programs.init_ = function() {
  if (!tdl.gl.tdl.programs) {
    tdl.gl.tdl.programs = { };
    tdl.webgl.registerContextLostHandler(tdl.gl.canvas, tdl.programs.handleContextLost_, true);
  }
  if (!tdl.gl.tdl.programs.shaderDB) {
    tdl.gl.tdl.programs.shaderDB = { };
    tdl.gl.tdl.programs.programDB = { };
  }
};

tdl.programs.Program.prototype.use = function() {
    if(this.program === undefined ){
        throw new Error("You must compile the program "+this.id+" before calling use()");
    }
    tdl.gl.useProgram(this.program);
    tdl.gl.tdl.currentProgram = this; //also used in framebuffers.js (and tdl.js and webgl.js?)
    this.uninitialized_attribs = {};
    
    //for(var k in this.all_attribs){
    //    this.uninitialized_attribs[k] = true;
    //}
    
    //for(var v in tdl.programs.uniformvalues ){
    //    this.setUniform(v,tdl.programs.uniformvalues[v],true,true);
    //}
};


/** Set a uniform variable.
 *  uniform = the name of the item
 * value = the value to set
 * ignoremissing = If true, don't warn about nonexistent uniforms
 * dontcache = for internal use only
 */
tdl.programs.Program.prototype.setUniform = function(uniform, value, ignoremissing,
    dontcache)
{
    
    var that=this;
    
    /*
    if( !dontcache ){
        //save data so when we switch shaders, we copy uniforms
        //to the new shader
        var v;
        if( value.length !== undefined ){
            var v = [];
            for(var i=0;i<value.length;++i)
                v[i]=value[i];
        }
        else
            v=value;
        tdl.programs.uniformvalues[uniform]=v;
    }
    */
    
    //jh added
    if( value === undefined ){
        //console && console.trace && console.trace();
        debugger;
        throw(new Error("Cannot set uniform '"+uniform+"' to 'undefined'"));
    }

    if( tdl.gl.tdl.currentProgram !== this ){
        //console.trace();
        debugger;
        throw new Error("You must use() the shader before setting uniforms");
    }

    if( this.uninitialized_uniforms[uniform] !== undefined ){
        delete this.uninitialized_uniforms[uniform];
    }

    var func = this.uniform[uniform];
    if (func) 
        func(value);
    else{
      // jh added for debugging
        if( this.warned === undefined )
            this.warned={};
        if( this.warned[uniform] === undefined && ignoremissing !== true){
            this.warned[uniform] = true;
            if(!this.pending_uniform_warnings)
                this.pending_uniform_warnings=[];
            this.pending_uniform_warnings.push(uniform);
            if( that.pending_uniform_warning_timeout )
                clearTimeout(that.pending_uniform_warning_timeout);
            that.pending_uniform_warning_timeout = setTimeout(function(){
                if( that.pending_uniform_warnings && that.pending_uniform_warnings.length ){
                    
                    console.warn("Warning: Shader "+that.id+" doesn't have uniform" +
                        ( (that.pending_uniform_warnings.length > 1) ? "s " : " ") +
                        that.pending_uniform_warnings.join(","));
                    that.pending_uniform_warnings=[];
                    that.pending_uniform_warning_timeout=undefined;
                }
            },250);
        }
    } 
};

//jh added to help debugging
tdl.programs.Program.prototype.getAttribLoc = function(name){
    var that=this;
    var lo = this.attribLoc[name];
    if( lo === undefined ){
        if( this.awarned === undefined )
            this.awarned={};
        if( this.awarned[name] === undefined ){
            this.awarned[name]=true;
            
            if(!this.pending_attribute_warnings)
                this.pending_attribute_warnings=[];
            this.pending_attribute_warnings.push(name);
            if( that.pending_attribute_warning_timeout )
                clearTimeout(that.pending_attribute_warning_timeout);
            that.pending_attribute_warning_timeout = setTimeout(function(){
                if( that.pending_attribute_warnings && that.pending_attribute_warnings.length ){
                    
                    console.warn("Warning: Shader "+that.id+" doesn't have attribute" +
                        ( (that.pending_attribute_warnings.length > 1) ? "s " : " ") +
                        that.pending_attribute_warnings.join(","));
                    that.pending_attribute_warnings=[];
                    that.pending_attribute_warning_timeout=undefined;
                }
            },250);
        }
            //tdl.log("Warning: Shader "+this.id+" doesn't have attribute '"+name+"'");
            //if( console && console.trace )
            //    console.trace();
    }
    return lo;
};

//jh added
tdl.programs.Program.prototype.setAttribute = function(name,size,type,stride,offset){
    var idx = this.getAttribLoc(name);
    if( idx === undefined )
        return;
    tdl.gl.vertexAttribPointer(idx,size,type,false,stride,offset);
    tdl.gl.enableVertexAttribArray(idx);
    if( this.uninitialized_attribs[name] )
        delete this.uninitialized_attribs[name];
}
    
//jh added to turn off all attributes
tdl.programs.Program.prototype.disableAllAttribs = function(){
    if( this.max_vertex_attribs === undefined ){
        this.max_vertex_attribs = tdl.gl.getParameter(tdl.gl.MAX_VERTEX_ATTRIBS);
    }
    for(var i=0;i<this.max_vertex_attribs;++i){
        tdl.gl.disableVertexAttribArray(i);
    }
}

//jh added to help debugging
tdl.programs.Program.prototype.checkUninitialized = function(){
    if( !this.warned_uninitialized ){
        var do_trace=false;
        this.warned_uninitialized=true;
        for(var X in this.uninitialized_uniforms ){
            tdl.log("Warning: Uninitialized uniform '"+X+"' in "+this.vs_url+"+"+this.fs_url);
            do_trace=true;
        }
        for(var X in this.uninitialized_attribs ){
            tdl.log("Warning: Uninitialized attrib '"+X+"' in "+this.vs_url+"+"+this.fs_url);
            do_trace=true;
        }
        if(do_trace)
            console.trace();
    }
}

//internal function
//B = list of dictionaries
//Each dictionary has keys:
//  buffer
//  attrs: List of dictionaries
//      name, components, type

tdl.programs.Program.prototype.setVertexFormatHelper = function(B){
    var GL = tdl.gl;
    
    if( this.max_vertex_attribs === undefined ){
        this.max_vertex_attribs = tdl.gl.getParameter(tdl.gl.MAX_VERTEX_ATTRIBS);
    }

    if( tdl.gl.tdl.currentProgram !== this ){
        throw new Error("You must use() the program "+this.id+" before setting the vertex format");
    }

    var bufferinfo = [];


    for(var i=0;i<B.length;++i){
        B[i].stride = 0;
        var A = B[i].attrs;
        for(var j=0;j<A.length;j++){
            var name = A[j].name;
            var components = A[j].components;
            var type = A[j].type;
            var divisor = A[j].divisor;
            
            if( name === undefined )
                throw new Error("Error in setVertexFormat: name is invalid");
            if( components === undefined || components < 1 || components > 4)
                throw new Error("Error in setVertexFormat: components is invalid");
            if( type === undefined )
                throw new Error("Error in setVertexFormat: type is undefined");
       
            if( name.length > 0 ){
                //zero length name = skip over this space,
                //but don't assign to an attribute
                var vi = this.getAttribLoc(name);
                if( vi !== undefined && vi !== null && vi !== -1){
                    A[j].location = vi;
                    A[j].offset = B[i].stride;
                }
                if( this.uninitialized_attribs[name] ){
                    delete this.uninitialized_attribs[name];
                }
            }
        
            var sz;
            if( type === tdl.gl.FIXED || type === tdl.gl.FLOAT || type === tdl.gl.INT)
                sz=4;
            else if( type === tdl.gl.SHORT || type == tdl.gl.UNSIGNED_SHORT)
                sz=2;
            else if( type === tdl.gl.BYTE || type == tdl.gl.UNSIGNED_BYTE )
                sz=1;
            else
                throw new Error("Error in setVertexFormat: type for "+name+" is invalid: "+type);
            
            var bytesize = sz * components;
            B[i].stride += bytesize;
        }//end for each attribute
    }//end for each buffer

    
    var usedattribs=[];
    
    for(var i=0;i<B.length;++i){
        var Bi = B[i];
        if( Bi.buffer !== tdl.Program.currentBufferSingleton )
            GL.bindBuffer(tdl.gl.ARRAY_BUFFER, Bi.buffer );

        //console.log("Buffer",Bi);
        var len = Bi.attrs.length;
        for( var j=0;j<len;++j){
            var A = Bi.attrs[j];
            
            if( A.location === undefined ){
                //this attribute doesn't exist in the shader.
                //We should have warned about it above.
                continue
            }
            GL.vertexAttribPointer(
                A.location, 
                A.components,
                A.type,
                false,      //normalized
                Bi.stride,
                A.offset
            );
            
            //console.log(A);
            
            if( tdl.programs.Program.instancingExtension ){
                //console.log("divisor",A.location,Bi.divisor);
                tdl.programs.Program.instancingExtension.vertexAttribDivisorANGLE(
                    A.location,
                    Bi.divisor ? Bi.divisor : 0
                );
            }
            usedattribs[A.location]=true;
        }
    }
    
    //activate the ones we need that are not yet active
    //deactivate the ones we don't need that are active
    //leave the rest alone
    for(var i=0;i<this.max_vertex_attribs;++i){      
        if( usedattribs[i]  &&  !tdl.gl.tdl.attribArrayStatus[i] )
            tdl.gl.enableVertexAttribArray(i);
        else if( !usedattribs[i]  && tdl.gl.tdl.attribArrayStatus[i]){
            tdl.gl.disableVertexAttribArray(i);   
            if( i === 0 ){
                console.warn("Warning: Not using vertex attribute zero (drawing will be slow)");
            }
        }
    }

}
    
//jh added to make it more DX like
//arguments:
//  n repetitions of:
//      attribute name: string
//      num components: 1,2,3,4 (or any number if name is empty)
//      attribute type: ex: tdl.gl.FLOAT
//Items must be tightly packed (use an attribute name of the empty string to
//skip over data). 
//The total size of each vertex will be deduced from the number and
//types of components specified.
//Ex: prog.setVertexFormat("position",4,tdl.gl.FLOAT,"texcoord",2,tdl.gl.FLOAT);
tdl.programs.Program.prototype.setVertexFormat = function(){

/*
    if( this.max_vertex_attribs === undefined ){
        this.max_vertex_attribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    }

    var AA=[];
    var offset=0;
    
    for(var i=0;i<arguments.length;i+=3){
        var name = arguments[i];
        var components = arguments[i+1];
        var type=arguments[i+2];
        
        if( name === undefined || type === undefined || components === undefined )
            throw new Error("Error in setVertexFormat");
            
        if( name !== "" && (components < 1 || components > 4 ) )
            throw new Error("Bad number of components in setVertexFormat: "+components);

        if( name !== "" ){
            var vi = this.getAttribLoc(name);
            if( vi !== undefined && vi !== null && vi !== -1)
                AA[vi]=[name,components,type,offset];
            if( name in this.uninitialized_attribs )
                delete this.uninitialized_attribs[name];
        }
        
        var sz;
        if( type === gl.FIXED || type === gl.FLOAT || type === gl.INT)
            sz=4;
        else if( type === gl.SHORT || type == gl.UNSIGNED_SHORT)
            sz=2;
        else if( type === gl.BYTE || type == gl.UNSIGNED_BYTE )
            sz=1;
        else
            throw new Error("Bad type to setVertexFormat:"+type);
            
        offset += components*sz;
    }     

    var vsize = offset;
    
    for(var i=0;i<this.max_vertex_attribs;++i){
        if( AA[i] ){
            gl.vertexAttribPointer(i,
                AA[i][1],AA[i][2],false,vsize,AA[i][3]);
        }
        
        if( AA[i]  &&  !gl.tdl.attribArrayStatus[i] )
            gl.enableVertexAttribArray(i);
        else if( !AA[i]  && gl.tdl.attribArrayStatus[i])
            gl.disableVertexAttribArray(i);
        //else if( AA[i] && gl.tdl.attribArrayStatus[i]) {}
        //else if( !AA[i] && !gl.tdl.attribArrayStatus[i]) {}
    }


    return;

*/




    var args=[];
    var tmp = {buffer: tdl.programs.Program.currentBufferSingleton,
            attrs: args};
    
    for(var i=0;i<arguments.length;i+=3){
        args.push( 
                {
                    name: arguments[i],
                    components: arguments[i+1],
                    type: arguments[i+2]
                }
        );
    }
    
    this.setVertexFormatHelper( [ tmp ] );
    return;
}



//same as setVertexFormat but used when we have separate buffers
//Call style:
// prog.setVertexFormatSeparate( 
//      [buffer, name,count,type, name,count,type, ...],
//      [buffer, name,count,type, name,count,type, ...]
//      ...
// )
// It is invalid to list the same buffer more than once.
// Use an attribute name of the empty string to skip over data.
tdl.programs.Program.prototype.setVertexFormatSeparate = function(){
    var B = [];
    for(var i=0;i<arguments.length;i++){
        var X={}
        B.push(X);
        var L = arguments[i];
        X.buffer = L[0];
        X.attrs=[];
        for(var j=1;j<L.length;j+=3){
            X.attrs.push( 
                {
                    name: L[j],
                    components: L[j+1],
                    type: L[j+2]
                }
            );
        }
    }
    this.setVertexFormatHelper(B);
}


//same as setVertexFormatSeparate except for the format:
// prog.setVertexFormatInstanced(
//      [buffer, divisor, name, count, type, name, count, type, ... ]
//      [ ... ],
//      ...
//  )
tdl.programs.Program.prototype.setVertexFormatInstanced = function(){
    if(!tdl.programs.Program.instancingExtension){
        tdl.programs.Program.instancingExtension = tdl.gl.getExtension("ANGLE_instanced_arrays");
        if(!tdl.programs.Program.instancingExtension)
            throw new Error("This platform does not support instancing.");
    }
   
    var B = [];
    for(var i=0;i<arguments.length;i++){
        var X={}
        B.push(X);
        var L = arguments[i];
        X.buffer = L[0];
        X.divisor = L[1];
        X.attrs=[];
        for(var j=2;j<L.length;j+=3){
            X.attrs.push( 
                {
                    name: L[j],
                    components: L[j+1],
                    type: L[j+2]
                }
            );
        }
    }
    this.setVertexFormatHelper(B);
}


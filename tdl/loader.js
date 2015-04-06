"use strict";
//modified by jh at ssu 2013, 2014


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


/**
 * @fileoverview This file contains a loader class for helping to load
 *     muliple assets in an asynchronous manner.
 */

tdl.provide('tdl.loader');

/**
 * A Module with a loader class for helping to load muliple assets in an
 * asynchronous manner.
 * @namespace
 */
tdl.loader = tdl.loader || {};

tdl.loader.verbose=false;
tdl.loader.uniqueid=0;
tdl.loader.numtoplevels=0;

/**
 * A simple Loader class to call some callback when everything has loaded.
 * @constructor
 * @param {!function(): void} onFinished Function to call when final item has
 *        loaded.
 */
 
tdl.loader.Loader = function(onFinished,parent)  {
  
    if(!parent)
        tdl.loader.numtoplevels++;
        
    if( tdl.loader.numtoplevels > 1 ){
        if(!tdl.loader.warned){
            tdl.loader.warned=true;
            console.warn("You have created multiple Loader's. This is almost certainly not what you want.");
        }
    }
    
    this.type_="Loader";  //so Textures, etc. can verify their first parameter is indeed a Loader.
  
    //for debugging only
    this.parent=parent;
    if(tdl.loader.uniqueid===undefined)
        tdl.loader.uniqueid=0;
    this.uniqueid=tdl.loader.uniqueid++;
  
    //sentinel: Used for finish() function.
    //Should be unique object shared with no one else
    this.loadSentinel={toString:function(){return "sentinel"}};
    
    //things this loader needs to load. May be strings
    //(url's) or sub-loader objects.
    this.to_load=[this.loadSentinel];
  
    //callback.
    this.onFinished_ = onFinished;

};

tdl.loader.Loader.prototype.toString = function(){
    var L=[];
    var p = this;
    while(p){
        L.push(p.uniqueid);
        p=p.parent;
    }
    L=L.reverse();
    return "Loader"+L.join("-");
}

/**
 * Loads a text file.
 * @param {string} url URL of scene to load.
 * @param {!function(string, *): void} callback Function to call when
 *     the file is loaded. It will be passed the contents of the file as a
 *     string.
 */
tdl.loader.Loader.prototype.loadTextFile = function(url, callback) {
    if( !url )
        throw new Error("Bad argument to loader");
    
    //we need to ensure the loader doesn't think it's done
    //until we've gotten all the data parsed
    var synthetic = {toString:function(){ return "{synthetic for "+url+"}"} };
    this.to_load.push(synthetic);
    var that=this;
    
    this.loadArrayBuffer(url,function(ab){
        var b = new Blob([ab]);
        var r = new FileReader();
        r.addEventListener("loadend",function(){
            if( callback ){
                callback(r.result);
            }
            that.loadCompleted(synthetic);
        });
        r.readAsText(b)
    });
    return;
}

tdl.loader.Loader.prototype.loadArrayBuffer = function(url,callback){
    
    if( !url )
        throw new Error("Bad argument to loader");
        
    if( document.location.protocol !== "file:")
        url = url + "?_="+((new Date()).getTime());
    
    var req = new XMLHttpRequest();
    var that = this;
    this.to_load.push(url);
    req.open("GET",url);
    req.onreadystatechange = function(){
        if(req.readyState === 4 ){
            if(req.status === 200 || req.status === 0){
                if( callback){
                    callback(req.response);
                }
                that.loadCompleted(url);
            }
            else
                throw new Error(req.status + ": Cannot load item "+url);
        }
    }
    req.responseType="arraybuffer";
    try{
        req.send(null);
    } catch(e){
        console.log(url);
        throw e;
    }
}

tdl.loader.Loader.prototype.getMimeType = function(url){
    var tmp = url.split(".");
    var suffix = tmp[tmp.length-1];
    suffix = suffix.toLowerCase();
    
    var sdict = {
        "png" : "image/png",
        "jpeg" : 'image/jpeg',
        "jpg" : "image/jpeg",
        "gif" : "image/gif",
        "svg" : "image/svg"
    }; 
    
    if(sdict[suffix] )
        return sdict[suffix]
        
    return "application/octet-stream";
}


tdl.loader.Loader.prototype.loadImage = function(url,callback){
    if( !url )
        throw new Error("Bad argument to loader");
    //error check: Catch attempts to load non-image files
    var that=this;
    var mimetype = this.getMimeType(url);
    if( !mimetype.startsWith("image/") )
        throw new Error("loadImage called with argument "+url+": Not an image file");
    
    if( document.location.protocol !== "file:" )
        url += "?_="+((new Date()).getTime());
     
    var img = new Image();
    this.to_load.push(url);
    var that=this;
    img.addEventListener("load",function(){
        if(callback){
            //console.log("calling callback for image "+url);
            callback(img);
        }
        that.loadCompleted(url);
    });
    img.addEventListener("error",function(){
        throw new Error("Cannot load image "+url);
    });
    
    img.src = url;
}


tdl.loader.Loader.prototype.loadDataURL = function(url,callback,mimetype){
    if( !url )
        throw new Error("Bad argument to loader");
    var mimetype = this.getMimeType(url);
    var that=this;
    if( document.location.protocol !== "file:" )
        url += "?_="+((new Date()).getTime());
    
    this.loadArrayBuffer(url,function(ab){
        var b = new Blob([ab],{type:mimetype,endings:'transparent'});
        var r = new FileReader();
        var synthetic = {};
        that.to_load.push(synthetic);
        r.onloadend = function(){
            if( callback ){
                callback(r.result);
            }
            that.loadCompleted(synthetic);
        }
        r.readAsDataURL(b);
    });
}
    
    
/**
 * Creates a loader that is tracked by this loader so that when the new loader
 * is finished it will be reported to this loader.
 * @param {!function(): void} onFinished Function to be called when everything
 *      loaded with this loader has finished.
 * @return {!tdl.loader.Loader} The new Loader.
 */
tdl.loader.Loader.prototype.createSubloader = function(onFinished) {
    var that = this;
    var L;
    L = new tdl.Loader(function(){
        if(onFinished)
            onFinished();
        that.loadCompleted(L)
    },this);
    this.to_load.push(L);
    return L;
};

/**
 * Counts down the internal count and if it gets to zero calls the callback.
 * @private
 */
tdl.loader.Loader.prototype.loadCompleted = function(thing){
    var flag=false;

    for(var i=0;i<this.to_load.length;++i){
        if( this.to_load[i] === thing ){
            var so = this.to_load.splice(i,1);
            flag=true;
            break;
        }
    }
    
    if( !flag )
        console.error("Internal loader error: Lost item "+thing);
    
    if( this.to_load.length === 0 ){
        if( this.onFinished_ )
            this.onFinished_();
    }
        
};

/**
 * Finishes the loading process.
 * Actually this just calls countDown_ to account for the count starting at 1.
 */
tdl.loader.Loader.prototype.finish = function() {
    this.loadCompleted(this.loadSentinel);
};



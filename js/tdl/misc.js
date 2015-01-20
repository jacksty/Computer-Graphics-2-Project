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
 * @fileoverview This file contains misc functions that don't fit elsewhere.
 */

tdl.provide('tdl.misc');

tdl.require('tdl.log');

/**
 * A module for misc.
 * @namespace
 */
tdl.misc = tdl.misc || {};

tdl.misc.applyUrlSettings = function(obj, opt_argumentName) {
  var argumentName = opt_argumentName || 'settings';
  try {
    var s = window.location.href;
    var q = s.indexOf("?");
    var e = s.indexOf("#");
    if (e < 0) {
      e = s.length;
    }
    var query = s.substring(q + 1, e);
    //tdl.log("query:", query);
    var pairs = query.split("&");
    //tdl.log("pairs:", pairs.length);
    for (var ii = 0; ii < pairs.length; ++ii) {
      var keyValue = pairs[ii].split("=");
      var key = keyValue[0];
      var value = decodeURIComponent(keyValue[1]);
      //tdl.log(ii, ":", key, "=", value);
      switch (key) {
      case argumentName:
        //tdl.log(value);
        var settings = eval("(" + value + ")");
        //tdl.log("settings:", settings);
        tdl.misc.copyProperties(settings, obj);
        break;
      }
    }
  } catch (e) {
    tdl.error(e);
    tdl.error("settings:", settings);
    return;
  }
};

/**
 * Copies properties from obj to dst recursively.
 * @private
 * @param {!Object} obj Object with new settings.
 * @param {!Object} dst Object to receive new settings.
 */
tdl.misc.copyProperties = function(obj, dst) {
  for (var name in obj) {
    var value = obj[name];
    if (value instanceof Array) {
      //tdl.log("apply->: ", name, "[]");
      var newDst = dst[name];
      if (!newDst) {
        newDst = [];
        dst[name] = newDst;
      }
      tdl.misc.copyProperties(value, newDst);
    } else if (typeof value == 'object') {
      //tdl.log("apply->: ", name);
      var newDst = dst[name];
      if (!newDst) {
        newDst = {};
        dst[name] = newDst;
      }
      tdl.misc.copyProperties(value, newDst);
    } else {
      //tdl.log("apply: ", name, "=", value);
      dst[name] = value;
    }
  }
};

//uses glReadPixels to fetch the current contents
//of canvas and send to server with POST
tdl.misc.sendImage = function(url){
    var a = new Uint8Array(tdl.gl.canvas.width*tdl.gl.canvas.height*4);
    tdl.gl.readPixels(0,0,tdl.gl.canvas.width,tdl.gl.canvas.height,tdl.gl.RGBA,tdl.gl.UNSIGNED_BYTE,a);
    var cvs = document.createElement("canvas");
    cvs.width=tdl.gl.canvas.width;
    cvs.height = tdl.gl.canvas.height;
    var ctx = cvs.getContext("2d");
    var idata = new ImageData(tdl.gl.canvas.width,tdl.gl.canvas.height);
    
    var xmax=tdl.gl.canvas.width*4;
    for(var y=0;y<tdl.gl.canvas.height;++y){
        var j1 = y * tdl.gl.canvas.width * 4;
        var j2 = (tdl.gl.canvas.height-1-y) * tdl.gl.canvas.width*4;
        for(var x=0;x<xmax;++x,j1++,j2++){
            idata.data[j1] = a[j2];
        }
    }
    ctx.putImageData(idata,0,0);
    var png = cvs.toDataURL("png")
    var idx = png.indexOf(",");
    png = png.substr(idx+1);
    var xhr = new XMLHttpRequest();
    xhr.open("POST",url);
    xhr.send(png);
}
    
tdl.misc.uploadFrame = function(maxframes){
    if( tdl.misc.uploadFrame.counter === undefined )
        tdl.misc.uploadFrame.counter = 0;
    if( tdl.misc.uploadFrame.counter > maxframes)
            return;
            
    var fname="frame";
    if( tdl.misc.uploadFrame.counter < 10 )
        fname += "000";
    else if( tdl.misc.uploadFrame.counter < 100)
        fname += "00";
    else if( tdl.misc.uploadFrame.counter < 1000 )
        fname += "0";
    
    fname += tdl.misc.uploadFrame.counter;
    fname += ".png";
    tdl.misc.sendImage(fname);
    tdl.misc.uploadFrame.counter ++;
}

    
    


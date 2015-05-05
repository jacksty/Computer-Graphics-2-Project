uniform sampler2D tex;
uniform vec2 resolution;
attribute vec3 a_position;
attribute vec2 a_coord;
varying vec2 texpos;

varying vec2 v_rgbNW;
varying vec2 v_rgbNE;
varying vec2 v_rgbSW;
varying vec2 v_rgbSE;
varying vec2 v_rgbM;

#include "shader/texcoords.glsl"

void main(){
	texpos = a_coord;	
	gl_Position = vec4(a_position, 1.0);
	
	vec2 fragCoord = a_coord * resolution;
	texcoords(fragCoord, resolution, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);
}
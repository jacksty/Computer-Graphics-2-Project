precision highp float;

#include "shader/noise.txt"

uniform sampler2D tex;
uniform vec4 tex_size;
uniform vec2 resolution;

varying vec2 texpos;

varying vec2 v_rgbNW;
varying vec2 v_rgbNE;
varying vec2 v_rgbSW;
varying vec2 v_rgbSE;
varying vec2 v_rgbM;

#include "shader/fxaa.glsl"

void main()
{
	vec4 antiAliased = fxaa(tex, texpos.st * resolution, resolution, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);
	vec3 tc = antiAliased.rgb;
	
	gl_FragColor.rgb = tc;
	gl_FragColor.a = 1.0;
}
precision highp float;

#include "shader/noise.txt"

uniform sampler2D tex;
uniform vec4 tex_size;
uniform vec2 resolution;
uniform bool antialias;
uniform bool showgrain;
uniform bool underwater;

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
	vec3 tc = (antialias) ? antiAliased.rgb : texture2D(tex, texpos).rgb;
	
	vec3 p = vec3(texpos.st, noisescale * 0.005);
	p *= noisescale;
	p.yz += vec2(noisetime, -noisetime);
	float val = noise3(p);
    val += 0.5*noise3(2.0*p);
    val += 0.25*noise3(4.0*p);
    val += 0.125*noise3(8.0*p);
	
	vec3 nc = vec3(noise3(vec3(val, val, val)));
	
	float l = (0.299*tc.r + 0.587*tc.g + 0.114*tc.b);
	
	gl_FragColor.rgb = (showgrain) ? mix(tc, 0.7 * mix(nc, tc, l), 0.15) : tc;
	
	if (underwater)
		gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.5, 0.1, 0.1), 0.8);
	
	gl_FragColor.a = 1.0;
}
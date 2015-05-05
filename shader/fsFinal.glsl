precision highp float;

#include "shader/noise.txt"

#define Pr .299
#define Pg .587
#define Pb .114
#define PI 3.14159265359

uniform sampler2D tex;
uniform vec4 tex_size;
uniform vec2 resolution;
uniform bool antialias;
uniform bool showgrain;
uniform bool correction;

varying vec2 texpos;

varying vec2 v_rgbNW;
varying vec2 v_rgbNE;
varying vec2 v_rgbSW;
varying vec2 v_rgbSE;
varying vec2 v_rgbM;

#include "shader/fxaa.glsl"

vec3 color_hueshift(vec3 color, float factor)
{
	vec3 c;
	factor = (factor - floor(factor)) * 3.0;
	float k1 = clamp(1.0 - factor, 0.0, 1.0) + clamp(factor - 2.0, 0.0, 1.0);
	float k2 = clamp(factor, 0.0, 1.0) - clamp(factor - 1.0, 0.0, 1.0);
	float k3 = clamp(factor - 1.0, 0.0, 1.0) - clamp(factor - 2.0, 0.0, 1.0);
	c.r = k1 * color.r + k2 * color.g + k3 * color.b;
	c.g = k1 * color.g + k2 * color.b + k3 * color.r;
	c.b = k1 * color.b + k2 * color.r + k3 * color.g;
	return clamp(c, 0.0, 1.0);
}

vec3 color_YIQshift(vec3 color, float H, float S, float V)
{
	//based off of http://beesbuzz.biz/code/hsv_color_transforms.php
	
	float VSU = V * S * cos(H * 2.0 * PI);
    float VSW = V * S * sin(H * 2.0 * PI);
	
	vec3 c;
	c.r = (.299*V+.701*VSU+.168*VSW)*color.r
        + (.587*V-.587*VSU+.330*VSW)*color.g
        + (.114*V-.114*VSU-.497*VSW)*color.b;
    c.g = (.299*V-.299*VSU-.328*VSW)*color.r
        + (.587*V+.413*VSU+.035*VSW)*color.g
        + (.114*V-.114*VSU+.292*VSW)*color.b;
    c.b = (.299*V-.3*VSU+1.25*VSW)*color.r
        + (.587*V-.588*VSU-1.05*VSW)*color.g
        + (.114*V+.886*VSU-.203*VSW)*color.b;
	return clamp(c, 0.0, 1.0);
}

vec3 color_boost(vec3 color, float hue, float factor)
{
	vec3 c;
	c = color_YIQshift(color, hue, 1.0, 1.0);
	c.r *= factor;
	c = color_YIQshift(c, -hue, 1.0, 1.0);
	return c;
}

vec3 color_saturation(vec3 color, float factor)
{
	//based off of http://alienryderflex.com/saturation.html
	vec3 c;
	float s = sqrt(
			Pr * color.r * color.r +
			Pg * color.g * color.g +
			Pb * color.b * color.b
			);
	c.r = s + ((color.r - s) * factor);
	c.g = s + ((color.g - s) * factor);
	c.b = s + ((color.b - s) * factor);
	return clamp(c, 0.0, 1.0);
}

vec3 color_greyscaleCorrection(vec3 color, float in_high, float in_mid, float in_low, 
		float out_high, float out_mid, float out_low,
		float high_hue, float high_boost, float low_hue, float low_boost)
{
	float l = (0.299*color.r + 0.587*color.g + 0.114*color.b);
	
	float black = clamp((l - in_low) / (in_mid - in_low), 0.0, 1.0);
	float grey = clamp((l - in_mid) / (in_high - in_mid), 0.0, 1.0);
	float white = clamp((l - in_high) / (1.0 - in_high), 0.0, 1.0);
	
	vec3 col = color / l;
	vec3 c;
	
	if (l < in_mid)
		c = color_boost(col * (black * (out_mid - out_low) + out_low), low_hue, 1.0 + low_boost * (1.0 - black));
	else if (l < in_high)
		c = col * (grey * (out_high - out_mid) + out_mid);
	else
		c = color_boost(col * (white * (1.0 - out_high) + out_high), high_hue, 1.0 + high_boost * white);
	
	return clamp(c, 0.0, 1.0);
}

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
	
	//float l = (0.299*tc.r + 0.587*tc.g + 0.114*tc.b);
	//tc = gl_FragColor.rgb = (showgrain) ? mix(tc, 0.7 * mix(nc, tc, l), 0.15) : tc;
	
	float dark = 0.4 * pow(1.0 - (Pr*tc.r + Pg*tc.g + Pb*tc.b), 5.0);
	
	if (correction)
	{
		tc = color_greyscaleCorrection(tc, 0.7, 0.4, 0.1, 0.6, 0.2, 0.0, 0.15, 0.1, 0.66, 0.1);
		tc = color_saturation(tc, 0.9);
		dark = 0.25 * pow(1.0 - (Pr*tc.r + Pg*tc.g + Pb*tc.b), 8.0);
		tc = mix(tc, vec3(0.0), 1.3 * distance(texpos.st, vec2(0.5)) - 0.2);
	}
	
	tc = (showgrain) ? mix(tc, nc, dark) : tc;
	
	gl_FragColor.rgb = tc;
	gl_FragColor.a = 1.0;
}
#extension GL_EXT_draw_buffers:require
precision highp float;
#define PI 3.14159265359

uniform sampler2D tex;
uniform sampler2D emitTex;
uniform float lightMode;
uniform vec4 specmtl;
varying vec3 normal;
varying vec2 texpos;

/*
float first11(float a){
	a = clamp(a, 0.0, 0.99951171875);
	a = floor(a * 4096.0) / 4096.0;
	return a;
}

float pack2(float a, float b){
	a = first11(0.5 * (a+1.0));
	b = first11(0.5 * (b+1.0));
	return a + b / 4096.0;
}
*/

vec2 split2ubyte(float a){
	a = a * 0.5 + 0.5;
	a *= 256.0;
	return vec2(floor(a) / 256.0, fract(a));
}

void main()
{
	vec4 color = texture2D(tex, texpos);
	if( color.a < 0.05 )
        discard;
	vec3 emissive = texture2D(emitTex, texpos).rgb;
	gl_FragData[0] = vec4(split2ubyte(atan(normal.x, normal.z) / PI), split2ubyte(normal.y)); //spherical coordinates, split into 2 ubyte channels each
	gl_FragData[1] = vec4(color.rgb, lightMode);
	gl_FragData[2] = vec4(emissive, 1.0);
	gl_FragData[3] = specmtl;
}
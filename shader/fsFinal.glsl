precision highp float;

#include "shader/noise.txt"

uniform sampler2D tex;
uniform vec4 tex_size;

varying vec2 texpos;

void main()
{
	vec3 tc = texture2D(tex, texpos.st).rgb;
	
	gl_FragColor.rgb = tc;
	gl_FragColor.a = 1.0;
}
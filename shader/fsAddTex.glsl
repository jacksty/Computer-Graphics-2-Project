precision highp float;

uniform sampler2D tex1;
uniform sampler2D tex2;
varying vec2 texpos;

void main(){
	vec4 t1c = vec4(0.8 * texture2D(tex1, texpos.st).rgb, 0.5);
	vec4 t2c = texture2D(tex2, texpos.st);
	
	gl_FragColor =  t1c + t2c;
}
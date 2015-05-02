precision highp float;

uniform sampler2D tex1;
uniform sampler2D tex2;
varying vec2 texpos;

void main(){
	vec4 t1c = texture2D(tex1, texpos.st);
	vec4 t2c = texture2D(tex2, texpos.st);
	
	gl_FragColor =  t1c + t2c;
}
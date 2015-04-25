precision highp float;

uniform sampler2D tex1;
uniform sampler2D tex2;
varying vec2 texpos;

void main(){
	gl_FragColor = texture2D(tex1, texpos.st) + texture2D(tex2, texpos.st);
}
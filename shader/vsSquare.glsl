uniform sampler2D tex;
attribute vec3 a_position;
attribute vec2 a_coord;
varying vec2 texpos;

void main(){
	texpos = a_coord;	
	gl_Position = vec4(a_position, 1.0);
}
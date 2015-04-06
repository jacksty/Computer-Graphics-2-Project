attribute vec3 a_position;
attribute vec2 a_coord;

varying vec2 texCoord;

void main()
{
	texCoord = a_coord;
    gl_Position = vec4(a_position,1.0);
}
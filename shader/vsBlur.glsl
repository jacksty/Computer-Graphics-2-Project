attribute vec3 a_position;
attribute vec2 a_coord;

varying vec2 v_texcoord;

void main()
{
	v_texcoord = a_coord;
    gl_Position = vec4(a_position, 1.0);
}

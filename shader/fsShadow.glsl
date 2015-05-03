precision highp float;

varying float v_viewPosz;

uniform vec3 hitheryon; 
uniform float scale_factor;

void main()
{
    float z = v_viewPosz;
    //z = -z;
    z = (z - hitheryon[0]) / hitheryon[2];
    z *= scale_factor;
    gl_FragColor = vec4(z, 0.0, 0.0, 1.0);
}

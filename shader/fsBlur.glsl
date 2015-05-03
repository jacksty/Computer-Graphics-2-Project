precision mediump float;

uniform vec2 deltas;
uniform sampler2D tex;
uniform vec4 tex_size;
uniform float scale_factor;

varying vec2 v_texcoord;

#include "shader/gaussblur5.txt"

void main()
{
    gl_FragColor = gaussblur5(tex, tex_size.zw, v_texcoord, deltas);
}

precision highp float;

uniform sampler2D tex;
uniform vec4 tex_size;
uniform bool blur;
uniform vec2 blur_deltas;
varying vec2 texpos;

vec4 gaussblur11(
         const in sampler2D tex,
         const in vec2 tex_dist, 
         const in vec2 texcoord,
         const in vec2 deltas){
    vec4 c = vec4(0,0,0,0);
    c += 0.0012106892668505699 * texture2D(tex, texcoord + -11.0 * deltas * tex_dist);
    c += 0.002643705614914441 * texture2D(tex, texcoord + -10.0 * deltas * tex_dist);
    c += 0.005359084430219722 * texture2D(tex, texcoord + -9.0 * deltas * tex_dist);
    c += 0.010084751698124776 * texture2D(tex, texcoord + -8.0 * deltas * tex_dist);
    c += 0.017617201626268997 * texture2D(tex, texcoord + -7.0 * deltas * tex_dist);
    c += 0.028569704244896302 * texture2D(tex, texcoord + -6.0 * deltas * tex_dist);
    c += 0.04301022049297047 * texture2D(tex, texcoord + -5.0 * deltas * tex_dist);
    c += 0.0601083349811317 * texture2D(tex, texcoord + -4.0 * deltas * tex_dist);
    c += 0.07798208303686284 * texture2D(tex, texcoord + -3.0 * deltas * tex_dist);
    c += 0.09391869947915252 * texture2D(tex, texcoord + -2.0 * deltas * tex_dist);
    c += 0.10500413777949748 * texture2D(tex, texcoord + -1.0 * deltas * tex_dist);
    c += 0.10898277469822033 * texture2D(tex, texcoord + 0.0 * deltas * tex_dist);
    c += 0.10500413777949748 * texture2D(tex, texcoord + 1.0 * deltas * tex_dist);
    c += 0.09391869947915252 * texture2D(tex, texcoord + 2.0 * deltas * tex_dist);
    c += 0.07798208303686284 * texture2D(tex, texcoord + 3.0 * deltas * tex_dist);
    c += 0.0601083349811317 * texture2D(tex, texcoord + 4.0 * deltas * tex_dist);
    c += 0.04301022049297047 * texture2D(tex, texcoord + 5.0 * deltas * tex_dist);
    c += 0.028569704244896302 * texture2D(tex, texcoord + 6.0 * deltas * tex_dist);
    c += 0.017617201626268997 * texture2D(tex, texcoord + 7.0 * deltas * tex_dist);
    c += 0.010084751698124776 * texture2D(tex, texcoord + 8.0 * deltas * tex_dist);
    c += 0.005359084430219722 * texture2D(tex, texcoord + 9.0 * deltas * tex_dist);
    c += 0.002643705614914441 * texture2D(tex, texcoord + 10.0 * deltas * tex_dist);
    c += 0.0012106892668505699 * texture2D(tex, texcoord + 11.0 * deltas * tex_dist);
    return c;
}

void main(){
	gl_FragColor = (blur) ? gaussblur11(tex, tex_size.zw, texpos.st, blur_deltas.st) : texture2D(tex, texpos.st);
}
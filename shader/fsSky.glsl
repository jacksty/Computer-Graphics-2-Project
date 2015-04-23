precision highp float;

uniform samplerCube basetexture;
uniform float reflection;
uniform vec4 cameraPos;
varying vec4 v_worldPos;
void main(){
    vec3 V = v_worldPos.xyz - cameraPos.xyz;
    V.y *= reflection;
    V=normalize(V);
    
    vec4 c = textureCube(basetexture,V);
    gl_FragColor = c;
}
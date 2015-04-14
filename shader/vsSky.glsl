attribute vec4 position;

uniform vec4 cameraPos;
uniform mat4 viewProjMat;
uniform mat4 worldMat;

varying vec4 v_worldPos;

varying vec3 oNormal;
varying vec3 oTangent;
varying vec2 texpos;

void main(){
    vec4 p = position * worldMat;
    p.xyz += cameraPos.xyz;
    p.w=1.0;
    v_worldPos = p;
    gl_Position = p * viewProjMat;
    gl_Position.z = gl_Position.w;
}
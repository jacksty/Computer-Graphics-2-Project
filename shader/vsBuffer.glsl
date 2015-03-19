attribute vec2 coords;
attribute vec3 position;
attribute vec3 norm;
attribute vec3 tang;
uniform mat4 viewProjMat;
uniform mat4 worldMatrix;
uniform sampler2D tex;
varying vec4 worldPos;
varying vec4 camWorldPos;
uniform vec4 cameraPos;
varying vec3 oNormal;
varying vec3 oTangent;
varying vec2 texpos;


void main()
{
	oNormal = normalize(norm);
	oTangent = normalize(tang - dot(tang, oNormal) * oNormal);
	texpos = coords;
	vec4 p = vec4(position, 1.0);
	p = p * worldMatrix;
	worldPos = p;
	camWorldPos = cameraPos * worldMatrix;
    gl_Position = p * viewProjMat;
}

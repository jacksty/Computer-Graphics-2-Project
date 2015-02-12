attribute vec3 position;
attribute vec3 norm;
attribute vec2 coords;
uniform mat4 viewProjMat;
uniform mat4 worldMatrix;
uniform sampler2D tex;
uniform vec4 cameraPos;
varying vec2 texpos;
varying vec3 normal;
varying vec4 worldPos;
varying vec4 camWorldPos;

void main()
{
	normal = normalize((worldMatrix * vec4(norm, 0.0)).xyz);
	texpos = coords;
	vec4 p = vec4(position, 1.0);
	p = p * worldMatrix;
	worldPos = p;
	camWorldPos = cameraPos * worldMatrix;
    gl_Position = p * viewProjMat;
}

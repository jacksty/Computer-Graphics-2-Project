#define amplitude AFSpSt.x;
#define frequency AFSpSt.y;
#define speed AFSpSt.z;
#define steepness AFSpSt.w;

attribute vec2 position;
attribute vec2 coords;

uniform mat4 worldMatrix;
uniform mat4 viewProjMat;
uniform vec4 AFSpSt;
uniform vec3 direction;
uniform float time;

varying vec4 worldPos;
varying vec3 normal;
varying vec2 texpos;


float height(vec2 p){
	float s = dot(direction.xz, p);
	s *= frequency;
	s += time * frequency * speed;
	float v = 0.5 * (sin(s)+1.0);
	v = pow(v, steepness);
	v = amplitude * v;
	return v;
}

void main(){
	texpos = coords;
	worldPos = vec4(position.x, height(position), position.y, 1.0) * worldMatrix;
	normal = (vec4(0.0,1.0,0.0,0.0) * worldMatrix).xyz;
	gl_Position = worldPos * viewProjMat;
}
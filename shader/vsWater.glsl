#define MAX_DIRECTIONS 4.0
#define amplitude afts.x
#define frequency afts.y
#define time afts.z
#define steepness afts.w

attribute vec2 position;
attribute vec2 coords;

uniform sampler2D directions;
uniform mat4 worldMatrix;
uniform mat4 viewProjMat;
uniform vec4 directions_size;
uniform vec4 afts;

varying vec4 worldPos;
varying vec3 normal;
varying vec2 texpos;
varying float h;


float height(vec2 p, vec3 d){
	float s = dot(d.xz, p) + time;
	s *= frequency;
	float v = 0.5 * (sin(s)+1.0);
	v = pow(v, steepness) * amplitude;
	return v;
}

float derivY(vec2 p, vec3 d){
	float v = amplitude * pow(0.5, steepness) * steepness * frequency;
	float k = time + p.x * d.x + d.z * p.y;
	k *= frequency;
	v *= cos(k) * pow(sin(k) + 1.0, steepness - 1.0);
	return v;
}

void main(){
	texpos = coords;
	worldPos = vec4(position.x, 0.0, position.y, 1.0) * worldMatrix;
	h = worldPos.y;
	vec3 tangent = vec3(0.0, 0.0, 1.0);
	vec3 bitangent = vec3(1.0,0.0,0.0);
	float count = 0.0;
	
	for(float i = 0.5; i < MAX_DIRECTIONS; i+=1.0){
		vec3 dir = texture2D(directions, vec2(i * directions_size.z, 0.5)).xyz;
		float s = sign(floor(dot(dir,dir) * 100.0));
		float dy = derivY(worldPos.xz, dir);
		
		count += s;
		worldPos.y += height(worldPos.xz, dir) * s;
		tangent.y += dy * dir.z * s;
		bitangent.y += dy * dir.x * s;
	}
	h = worldPos.y - h;
	normal = normalize(cross(tangent, bitangent));
	gl_Position = worldPos * viewProjMat;
}
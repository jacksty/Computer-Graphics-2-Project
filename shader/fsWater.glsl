precision highp float;
#define MAX_LIGHTS 20
#define hither hitherYon.x
#define yon hitherYon.y
#define vfov winSizeVFOV.z
#define width winSizeVFOV.x
#define height winSizeVFOV.y

struct Light{
	vec4 pos; //w = 0 directional, 1 positional
	vec4 col; //w <= -1 omnidirectional, else cos for spot
	vec3 dir; //only useful if spotlight
	vec3 atten; //constant, linear, exponentials
	float brightness;
};

uniform Light light[MAX_LIGHTS];
uniform sampler2D depth_texture;
uniform sampler2D tex;
uniform mat4 invViewMatrix;
uniform vec4 cameraPos;
uniform vec3 ambient;
uniform vec3 winSizeVFOV;
uniform vec2 hitherYon;

varying vec4 worldPos;
varying vec3 normal;
varying vec2 texpos;


float linearizeDepth(float depthValue){
	return hither * yon / (hither - yon) / (depthValue + yon / (hither - yon));
}

void main(){
	vec3 color = texture2D(tex, texpos).rgb;
	float depth = linearizeDepth(texture2D(depth_texture, gl_FragCoord.xy / vec2(width,height)).r);
	vec3 camtowater = worldPos.xyz - cameraPos.xyz;
	float camtowaterdist = -sqrt(dot(camtowater, camtowater));
	float waterdepth = depth - camtowaterdist;
	
	gl_FragColor = vec4(ambient * color.rgb, mix(0.25, 1.0, 0.01*waterdepth));
	
	for(int i = 0; i < MAX_LIGHTS; ++i){
		vec3 toLight = light[i].pos.xyz - light[i].pos.w * worldPos.xyz;
		float d2 = dot(toLight, toLight);
		toLight = normalize(toLight);
		if(dot(toLight, light[i].dir) < light[i].col.a)
			continue;	
		float diff = clamp(dot(toLight, normal), 0.0, 1.0);
		float f = light[i].brightness/(light[i].atten.x + light[i].atten.y*sqrt(d2) + light[i].atten.z*d2);
		f = clamp(f, 0.0, 1.0);
		diff *= f;
		gl_FragColor.rgb += diff * light[i].col.rgb * color.rgb;
	}
}
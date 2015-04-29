precision highp float;
#define MAX_LIGHTS 3
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
uniform sampler2D reflection;
uniform mat4 invViewMatrix;
uniform mat4 invProjMatrix;
uniform vec4 cameraPos;
uniform vec3 ambient;
uniform vec3 winSizeVFOV;
uniform vec2 hitherYon;
uniform float specmtl;
uniform float murkiness;
uniform vec3 fogColor;
uniform float fogDensity;
uniform float fogDark;

varying vec4 worldPos;
varying vec3 normal;
varying vec2 texpos;
varying float h;


float linearizeDepth(float depthValue){
	return hither * yon / (hither - yon) / (depthValue + yon / (hither - yon));
}

vec3 other_RIM(float exp, vec3 color, vec3 N, vec3 V)
{
	return clamp(color * pow(1.0 - dot(N, V), exp), 0.0, 1.0);
}

void main(){
	vec2 screenpos = gl_FragCoord.xy / vec2(width,height);
	vec3 color = texture2D(tex, texpos).rgb;
	vec3 refl = texture2D(reflection, screenpos + normal.xz * h * 0.08).rgb;
	color = mix(color, refl, 0.3);
	float depth = texture2D(depth_texture, screenpos).r;
	vec2 viewportSpace = vec2(gl_FragCoord.x / (width - 1.0), gl_FragCoord.y / (height - 1.0)) * 2.0 - 1.0;
	vec4 cameraSpace = vec4(viewportSpace, depth * 2.0 - 1.0, 1) * linearizeDepth(depth) * invProjMatrix;
	cameraSpace.w = 1.0;
	vec4 worldSpace = cameraSpace * invViewMatrix;
	vec3 V = normalize(cameraPos.xyz - worldPos.xyz);
	
	vec4 waterSurfaceToFloor = worldSpace - worldPos;
	float waterDepth = sqrt(dot(waterSurfaceToFloor.xyz, waterSurfaceToFloor.xyz));
	
	vec3 cumlight = ambient * color.rgb;
	
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
		vec3 R = normalize(reflect(-toLight, normal));
		float spec = clamp(dot(V, R), 0.0, 1.0);
		spec = pow(spec, specmtl);
		spec *= f / 2.0;
		cumlight += diff * light[i].col.rgb * color.rgb + spec * light[i].col.rgb;
	}
	
	vec3 rim = 0.34 * other_RIM(8.5, vec3(1.0), normal, V);
	vec3 tc = clamp(cumlight + rim, 0.0, 1.0);
	
	float dist = distance(worldPos.xyz, cameraPos.xyz);
    float fog = exp(-fogDensity * dist);
	float dark = (1.0 - (tc.r + tc.g + tc.b) / 3.0) * fogDark;
    tc = mix(fogColor, mix(tc, fogColor, dark), fog);
	
	gl_FragColor.rgb = tc;
	gl_FragColor.a = mix(0.25, 1.0, waterDepth * murkiness);
}
#extension GL_EXT_frag_depth : require
precision highp float;
#define PI 3.14159265359
#define hither hitherYon.x
#define yon hitherYon.y
#define width winSizeVFOV.x
#define height winSizeVFOV.y
#define vfov winSizeVFOV.z
#define LAMBERT 0.0
#define BILLBOARD 2.0
#define PHONG 1.0

struct Light{
	vec4 pos; //w = 0 directional, 1 positional
	vec4 col; //a <= -1 omnidirectional, else cos for spot
	vec3 dir; //only useful if spotlight
	vec3 atten; //x = constant, y = linear, z = exponential
	float brightness;
};

uniform Light light;
uniform sampler2D depth_texture;
uniform sampler2D normalTex;
uniform sampler2D colorTex;
uniform sampler2D specularTex;
uniform sampler2D emissiveTex;
uniform mat4 invViewMatrix;
uniform vec4 cameraPos;
uniform vec3 winSizeVFOV;
uniform vec3 ambient;
uniform vec2 hitherYon;

varying vec2 texCoord;


float merge2ubyte(vec2 a){
	float b = a.x * 256.0 + a.y;
    b /= 256.0;
    return (b - 0.5) * 2.0;
}

vec3 unspherize(vec4 norm){
	vec3 n = vec3(merge2ubyte(norm.xy) * PI, merge2ubyte(norm.zw), 1.0);
	float sinphi = sqrt(1.0 - pow(n.y, 2.0));
	n.z = cos(n.x) * sinphi;
	n.x = sin(n.x) * sinphi;
	return n;
}

float linearizeDepth(float depthValue){
	return hither * yon / (hither - yon) / (depthValue + yon / (hither - yon));
}

void main()
{
	float depth = texture2D(depth_texture, texCoord).r;
	gl_FragDepthEXT = depth;
	depth = linearizeDepth(depth);
	vec3 color = texture2D(colorTex, texCoord).rgb;
	vec3 emissive = texture2D(emissiveTex, texCoord).rgb;
	vec3 normal = unspherize(texture2D(normalTex, texCoord));
	float lightMode = texture2D(colorTex, texCoord).w;
	vec2 viewportSpace = vec2(gl_FragCoord.x / (width - 1.0), gl_FragCoord.y / (height - 1.0)) * 2.0 - 1.0;
	vec3 cameraSpace = vec3(viewportSpace.xy * depth * tan(vfov), depth);
	vec4 worldSpace = vec4(cameraSpace, 1.0) * invViewMatrix;
	
	gl_FragColor = vec4(emissive + ambient * color, 0.0);
	
	vec3 toLight = light.pos.xyz - light.pos.w * worldSpace.xyz;
	float d2 = dot(toLight, toLight);
	toLight = normalize(toLight);
	if(dot(toLight, light.dir) < light.col.a)
		return;	
	float diff = clamp(dot(toLight, normal), 0.0, 1.0);
	float f = light.brightness/(light.atten.x + light.atten.y*sqrt(d2) + light.atten.z*d2);
	f = clamp(f, 0.0, 1.0);
	diff *= f;
	float spec = 0.0;
	gl_FragColor.rgb += diff * light.col.rgb * color;
	
	if(lightMode == PHONG && diff > 0.0){
		vec4 specmtl = texture2D(specularTex, texCoord);
		specmtl.a *= 255.0; //roughness
		
		vec3 V = normalize(cameraPos.xyz - worldSpace.xyz);
		vec3 R = normalize(reflect(-toLight, normal));
		spec = clamp(dot(V, R), 0.0, 1.0);
		spec = pow(spec, specmtl.a);
		spec *= f / 2.0;
		gl_FragColor.rgb += spec * specmtl.rgb * light.col.rgb;
	}
	gl_FragColor.a = 1.0;
}

#extension GL_EXT_frag_depth : require
precision highp float;
#define PI 3.14159265359
#define hither hitherYon.x
#define yon hitherYon.y
#define width winSizeVFOV.x
#define height winSizeVFOV.y
#define vfov winSizeVFOV.z
#define LAMBERT 0.0
#define COOKTORRENCE 1.0
#define BILLBOARD 2.0
#define SKYBOX 3.0
#define PHONG 4.0

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
uniform mat4 invProjMatrix;
uniform vec4 cameraPos;
uniform vec3 winSizeVFOV;
uniform vec3 ambient;
uniform vec2 hitherYon;

varying vec2 texCoord;

//--DEFFERED RENDERING FUNCTIONS--

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
	return normalize(n);
}

float linearizeDepth(float depthValue){
	return hither * yon / (hither - yon) / (depthValue + yon / (hither - yon));
}

//--SPECULAR LIGHTING FUNCTIONS--

vec3 spec_PHONG(float exp, vec3 color, vec3 V, vec3 R)
{
	vec3 specular = clamp(pow(dot(V, R), 140.0), 0.0, 1.0) * color;
	return specular;
}

vec3 spec_CT(float roughness, vec3 color, vec3 L, vec3 V, vec3 N)
{
	float r = roughness;
	vec3 one = vec3(1.0);
	vec3 H = normalize(0.5 * (L + V));
	vec3 sp = min(color.rgb, vec3(0.95));
	vec3 sqrtk = sqrt(sp);
	vec3 n = (-one - sqrtk) / (sqrtk - one);
	vec3 cos_a = vec3(dot(N, V));
	vec3 cos_b = vec3(dot(N, L));
	vec3 cos_c = vec3(dot(V, H));
	vec3 cos_d = vec3(dot(N, H));
	vec3 q = sqrt(cos_c * cos_c - one + n * n);
	vec3 f1 = q - cos_c;
	vec3 f2 = q + cos_c;
	vec3 f3 = (f2 * cos_c) - one;
	vec3 f4 = (f1 * cos_c) + one;
	vec3 Q1 = f1 / f2;
	Q1 *= Q1;
	vec3 Q2 = f3 / f4;
	Q2 *= Q2;
	vec3 F = vec3(0.5) * Q1 * (one + Q2);
	float cos2d = cos_d[0] * cos_d[0];
	float t = r * (1.0 - 1.0 / cos2d);
	float M = r * exp(t) / (4.0 * cos2d * cos2d);
	float A = clamp(2.0 * cos_d[0] * min(cos_a[0], cos_b[0]) / cos_c[0], 0.0, 1.0);
	vec3 specular = vec3(M) * F * vec3(A) / (cos_a * cos_b * vec3(3.14159265358979323));
	specular *= sign(dot(N, L));
	return specular;
}

//--DIFFUSE LIGHTING FUNCTIONS--

vec3 diff_WRAP(float factor, vec3 color, vec3 N, vec3 L)
{
	vec3 diffuse = color * clamp((dot(N, L) + factor) / (1.0 + factor), 0.0, 1.0);
	return diffuse;
}

vec3 diff_HEMIWRAP(float factor, vec3 c1, vec3 c2, vec3 N, vec3 L)
{
	vec3 diffuse = clamp((dot(N, L) + factor) / (1.0 + factor) * dot(N, L) * mix(c2, c1, (dot(N, L) + 1.0) / 2.0), 0.0, 1.0);
	return diffuse;
}

vec3 diff_TRI(vec3 c1, vec3 c2, vec3 c3, vec3 N, vec3 L)
{
	vec3 diffuse = c2 * clamp(dot(N, L), 0.0, 1.0) 
			+ c1 * (1.0 - abs(dot(N, L))) 
			+ c3 * clamp(dot(-N, L), 0.0, 1.0);
	return diffuse;
}

//--OTHER LIGHTING FUNCTIONS--
vec3 other_RIM(float exp, vec3 color, vec3 N, vec3 V)
{
	return clamp(color * pow(1.0 - dot(N, V), exp), 0.0, 1.0);
}

//--MAIN FUNCTION--

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
	vec4 cameraSpace = vec4(viewportSpace, texture2D(depth_texture, texCoord).r * 2.0 - 1.0, 1.0) * depth * invProjMatrix;
	vec4 worldSpace = cameraSpace * invViewMatrix;
	
	gl_FragColor = vec4(emissive + ambient * color, 1.0);
	
	vec3 toLight = light.pos.xyz - light.pos.w * worldSpace.xyz;
	float d2 = dot(toLight, toLight);
	toLight = normalize(toLight);
	if(dot(toLight, light.dir) < light.col.a)
		return;	
	float diff = clamp(dot(toLight, normal), 0.0, 1.0);
	float f = light.brightness/(light.atten.x + light.atten.y*sqrt(d2) + light.atten.z*d2);
	f = clamp(f, 0.0, 1.0);
	diff *= f;
	gl_FragColor.rgb += diff * light.col.rgb * color;
	
	if(diff > 0.0){
		if(lightMode == COOKTORRENCE){
			vec4 specmtl = texture2D(specularTex, texCoord);
			specmtl.a *= 255.0; //roughness
		
			vec3 V = normalize(cameraPos.xyz - worldSpace.xyz);
			vec3 spec = spec_CT(specmtl.a, light.col.rgb, toLight, V, normal);
			spec *= 0.02;
			gl_FragColor.rgb += spec * specmtl.rgb;
		} else if(lightMode == PHONG){
			vec4 specmtl = texture2D(specularTex, texCoord);
			vec3 V = normalize(cameraPos.xyz - worldSpace.xyz);
			vec3 R = normalize(reflect(-toLight, normal));
			float spec = clamp(dot(V, R), 0.0, 1.0);
			spec = pow(spec, specmtl.a * 255.0);
			spec *= f / 2.0;
			gl_FragColor.rgb += spec * specmtl.rgb * light.col.rgb;
		}
	}
}

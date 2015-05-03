precision highp float;
#define MAX_LIGHTS 3
#define PHONG 1.0
#define BILLBOARD 2.0
#define LAMBERT 0.0

struct Light{
	vec4 pos; //w = 0 directional, 1 positional
	vec4 col; //w <= -1 omnidirectional, else cos for spot
	vec3 dir; //only useful if spotlight
	vec3 atten; //constant, linear, exponentials
	float brightness;
};

uniform Light light[MAX_LIGHTS];
uniform sampler2D tex;
uniform sampler2D normalMap;
uniform sampler2D specMap;
uniform sampler2D emitMap;
uniform mat4 worldMatrix;
uniform vec4 cameraPos;
uniform vec4 clipPlane;
uniform vec3 ambient;
uniform float alpha;
uniform float lightMode;
uniform vec3 c2;
uniform vec3 fogColor;
uniform float fogDensity;
uniform float fogDark;

varying vec4 worldPos;
varying vec3 oNormal;
varying vec3 oTangent;
varying vec2 texpos;

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
	return max(specular, 0.0);
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
	vec4 color = texture2D(tex, texpos);
	//IF image is transparent OR
	//there is a clipping plane AND 
	//	the fragment is under the clipping plane OR the camera is under the clipping plane
	//THEN don't draw the fragment (reflection)
	if( color.a < 0.05 || (clipPlane.w != 0.0 && (sign(worldPos.y - clipPlane.y) == -1.0 || sign(cameraPos.y - clipPlane.y) == -1.0)))
        discard;
	vec4 bump = texture2D(normalMap, texpos);
	vec3 emissive = texture2D(emitMap, texpos).rgb;
	vec3 N = oNormal;
	
	if(bump.a != 0.0)
	{
		bump = bump * 2.0 - 1.0;
		vec3 bitangent = cross(oTangent, oNormal);
		mat3 tanToObj = mat3(oTangent.x, bitangent.x, oNormal.x,
							 oTangent.y, bitangent.y, oNormal.y,
							 oTangent.z, bitangent.z, oNormal.z);
		N = normalize((vec4(bump.xyz * tanToObj, 0.0) * worldMatrix).xyz);
	}
	/*
	gl_FragColor = vec4(emissive + ambient * color.rgb, alpha);
	
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
	
		if(lightMode == PHONG && diff > 0.0){
			vec4 specmtl = texture2D(specMap, texpos);
			vec3 V = normalize(cameraPos.xyz - worldPos.xyz);
			vec3 R = normalize(reflect(-toLight, normal));
			float spec = clamp(dot(V, R), 0.0, 1.0);
			spec = pow(spec, specmtl.a * 255.0);
			spec *= f / 2.0;
			gl_FragColor.rgb += spec * specmtl.rgb * light[i].col.rgb;
		}
	}*/
	
	//////
	
	vec3 V = normalize(cameraPos.xyz - worldPos.xyz);
	vec4 specmtl = texture2D(specMap, texpos);
	float specval = specmtl.a * 4.0;
	
	float litpct = 1.0;
	
	vec3 cumlight = emissive + ambient * color.rgb;
	
	for (int i = 0; i < MAX_LIGHTS; i++)
	{
		vec3 L = normalize(light[i].pos.xyz - light[i].pos.w * worldPos.xyz);
		vec3 S = normalize(light[i].dir.xyz);
		
		float d = distance(worldPos.xyz, light[i].pos.xyz);
		float f = clamp(light[i].brightness / ((light[i].atten.z * d * d) + (light[i].atten.y * d) + light[i].atten.x), 0.0, 1.0);
		
		vec3 spec = vec3(0.0);//0.6 * clamp(0.04 * specmtl.rgb * pow(litpct, 3.0) * spec_CT(100.0 * specval, light[i].col.rgb, L, V, N), 0.0, 1.0);
		vec3 diff = 0.95 * litpct * diff_HEMIWRAP(0.3, light[i].col.rgb, c2, N, L);
		
		vec3 lit = (diff * color.rgb * f) + (spec * f);
		if (dot(L, S) < light[i].col.w)
			lit *= light[i].col.w;
		
		cumlight = 1.0 - ((1.0 - cumlight) * (1.0 - lit));
	}
	
	vec3 rim = 0.24 * litpct * other_RIM(8.5, vec3(1.0), N, V);
	vec3 tc = clamp(cumlight + rim, 0.0, 1.0);
	
	float dist = distance(worldPos.xyz, cameraPos.xyz);
    float fog = exp(-fogDensity * dist);
	float dark = (1.0 - (tc.r + tc.g + tc.b) / 3.0) * fogDark;
    tc = mix(fogColor, mix(tc, fogColor, dark), fog);
	
	gl_FragColor.rgb = tc;
	gl_FragColor.a = alpha;
}

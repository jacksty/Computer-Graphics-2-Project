precision highp float;
#define MAX_LIGHTS 1

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
uniform sampler2D emitTex;
uniform mat4 worldMatrix;
uniform vec4 cameraPos;
uniform vec3 ambient;
uniform float alpha;
varying vec4 worldPos;
varying vec3 oNormal;
varying vec3 oTangent;
varying vec2 texpos;

void main()
{
	vec4 color = texture2D(tex, texpos);
	if( color.a < 0.05 )
        discard;
	vec4 bump = texture2D(normalMap, texpos);
	vec4 specmtl = texture2D(specMap, texpos);
	vec4 emissive = texture2D(emitTex, texpos);
	vec3 normal = oNormal;
	
	if(bump.a != 0.0){
		bump = bump * 2.0 - 1.0;
		vec3 binormal = normalize(cross(oTangent, oNormal));
		mat3 tanToObj = mat3(oTangent.x, binormal.x, oNormal.x,
							 oTangent.y, binormal.y, oNormal.y,
							 oTangent.z, binormal.z, oNormal.z);
		normal = bump.xyz * tanToObj;
	}
	normal = normalize((vec4(normal, 0.0) * worldMatrix).xyz);
	
	gl_FragColor.rbg = color.rbg * ambient;
	gl_FragColor.a = color.a;
	
	for(int i = 0; i < MAX_LIGHTS; ++i){
		vec3 toLight = light[i].pos.xyz - light[i].pos.w * worldPos.xyz;
		float d2 = dot(toLight, toLight);
		toLight = normalize(toLight);
		if(dot(toLight, light[i].dir) < light[i].col.a)
			continue;
			
		float diff = clamp(dot(toLight, normal), 0.0, 1.0);
		float spec = 0.0;
		if(diff > 0.0){
			vec3 V = normalize(cameraPos.xyz - worldPos.xyz);
			vec3 R = normalize(reflect(-toLight, normal));
			spec = clamp(dot(V, R), 0.0, 1.0);
			spec = pow(spec, 32.0);
			float f = light[i].brightness/(light[i].atten.x + light[i].atten.y*sqrt(d2) + light[i].atten.z*d2);
			f = clamp(f, 0.0, 1.0);
			spec *= f / 2.0;
			diff *= f;
		}
		gl_FragColor.rbg += diff * light[i].col.rbg * color.rbg + spec * light[i].col.rbg;
	}
	gl_FragColor.rgb += emissive.rgb * emissive.a;
	gl_FragColor.a *= alpha;
}

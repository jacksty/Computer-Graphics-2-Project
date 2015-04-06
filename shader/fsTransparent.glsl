precision highp float;
#define MAX_LIGHTS 20
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
uniform vec3 ambient;
uniform float alpha;
uniform float lightMode;

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
	vec3 emissive = texture2D(emitMap, texpos).rgb;
	vec3 normal = oNormal;
	
	if(bump.a != 0.0){
		bump = bump * 2.0 - 1.0;
		vec3 bitangent = cross(oTangent, oNormal);
		mat3 tanToObj = mat3(oTangent.x, bitangent.x, oNormal.x,
							 oTangent.y, bitangent.y, oNormal.y,
							 oTangent.z, bitangent.z, oNormal.z);
		normal = normalize((worldMatrix * vec4(bump.xyz * tanToObj, 0.0)).xyz);
	}else if(lightMode != BILLBOARD)
		normal = normalize((worldMatrix * vec4(normal, 0.0)).xyz);
	
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
	}
}

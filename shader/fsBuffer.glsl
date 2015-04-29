#extension GL_EXT_draw_buffers:require
precision highp float;
#define PI 3.14159265359
#define BILLBOARD 2.0

uniform sampler2D tex;
uniform sampler2D emitMap;
uniform sampler2D specMap;
uniform sampler2D normalMap;
uniform mat4 worldMatrix;
uniform vec4 cameraPos;
uniform vec4 clipPlane;
uniform float lightMode;

varying vec4 worldPos;
varying vec3 oNormal;
varying vec3 oTangent;
varying vec2 texpos;


vec2 split2ubyte(float a){
	a = a * 0.5 + 0.5;
	a *= 256.0;
	return vec2(floor(a) / 256.0, fract(a));
}

void main()
{
	vec4 color = texture2D(tex, texpos);
	//if image is transparent OR
	//there is a clipping plane AND 
	//the fragment is under the clipping plane OR the camera is under the clipping plane
	//THEN don't draw the fragment (reflection)
	if( color.a < 0.05 || (clipPlane.w != 0.0 && (sign(worldPos.y - clipPlane.y) == -1.0 || sign(cameraPos.y - clipPlane.y) == -1.0)))
        discard;
	vec4 bump = texture2D(normalMap, texpos);
	vec4 specmtl = texture2D(specMap, texpos);
	vec3 emissive = texture2D(emitMap, texpos).rgb;
	vec3 normal = oNormal;
	
	if(bump.a != 0.0){
		bump = bump * 2.0 - 1.0;
		vec3 bitangent = cross(oTangent, oNormal);
		mat3 tanToObj = mat3(oTangent.x, bitangent.x, oNormal.x,
							 oTangent.y, bitangent.y, oNormal.y,
							 oTangent.z, bitangent.z, oNormal.z);
		normal = normalize((vec4(bump.xyz * tanToObj, 0.0) * worldMatrix).xyz);
	}else if(lightMode != BILLBOARD)
		normal = normalize((vec4(normal, 0.0) * worldMatrix).xyz);
	
	gl_FragData[0] = vec4(split2ubyte(atan(normal.x, normal.z) / PI), split2ubyte(normal.y)); //spherical coordinates, split into 2 ubyte channels each
	gl_FragData[1] = vec4(color.rgb, lightMode);
	gl_FragData[2] = vec4(emissive, 1.0);
	gl_FragData[3] = specmtl;
}
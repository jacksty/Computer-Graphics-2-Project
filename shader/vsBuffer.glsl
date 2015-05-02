#define MAX_BONE_CHAIN_LENGTH 16

attribute vec3 a_position;
attribute vec2 a_texcoord;
attribute vec3 a_normal;
attribute vec4 a_weight;
attribute vec4 a_boneidx;
attribute vec3 a_tang;

uniform sampler2D tex;
uniform mat4 viewProjMat;
uniform mat4 worldMatrix;
uniform mat4 reflectionMatrix;
uniform vec4 cameraPos;
uniform bool hasbones;
uniform sampler2D bonetex;     
uniform vec4 bonetex_size;
uniform sampler2D quattex;
uniform vec4 quattex_size;
uniform float currframe;

varying vec4 worldPos;
varying vec4 camWorldPos;
varying vec3 oNormal;
varying vec3 oTangent;
varying vec2 texpos;

vec4 getBone(float idx)
{
    return texture2D( 
        bonetex,
        vec2((idx + 0.5) * bonetex_size[2], 0.0)
    );
}

vec4 getQuaternion(float boneidx, float frame)
{
    vec2 t = vec2( 
        (boneidx + 0.5) * quattex_size[2],
        (frame + 0.5) * quattex_size[3] 
    );
    return texture2D(quattex, t);
}

vec4 qmul(in vec4 q, in vec4 r)
{
    vec3 v1 = q.xyz;
    vec3 v2 = r.xyz;
    return vec4(
        q.a * v2 + r.a * v1 + cross(v1, v2),
        q.a * r.a - dot(v1,v2)
    );
}

vec4 nlerp(vec4 q1, vec4 q2, float t)
{
    vec4 tmp = mix(q1, q2, t);
    return normalize(tmp);
}

vec4 computePos(vec4 p, float boneidx, float frame)
{
    float ff = floor(frame);
    float fc = ceil(frame);
    float pct = fract(frame);
    
    for (int i = 0; i < MAX_BONE_CHAIN_LENGTH; ++i)
	{
        if (boneidx < 0.0)
            break;
        vec4 bonedata = getBone(boneidx);
        vec4 q1 = getQuaternion(boneidx, ff);
        vec4 q2 = getQuaternion(boneidx, fc);
        vec4 q = nlerp(q1, q2, pct);
        vec4 q_ = vec4(-q.xyz, q.w);
        p.xyz -= bonedata.xyz * p.w;
        vec4 p_ = vec4(p.xyz, 0.0);
        p.xyz = (qmul(qmul(q, p_), q_)).xyz;
        p.xyz += bonedata.xyz * p.w;
        boneidx = bonedata[3];
    }
    return p;
}

vec4 averagePosition(vec4 p, float frame)
{
    vec4 p0 = computePos(p,a_boneidx[0], frame);
    vec4 p1 = computePos(p,a_boneidx[1], frame);
    vec4 p2 = computePos(p,a_boneidx[2], frame);
    vec4 p3 = computePos(p,a_boneidx[3], frame);
    return a_weight[0]*p0 + a_weight[1]*p1 + a_weight[2]*p2 + a_weight[3]*p3;
}

vec4 interpolatePosition(vec4 p, float frame)
{
    return averagePosition(p,frame);
}

void main()
{
	oTangent = normalize(a_tang - dot(a_tang, a_normal) * a_normal);
	texpos = a_texcoord;
	
	vec4 p = vec4(a_position, 1.0);
	vec4 n = normalize(vec4(a_normal, 1.0));
	if (hasbones)
	{
		p = interpolatePosition(p,currframe);
		n = interpolatePosition(n,currframe);
	}
	oNormal = n.xyz;
	p = p * worldMatrix;
	worldPos = p;
	camWorldPos = cameraPos * worldMatrix;
    p = p * reflectionMatrix;
	gl_Position = p * viewProjMat;
}

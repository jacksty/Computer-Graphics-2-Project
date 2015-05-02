#!/usr/bin/env python3

import sys
import array
import os
import math 

def sub(a, b, length = 3):
	c = []
	for i in range(0, length):
		c.append(a[i]-b[i])
	return c

def main():
    
    #get input and output file names
    instem = sys.argv[1]
    infile = instem+".obj"
    inrig = instem+".rig"
    outfile = infile+".mesh"
    
    #read obj file as a list of strings
    objdata = open(infile).readlines()
    
    #vertex data will be a list of [x,y,z] tuples
    vertexdata = [] 
    
    #list of [s,t] tuples
    texturedata = [] 
    
    #list of [x,y,z] tuples
    normaldata = []
    
    #list of triangles. Each triangle consists of three 
    #(vertex index, texture index) tuples
    triangles = [] 
    
    #materials. Key = material name; value = dictionary
    mdict = {} 
    
    #current material
    currmtl=None
    
    #information about each object (centroids, etc)
    objects={}
    
    for L in objdata:
        #get next line from input
        L=L.strip().split(" ")
        
        if L[0] == "o" :
            currobj = L[1]
            objects[currobj]={}
            objects[currobj]["centroid"]=[0,0,0]
            objects[currobj]["numv"]=0
        elif L[0] == "v" :
            #a vertex (xyz) specification
            #format: x,y,z w,w,w,w i,i,i,i
            #where the w's are bone weights and the
            #i's are bone indices.
            #If these are absent, dummy values are used.
            tmp = [float(qq) for qq in L[1:]]
            if len(tmp) == 3:
                tmp += [1.0,0.0,0.0,0.0, 1.0,0.0,0.0,0.0]
            elif len(tmp) == 11:
                pass
            else:
                print("Bad vertex:",L)
            vertexdata.append(tmp) 
            for iii in range(3):
                objects[currobj]["centroid"][iii] += vertexdata[-1][iii]
            objects[currobj]["numv"] += 1
        elif L[0] == "vt" :
            #texture coordinate
            texturedata.append([  float(L[1]),
                                float(L[2])]) 
        elif L[0] == "vn":
            #normal
            normaldata.append( [float(L[1]),float(L[2]),float(L[3])] )
        elif L[0] == "f" :
            #face (triangle)
            
            if len(L) != 4:
                print("Warning: Non-triangles present:",len(L)-1,"vertices") 
                continue 
            
            #t=the current triangle
            t=[] 
            for i in range(1,4):
                #four formats possible: vi  vi//ni  vi/ti  vi/ti/ni
                tmp = L[i].split("/") 
                
                #obj uses one-based indexing, so we must subtract one here
                vi=int(tmp[0])-1 
                
                #if no texture coordinate, make up one
                if len(tmp) < 2 or len(tmp[1]) == 0:
                    ti=0
                else:
                    ti = int(tmp[1])-1 
                    
                if len(tmp) < 3 or len(tmp[2]) == 0:
                    ni=0
                else:
                    ni = int(tmp[2])-1
                    
                t.append( (vi,ti,ni) )
                
            triangles.append(t) 
            
        elif L[0] == "mtllib" :
            #material library; must parse it
            ML = open(L[1]).readlines()
            
            #look at each material and store information about it
            for m in ML:
                tmp=m.strip().split(" ")
                if tmp[0] == "newmtl" :
                    mname = tmp[1] 
                    mdict[mname]={}
                elif tmp[0] == "map_Kd" :
                    mdict[mname]["map_Kd"] = tmp[1] 
                elif tmp[0] == "map_Bump" or tmp[0] == "bump" :
                    mdict[mname]["map_Kd"] = tmp[1] 
                elif tmp[0] == "map_Ks" :
                    mdict[mname]["map_Ks"] = tmp[1] 
                
        elif L[0] == "usemtl" :
            #change currently active material
            currmtl = L[1] 
    
    
    #if object lacks texture coordinates, make sure we don't
    #get an out-of-bounds error from accessing texture data
    if len(texturedata) == 0 :
        texturedata += [0,0]
 
    #first, determine how many unique vertices we'll have
    vmap={}     #key=vi,ti,ni  Value=index in vdata
    vdata=[]    #x,y,z,s,t for each vertex, one after another
    idata=[]    #triangle indices: Refers to entries in vdata
    vsize=0
    
    for T in triangles:
        #T will be a list of three vi,ti tuples
        
        for vi,ti,ni in T:
            key = (vi,ti,ni)
            if key not in vmap:
                #first time we've seen this vertex, so add it
                #to our vertex list and our dictionary
                vdata += [
                    vertexdata[vi][0],
                    vertexdata[vi][1],
                    vertexdata[vi][2],
                    texturedata[ti][0],
                    texturedata[ti][1],
                    normaldata[ni][0],
                    normaldata[ni][1],
                    normaldata[ni][2],
                    vertexdata[vi][3], #w1
                    vertexdata[vi][4], #w2
                    vertexdata[vi][5], #w3
                    vertexdata[vi][6], #w4
                    vertexdata[vi][7], #i1
                    vertexdata[vi][8], #i2
                    vertexdata[vi][9], #i3
                    vertexdata[vi][10], #i4
					0, 0, 0 #tangent placeholder
                ]
                #used for reporting number of vertices.
                #Easier than having to remember to change
                #it every time we modify the vertex format...
                if vsize == 0:
                    vsize = len(vdata)
                    print("Vertex size:",vsize,"floats")

                vmap[key]=(len(vdata)-1)//vsize
            
            idata.append( vmap[key] ) 
    
	#compute tangents
    print("Computing tangents...")
    triIdx = 0
    while triIdx < len(idata):
        temp = []
        for i in range(0, 3):
            temp.append(triIdx)
            triIdx += 1
        
        #q,r,s = triangle vertices
        qrsIdx = [idata[temp[0]] * vsize, idata[temp[1]] * vsize, idata[temp[2]] * vsize]
        q = vdata[qrsIdx[0]:qrsIdx[0]+5]
        r = vdata[qrsIdx[1]:qrsIdx[1]+5]
        s = vdata[qrsIdx[2]:qrsIdx[2]+5]
        qTex = [0, q.pop()]
        rTex = [0, r.pop()]
        sTex = [0, s.pop()]
        
        qTex[0] = q.pop()
        rTex[0] = r.pop()
        sTex[0] = s.pop()
        
        r = sub(r, q) #R'xyz
        s = sub(s, q) #S'xyz
        rTex = sub(rTex, qTex, 2) #R'st
        sTex = sub(sTex, qTex, 2) #S'st
        
        #
        # [Tx Ty Tz]     [R's R't]^-1    [R'x R'y R'z]
        # [Bx By Bz]  =  [S's S't]    *  [S'x S'y S'z]
        # 
        # A = 1/(R's*S't-R't*S's) [S't -R't]
        # 
        # [Tx Ty Tz]  =  A  *  [R'x R'y R'z]
        #                      [S'x S'y S'z]
        #
        
        t = (rTex[0] * sTex[1] - rTex[1] * sTex[0])
        if (t == 0):
            tmp = 0
            print("A tangent was not computed")
        else:
            tmp = 1 / (rTex[0] * sTex[1] - rTex[1] * sTex[0])
        A = [tmp * sTex[1], tmp * -rTex[1]]
        T = [
                 A[0] * r[0] + A[1] * s[0],
                 A[0] * r[1] + A[1] * s[1],
                 A[0] * r[2] + A[1] * s[2]
                 ]
        
        for i in range (0, 3):
            vdata[qrsIdx[0] + (vsize - 3) + i] += T[i]
            vdata[qrsIdx[1] + (vsize - 3) + i] += T[i]
            vdata[qrsIdx[2] + (vsize - 3) + i] += T[i]
        
        ++triIdx
	
    i = 0
    while (i < len(vdata)):
        xyz = vdata[i + (vsize - 3) : i + vsize]
        length = math.sqrt(xyz[0]*xyz[0] + xyz[1]*xyz[1] + xyz[2]*xyz[2])
        for j in range(0, 3):
            if (length > 0):
                vdata[i + (vsize - 3) + j] = xyz[j] / length
            else:
                vdata[i + (vsize - 3) + j] = 0
        i += 19
    
    #information for the user
    print(len(vdata)//vsize,"vertices") 
    print(len(idata)//3,"triangles") 

    #output geometry data
    print("Writing to mesh file")
    ofp = open(outfile,"wb")
    ofp.write(b"mesh_5\n") 
    
    def pad():
        while (ofp.tell()+1) % 4 != 0 :
            ofp.write(b" ")
        ofp.write(b"\n")
        return
        
    #this is the count of the number of floats per vertex * num vertices 
    ofp.write( ( "vertices "+str(len(vdata))+" bytes\n").encode() ) 
    
    #the count of the number of triangle indices
    ofp.write( ( "indices "+str(len(idata))+" bytes\n" ).encode() ) 
    
    #if we know a texture, write it
    if currmtl in mdict and "map_Kd" in mdict[currmtl]:
        ofp.write( ("texture_file "+mdict[currmtl]["map_Kd"]+"\n").encode()  ) 
    if currmtl in mdict and "map_Bump" in mdict[currmtl]:
        ofp.write( ("normal_map "+mdict[currmtl]["map_Bump"]+"\n").encode()  ) 
    if currmtl in mdict and "map_Ks" in mdict[currmtl]:
        ofp.write( ("specular_map "+mdict[currmtl]["map_Ks"]+"\n").encode()  ) 
    
    for obname in objects:
        c=objects[obname]["centroid"]
        nv=objects[obname]["numv"]
        if nv > 0:
            c[0] /= nv
            c[1] /= nv
            c[2] /= nv
        ofp.write(b"centroid "+obname.encode()+b" "+
            (str(c[0])+" "+str(c[1])+" "+str(c[2])).encode()+b"\n")

    #write the vertex data
    ofp.write(b"vertex_data") 
    
    #must pad to 4 byte boundary
    pad()
        
    #convert vertex data to floats and write it
    b = array.array("f",vdata)
    ofp.write(b) 
       
    #write index data
    ofp.write(b"index_data")

    pad() 

    #convert to shorts and write it
    b = array.array("H",idata)
    ofp.write(b) 
    
    
    #now process rig data
    if os.access(inrig,os.F_OK ):
        lst = open(inrig).readlines()
        if lst[0].strip() != "RIG0000":
            print("Bad rig file: starts with",lst[0])
            assert 0
        i=1
        while i < len(lst):
            line = lst[i]
            i+=1
            L = line.strip().split(" ")
            if len(L) == 0:
                pass 
            elif L[0] in ("numbones","numframes","maxdepth","bonenames"):
                ofp.write( (" ".join(L)).encode() )
                ofp.write(b"\n")
            elif L[0] in ("heads","tails","quaternions","translations"):
                numbytes = int(L[1],10)
                mybuffer = []
                ofp.write( (L[0]+" "+str(numbytes)).encode() )
                pad()
                #pull out one quaternion at a time: 16 bytes each
                for j in range(0,numbytes,16):
                    tmp = lst[i].strip()
                    i+=1
                    tmp = tmp.split(" ")
                    for k in range(4):
                        f = float(tmp[k])
                        mybuffer.append(f)
                
                #convert to floats and write
                b = array.array("f",mybuffer)
                ofp.write(b)
            elif L[0] == "matrices":
                numbytes = int(L[1],10)
                mybuffer=[]
                ofp.write( (L[0]+" "+str(numbytes)).encode())
                pad()
                #16 floats per matrix, 4 bytes per float = 48 bytes per matrix
                for j in range(0,numbytes,16*4):
                    tmp = lst[i]
                    i+=1
                    tmp = tmp.split()
                    for k in range(16):
                        f = float(tmp[k])
                        mybuffer.append(f)
                b=array.array("f",mybuffer)
                ofp.write(b)
            else:
                print("Unexpected:",L)
                assert 0

    #indicate we're done
    ofp.write(b"\nend\n") 
    ofp.close()


main()

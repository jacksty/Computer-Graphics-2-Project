#!/usr/bin/env python

import sys
import re
import os
import cProfile

import parsefbx 
import parsebvh

def main():
    stem = sys.argv[1]
    
    infbx = stem+".fbx"
    inbvh = stem+".bvh"
    outobj = stem+".obj"
    outrig = stem+".rig"
    
    if not os.access(infbx,os.F_OK):
        print("No fbx file",infbx,"; stopping")
        return
    
    if not os.access(inbvh,os.F_OK):
        print("No bvh file; not outputting rig file")
        B=[]
    else:
        B = parsebvh.bvh2rig(inbvh,outrig)
        print("Wrote rig to",outrig)
    
    #always output obj file
    parsefbx.fbx2obj(infbx,outobj,B)
    print("Wrote obj to",outobj)
    

if sys.argv[1] == "-p":
    print("Profiling active")
    del sys.argv[1]
    cProfile.run("main()")
else:
    main()

"""Run in Blender. Build a separate character from the supplied multi-view references."""
import bpy
import math
import os
from mathutils import Vector

OUT = '/Users/geun-wiho/github/diary/diary-character/reference-rebuild'
scene = bpy.data.scenes.new('Female | multiview reference rebuild')
bpy.context.window.scene = scene
collection = bpy.data.collections.new('Reference female | new model')
scene.collection.children.link(collection)

def material(name, color, roughness=.65):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Roughness'].default_value = roughness
    mat.diffuse_color = (*color, 1)
    return mat

skin = material('REF | warm peach skin', (.72, .43, .29))
hair = material('REF | soft caramel hair', (.43, .225, .115))
hair_dark = material('REF | caramel underside', (.31, .135, .065))
shirt = material('REF | cream cotton', (.88, .76, .48))
shorts = material('REF | dusty blue shorts', (.24, .30, .46))
cuff = material('REF | shorts cuff', (.29, .36, .51))
sock = material('REF | ivory socks', (.91, .87, .75))
shoe = material('REF | chestnut shoes', (.25, .105, .055))
sole = material('REF | dark brown soles', (.12, .045, .021))
eye = material('REF | cocoa eyes', (.10, .034, .012), .28)
iris = material('REF | lower iris warmth', (.21, .075, .025), .4)
white = material('REF | eye catchlights', (1, .94, .78), .25)
blush = material('REF | soft cheek blush', (.76, .31, .23))
brow = material('REF | caramel eyebrows', (.28, .115, .052))
mouth = material('REF | smile', (.36, .13, .075))

def move_to_collection(obj):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)

def mesh(name, verts, faces, mat, subdiv=1):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    data.materials.append(mat)
    for p in data.polygons:
        p.use_smooth = True
    if subdiv:
        modifier = obj.modifiers.new('Smooth silhouette', 'SUBSURF')
        modifier.levels = subdiv
    return obj

def ellipsoid(name, location, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    move_to_collection(obj)
    return obj

def rings(name, sections, mat, sides=64, subdiv=2):
    verts, faces = [], []
    for z, rx, ry, cx, cy in sections:
        for i in range(sides):
            a = 2 * math.pi * i / sides
            verts.append((cx + rx*math.sin(a), cy - ry*math.cos(a), z))
    for j in range(len(sections)-1):
        for i in range(sides):
            a=j*sides+i; b=j*sides+(i+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.append(tuple(reversed(range(sides))))
    faces.append(tuple((len(sections)-1)*sides+i for i in range(sides)))
    return mesh(name, verts, faces, mat, subdiv)

def curve(name, points, radius, mat):
    data=bpy.data.curves.new(name, 'CURVE'); data.dimensions='3D'
    data.resolution_u=20; data.bevel_depth=radius; data.bevel_resolution=4
    spline=data.splines.new('BEZIER'); spline.bezier_points.add(len(points)-1)
    for p, co in zip(spline.bezier_points, points):
        p.co=co; p.handle_left_type='AUTO'; p.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,data); collection.objects.link(obj); data.materials.append(mat)
    return obj

def catmull(points, t):
    u=t*(len(points)-1); k=min(int(u),len(points)-2); f=u-k
    a=Vector(points[max(0,k-1)]); b=Vector(points[k]); c=Vector(points[k+1]); d=Vector(points[min(len(points)-1,k+2)])
    return (2*b+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f)*.5

def tube(name, path, radii, mat, depth=1):
    verts=[];faces=[];rows=32;sides=20
    for j in range(rows+1):
        t=j/rows; pos=catmull(path,t)
        tangent=(catmull(path,min(1,t+.002))-catmull(path,max(0,t-.002))).normalized()
        side=tangent.cross(Vector((0,1,0))).normalized(); normal=side.cross(tangent).normalized()
        u=t*(len(radii)-1);k=min(int(u),len(radii)-2);f=u-k;r=radii[k]*(1-f)+radii[k+1]*f
        for i in range(sides):
            a=i*math.tau/sides; p=pos+r*(side*math.cos(a)+normal*math.sin(a)*depth);verts.append(tuple(p))
    for j in range(rows):
        for i in range(sides):
            a=j*sides+i;b=j*sides+(i+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces.append(tuple(reversed(range(sides))));faces.append(tuple(rows*sides+i for i in range(sides)))
    return mesh(name,verts,faces,mat,1)

# Face silhouette: broad cheeks, soft jaw and modest forehead, independent of the hair.
head=ellipsoid('Face | smooth cheek and jaw volume',(0,0,3.23),(.705,.515,.655),skin)
for v in head.data.vertices:
    z=v.co.z/.655
    if z<-.25:
        v.co.x *= 1+.06*math.sin(min(1,(-z-.25)/.75)*math.pi)
neck=rings('Neck',[(2.37,.145,.135,0,.04),(2.4,.15,.14,0,.04),(2.63,.15,.14,0,.04),(2.66,.14,.13,0,.04)],skin)
for sign, label in [(-1,'L'),(1,'R')]:
    ellipsoid('Ear '+label,(sign*.704,-.015,3.10),(.118,.073,.174),skin)
    inner=material('REF | ear blush '+label,(.64,.30,.20))
    ellipsoid('Ear concha '+label,(sign*.741,-.076,3.10),(.066,.018,.108),inner)
    # Eyes and face marks follow the convex face, rather than float on a flat plane.
    x=sign*.268
    ellipsoid('Eye '+label,(x,-.487,3.17),(.094,.028,.132),eye)
    ellipsoid('Iris lower '+label,(x,-.511,3.125),(.073,.009,.063),iris)
    ellipsoid('Catchlight '+label,(x-.026,-.524,3.223),(.024,.009,.032),white)
    curve('Upper lash '+label,[(x+sign*.062,-.508,3.245),(x+sign*.107,-.497,3.251),(x+sign*.132,-.475,3.276)],.010,eye)
    curve('Eyebrow '+label,[(sign*.17,-.447,3.40),(sign*.255,-.451,3.423),(sign*.345,-.413,3.394)],.023,brow)
    ellipsoid('Cheek tint '+label,(sign*.385,-.444,3.015),(.071,.007,.033),blush)
ellipsoid('Nose | subtle round tip',(0,-.522,3.075),(.040,.026,.038),skin)
curve('Smile',[(-.105,-.488,2.936),(0,-.507,2.919),(.105,-.488,2.936)],.009,mouth)

# Cream shirt with a shaped silhouette and open-looking rolled sleeve edges.
rings('Shirt | fitted cream silhouette',[(1.26,.425,.245,0,.025),(1.28,.44,.257,0,.025),(1.36,.437,.258,0,.025),(1.57,.355,.228,0,.015),(1.80,.358,.258,0,-.015),(2.02,.414,.282,0,-.025),(2.20,.405,.235,0,.015),(2.32,.34,.19,0,.025),(2.37,.20,.146,0,.025),(2.38,.16,.143,0,.025)],shirt)
curve('Collar seam',[(.158*math.sin(i*math.tau/48),.025-.147*math.cos(i*math.tau/48),2.379) for i in range(49)],.009,shirt)
for sign,label in [(-1,'L'),(1,'R')]:
    tube('Sleeve '+label,[(sign*.33,.012,2.23),(sign*.44,.015,2.16),(sign*.535,.015,2.035)],[.19,.207,.205],shirt,.9)
    # Uncovered arm and palm taper continuously into small relaxed fingers.
    tube('Arm '+label,[(sign*.48,.012,2.12),(sign*.55,-.005,1.92),(sign*.61,-.035,1.66),(sign*.72,-.07,1.38),(sign*.75,-.075,1.26)],[.118,.123,.101,.082,.075],skin,.88)
    ellipsoid('Palm '+label,(sign*.754,-.078,1.24),(.103,.069,.137),skin)
    for f in range(4):
        x=sign*(.695+f*.039);z=1.19
        length=[.105,.14,.15,.12][f]
        tube('Finger %s %s'%(label,f),[(x,-.092,z),(x+sign*.012,-.103,z-length*.65),(x+sign*.008,-.109,z-length)],[.024,.022,.007],skin)
    tube('Thumb '+label,[(sign*.676,-.078,1.29),(sign*.645,-.12,1.23),(sign*.647,-.13,1.18)],[.035,.032,.012],skin)
    # Blue shorts: two rounded legs and broad cuffs, with a curved waistband.
    rings('Shorts leg '+label,[(.92,.219,.219,sign*.222,.018),(.96,.231,.224,sign*.222,.018),(1.13,.237,.237,sign*.218,.018),(1.30,.234,.244,sign*.212,.018),(1.34,.216,.235,sign*.211,.018)],shorts)
    rings('Shorts cuff '+label,[(.915,.218,.219,sign*.222,.018),(.93,.239,.236,sign*.222,.018),(1.005,.239,.235,sign*.222,.018),(1.02,.22,.22,sign*.222,.018)],cuff)
    rings('Leg '+label,[(.235,.109,.11,sign*.225,.018),(.31,.118,.118,sign*.225,.018),(.58,.135,.137,sign*.225,.018),(.82,.152,.157,sign*.225,.018),(1.03,.162,.171,sign*.225,.018)],skin)
    rings('Sock '+label,[(.18,.118,.12,sign*.225,.016),(.23,.12,.124,sign*.225,.016),(.48,.127,.128,sign*.225,.016),(.50,.132,.134,sign*.225,.016),(.52,.128,.13,sign*.225,.016)],sock)
    ellipsoid('Shoe sole '+label,(sign*.225,-.095,.075),(.165,.262,.06),sole)
    ellipsoid('Shoe upper '+label,(sign*.225,-.102,.148),(.16,.248,.114),shoe)
    ellipsoid('Shoe instep '+label,(sign*.225,-.004,.203),(.136,.141,.098),shoe)

# A thin, scalp-fitting foundation; all visible locks grow along this surface.
verts=[];faces=[];N=144;R=40
for j in range(R+1):
    t=j/R
    for i in range(N):
        a=i*math.tau/N;q=abs((a+math.pi)%math.tau-math.pi)
        blend=max(0,min(1,(q-1.05)/.65));blend=blend*blend*(3-2*blend)
        bottom=3.61*(1-blend)+2.79*blend
        theta=(math.acos((bottom-3.33)/.70)-.008)*t+.008
        rad=math.sin(theta) if theta<math.pi/2 else 1-.10*(theta-math.pi/2)
        x=.755*rad*math.sin(a);y=.045-.575*rad*math.cos(a);z=3.33+.70*math.cos(theta)
        verts.append((x,y,z))
for j in range(R):
    for i in range(N):
        a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
faces.append(tuple(reversed(range(N))))
cap=mesh('Hair | scalp-fitting foundation',verts,faces,hair,1)
solid=cap.modifiers.new('Fine shell thickness','SOLIDIFY');solid.thickness=.025;solid.offset=-1

def leaf(name,path,widths,mat=hair,relief=.035):
    """Closed scalp-hugging ribbon with shallow convex relief, never a round tube."""
    rows=56;across=20;verts=[];faces=[]
    for layer in range(2):
        previous_side = None
        for j in range(rows+1):
            t=j/rows;p=catmull(path,t)
            tangent=(catmull(path,min(1,t+.002))-catmull(path,max(0,t-.002))).normalized()
            radial=Vector((p.x/.755**2,(p.y-.045)/.575**2,(p.z-3.33)/.70**2)).normalized()
            side=tangent.cross(radial).normalized();normal=side.cross(tangent).normalized()
            if previous_side is not None and side.dot(previous_side)<0:
                side=-side
            previous_side=side.copy()
            normal=side.cross(tangent).normalized()
            if normal.dot(radial)<0: normal=-normal
            u=t*(len(widths)-1);k=min(int(u),len(widths)-2);f=u-k;f=f*f*(3-2*f)
            w=widths[k]*(1-f)+widths[k+1]*f
            w*=max(.001,math.sin(math.pi*t))**.16
            for i in range(across+1):
                s=i/across*2-1
                bulge=relief*(max(0,1-s*s)**.7)*math.sin(math.pi*t)**.4 if layer==0 else -.018
                point=p+side*(s*w)+normal*bulge;verts.append(tuple(point))
    count=(rows+1)*(across+1)
    for layer in range(2):
        for j in range(rows):
            for i in range(across):
                a=layer*count+j*(across+1)+i;b=a+1;c=b+across+1;d=a+across+1
                faces.append((a,b,c,d) if layer==0 else (d,c,b,a))
    for j in range(rows):
        for i in [0,across]:
            a=j*(across+1)+i;b=a+across+1;faces.append((a,b,b+count,a+count))
    for j in [0,rows]:
        for i in range(across):
            a=j*(across+1)+i;faces.append((a,a+count,a+count+1,a+1))
    return mesh(name,verts,faces,mat,2)

leaf('Hair | fringe outer left',[(-.06,-.12,3.99),(-.39,-.41,3.83),(-.57,-.48,3.59),(-.59,-.40,3.40)],[.015,.15,.13,.004])
leaf('Hair | fringe left sweep',[(-.04,-.14,4.00),(-.17,-.47,3.82),(-.28,-.575,3.57),(-.34,-.54,3.38)],[.015,.18,.16,.003])
leaf('Hair | central swept tip',[(.01,-.14,4.015),(.03,-.47,3.84),(.09,-.59,3.57),(.055,-.555,3.32)],[.012,.20,.18,.002])
leaf('Hair | fringe right sweep',[(.035,-.13,4.00),(.32,-.43,3.83),(.43,-.54,3.61),(.565,-.43,3.41)],[.012,.23,.20,.003])
for sign,label in [(-1,'L'),(1,'R')]:
    def mirror(path):return [(sign*x,y,z) for x,y,z in path]
    leaf('Hair | fine sideburn '+label,mirror([(.57,-.37,3.54),(.64,-.34,3.35),(.65,-.27,3.13),(.62,-.20,2.99)]),[.025,.072,.067,.003],hair_dark,.018)
    for index,a in enumerate([1.35,1.72,2.08,2.44,2.80,3.14]):
        if sign == 1 and index == 5:
            continue
        path=[]
        for t in [0,.33,.66,1]:
            theta=.12+t*2.62
            az=a-.12*(1-t)
            rad=math.sin(theta) if theta<math.pi/2 else 1-.08*(theta-math.pi/2)
            x=sign*(.77*rad*math.sin(az)+.015*math.sin(t*math.pi*2))
            y=.055-.59*rad*math.cos(az)
            z=3.33+.70*math.cos(theta)
            path.append((x,y,z))
        leaf('Hair | flowing back panel %s %s'%(label,index),path,[.012,.145,.163,.008],hair,.024)

# A modest bob volume around the ears and a short visible neck.
for obj in list(collection.objects):
    if obj.type=='MESH' and (obj.name.startswith('Hair |')):
        for v in obj.data.vertices:
            v.co.x*=1.08
    if obj.name.startswith(('Hair |','Face |','Ear ','Ear concha ','Eye ','Iris lower ','Catchlight ','Cheek tint ','Nose |')):
        obj.location.z-=.07
    elif obj.name.startswith(('Smile','Upper lash','Eyebrow')):
        obj.location.z-=.07

# Studio scene for comparing front, side and back under consistent lighting.
floor=material('REF | studio backdrop',(.62,.64,.66))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.002));obj=bpy.context.object;obj.name='Studio ground';obj.data.materials.append(floor)
world=bpy.data.worlds.new('Reference studio');world.use_nodes=True
next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs['Color'].default_value=(.65,.68,.72,1)
next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs['Strength'].default_value=.45
scene.world=world
for name,loc,power,size in [('Key',(-3,-4,7),500,5),('Fill',(4,-2,5),300,4),('Rim',(1,3,6),400,3)]:
    data=bpy.data.lights.new('Studio '+name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new('Studio '+name,data);scene.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector((0,0,2))-obj.location).to_track_quat('-Z','Y').to_euler()
camdata=bpy.data.cameras.new('Reference camera');camera=bpy.data.objects.new('Reference camera',camdata);scene.collection.objects.link(camera)
camera.location=(0,-9,3.9);camera.rotation_euler=(Vector((0,0,2.05))-camera.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=4.65;scene.camera=camera
scene.render.resolution_x=900;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.engine='CYCLES';scene.cycles.samples=32
scene.view_settings.view_transform='AgX'
scene.render.filepath=OUT+'/front-preview.png'
# Store all supplied references inside the blend, hidden from the finished scene.
references=bpy.data.collections.new('Supplied references | hidden');scene.collection.children.link(references)
reference_files=[
'hf_20261015_111732_d1b8ee93-3f9d-4177-a229-79a8254d6b71.png',
'hf_20261015_111732_888a387c-25aa-4b5b-af3b-8ba976ebd09e.png',
'hf_20261015_111731_fb4a8898-c9d8-4ab8-af7e-1b955970903b.png',
'hf_20261015_111731_65f1ac54-361e-4b01-b8cb-ff14b018afee.png',
'hf_20261015_111731_ecf643fa-7c4e-4f71-a29f-14bdeaff8ba9.png',
'hf_20261015_111730_fe4af810-343c-4802-8abe-84037791d285.png',
'hf_20261015_111730_3539c612-d223-4bb9-8714-ef21a5c3c0e1.png',
'hf_20261015_111730_84251dc9-efad-4a26-980c-a4c8a38b68b1.png',
'hf_20261015_111730_30188b3c-27fe-495f-b983-c317ef55e994.png',
'hf_20261015_104923_f6b30eba-df39-461d-be23-2ae76c687a55.png',
'hf_20261015_103557_b5768f49-97b5-4c41-8fbe-b8c52095ff0b.png']
for filename in reference_files:
    image=bpy.data.images.load('/Users/geun-wiho/Downloads/'+filename,check_existing=True);image.pack()
    obj=bpy.data.objects.new('Reference '+filename,None);obj.empty_display_type='IMAGE';obj.data=image;references.objects.link(obj)
references.hide_viewport=True;references.hide_render=True
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        space=area.spaces.active;space.region_3d.view_distance=6;space.region_3d.view_location=(0,0,2)
        space.region_3d.view_rotation=camera.rotation_euler.to_quaternion();space.clip_end=1000
scene['reference_model_note']='New static model rebuilt from the 11 supplied views. Previous scenes retained. Animation rig not yet transferred.'
print('Created new reference scene:',len(collection.objects),'model parts')

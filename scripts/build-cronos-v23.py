"""Continuous-surface compact sedan with the existing scroll wheel rig.

Run with Blender 4.5: blender -b --python scripts/build-sedan.py
Geometry is procedural and inspired by the supplied sedan references.
"""
import bpy
import bmesh
import math
import sys
from pathlib import Path
from mathutils import Vector

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / 'work' / 'model-v23'
RENDERS = OUT / 'renders'
RENDERS.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 1000
scene.render.resolution_y = 650
scene.render.resolution_percentage = 100
scene.world.color = (.23,.23,.23)
scene.view_settings.view_transform = 'AgX'

def material(name, color, metal=0, rough=.4, coat=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    m.diffuse_color=(*color,1)
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal
    p.inputs['Roughness'].default_value=rough
    p.inputs['Coat Weight'].default_value=coat
    return m

PAINT=material('Pearl white paint',(.79,.785,.76),.10,.23,.9)
GLASS=material('Tinted automotive glass - side',(.018,.024,.026),0,.055,.65)
GLASS.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.94
GLASS.diffuse_color=(.018,.024,.026,.94)
GLASS.surface_render_method='DITHERED'
WINDSCREEN=material('Tinted automotive glass - windscreen',(.038,.050,.054),0,.045,.6)
WINDSCREEN.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.68
WINDSCREEN.diffuse_color=(.038,.050,.054,.68)
WINDSCREEN.surface_render_method='DITHERED'
REAR_GLASS=material('Tinted automotive glass - rear',(.022,.030,.032),0,.055,.65)
REAR_GLASS.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.84
REAR_GLASS.diffuse_color=(.022,.030,.032,.84)
REAR_GLASS.surface_render_method='DITHERED'
INTERIOR=material('Charcoal woven upholstery',(.026,.030,.031),0,.92)
BLACK=material('Satin black trim',(.006,.008,.010),0,.48)
SEAM=material('Panel gaps',(.07,.085,.088),0,.65)
RUBBER=material('Tire rubber',(.016,.018,.019),0,.82)
ALLOY=material('Machined alloy',(.38,.42,.44),.8,.27)
GRAPHITE=material('Graphite alloy wheel',(.045,.055,.06),.65,.32)
CHROME=material('Machined chrome',(.62,.67,.69),.85,.21)
DISC=material('Brake steel',(.085,.09,.095),.65,.58)
RED=material('Ruby tail lamp',(.36,.008,.012),.15,.22,.55)
RED_GUIDE=material('Red molded light guide',(.72,.012,.008),.15,.23,.5)
LENS=material('Headlamp optical housing',(.06,.10,.12),.35,.18,.7)
LED=material('White optical strip',(.78,.88,.90),.3,.22)
PLATE=material('Plate white',(.85,.85,.81),0,.45)

def empty(name, parent=None, at=(0,0,0)):
    ob=bpy.data.objects.new(name,None); scene.collection.objects.link(ob)
    ob.parent=parent; ob.location=at
    return ob

root=empty('FiatCronos_ROOT')
root['orientation']='Blender nose +X, left +Y, up +Z'
root['wheelbase_m']=2.521
root['model_revision']='v23 reference refinement: tapered greenhouse, flush optics, sculpted bumper and graphite split-spoke alloys'
parts={name:empty(name,root) for name in ('Body','Glass','Trim','Lights','Badges')}

def mesh(name,vertices,faces,mat,parent,smooth=True):
    data=bpy.data.meshes.new(name); data.from_pydata(vertices,[],faces); data.update()
    ob=bpy.data.objects.new(name,data); scene.collection.objects.link(ob)
    ob.parent=parent; data.materials.append(mat)
    for p in data.polygons: p.use_smooth=smooth
    return ob

def grid(name, rows, mat, parent, flip=False):
    count=len(rows[0]); faces=[]
    for i in range(len(rows)-1):
        for j in range(count-1):
            a=i*count+j
            face=(a,a+count,a+count+1,a+1)
            faces.append(tuple(reversed(face)) if flip else face)
    return mesh(name,[p for row in rows for p in row],faces,mat,parent)

def line(name,pts,mat,parent,radius=.002):
    data=bpy.data.curves.new(name,'CURVE'); data.dimensions='3D'
    data.bevel_depth=radius; data.bevel_resolution=2; data.resolution_u=2
    curve=data.splines.new('POLY'); curve.points.add(len(pts)-1)
    for p,co in zip(curve.points,pts): p.co=(*co,1)
    ob=bpy.data.objects.new(name,data); scene.collection.objects.link(ob)
    ob.parent=parent; data.materials.append(mat)
    return ob

def ball(name,loc,scale,mat,parent):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=loc)
    ob=bpy.context.object; ob.name=name; ob.parent=parent; ob.scale=scale
    ob.data.materials.append(mat)
    for f in ob.data.polygons:f.use_smooth=True
    return ob

def box(name,loc,size,mat,parent,bevel=.01):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    ob=bpy.context.object; ob.name=name; ob.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.parent=parent; ob.data.materials.append(mat)
    if bevel:
        mod=ob.modifiers.new('Manufactured edge radius','BEVEL')
        mod.width=bevel; mod.segments=3
        ob.modifiers.new('Face weighted normals','WEIGHTED_NORMAL')
    return ob

def interp(x,knots):
    if x<=knots[0][0]:return knots[0][1]
    if x>=knots[-1][0]:return knots[-1][1]
    for i,((x0,y0),(x1,y1)) in enumerate(zip(knots,knots[1:])):
        if x>x1:continue
        a=knots[max(i-1,0)]; b=knots[min(i+2,len(knots)-1)]
        m0=(y1-a[1])/(x1-a[0]); m1=(b[1]-y0)/(b[0]-x0)
        t=(x-x0)/(x1-x0); d=x1-x0
        return (2*t**3-3*t*t+1)*y0+(t**3-2*t*t+t)*d*m0+(-2*t**3+3*t*t)*y1+(t**3-t*t)*d*m1

def smooth(t):
    t=max(0,min(1,t)); return t*t*(3-2*t)

L=-2.182; F=2.182; AXLES=(-1.162,1.359); R=.345
TOP=[(L,1.005),(-1.95,1.035),(-1.48,1.06),(-.6,1.04),(.65,1.015),
     (1.04,1.005),(1.50,.965),(1.88,.905),(F,.86)]
WIDTH=[(L,.76),(-1.95,.81),(-1.55,.86),(-1.16,.865),(-.45,.855),
       (.55,.855),(1.36,.865),(1.76,.83),(F,.76)]

def top(x):return interp(x,TOP)
def width(x):return interp(x,WIDTH)

def warp_x(x,y):
    # Set back only the corners, preserving a broad front and rear fascia.
    return x-.24*smooth((x-1.65)/(F-1.65))*(y/width(x))**2 + .21*smooth((-1.65-x)/(-1.65-L))*(y/width(x))**2

def bumper_round(x,z):
    # Roll the bumper underneath the car instead of ending in a vertical box.
    lower=.16*(1-smooth((z-.20)/.35))
    upper=.035*smooth((z-.72)/.17)
    return -smooth((x-1.72)/(F-1.72))*(lower+upper)+smooth((-1.72-x)/(-1.72-L))*lower

def side_width(x,z):
    q=max(0,min(1,(z-.265)/(top(x)-.265)))
    profile=[(0,.88),(.13,.955),(.39,.977),(.60,.989),(.78,1.0),(.90,.985),(1,.94)]
    y=width(x)*interp(q,profile)
    # Stamped character line below the handles, concave lower doors and
    # pronounced fender shoulders, all in the continuous metal surface.
    doors=smooth((x+1.1)/.3)*(1-smooth((x-.85)/.3))
    belt=.927-.022*x
    y += doors*(.011*math.exp(-((z-belt)/.032)**2)-.023*math.exp(-((z-.48)/.135)**2))
    for axle in AXLES:
        y += .022*math.exp(-((x-axle)/.45)**2)*math.exp(-((z-.77)/.15)**2)
    # The arch cut does not move the shoulder or deform the door skin.
    for axle in AXLES:
        distance=math.hypot(x-axle,z-.31)
        y+=.009*math.exp(-((distance-.366)/.055)**2)
    return y

def side_point(x,z,side,offset=0):
    y=side*(side_width(x,z)+offset)
    return (warp_x(x,y)+bumper_round(x,z),y,z)

def floor(x):
    for axle in AXLES:
        d=abs(x-axle)
        if d<R:return .31+math.sqrt(max(0,R*R-d*d))
    return .265

xs=sorted(set([L+(F-L)*i/240 for i in range(241)]+
              [c+s*(R+e) for c in AXLES for s in (-1,1) for e in (-.0001,0,.0001)]))
for side in (-1,1):
    rows=[]
    for x in xs:
        bottom=floor(x); height=top(x)-bottom
        rows.append([side_point(x,bottom+height*i/40,side) for i in range(41)])
    grid(f'Continuous side panel {side}',rows,PAINT,parts['Body'],side>0)
    for axle in AXLES:
        pts=[side_point(axle-R,.265,side,.003),side_point(axle-R,.31,side,.003)]
        pts += [side_point(axle-R*math.cos(math.pi*i/64),.31+R*math.sin(math.pi*i/64),side,.003) for i in range(65)]
        pts += [side_point(axle+R,.265,side,.003)]
        line(f'Rolled wheel arch lip {side} {axle}',pts,PAINT,parts['Body'],.005)

def deck_point(x,u):
    y=.94*width(x)*u
    z=top(x)+.04*(1-u*u)
    # Twin pressed hood ribs run from the A pillars toward the grille.
    hood=smooth((x-.95)/.14)*(1-smooth((x-1.95)/.23))
    ridge=.51+.11*(2.05-x)
    z+=hood*.010*math.exp(-((abs(u)-ridge)/.09)**2)
    return (warp_x(x,y)+bumper_round(x,z),y,z)
deck_rows=[[deck_point(x,-1+2*j/48) for j in range(49)] for x in xs]
deck_faces=[]
for i in range(len(xs)-1):
    for j in range(48):
        # Open the cabin floor; the dashboard and parcel shelf hide the joins.
        x=(xs[i]+xs[i+1])/2; u=-1+2*(j+.5)/48
        if -1.38<x<.91 and abs(u)<.88:continue
        a=i*49+j; deck_faces.append((a,a+49,a+50,a+1))
mesh('Continuous crowned hood and trunk',[p for row in deck_rows for p in row],deck_faces,PAINT,parts['Body'])
box('Underbody',(0,0,.235),(3.65,1.33,.09),BLACK,parts['Body'],.04)

def cap_edge(x,z):
    if z<=top(x):return side_width(x,z)
    return .94*width(x)*math.sqrt(max(0,1-(z-top(x))/.04))

def cap_point(sign,y,z,offset=0):
    x=F if sign>0 else L
    edge=cap_edge(x,z)
    u=y/max(.00001,edge)
    h=(z-.265)/(top(x)+.04-.265)
    bulge=.032*max(0,1-u*u)*math.sin(math.pi*h)
    return (warp_x(x,y)+bumper_round(x,z)+sign*(bulge+offset),y,z)

for sign in (-1,1):
    x=F if sign>0 else L
    rows=[]
    zs=[.265+(top(x)-.265)*i/40 for i in range(41)]+[top(x)+.04*i/8 for i in range(1,9)]
    for z in zs:
        edge=cap_edge(x,z)
        rows.append([cap_point(sign,edge*(-1+2*j/40),z) for j in range(41)])
    grid(f'Rounded bumper and fascia {sign}',rows,PAINT,parts['Body'],sign>0)

# Weld the panels so the light flows across fenders and bumpers without a hard seam.
bpy.ops.object.select_all(action='DESELECT')
shell=[o for o in parts['Body'].children if o.type=='MESH' and o.name.startswith(('Continuous','Rounded bumper'))]
for ob in shell: ob.select_set(True)
bpy.context.view_layer.objects.active=shell[0]
bpy.ops.object.join()
shell=bpy.context.object; shell.name='Welded curved body shell'
bm=bmesh.new(); bm.from_mesh(shell.data)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00015)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.to_mesh(shell.data); bm.free(); shell.data.update()

# All cabin surfaces and their inset glass share the same surface function.
CABIN=[(-1.53,1.06),(-1.39,1.16),(-1.14,1.355),(-.85,1.465),
       (-.48,1.505),(.04,1.495),(.34,1.43),(.65,1.265),(.98,1.06),(1.04,1.02)]
BASE_Z=1.028
def cabin_center(x):return interp(x,CABIN)
def cabin_rail(x):
    height=cabin_center(x)-BASE_Z
    fraction=max(0,min(1,height/.46))
    return (.742-.144*fraction,cabin_center(x)-.032*fraction)

def cabin_top(x,u,offset=0):
    half,zrail=cabin_rail(x)
    return (x,half*u,cabin_center(x)-(cabin_center(x)-zrail)*u*u+offset)

def cabin_side(x,z,side,offset=0):
    half,zrail=cabin_rail(x)
    t=max(0,min(1,(z-BASE_Z)/max(.00001,zrail-BASE_Z)))
    y=.742+(half-.742)*t+.007*math.sin(math.pi*t)
    shear=.105*t*math.exp(-((x+.19)/.48)**4)
    return (x-shear,side*(y+offset),z)

cx=sorted(set([-1.53+2.57*i/128 for i in range(129)]+[-1.425,-.895,.383,.974]))
# Real openings behind the glass allow the seats and dashboard to be visible.
def open_roof():
    us=sorted(set([-1+2*j/40 for j in range(41)]+[-.948,.948]))
    verts=[cabin_top(x,u) for x in cx for u in us]; faces=[]; n=len(us)
    for i in range(len(cx)-1):
        x=(cx[i]+cx[i+1])/2
        for j in range(n-1):
            u=(us[j]+us[j+1])/2
            if ((.383<x<.974) or (-1.425<x<-.895)) and abs(u)<.948:continue
            a=i*n+j; faces.append((a,a+n,a+n+1,a+1))
    mesh('Compound curved roof and pillars',verts,faces,PAINT,parts['Body'])
open_roof()
for side in (-1,1):
    # Painted C/A pillars and the actual sill/roof rails surround the openings.
    for start,end in [(-1.53,-1.10),(-.27,-.12),(.88,1.04)]:
        rows=[]
        for i in range(25):
            x=start+(end-start)*i/24; railz=cabin_rail(x)[1]
            rows.append([cabin_side(x,BASE_Z+(railz-BASE_Z)*j/12,side) for j in range(13)])
        grid(f'Fitted cabin side pillar {side} {start}',rows,PAINT,parts['Body'],side>0)
    for name,a,b in [('Rear',-1.10,-.27),('Front',-.12,.88)]:
        rows=[]; upper=[]; lower=[]; sill_rows=[]; rail_rows=[]
        for i in range(49):
            x=a+(b-a)*i/48
            # Rounded corners remain on the same curved pillar surface.
            corner=.019*(1-smooth(min(i,48-i)/4))
            lo=1.071+.035*max(0,-x)+corner; hi=max(lo+.006,cabin_rail(x)[1]-.028-corner)
            sill_rows.append([cabin_side(x,BASE_Z+(lo-BASE_Z)*j/4,side) for j in range(5)])
            rail_rows.append([cabin_side(x,hi+(cabin_rail(x)[1]-hi)*j/4,side) for j in range(5)])
            rows.append([cabin_side(x,lo+(hi-lo)*j/12,side,.003) for j in range(13)])
            lower.append(cabin_side(x,lo,side,.005)); upper.append(cabin_side(x,hi,side,.005))
        grid(f'{name} flush side glass {side}',rows,GLASS,parts['Glass'],side>0)
        grid(f'{name} cabin side sill {side}',sill_rows,PAINT,parts['Body'],side>0)
        grid(f'{name} cabin side roof rail {side}',rail_rows,PAINT,parts['Body'],side>0)
        line(f'{name} window gasket {side}',lower+list(reversed(upper))+[lower[0]],BLACK,parts['Trim'],.003)
    grid(f'Satin B pillar {side}',[[cabin_side(x,1.079+(cabin_rail(x)[1]-.027-1.079)*j/12,side,.0035) for j in range(13)] for x in [-.27,-.23,-.19,-.15,-.12]],BLACK,parts['Trim'],side>0)
    line(f'Rear quarter glass divider {side}',[cabin_side(-.86,1.101+(cabin_rail(-.86)[1]-.029-1.101)*j/24,side,.007) for j in range(25)],BLACK,parts['Trim'],.006)
    sill=[cabin_side(-1.10+1.98*i/64,1.061+.035*max(0,1.10-1.98*i/64),side,.002) for i in range(65)]
    line(f'Window lower weatherstrip {side}',sill,BLACK,parts['Trim'],.004)

for name,a,b in [('Front windscreen',.383,.974),('Rear windscreen',-1.425,-.895)]:
    rows=[]
    for i in range(49):
        x=a+(b-a)*i/48
        half=.948-.024*(1-smooth(min(i,48-i)/3))
        rows.append([cabin_top(x,half*(-1+2*j/28),.0025) for j in range(29)])
    grid(name,rows,WINDSCREEN if name.startswith('Front') else REAR_GLASS,parts['Glass'])
    border=rows[0]+[row[-1] for row in rows[1:]]+list(reversed(rows[-1][:-1]))+[row[0] for row in reversed(rows[1:-1])]
    line(name+' rubber seal',border+[border[0]],BLACK,parts['Trim'],.0035)

# Upholstered cabin: no white body surface behind the windscreen.
box('Cabin carpet',(-.18,0,.68),(1.88,1.33,.08),INTERIOR,parts['Body'],.04)
box('Dashboard sculpted upper',(.72,0,.985),(.40,1.37,.13),INTERIOR,parts['Body'],.055)
box('Dashboard central display',(.575,0,1.065),(.028,.22,.125),BLACK,parts['Trim'],.009)
box('Center console',(.07,0,.83),(.62,.16,.22),INTERIOR,parts['Body'],.035)
box('Rear parcel shelf',(-1.14,0,1.058),(.36,1.26,.026),INTERIOR,parts['Body'],.01)
for x in (-.72,.15):
    for sy in (-1,1):
        box(f'Seat cushion {x} {sy}',(x,sy*.36,.76),(.43,.43,.12),INTERIOR,parts['Body'],.055)
        seat=box(f'Seat back {x} {sy}',(x-.18,sy*.36,1.00),(.12,.44,.43),INTERIOR,parts['Body'],.052)
        seat.rotation_euler.y=-.13
        box(f'Seat headrest {x} {sy}',(x-.21,sy*.36,1.275),(.115,.22,.155),INTERIOR,parts['Body'],.04)
        for z in (.91,1.02,1.13):
            line(f'Seat piping {x} {sy} {z}',[(x-.108,sy*.36-.18,z),(x-.108,sy*.36+.18,z)],BLACK,parts['Trim'],.0015)
for sy in (-1,1):
    box(f'Inner door card {sy}',(-.12,sy*.697,.88),(1.72,.045,.29),INTERIOR,parts['Body'],.025)
    box(f'Interior door armrest {sy}',(.12,sy*.667,.91),(.30,.06,.055),BLACK,parts['Trim'],.015)
steer_center=Vector((.50,.36,1.03))
line('Steering wheel leather rim',[tuple(steer_center+Vector((.035*math.sin(math.tau*i/64),.145*math.cos(math.tau*i/64),.145*math.sin(math.tau*i/64)))) for i in range(65)],BLACK,parts['Trim'],.012)
ball('Steering hub',steer_center,(.035,.055,.045),BLACK,parts['Trim'])
for a in (0,math.pi,math.pi*1.5):
    line(f'Steering spoke {a}',[steer_center,tuple(steer_center+Vector((.035*math.sin(a),.133*math.cos(a),.133*math.sin(a))))],GRAPHITE,parts['Trim'],.012)

# Fine panel gaps track the actual metal surface instead of hovering above it.
def side_path(name,coords,side,mat=SEAM,radius=.0015):
    pts=[]
    for (x0,z0),(x1,z1) in zip(coords,coords[1:]):
        pts += [side_point(x0+(x1-x0)*i/12,z0+(z1-z0)*i/12,side,.002) for i in range(12)]
    pts.append(side_point(*coords[-1],side,.002))
    return line(name,pts,mat,parts['Trim'],radius)

for side in (-1,1):
    side_path(f'Front door shutline {side}',[(.97,1.005),(.96,.78),(.93,.48),(.86,.315),(-.10,.302),(-.19,1.035)],side)
    side_path(f'Rear door shutline {side}',[(-.10,.302),(-.74,.307),(-.86,.42),(-1.02,.70),(-1.20,1.055)],side)
    for x in (-.92,.02):
        z=.956; y=side_width(x,z)
        ball(f'Handle recess {side} {x}',(x,side*(y+.003),z),(.104,.006,.019),SEAM,parts['Trim'])
        ball(f'Chrome door handle {side} {x}',(x,side*(y+.017),z+.005),(.094,.019,.012),CHROME,parts['Trim'])
    side_path(f'Lower door chrome molding {side}',[(-.73,.397),(-.58,.398),(.78,.361),(.85,.351)],side,CHROME,.006)
    side_path(f'Rocker sill crease {side}',[(-.78,.285),(.82,.285)],side,PAINT,.009)
    box(f'Mirror mount {side}',(.83,side*.752,1.106),(.12,.10,.04),BLACK,parts['Trim'],.012)
    ball(f'Mirror black lower shell {side}',(.82,side*.88,1.105),(.105,.083,.043),BLACK,parts['Trim'])
    ball(f'Mirror housing {side}',(.82,side*.88,1.128),(.104,.082,.051),PAINT,parts['Body'])
    ball(f'Mirror glass {side}',(.723,side*.885,1.128),(.008,.065,.036),GLASS,parts['Glass'])
    for x0,x1 in [(1.03,1.96),(-1.51,-2.06)]:
        pts=[]
        for i in range(49):
            x=x0+(x1-x0)*i/48
            point=deck_point(x,side*.77)
            pts.append((point[0],point[1],point[2]+.0018))
        line(f'Deck shutline {side} {x0}',pts,SEAM,parts['Trim'],.0014)

fuel=[]
for i in range(65):
    a=math.tau*i/64
    fuel.append(side_point(-1.57+.068*math.cos(a),.865+.068*math.sin(a),1,.002))
line('Fitted fuel door',fuel,SEAM,parts['Trim'],.0013)
line('Short roof antenna',[cabin_top(-.68,0,.002),(-.76,0,1.64)],BLACK,parts['Trim'],.004)
for side in (-1,1):
    line(f'Wiper {side}',[cabin_top(.945,side*.80,.009),cabin_top(.916,side*.08,.009)],BLACK,parts['Trim'],.004)

def fascia(name,sign,y0,y1,low,high,mat,offset=.006):
    rows=[]
    for i in range(33):
        u=i/32; y=y0+(y1-y0)*u
        za=low(u) if callable(low) else low
        zb=high(u) if callable(high) else high
        rows.append([cap_point(sign,y,za+(zb-za)*j/8,offset) for j in range(9)])
    return grid(name,rows,mat,parts['Lights'],sign<0)

# Reference-specific fascia and wraparound optics.
exec((BASE / 'scripts' / 'cronos-details-v23.py').read_text(), globals())

def text(name,body,loc,size,sign,mat,stretch=1):
    data=bpy.data.curves.new(name,'FONT'); data.body=body; data.size=size
    data.align_x='CENTER'; data.align_y='CENTER'; data.extrude=.0005
    ob=bpy.data.objects.new(name,data); scene.collection.objects.link(ob)
    ob.parent=parts['Badges']; ob.location=loc; ob.scale.y=stretch
    ob.rotation_euler=(math.pi/2,0,sign*math.pi/2); data.materials.append(mat)
    if body=='FIAT':ob.scale.x=.55
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.context.view_layer.objects.active=ob; bpy.ops.object.convert(target='MESH')

for sign,z in [(1,.551),(-1,.666)]:
    plate_material=BLACK if sign>0 else PLATE
    lettering_material=PLATE if sign>0 else BLACK
    fascia(f'Plate surround {sign}',sign,-.207,.207,z-.049,z+.049,BLACK,.007)
    fascia(f'Plate face {sign}',sign,-.19,.19,z-.035,z+.035,plate_material,.011)
    text(f'Plate text {sign}','CRONOS' if sign>0 else 'MGAVIRA',cap_point(sign,0,z,.018),.033,sign,lettering_material)
text('Front badge','FIAT',cap_point(1,0,.777,.028),.067,1,CHROME,1.55)
text('Rear badge','FIAT',cap_point(-1,0,.947,.020),.053,-1,CHROME,1.55)
text('CRONOS trunk lettering','CRONOS',cap_point(-1,.36,.727,.018),.022,-1,CHROME)
for j,mat in enumerate([material('Italian green',(.015,.16,.06)),PLATE,RED]):
    fascia(f'Italian grille detail {j}',1,.305+j*.009,.312+j*.009,.718,.741,mat,.019)

# Tires use a single lathed 195 mm cross-section, avoiding overlapping donuts.
def lathe(name,profile,mat,parent):
    rows=[]
    for i in range(65):
        a=math.tau*i/64
        rows.append([(r*math.cos(a),r*math.sin(a),z) for z,r in profile])
    return grid(name,rows,mat,parent)

def disc(name,radius,depth,z,mat,parent):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=radius,depth=depth)
    ob=bpy.context.object; ob.name=name; ob.parent=parent; ob.location=(0,0,z)
    ob.data.materials.append(mat)
    mod=ob.modifiers.new('Rim bevel','BEVEL'); mod.width=.002; mod.segments=2
    ob.modifiers.new('Rim normals','WEIGHTED_NORMAL')
    return ob

for axle,x in [('R',AXLES[0]),('F',AXLES[1])]:
    for side,y in [('L',.735),('R',-.735)]:
        code=axle+side
        pivot=empty(f'Wheel_{code}_Pivot',root,(x,y,.31))
        spin=empty(f'Wheel_{code}_Spin',pivot); spin.rotation_euler=(math.pi/2,0,0)
        tire=empty(f'Tire_{code}',spin); rim=empty(f'Rim_{code}',spin)
        brake=empty(f'Brake_{code}',spin)
        lathe(f'195 55 R16 tire {code}',[(-.0975,.205),(-.099,.248),(-.091,.282),(-.072,.302),(-.044,.31),
              (.044,.31),(.072,.302),(.091,.282),(.099,.248),(.0975,.205),(-.0975,.205)],RUBBER,tire)
        for channel in (-.033,0,.033):
            lathe(f'Tread channel {code} {channel}',[(channel-.0016,.3105),(channel+.0016,.3105)],BLACK,tire)
        # Fine transverse tread cuts follow the surface instead of floating outside it.
        for step in range(56):
            angle=math.tau*step/56
            for half in (-1,1):
                pts=[]
                for i in range(4):
                    z=half*(.007+i*.022)
                    a=angle+half*i*.013
                    r=.3104-.009*(abs(z)/.075)**4
                    pts.append((r*math.cos(a),r*math.sin(a),z))
                line(f'Tread sipe {code} {step} {half}',pts,BLACK,tire,.0009)
        lathe(f'Alloy barrel {code}',[(-.095,.199),(-.095,.211),(.095,.211),(.095,.199),(-.095,.199)],GRAPHITE,rim)
        for face in (-1,1):
            z=face*.098
            disc(f'Brake rotor {code} {face}',.133,.007,face*.043,DISC,brake)
            lathe(f'Rim outer lip {code} {face}',[(z-face*.006,.204),(z,.213),(z+face*.002,.211),(z+face*.002,.205)],ALLOY,rim)
            disc(f'Five spoke graphite hub {code} {face}',.063,.014,z-face*.012,GRAPHITE,rim)
            for i in range(5):
                angle=math.tau*i/5
                for split in (-1,1):
                    # A deep graphite fork with a narrow diamond-cut face, not silver strips.
                    outline=[(.054,split*.006-.010),(.12,split*.022-.011),
                             (.194,split*.037-.008),(.202,split*.039+.007),
                             (.12,split*.022+.010),(.054,split*.006+.010)]
                    verts=[]
                    for r,t in outline:
                        depth=z-face*.013*(1-r/.21)
                        verts.append((r*math.cos(angle)-t*math.sin(angle),r*math.sin(angle)+t*math.cos(angle),depth))
                    ob=mesh(f'Cast graphite fork {code} {face} {i} {split}',verts,[tuple(range(6))],GRAPHITE,rim,False)
                    ob.modifiers.new('Cast spoke thickness','SOLIDIFY').thickness=.012
                    bevel=ob.modifiers.new('Radiused casting edge','BEVEL'); bevel.width=.0018; bevel.segments=2
                    edge=-1 if split<0 else 1
                    strip=[(.065,split*.008+edge*.005),(.12,split*.022+edge*.005),
                           (.198,split*.038+edge*.003),(.198,split*.038+edge*.006),
                           (.12,split*.022+edge*.008),(.065,split*.008+edge*.008)]
                    verts=[(r*math.cos(angle)-t*math.sin(angle),r*math.sin(angle)+t*math.cos(angle),
                            z-face*.013*(1-r/.21)+face*.0018) for r,t in strip]
                    mesh(f'Diamond cut spoke face {code} {face} {i} {split}',verts,[tuple(range(6))],ALLOY,rim,False)
            disc(f'Wheel center chrome surround {code} {face}',.024,.003,z+face*.002,CHROME,rim)
            disc(f'Red Fiat wheel badge {code} {face}',.021,.003,z+face*.004,RED,rim)
            for radius in (.238,.281):
                lathe(f'Molded tire sidewall ridge {code} {face} {radius}',[(face*.097,radius-.001),(face*.099,radius),(face*.097,radius+.001)],RUBBER,tire)
            for i in range(4):
                a=math.tau*i/4+math.pi/4
                ball(f'Lug recess {code} {face} {i}',(.049*math.cos(a),.049*math.sin(a),z-face*.004),(.007,.007,.004),BLACK,rim)
                ball(f'Lug {code} {face} {i}',(.049*math.cos(a),.049*math.sin(a),z+face*.001),(.004,.004,.003),CHROME,rim)
        # Interior wheel well, tucked inboard of the actual tire.
        sy=1 if side=='L' else -1
        arc=[(x+.338*math.cos(math.pi*i/64),sy*.65,.31+.338*math.sin(math.pi*i/64)) for i in range(65)]
        mesh(f'Wheel well liner {code}',[(x,sy*.65,.31)]+arc,[tuple(range(66))],BLACK,parts['Body'],False)

# Batch static details by material, preserving the four independent wheel rigs.
# Roof paint stays separate so the city taxi retains its yellow roof.
bpy.context.view_layer.update()
batches={}
for ob in list(root.children_recursive):
    if ob.type not in ('MESH','CURVE'):continue
    if ob.type=='CURVE':
        bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
        bpy.context.view_layer.objects.active=ob; bpy.ops.object.convert(target='MESH')
    for mod in list(ob.modifiers):
        bpy.context.view_layer.objects.active=ob
        bpy.ops.object.modifier_apply(modifier=mod.name)
    key=(ob.parent,ob.data.materials[0], 'roof' if 'roof' in ob.name.lower() or 'cabin side' in ob.name.lower() else 'detail')
    batches.setdefault(key,[]).append(ob)
# Correct the end-cap crown and trim offsets to the reference overall length
# without changing the measured wheelbase or tire radius.
static=[o for group in batches.values() for o in group if o.parent in parts.values()]
bpy.context.view_layer.update()
extents=[(o.matrix_world@v.co).x for o in static for v in o.data.vertices]
rear_scale=(L-AXLES[0])/(min(extents)-AXLES[0])
front_scale=(F-AXLES[1])/(max(extents)-AXLES[1])
for ob in static:
    world=ob.matrix_world.copy(); inverse=world.inverted()
    for v in ob.data.vertices:
        p=world@v.co
        if p.x<AXLES[0]:p.x=AXLES[0]+(p.x-AXLES[0])*rear_scale
        elif p.x>AXLES[1]:p.x=AXLES[1]+(p.x-AXLES[1])*front_scale
        v.co=inverse@p
for (parent,mat,kind),objects in batches.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    bpy.context.object.name=f'{parent.name} {kind} {mat.name}'
    # Dense procedural strips are reduced after joining; material boundaries
    # and separate wheel parents survive export.
    ob=bpy.context.object
    if len(ob.data.polygons)>600 and mat not in (PAINT,GLASS,WINDSCREEN,REAR_GLASS,SEAM):
        mod=ob.modifiers.new('Web surface reduction','DECIMATE'); mod.ratio=.76
        bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)

# Standalone review lighting is excluded from the glTF.
stage=empty('Review stage')
box('Studio floor',(0,0,-.04),(200,200,.075),material('Studio gray',(.31,.34,.36),0,.8),stage,0)
def area(name,loc,power,size):
    data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='RECTANGLE'; data.size=size; data.size_y=size*.5
    ob=bpy.data.objects.new(name,data); scene.collection.objects.link(ob); ob.parent=stage
    ob.location=loc; ob.rotation_euler=(Vector((0,0,.7))-ob.location).to_track_quat('-Z','Y').to_euler()
area('Long key softbox',(2,3.5,5),650,5)
area('Cool fill',(-3,-4,3),450,4)
area('Rim strip',(-3,2,4),500,3)
def camera(name,loc,target,ortho=False):
    data=bpy.data.cameras.new(name); ob=bpy.data.objects.new(name,data); scene.collection.objects.link(ob)
    ob.parent=stage; ob.location=loc
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
    data.lens=58
    if ortho:data.type='ORTHO'; data.ortho_scale=5.2
    return ob
cams={'lateral':camera('Lateral',(0,-8,.8),(0,0,.8),True),
      'frontal_3-4':camera('Front',(5.7,5.3,2.25),(0,0,.78)),
      'trasera_3-4':camera('Rear',(-5.7,5.3,2.25),(0,0,.78)),
      'frontal':camera('Front orthographic',(8,0,.8),(0,0,.8),True),
      'trasera':camera('Rear orthographic',(-8,0,.8),(0,0,.8),True)}
scene.camera=cams['frontal_3-4']
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'fiat-cronos.blend'))
bpy.ops.object.select_all(action='DESELECT')
for ob in [root]+list(root.children_recursive):ob.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'fiat-cronos.glb'),export_format='GLB',use_selection=True,export_apply=True)
if '--no-render' not in sys.argv:
    for name,cam in cams.items():
        if '--review' in sys.argv and name not in ('lateral','frontal_3-4','trasera_3-4'):continue
        scene.camera=cam; scene.render.filepath=str(RENDERS/(name+'.png'))
        bpy.ops.render.render(write_still=True)
print('SEDAN_GLB_BYTES',(OUT/'fiat-cronos.glb').stat().st_size)

"""Pre-MY26 fascia surfaces; executed in build-sedan.py's Blender context.

The reference photographs show angular swept headlamps, round fog lights,
horizontal grille rails and split triangular rear light guides.
"""

def perimeter(sign,side,k,z,offset=.006):
    """Continuous coordinate from the front/rear center around the fender."""
    end=F if sign>0 else L
    def surface(at,height):
        if at<=1:return Vector(cap_point(sign,side*side_width(end,height)*at,height))
        return Vector(side_point(end-sign*(at-1)*1.1,height,side))
    base=surface(k,z)
    # An offset follows the surface normal through the bumper/fender corner.
    # Switching abruptly from an X offset to Y made the old lenses buckle.
    tangent=surface(k+.025,z)-surface(k-.025,z)
    vertical=surface(k,z+.002)-surface(k,z-.002)
    normal=tangent.cross(vertical).normalized()*(sign*side)
    return tuple(base+normal*offset)

def ribbon(name,sign,side,profile,mat,offset=.008,inset=0):
    # Linear contour interpolation keeps the purposeful angular lamp outline.
    rows=[]; bottom=[]; upper=[]
    for a,b in zip(profile,profile[1:]):
        for i in range(12):
            t=i/12; k=a[0]+(b[0]-a[0])*t
            lo=a[1]+(b[1]-a[1])*t+inset
            hi=a[2]+(b[2]-a[2])*t-inset
            hi=max(lo+.001,hi)
            rows.append([perimeter(sign,side,k,lo+(hi-lo)*j/8,offset) for j in range(9)])
    k,lo,hi=profile[-1]
    rows.append([perimeter(sign,side,k,lo+(hi-lo)*j/8,offset) for j in range(9)])
    ob=grid(name,rows,mat,parts['Lights'],sign*side<0)
    border=[row[0] for row in rows]+[row[-1] for row in reversed(rows)]
    return ob,border

def fascia_outline(name,sign,coords,mat,radius=.003,offset=.014):
    points=[]
    for a,b in zip(coords,coords[1:]+coords[:1]):
        points.extend(cap_point(sign,a[0]+(b[0]-a[0])*j/12,a[1]+(b[1]-a[1])*j/12,offset) for j in range(12))
    line(name,points+[points[0]],mat,parts['Trim'],radius)

# Grille is a broad shallow hexagon, with a chrome perimeter and two rails.
fascia('Cronos horizontal upper grille',1,-.418,.418,
       lambda u:.699+.048*abs(2*u-1)**5,lambda u:.839-.006*abs(2*u-1),BLACK)
fascia_outline('Grille chrome surround',1,[(-.418,.833),(.418,.833),(.39,.758),(.337,.707),(-.337,.707),(-.39,.758)],CHROME,.004)
for z in (.755,.798):
    line(f'Horizontal chrome grille rail {z}',[cap_point(1,-.385+.77*i/64,z,.016) for i in range(65)],CHROME,parts['Trim'],.003)

# Small repeated diamond openings, combined into one mesh per grille.
def grille_mesh(name,half,z0,z1,step):
    vertices=[]; faces=[]
    for row in range(int((z1-z0)/step)+1):
        z=z0+row*step
        for col in range(int(2*half/step)):
            y=-half+(col+.5*(row%2))*step
            if abs(y)>half-.07*abs(2*(z-z0)/(z1-z0)-1):continue
            start=len(vertices)
            for dy,dz in [(0,-.008),(.012,0),(0,.008),(-.012,0),(0,-.005),(.008,0),(0,.005),(-.008,0)]:
                vertices.append(cap_point(1,y+dy,z+dz,.014))
            for j in range(4):faces.append((start+j,start+(j+1)%4,start+(j+1)%4+4,start+j+4))
    mesh(name,vertices,faces,GRAPHITE,parts['Trim'])
grille_mesh('Upper diamond grille mesh',.38,.717,.821,.024)
fascia('Wide lower grille',1,-.595,.595,lambda u:.313+.012*abs(2*u-1),lambda u:.466-.087*abs(2*u-1)**5,BLACK)
grille_mesh('Lower diamond grille mesh',.56,.335,.435,.027)
fascia_outline('Lower grille fine chrome surround',1,[(-.60,.329),(-.49,.433),(-.42,.454),(.42,.454),(.49,.433),(.60,.329)],CHROME,.003)
line('Front white lower splitter',[cap_point(1,-.70+1.4*i/80,.267,.015) for i in range(81)],PAINT,parts['Body'],.012)

head_profile=[(.52,.762,.843),(.78,.708,.856),(1,.744,.854),(1.30,.840,.910),(1.57,.936,.948)]
cover=material('Clear polycarbonate headlight cover',(.54,.65,.68),0,.07,.85)
cover.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.12
cover.diffuse_color=(.54,.65,.68,.12)
cover.surface_render_method='DITHERED'
for side in (-1,1):
    _,border=ribbon(f'Angular swept headlamp seal {side}',1,side,head_profile,BLACK)
    line(f'Headlight outer gasket {side}',border+[border[0]],BLACK,parts['Lights'],.003)
    ribbon(f'Headlamp smoked optical cavity {side}',1,side,head_profile,LENS,.010,.006)
    # Upper chrome/white blade follows the swept lamp all the way onto fender.
    points=[]
    for a,b in zip(head_profile,head_profile[1:]):
        points.extend(perimeter(1,side,a[0]+(b[0]-a[0])*i/16,a[2]+(b[2]-a[2])*i/16-.012,.018) for i in range(16))
    line(f'Swept headlamp upper optical blade {side}',points,CHROME,parts['Lights'],.004)
    # Angular reflector compartments follow the real lamp envelope.
    for label,profile in [('Inner',[(.55,.777,.827),(.64,.743,.832),(.75,.731,.834)]),
                          ('Outer',[(.79,.732,.837),(.95,.753,.837),(1.17,.820,.882)])]:
        ribbon(f'{label} faceted reflector {side}',1,side,profile,CHROME,.019)
        ribbon(f'{label} dark reflector center {side}',1,side,profile,LENS,.022,.012)
        points=[perimeter(1,side,k,lo+.008,.025) for k,lo,hi in profile]
        line(f'{label} lower reflector rim {side}',points,CHROME,parts['Lights'],.003)
    indicator=material(f'Amber turn lens {side}',(.34,.17,.035),.12,.24,.4)
    ribbon(f'Headlamp turn compartment {side}',1,side,[(.54,.780,.810),(.58,.769,.816)],indicator,.026)
    # Concave, radially faceted reflectors catch different angles of sunlight.
    for k,z,radius in [(.66,.786,.033),(.89,.788,.037)]:
        rows=[]
        for ring in range(6):
            r=.009+(radius-.009)*ring/5
            rows.append([perimeter(1,side,k+r*math.cos(math.tau*j/32)/.72,
                         z+r*math.sin(math.tau*j/32),.018+.012*(r/radius)**2) for j in range(33)])
        reflector=grid(f'Deep faceted reflector {side} {k}',rows,CHROME,parts['Lights'])
        for polygon in reflector.data.polygons:polygon.use_smooth=False
        center=Vector(perimeter(1,side,k,z,.028))
        ball(f'Headlamp halogen bulb {side} {k}',center,(.007,.009,.009),LED,parts['Lights'])
    ribbon(f'Flush polycarbonate headlight cover {side}',1,side,head_profile,cover,.035,.004)
    # Triangular black fog-light bezels and round reflector inserts.
    fog=[(.70,.510,.522),(.84,.401,.525),(1.02,.407,.530),(1.11,.449,.510)]
    ribbon(f'Black fog lamp bezel {side}',1,side,fog,BLACK,.010)
    center=Vector(perimeter(1,side,.9,.465,.035))
    along=(Vector(perimeter(1,side,.901,.465))-Vector(perimeter(1,side,.899,.465)))*side
    vertical=Vector(perimeter(1,side,.9,.466))-Vector(perimeter(1,side,.9,.464))
    normal=along.cross(vertical).normalized(); along.normalize(); vertical=normal.cross(along).normalized()
    ring=[tuple(center+along*(.047*math.cos(math.tau*i/48))+vertical*(.047*math.sin(math.tau*i/48))) for i in range(49)]
    line(f'Circular fog chrome ring {side}',ring,CHROME,parts['Lights'],.004)
    for name,offset,scale,mat in [('reflector',0,(.014,.042,.042),CHROME),('lens',.013,(.008,.028,.028),LED)]:
        optic=ball(f'Circular fog {name} {side}',center+normal*offset,scale,mat,parts['Lights'])
        optic.rotation_mode='QUATERNION'; optic.rotation_quaternion=Vector((1,0,0)).rotation_difference(normal)
    line(f'Fog lamp horizontal lower chrome {side}',[perimeter(1,side,.70+.41*i/32,.379+.014*(i/32),.016) for i in range(33)],CHROME,parts['Trim'],.005)

    # Separate inner trunk segment and angular outer lamp, wrapping around
    # the rear quarter exactly as a continuous object (no detached red box).
    rear_inner=[(.40,.917,.957),(.68,.914,.971),(.76,.924,.974)]
    rear_outer=[(.78,.910,.979),(1,.853,.981),(1.16,.842,.980),(1.38,.932,.971)]
    for label,profile in [('Trunk',rear_inner),('Quarter',rear_outer)]:
        _,border=ribbon(f'{label} tail lamp black seal {side}',-1,side,profile,BLACK,.007)
        ribbon(f'{label} ruby lens {side}',-1,side,profile,RED,.012,.005)
        line(f'{label} tail lamp gasket {side}',border+[border[0]],BLACK,parts['Lights'],.0025)
        # Inset, closed red light guide outlines the triangular signature.
        guide=[]
        for reverse in (False,True):
            segment=list(reversed(profile)) if reverse else profile
            for a,b in zip(segment,segment[1:]):
                for i in range(14):
                    t=i/14; k=a[0]+(b[0]-a[0])*t
                    lo=a[1]+(b[1]-a[1])*t; hi=a[2]+(b[2]-a[2])*t
                    guide.append(perimeter(-1,side,k,lo+(hi-lo)*(.78 if reverse else .22),.020))
        line(f'{label} sculpted red light guide {side}',guide+[guide[0]],RED_GUIDE,parts['Lights'],.005)
    ribbon(f'Rear reverse strip {side}',-1,side,[(.46,.927,.936),(.67,.926,.935)],LED,.020)
    ribbon(f'Lower rear reflector {side}',-1,side,[(.58,.407,.431),(1.06,.401,.428)],RED,.010)
    ribbon(f'Rear lower bumper corner {side}',-1,side,[(.63,.247,.393),(1,.234,.391),(1.23,.260,.330)],BLACK,.008)

fascia('Rear black lower valance',-1,-.70,.70,.238,lambda u:.395-.024*abs(2*u-1),BLACK,.008)
fascia_outline('Recessed trunk license area',-1,[(-.32,.820),(.32,.820),(.29,.625),(-.29,.625)],PAINT,.007,.012)
trunk_outline=[(-.55,.927),(-.54,.766),(-.47,.572),(-.35,.542),(.35,.542),(.47,.572),(.54,.766),(.55,.927)]
line('Trunk lid perimeter',[cap_point(-1,y,z,.005) for y,z in trunk_outline],SEAM,parts['Trim'],.002)
line('Integrated trunk lip',[cap_point(-1,-.67+1.34*i/64,1.007,.008) for i in range(65)],PAINT,parts['Body'],.007)

import random, sys
out = sys.argv[1]
def chain(rnd, x, y, n, w, h):
    pts=[]
    for i in range(n):
        pts.append((x,y))
        r=rnd.random()
        if r<0.45: x+=w*0.52; y-=h*0.62     # diagonal step up
        elif r<0.8: x+=w*0.62               # flat step
        else: x+=w*0.42; y+=h*0.62          # step down
    return pts
def svg(kind, seed, W=1600, H=1000, chains=None, hi=None):
    rnd=random.Random(seed)
    if kind=='dark':  stroke='rgba(150,240,196,0.30)'
    elif kind=='light': stroke='rgba(6,58,51,0.16)'
    else: stroke='rgba(6,58,51,0.22)'
    w,h=150,46
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">',
     '<defs><filter id="g" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="9"/></filter></defs>']
    links=[]
    for (x,y,n) in chains:
        links+=chain(rnd,x,y,n,w,h)
    for (x,y) in links:
        parts.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{w}" height="{h}" rx="{h/2}" fill="none" stroke="{stroke}" stroke-width="1.3"/>')
    for (i,col) in (hi or []):
        x,y=links[i%len(links)]
        c={'g':'#00dc6c','y':'#efe68a'}[col]
        parts.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{w}" height="{h}" rx="{h/2}" fill="none" stroke="{c}" stroke-width="10" opacity=".55" filter="url(#g)"/>')
        parts.append(f'<rect x="{x+3:.0f}" y="{y+3:.0f}" width="{w-6}" height="{h-6}" rx="{(h-6)/2}" fill="{c}" fill-opacity=".14" stroke="{c}" stroke-width="2.2"/>')
    parts.append('</svg>')
    return '\n'.join(parts)
open(out+'/links-dark.svg','w').write(svg('dark',7,chains=[(-60,900,12),(260,620,13),(820,980,10),(900,420,9),(-120,300,6)],hi=[(16,'y'),(41,'g')]))
open(out+'/links-light.svg','w').write(svg('light',11,chains=[(-60,940,12),(420,700,12),(980,1020,9),(1000,380,8)]))
open(out+'/links-band.svg','w').write(svg('band',5,W=1600,H=420,chains=[(-80,330,13),(700,360,12),(200,120,6)],hi=[(9,'g'),(22,'y')]))

import subprocess
from xml.sax.saxutils import escape
F = "DejaVu Sans"
COL = {'I':('#D5E8D4','#2E7D32',''),'P':('#FFF2CC','#B7950B',''),'N':('#F2F2F2','#9E9E9E','6,5'),'C':('#DAE8FC','#1C4587','2,4'),'X':('#FFFFFF','#333333','')}
class SVG:
    def __init__(s,w,h): s.w,s.h=w,h; s.el=[]
    def add(s,x): s.el.append(x)
    def text(s,x,y,t,size=15,anchor='middle',weight='normal',fill='#111',italic=False):
        lines=t.split('\n'); y0=y-(len(lines)-1)*size*0.6
        for i,l in enumerate(lines):
            s.add(f'<text x="{x}" y="{y0+i*size*1.2:.1f}" font-family="{F}" font-size="{size}" text-anchor="{anchor}" font-weight="{weight}" {"font-style=\"italic\"" if italic else ""} fill="{fill}" dominant-baseline="middle">{escape(l)}</text>')
    def line(s,x1,y1,x2,y2,color='#444',w=1.6,dash=''):
        s.add(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{w}" {"stroke-dasharray=\"%s\""%dash if dash else ""}/>')
    def poly(s,pts,color='#1C4587',w=1.6):
        s.add(f'<polyline points="{" ".join(f"{x},{y}" for x,y in pts)}" fill="none" stroke="{color}" stroke-width="{w}"/>')
    def tri(s,x,y,dx,dy,color='#1C4587'):  # hollow triangle tip at (x,y) pointing direction (dx,dy)
        import math
        L=16; W=9; n=math.hypot(dx,dy); ux,uy=dx/n,dy/n; bx,by=x-ux*L,y-uy*L; px,py=-uy,ux
        s.add(f'<polygon points="{x},{y} {bx+px*W},{by+py*W} {bx-px*W},{by-py*W}" fill="white" stroke="{color}" stroke-width="1.6"/>')
    def actor(s,x,y,label):
        c='#333'; s.add(f'<circle cx="{x}" cy="{y-28}" r="11" fill="white" stroke="{c}" stroke-width="2"/>')
        s.line(x,y-17,x,y+12,c,2); s.line(x-18,y-6,x+18,y-6,c,2); s.line(x,y+12,x-14,y+34,c,2); s.line(x,y+12,x+14,y+34,c,2)
        s.text(x,y+52+ (label.count('\n'))*9,label,14)
    def uc(s,x,y,code,name,st,w=300,h=78):
        f,b,d=COL[st]
        s.add(f'<ellipse cx="{x}" cy="{y}" rx="{w/2}" ry="{h/2}" fill="{f}" stroke="{b}" stroke-width="2" {"stroke-dasharray=\"%s\""%d if d else ""}/>')
        if code: s.text(x,y-(9 if '\n' not in name else 17),code,13,weight='bold'); s.text(x,y+(10 if '\n' not in name else 8),name,13)
        else: s.text(x,y,name,13)
    def edge_uc(s,ax,ay,ux,uy,side,w=300,h=78,dash='',color='#444'):
        # line from actor point to ellipse boundary toward actor
        import math
        dx,dy=ax-ux,ay-uy; a,b=w/2,h/2
        t=1/math.sqrt((dx/a)**2+(dy/b)**2); s.line(ax,ay,ux+dx*t,uy+dy*t,color,1.6,dash)
    def rect(s,x,y,w,h,title,color='#1C4587'):
        s.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="none" stroke="{color}" stroke-width="2.5"/>')
        s.text(x+w/2,y+26,title,17,weight='bold',fill='#1C4587')
    def save(s,name,scale=2):
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{s.w}" height="{s.h}" viewBox="0 0 {s.w} {s.h}"><rect width="100%" height="100%" fill="white"/>'+''.join(s.el)+'</svg>'
        open(name+'.svg','w').write(svg)
        subprocess.run(['rsvg-convert','-z',str(scale),name+'.svg','-o',name+'.png'],check=True)
def legend(s,x,y,items):
    for i,(st,t) in enumerate(items):
        f,b,d=COL[st]; xx=x+i*230
        s.add(f'<ellipse cx="{xx+30}" cy="{y}" rx="28" ry="13" fill="{f}" stroke="{b}" stroke-width="2" {"stroke-dasharray=\"%s\""%d if d else ""}/>')
        s.text(xx+66,y,t,13,anchor='start')

# ---------------- Diagrama general (diseño) ----------------
def general():
    s=SVG(1480,1480)
    s.rect(300,36,930,1354,'SIGEPA — Plataforma gastronómica georreferenciada')
    L=[('CU01','Consultar mapa\ninteractivo','I',130),('CU02','Filtrar mapa','I',225),('CU03','Consultar receta','I',320),
       ('CU04','Consultar ficha\nde ingrediente','P',415),('CU05','Consultar contenido\neducativo','P',510),
       ('CU06','Registrarse e\niniciar sesión','I',640),('CU09','Contactar portador\no recolector','N',735),('CU10','Participar en el foro','P',830),
       ('CU11','Reportar sobreconsumo','N',925),('CU12','Recibir alertas de\nveda y riesgo','P',1020),
       ('CU07','Registrar receta\no saber','I',1170),('CU08','Registrar ingrediente\ny temporada','N',1290)]
    R=[('CU14','Gestionar especies,\nvedas y riesgo','N',560),('CU15','Gestionar ubicaciones\ny restricciones','N',660),('CU16','Gestionar usuarios\ny roles','P',760),
       ('CU13','Validar contenido','I',960)]
    cx=560; rx=970; pos={}
    for c,n,st,y in L: s.uc(cx,y,c,n,st); pos[c]=(cx,y)
    for c,n,st,y in R: s.uc(rx,y,c,n,st); pos[c]=(rx,y)
    V=(190,320); U=(190,830); P=(190,1170); Rc=(190,1290); I=(190,1040)
    for c in ['CU01','CU02','CU03','CU04','CU05']: s.edge_uc(V[0]+24,V[1],*pos[c],'L')
    for c in ['CU06','CU09','CU10','CU11','CU12']: s.edge_uc(U[0]+24,U[1],*pos[c],'L')
    s.edge_uc(P[0]+24,P[1],*pos['CU07'],'L'); s.edge_uc(Rc[0]+24,Rc[1],*pos['CU08'],'L')
    s.actor(*V,'Visitante'); s.actor(*U,'Usuario\nregistrado'); s.actor(*P,'Portador(a)\nde saberes'); s.actor(*Rc,'Recolector'); s.actor(*I,'Investigador')
    # generalizaciones: Usuario -> Visitante
    s.line(U[0],U[1]-40,V[0],V[1]+78,'#1C4587'); s.tri(V[0],V[1]+76,0,-1)
    # bus de especializaciones -> Usuario
    bx=70
    for a in (I,P,Rc): s.line(a[0]-22,a[1],bx,a[1],'#1C4587')
    s.line(bx,Rc[1],bx,U[1],'#1C4587'); s.line(bx,U[1],U[0]-26,U[1],'#1C4587'); s.tri(U[0]-24,U[1],1,0)
    # derecha
    M=(1330,130); A=(1330,660); Mo=(1330,960)
    s.edge_uc(M[0]-24,M[1],*pos['CU01'],'R')
    for c in ['CU14','CU15','CU16']: s.edge_uc(A[0]-24,A[1],*pos[c],'R')
    s.edge_uc(Mo[0]-24,Mo[1],*pos['CU13'],'R')
    s.actor(*M,'Servicio de mapas\n«sistema»'); s.actor(*A,'Administrador'); s.actor(*Mo,'Moderador')
    s.text(1050,1300,'El Investigador hereda del Usuario registrado\ny usa CU03, CU04 y CU09 con fines de documentación.',12,fill='#333',italic=True)
    legend(s,300,1430,[('I','Implementado'),('P','Parcial'),('N','No implementado')])
    s.text(1050,1430,'Estado en la versión 1.0',13,weight='bold',anchor='start') if False else None
    s.save('casos-uso-general')

# ---------------- Diagrama de la versión 1.0 ----------------
def v1():
    s=SVG(1480,1240)
    s.rect(300,36,930,1124,'SIGEPA versión 1.0 — casos de uso implementados')
    L=[('CU01','Consultar mapa\ninteractivo','I',130),('CU02','Filtrar mapa\n(búsqueda y filtros)','I',225),('CU03','Consultar receta','I',320),
       ('CU04','Consultar ficha de ingrediente\n(calendario de temporada)','P',415),('CU05','Consultar contenido educativo\n(«Sobre el proyecto»)','P',510),
       ('CU06','Registrarse e\niniciar sesión','I',650),('CU10','Participar en el foro\n(comentarios por receta)','P',745),
       ('CU12','Recibir alertas de veda y riesgo\n(recomendaciones de cuidado)','P',840),('CU16','Gestionar usuarios y roles\n(cambio a portador)','P',935),
       ('CU07','Registrar receta o saber\n(con consentimiento)','I',1070)]
    C=[('','Usar el modo cocina','C',245),('','Consultar al asistente','C',320),('','Descargar datos abiertos','C',395),('','Guardar favoritos','C',735)]
    R=[('CU13','Validar contenido\n(recetas y comentarios)','I',1070)]
    cx=560; rx=970; pos={}
    for c,n,st,y in L: s.uc(cx,y,c,n,st,w=330); pos[c]=(cx,y)
    for i,(c,n,st,y) in enumerate(C): s.uc(rx,y,c,n,st,w=270,h=58); pos['C%d'%i]=(rx,y)
    for c,n,st,y in R: s.uc(rx,y,c,n,st,w=300); pos[c]=(rx,y)
    V=(190,320); U=(190,795); P=(190,1070)
    for c in ['CU01','CU02','CU03','CU04','CU05']: s.edge_uc(V[0]+24,V[1],*pos[c],'L',w=330)
    for c in ['CU06','CU10','CU12','CU16']: s.edge_uc(U[0]+24,U[1],*pos[c],'L',w=330)
    s.edge_uc(P[0]+24,P[1],*pos['CU07'],'L',w=330)
    # complementarios: Visitante a C0..C2 pasando por arriba del cluster izquierdo -> se conectan desde el borde derecho de CU02/CU03/CU04? usar actor Visitante con línea punteada
    s.add('<rect x="815" y="170" width="310" height="300" rx="10" fill="none" stroke="#1C4587" stroke-width="1.2" stroke-dasharray="4,4"/>')
    s.text(970,190,'Funciones complementarias',12,weight='bold',fill='#1C4587')
    s.text(970,455,'Actor: Visitante (y quienes heredan de él)',11,fill='#1C4587',italic=True)
    s.add('<rect x="815" y="690" width="310" height="110" rx="10" fill="none" stroke="#1C4587" stroke-width="1.2" stroke-dasharray="4,4"/>')
    s.text(970,785,'Actor: Usuario registrado',11,fill='#1C4587',italic=True)
    s.actor(*V,'Visitante'); s.actor(*U,'Usuario\nregistrado'); s.actor(*P,'Portador(a)\nde saberes')
    s.line(U[0],U[1]-40,V[0],V[1]+78,'#1C4587'); s.tri(V[0],V[1]+76,0,-1)
    s.line(P[0],P[1]-40,U[0],U[1]+78,'#1C4587'); s.tri(U[0],U[1]+76,0,-1)
    M=(1330,130); Mo=(1330,1070)
    s.edge_uc(M[0]-24,M[1],*pos['CU01'],'R',w=330)
    s.edge_uc(Mo[0]-24,Mo[1],*pos['CU13'],'R')
    s.actor(*M,'Leaflet + OpenStreetMap\n/ Esri «sistema»'); s.actor(*Mo,'Moderador')
    legend(s,190,1200,[('I','Implementado'),('P','Parcial'),('C','Función complementaria')])
    s.save('casos-uso-v1')
general(); v1()

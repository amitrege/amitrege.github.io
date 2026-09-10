/* Static replay of the archived drawing-arm run. No server or model calls.
 * Evidence animation reprojects actual observed pixels; shape cards are
 * schematics of the two families considered by the saved generated program.
 * See assets/mechanic/provenance.json for the source hashes and limitations.
 */
const ASSET = new URL('./assets/mechanic/', import.meta.url);
const C = {bg:'#0B1014', panel:'#0E151B', line:'#213039', paper:'#F2F5F7',
  green:'#63c7af', orange:'#E89970', muted:'#83939e', gold:'#CFB779', blue:'#769AC0'};
const TAU = Math.PI * 2;

async function getImage(file) {
  const image = new Image();
  image.src = new URL(file, ASSET).href;
  await image.decode();
  return image;
}

function pointAt(m, phase, offset=0) {
  const g=m.ground_angle, A=m.origin;
  const B=[A[0]+m.ground_length*Math.cos(g), A[1]+m.ground_length*Math.sin(g)];
  const C=[A[0]+(m.crank_length+offset)*Math.cos(g+phase), A[1]+(m.crank_length+offset)*Math.sin(g+phase)];
  const v=[B[0]-C[0],B[1]-C[1]], length=Math.hypot(...v), u=v.map(x=>x/length);
  const q=(m.coupler_length**2-m.rocker_length**2+length**2)/(2*length);
  const h=Math.sqrt(Math.max(0,m.coupler_length**2-q**2));
  const D=[C[0]+q*u[0]+h*u[1],C[1]+q*u[1]-h*u[0]];
  const cd=[(D[0]-C[0])/m.coupler_length,(D[1]-C[1])/m.coupler_length];
  const P=[C[0]+m.coupler_fraction*(D[0]-C[0])-m.coupler_offset*cd[1],
    C[1]+m.coupler_fraction*(D[1]-C[1])+m.coupler_offset*cd[0]];
  return {A,B,C,D,P};
}

/** @param {HTMLCanvasElement} canvas
 * @returns {Promise<{setStep:(n:number)=>void,setIntro:(active:boolean,visible?:boolean)=>void,destroy:()=>void}>}
 */
export async function createMechanic(canvas) {
  const response = await fetch(new URL('data.json', ASSET));
  if (!response.ok) throw new Error(`Mechanic replay data: HTTP ${response.status}`);
  const data = await response.json();
  const [observed,reveal,evidence] = await Promise.all([
    getImage(data.observation.file), getImage(data.reveal.file), getImage(data.evidence.file)
  ]);
  const ctx=canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot create the Mechanic canvas.');
  let step=0, intro=false, introVisible=true, dead=false, frameId=0, start=performance.now(), width=0, height=0;
  let reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const resize=()=>{
    const r=canvas.getBoundingClientRect();
    width=Math.max(1,r.width); height=Math.max(1,r.height);
    const dpr=Math.min(window.devicePixelRatio||1,2);
    if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)) {
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);
  };
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();

  function rect(x,y,w,h,r=12) {ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function text(s,x,y,size=11,color=C.muted,align='left') {
    ctx.fillStyle=color;ctx.font=`500 ${size}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y);ctx.textAlign='left';
  }
  function line(a,b,color,w=1,dash=[]) {
    ctx.strokeStyle=color;ctx.lineWidth=w;ctx.setLineDash(dash);
    ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();ctx.setLineDash([]);
  }
  function dot(p,r,fill,stroke) {
    ctx.beginPath();ctx.arc(...p,r,0,TAU);ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.4;ctx.stroke();}
  }
  function panel(p,label) {
    ctx.fillStyle=C.panel;rect(p.x,p.y,p.w,p.h);ctx.fill();
    ctx.strokeStyle=C.line;ctx.lineWidth=1;ctx.stroke();
    text(label,p.x+17,p.y+21,10.5,C.muted);
  }
  function content(p) {return {x:p.x+8,y:p.y+40,w:p.w-16,h:p.h-49};}
  function transform(p,box=data.viewbox,pad=12) {
    const s=Math.min((p.w-2*pad)/box[2],(p.h-2*pad)/box[3]);
    const x=p.x+(p.w-box[2]*s)/2-box[0]*s,y=p.y+(p.h-box[3]*s)/2-box[1]*s;
    return {s,x,y,point:a=>[x+a[0]*s,y+a[1]*s]};
  }
  function imageFrame(image,spec,index,p,box=data.viewbox) {
    const t=transform(p,box,0), sx=(index%spec.columns)*spec.width+box[0], sy=Math.floor(index/spec.columns)*spec.height+box[1];
    ctx.save();rect(p.x,p.y,p.w,p.h,7);ctx.clip();
    ctx.fillStyle='#EEEFE8';ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.drawImage(image,sx,sy,box[2],box[3],t.x+box[0]*t.s,t.y+box[1]*t.s,box[2]*t.s,box[3]*t.s);
    ctx.restore();return t;
  }
  function path(points,t,color,w=2,dash=[],alpha=1) {
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.setLineDash(dash);
    ctx.beginPath();points.forEach((p,i)=>{const a=t.point(p);i?ctx.lineTo(...a):ctx.moveTo(...a);});
    ctx.closePath();ctx.stroke();ctx.restore();
  }
  function grid(p,t) {
    ctx.save();rect(p.x,p.y,p.w,p.h,7);ctx.clip();ctx.fillStyle=C.panel;ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle='#26343D';
    for(let x=80;x<=480;x+=20)for(let y=60;y<=380;y+=20){const q=t.point([x,y]);ctx.fillRect(q[0],q[1],1,1);}
    ctx.restore();
  }
  function mechanism(m,phase,t,offset=0,alpha=1) {
    const raw=pointAt(m,phase,offset), q=Object.fromEntries(Object.entries(raw).map(([k,p])=>[k,t.point(p)]));
    ctx.save();ctx.globalAlpha=alpha;ctx.lineCap='round';
    line(q.A,q.B,'#35454F',2,[3,5]);
    ctx.beginPath();ctx.moveTo(...q.C);ctx.lineTo(...q.D);ctx.lineTo(...q.P);ctx.closePath();
    ctx.fillStyle='rgba(207,183,121,.12)';ctx.fill();ctx.strokeStyle='rgba(207,183,121,.8)';ctx.lineWidth=2;ctx.stroke();
    line(q.C,q.D,C.gold,Math.max(4,6*t.s));
    line(q.A,q.C,C.orange,Math.max(5,7*t.s));line(q.B,q.D,C.blue,Math.max(5,7*t.s));
    for(const k of ['A','B','C','D']){dot(q[k],Math.max(4,5*t.s),C.panel,'#BDCAD0');dot(q[k],1.4,C.paper);}
    dot(q.P,Math.max(5,6*t.s),C.green,C.bg);dot(q.P,2,C.paper);
    ctx.restore();return {raw,q};
  }
  function legend(p,items) {
    let x=p.x+17;
    for(const [label,color,dash] of items){line([x,p.y+p.h-17],[x+16,p.y+p.h-17],color,2,dash?[3,3]:[]);text(label,x+23,p.y+p.h-17,10,color);x+=23+label.length*5.7+18;}
  }
  function photo(p,index,showEdges=false,truth=false) {
    const area=content(p), t=imageFrame(truth?reveal:observed,truth?data.reveal:data.observation,index,area);
    if(showEdges){
      ctx.save();ctx.strokeStyle=C.green;ctx.lineWidth=1.6;
      for(const contour of data.evidence.outlines[index]){
        ctx.beginPath();contour.forEach((v,i)=>{let a=t.point(v);i?ctx.lineTo(...a):ctx.moveTo(...a);});ctx.closePath();ctx.stroke();
      }
      ctx.restore();
    }
    return t;
  }
  function shapeCard(p,filled,selected) {
    ctx.fillStyle=selected?'#172C2A':'#101A21';rect(p.x,p.y,p.w,p.h,8);ctx.fill();
    ctx.strokeStyle=selected?'#426E62':C.line;ctx.lineWidth=1;ctx.stroke();
    const q=[[p.x+16,p.y+p.h*.50],[p.x+p.w-16,p.y+p.h*.50],[p.x+p.w*.40,p.y+p.h*.21]];
    ctx.beginPath();ctx.moveTo(...q[0]);ctx.lineTo(...q[1]);ctx.lineTo(...q[2]);ctx.closePath();
    if(filled){ctx.fillStyle='rgba(99,199,175,.21)';ctx.fill();}
    ctx.strokeStyle=selected?C.green:C.muted;ctx.lineWidth=2;ctx.stroke();
    for(const a of q)dot(a,2.5,C.panel,selected?C.green:C.muted);
    text(filled?'filled plate':'open frame',p.x+p.w/2,p.y+p.h-15,10.5,selected?C.green:C.muted,'center');
  }
  function evidenceView(p,index) {
    const area=content(p), cardH=Math.min(90,area.h*.29), atlasArea={x:area.x+10,y:area.y+8,w:area.w-20,h:area.h-cardH-29};
    const spec=data.evidence,t=transform(atlasArea,spec.bounds,0);
    // These pixels are actual accumulated material/board observations.
    ctx.drawImage(evidence,(index%spec.columns)*spec.width,Math.floor(index/spec.columns)*spec.height,spec.width,spec.height,
      t.x+spec.bounds[0]*t.s,t.y+spec.bounds[1]*t.s,spec.bounds[2]*t.s,spec.bounds[3]*t.s);
    const q=[[0,0],[spec.base_length,0],spec.tip].map(t.point);
    ctx.save();ctx.setLineDash([5,4]);ctx.strokeStyle=C.green;ctx.lineWidth=1.7;
    ctx.beginPath();ctx.moveTo(...q[0]);ctx.lineTo(...q[1]);ctx.lineTo(...q[2]);ctx.closePath();ctx.stroke();ctx.restore();
    dot(q[2],5,C.panel,C.green);dot(q[2],1.5,C.green);
    text('frames aligned to the moving support',atlasArea.x+atlasArea.w/2,atlasArea.y+atlasArea.h-2,10,C.muted,'center');
    const cw=(area.w-32)/2,cy=area.y+area.h-cardH-2;
    shapeCard({x:area.x+10,y:cy,w:cw,h:cardH},false,false);
    shapeCard({x:area.x+22+cw,y:cy,w:cw,h:cardH},true,true);
  }
  function draw(now) {
    if(dead)return;
    if (!canvas.getClientRects().length) { frameId=requestAnimationFrame(draw); return; }
    const elapsed=reduced?1.2:(now-start)/1000;
    ctx.fillStyle=C.bg;ctx.fillRect(0,0,width,height);
    if(intro&&!introVisible) {frameId=requestAnimationFrame(draw);return;}
    const margin=Math.min(8,width*.01),gap=16,small=width<660;
    const observedOnly=intro||step===0;
    const p1=small?{x:margin,y:margin,w:width-2*margin,h:(height-2*margin-gap)/2}:
      {x:margin,y:margin,w:(width-2*margin-gap)/2,h:height-2*margin};
    if(small&&observedOnly)p1.h=height-2*margin;
    const p2=small?{...p1,y:p1.y+p1.h+gap}:{...p1,x:p1.x+p1.w+gap};
    const sourceIndex=Math.round((.5-.5*Math.cos(elapsed*1.6))*23);
    const evIndex=Math.min(23,Math.floor((elapsed%5.3)/3.5*24));
    const cyc=(elapsed/5.4)%1,fullPhase=-Math.PI+cyc*TAU;
    const revealIndex=Math.floor(cyc*48),revealPhase=data.reveal.phases[revealIndex];
    panel(p1,!observedOnly&&step===5?'ACTUAL MOTION · COVER REMOVED':'OBSERVED VIDEO · DRAWING POINT COVERED');
    const labels=['','ORIGINAL PROGRAM · FULL MOTION',
      'MODEL-WRITTEN MEASUREMENT · VISIBLE EVIDENCE','IMPROVED PROGRAM · FULL MOTION',
      'CHANGED CRANK · PREDICTION COMMITTED','PREDICTION COMPARED WITH ACTUAL MOTION'];
    if(!observedOnly)panel(p2,labels[step]);
    const photoT=photo(p1,observedOnly?sourceIndex:(step===5?revealIndex:(step===2?evIndex:sourceIndex)),!observedOnly&&step===2,!observedOnly&&step===5);
    if(observedOnly) {
      // The introduction shows the original clip on its own. Text reveals use
      // setIntro so the video keeps playing across those clicks.
    } else if(step===2)evidenceView(p2,evIndex);
    else {
      const area=content(p2);area.h-=22;
      const t=transform(area);grid(area,t);
      if(step===1){
        path(data.before.trajectory,t,C.orange,2.5);
        const pose=mechanism(data.before.mechanism,fullPhase,t);
        dot(pose.q.P,6,C.orange,C.paper);
        legend(p2,[['original prediction',C.orange]]);
      } else if(step===3) {
        path(data.before.trajectory,t,C.orange,1.5,[4,5],.66);
        path(data.after.trajectory,t,C.green,2.7);
        mechanism(data.after.mechanism,fullPhase,t);
        legend(p2,[['original',C.orange,true],['improved',C.green]]);
      } else if(step===4) {
        path(data.after.trajectory,t,C.muted,1.3,[3,5],.45);
        path(data.changed.after.trajectory,t,C.green,2.8);
        const pose=mechanism(data.after.mechanism,fullPhase,t,20);
        const old=t.point(pointAt(data.after.mechanism,fullPhase).C);
        dot(old,4,C.panel,C.orange);line(old,pose.q.C,C.paper,1.2,[2,3]);
        legend(p2,[['before change',C.muted,true],['new prediction',C.green]]);
      } else {
        path(data.changed.before.trajectory,t,C.orange,1.5,[4,5],.75);
        path(data.changed.after.trajectory,t,C.green,4.2);
        path(data.truth.changed_trajectory,t,C.paper,1.05);
        mechanism(data.after.mechanism,revealPhase,t,20);
        const actual=data.truth.reveal_points[revealIndex];
        dot(t.point(actual),4,C.paper,C.bg);
        // Identical image coordinates align the committed path with real pixels.
        path(data.changed.after.trajectory,photoT,C.green,3.1);
        legend(p2,[['original',C.orange,true],['improved',C.green],['actual',C.paper]]);
      }
    }
    if(observedOnly||step!==5){
      const x=p1.x+16,y=p1.y+p1.h-7,w=p1.w-32;
      line([x,y],[x+w,y],'#33434A',2);
      line([x,y],[x+w*((!observedOnly&&step===2?evIndex:sourceIndex)/23),y],C.green,2);
    }
    frameId=requestAnimationFrame(draw);
  }
  frameId=requestAnimationFrame(draw);
  return {
    setStep(n) {if(!Number.isFinite(n))return;intro=false;step=Math.max(0,Math.min(5,Math.round(n)));start=performance.now();},
    setIntro(active,visible=true) {
      const next=Boolean(active);
      if(next!==intro)start=performance.now();
      intro=next;introVisible=Boolean(visible);
    },
    destroy() {dead=true;cancelAnimationFrame(frameId);ro.disconnect();}
  };
}

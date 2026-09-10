/* Static replay of archived ETALON geometry. No model calls or runtime API. */
const ASSETS = new URL('./assets/natural/', import.meta.url);
const COLORS = {bg: '#0B1014', ink: '#F2F5F7', green: '#63c7af', orange: '#E89970', muted: '#83939e'};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load natural replay asset: ${path}`));
    image.src = new URL(path, ASSETS).href;
  });
}

export async function createNatural(canvas) {
  const response = await fetch(new URL('data.json', ASSETS));
  if (!response.ok) throw new Error(`Natural replay data: HTTP ${response.status}`);
  const data = await response.json();
  const scenes = await Promise.all(data.scenes.map(async scene => ({
    ...scene,
    images: await Promise.all([scene.photo, scene.depth, scene.overlay].map(loadImage)),
    // Keep each point's measured photo color; brighten only its display transfer.
    drawPoints: scene.points.map(p => ({
      xyz: p.slice(0, 3), floor: p[6],
      color: `rgb(${p.slice(3, 6).map(c => Math.round(Math.min(255, c * 1.12 + 12))).join(',')})`,
    })),
  })));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Natural replay needs a 2D canvas');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let step = 0, width = 0, height = 0, raf = 0, alive = true;
  let changedAt = performance.now(), startedAt = changedAt;

  function resize() {
    if (!alive) return;
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    const dpi = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpi);
    canvas.height = Math.round(height * dpi);
    ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
    requestDraw();
  }

  function requestDraw() {
    if (alive && !raf) raf = requestAnimationFrame(draw);
  }

  function line(a, b, color, lineWidth = 1, dashed = false) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
    ctx.setLineDash(dashed ? [4, 5] : []); ctx.stroke(); ctx.setLineDash([]);
  }

  function photoFrame(image, bounds, overlay = null, opacity = 0) {
    const [x, y, w, h] = bounds;
    const scale = Math.min(w / image.width, h / image.height);
    const dw = image.width * scale, dh = image.height * scale;
    const dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(dx, dy, dw, dh, 8); ctx.clip();
    ctx.drawImage(image, dx, dy, dw, dh);
    if (overlay && opacity > 0) {
      ctx.globalAlpha = opacity;
      ctx.drawImage(overlay, dx, dy, dw, dh);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(242,245,247,.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(dx, dy, dw, dh, 8); ctx.stroke();
  }

  function cloud(scene, rect, now, progress) {
    const [rx, ry, rw, rh] = rect;
    // Gravity is vertical in this display; the ORIGINAL camera is the small
    // frustum. This presentation viewpoint is separate from that camera.
    const wobble = reducedMotion ? 0 : Math.sin((now - startedAt) / 8500) * .085;
    const yaw = -.48 + wobble, pitch = .20;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const rotate = p => {
      const z = p[0] * sy + p[2] * cy;
      return [p[0] * cy - p[2] * sy, -p[1] * cp + z * sp, p[1] * sp + z * cp];
    };
    const floorY = -scene.height;
    const [xmin, xmax, zmin, zmax] = scene.floorBounds;
    const corners = [[xmin,floorY,zmin],[xmax,floorY,zmin],[xmax,floorY,zmax],[xmin,floorY,zmax]];
    const projected = scene.drawPoints.map(p => ({...p, p: rotate(p.xyz)}));
    const extent = projected.map(p => p.p).concat(corners.map(rotate), [rotate([0,0,0])]);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of extent) {
      minX = Math.min(minX,p[0]); maxX = Math.max(maxX,p[0]);
      minY = Math.min(minY,p[1]); maxY = Math.max(maxY,p[1]);
    }
    const pad = Math.min(40, rw * .075);
    const scale = Math.min((rw - pad * 2) / (maxX - minX), (rh - pad * 2) / (maxY - minY));
    const ox = rx + rw / 2 - (minX + maxX) / 2 * scale;
    const oy = ry + rh / 2 - (minY + maxY) / 2 * scale;
    const screen = p => [ox + p[0] * scale, oy + p[1] * scale];
    const project = p => screen(rotate(p));
    ctx.save();
    ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();

    const quad = corners.map(project);
    ctx.beginPath(); quad.forEach((p,i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath();
    ctx.fillStyle = `rgba(99,199,175,${.055 * progress})`; ctx.fill();
    for (let x = Math.ceil(xmin/.25)*.25; x <= xmax; x += .25) {
      line(project([x,floorY,zmin]), project([x,floorY,zmax]), `rgba(99,199,175,${.19*progress})`);
    }
    for (let z = Math.ceil(zmin/.25)*.25; z <= zmax; z += .25) {
      line(project([xmin,floorY,z]), project([xmax,floorY,z]), `rgba(99,199,175,${.19*progress})`);
    }

    projected.sort((a,b) => b.p[2] - a.p[2]);
    const size = clamp(scale * .014, 1.5, 3.2);
    for (const point of projected) {
      const p = screen(point.p);
      ctx.fillStyle = point.floor ? COLORS.green : point.color;
      ctx.globalAlpha = point.floor ? .88 : .8;
      ctx.fillRect(p[0] - size/2, p[1] - size/2, size, size);
    }
    ctx.globalAlpha = 1;
    quad.forEach((p,i) => line(p, quad[(i+1)%4], 'rgba(99,199,175,.40)', 1, true));

    // Camera frustum uses the real optical axis transformed by the fitted
    // gravity basis, preserving its downward tilt in this side view.
    const transform = p => scene.plane.basisDisplay.map(row => row.reduce((v,c,i) => v+c*p[i],0));
    const camera = project([0,0,0]);
    const face = [[-.09,-.065,.20],[.09,-.065,.20],[.09,.065,.20],[-.09,.065,.20]]
      .map(transform).map(project);
    face.forEach((p,i) => { line(camera,p,'rgba(242,245,247,.75)',1.2); line(p,face[(i+1)%4],'rgba(242,245,247,.75)',1.2); });
    ctx.beginPath(); ctx.arc(...camera,3.5,0,Math.PI*2); ctx.fillStyle = COLORS.ink; ctx.fill();
    label('camera', camera[0]-5, camera[1]-15, COLORS.ink, 'right');

    if (step >= 3) {
      const foot = project([0,floorY,0]);
      ctx.shadowColor = COLORS.green; ctx.shadowBlur = 10;
      line(camera,foot,COLORS.green,2.8);
      ctx.shadowBlur = 0;
      for (const y of [0,floorY]) line(project([-.065,y,0]),project([.065,y,0]),COLORS.green,2);
      // Show that the distance is perpendicular to the plane.
      const t = Math.min(.10,scene.height*.1);
      line(project([0,floorY+t,0]),project([t,floorY+t,0]),COLORS.green,1.5);
      line(project([t,floorY+t,0]),project([t,floorY,0]),COLORS.green,1.5);
      label('height', (camera[0]+foot[0])/2-12, (camera[1]+foot[1])/2, COLORS.green, 'right');

      if (step >= 4) {
        // Separate measurement bar: never draw a fabricated reference plane.
        const top = project([-.13,0,0]), bottom = project([-.13,-scene.reference,0]);
        line(top,bottom,COLORS.ink,2);
        line([top[0]-4,top[1]],[top[0]+4,top[1]],COLORS.ink,2);
        line([bottom[0]-4,bottom[1]],[bottom[0]+4,bottom[1]],COLORS.ink,2);
      }
    }
    const floorLabel = project([xmax,floorY,zmax]);
    label('fitted floor', clamp(floorLabel[0],rx+80,rx+rw-12),
          Math.min(ry+rh-12,floorLabel[1]+22), COLORS.green, 'right');
    ctx.restore();
  }

  function label(text, x, y, color, align='left') {
    ctx.font = '500 13px Inter, ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = COLORS.bg; ctx.strokeText(text,x,y);
    ctx.fillStyle = color; ctx.fillText(text,x,y);
  }

  function draw(now) {
    raf = 0;
    if (!alive) return;
    if (!canvas.getClientRects().length) return;
    ctx.clearRect(0,0,width,height); ctx.fillStyle = COLORS.bg; ctx.fillRect(0,0,width,height);
    const scene = scenes[step === 5 ? 1 : 0];
    const progress = reducedMotion ? 1 : clamp((now-changedAt)/550,0,1);
    const ease = 1-Math.pow(1-progress,3);
    const margin = clamp(width*.012,8,20), gap = clamp(width*.022,12,28);
    const w = width - margin*2, h = height-margin*2;
    if (step === 0) {
      photoFrame(scene.images[0],[margin,margin,w,h]);
    } else if (step === 1) {
      const panelWidth = (w-gap)/2;
      photoFrame(scene.images[0],[margin,margin,panelWidth,h]);
      photoFrame(scene.images[1],[margin+panelWidth+gap,margin,panelWidth,h]);
    } else if (width < 650 && height > width*.8) {
      const photoHeight = h*.39;
      photoFrame(scene.images[0],[margin,margin,w,photoHeight],scene.images[2],ease);
      cloud(scene,[margin,margin+photoHeight+gap,w,h-photoHeight-gap],now,ease);
    } else {
      const photoWidth = w*.40;
      photoFrame(scene.images[0],[margin,margin,photoWidth,h],scene.images[2],ease);
      cloud(scene,[margin+photoWidth+gap,margin,w-photoWidth-gap,h],now,ease);
    }
    if ((!reducedMotion && step >= 2) || progress < 1) requestDraw();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener('resize',resize);
  resize();
  return {
    setStep(n) {
      if (!alive) return;
      const next = clamp(Math.round(Number(n)||0),0,5);
      if (next !== step) { step = next; changedAt = performance.now(); }
      requestDraw();
    },
    destroy() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect(); window.removeEventListener('resize',resize);
    },
  };
}

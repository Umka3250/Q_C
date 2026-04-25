/* ═══════════════════════════════════════
   Quadro Center — Particle Network Engine
   Railway node network visualization
═══════════════════════════════════════ */

class ParticleNetwork {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = Object.assign({
      nodeCount: 55,
      connectionDist: 140,
      nodeColor: '208,39,45',
      streamColor: '208,39,45',
      speed: 0.18,
      streamSpeed: 0.004
    }, opts);
    this.nodes = [];
    this.streams = [];
    this.mouse = { x: -9999, y: -9999 };
    this.raf = null;
    this.resize();
    this.init();
    this.bindEvents();
    this.start();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.offsetWidth;
    const h = this.canvas.offsetHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.scale(dpr, dpr);
    this.w = w;
    this.h = h;
  }

  init() {
    this.nodes = [];
    this.streams = [];
    const count = Math.max(30, Math.min(this.opts.nodeCount, Math.floor(this.w * this.h / 14000)));
    for (let i = 0; i < count; i++) {
      this.nodes.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * this.opts.speed,
        vy: (Math.random() - 0.5) * this.opts.speed,
        r: Math.random() * 1.2 + 0.6,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02,
        isHub: Math.random() < 0.12
      });
    }
    // Seed a few data streams
    this._spawnStreams(6);
  }

  _spawnStreams(n) {
    for (let i = 0; i < n; i++) {
      const a = Math.floor(Math.random() * this.nodes.length);
      let b = Math.floor(Math.random() * this.nodes.length);
      while (b === a) b = Math.floor(Math.random() * this.nodes.length);
      this.streams.push({ a, b, t: Math.random(), dir: 1 });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.init();
    }, { passive: true });

    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    }, { passive: true });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    });
  }

  start() {
    const tick = () => {
      this.draw();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  draw() {
    const ctx = this.ctx;
    const { nodeColor, streamColor, connectionDist } = this.opts;
    ctx.clearRect(0, 0, this.w, this.h);

    // Update nodes
    this.nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -20) n.x = this.w + 20;
      if (n.x > this.w + 20) n.x = -20;
      if (n.y < -20) n.y = this.h + 20;
      if (n.y > this.h + 20) n.y = -20;
      n.pulse += n.pulseSpeed;
    });

    // Draw edges
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const ni = this.nodes[i], nj = this.nodes[j];
        const dx = ni.x - nj.x, dy = ni.y - nj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < connectionDist) {
          const alpha = (1 - dist / connectionDist) * 0.12;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${nodeColor},${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(ni.x, ni.y);
          ctx.lineTo(nj.x, nj.y);
          ctx.stroke();
        }
      }
    }

    // Mouse proximity glow
    if (this.mouse.x > 0) {
      this.nodes.forEach(n => {
        const dx = n.x - this.mouse.x, dy = n.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90) {
          const alpha = (1 - dist / 90) * 0.25;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${nodeColor},${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(this.mouse.x, this.mouse.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      });
    }

    // Draw streams (data packets traveling along edges)
    this.streams.forEach(s => {
      const a = this.nodes[s.a], b = this.nodes[s.b];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      s.t += this.opts.streamSpeed * (dist < 60 ? 2 : 1);
      if (s.t >= 1) {
        s.t = 0;
        s.a = s.b;
        // pick new target
        let tries = 0;
        do {
          s.b = Math.floor(Math.random() * this.nodes.length);
          tries++;
        } while (s.b === s.a && tries < 10);
      }
      const px = a.x + dx * s.t;
      const py = a.y + dy * s.t;
      // Comet trail
      const trailLen = 0.12;
      const t0 = Math.max(0, s.t - trailLen);
      const tx0 = a.x + dx * t0;
      const ty0 = a.y + dy * t0;
      const grad = ctx.createLinearGradient(tx0, ty0, px, py);
      grad.addColorStop(0, `rgba(${streamColor},0)`);
      grad.addColorStop(1, `rgba(${streamColor},0.9)`);
      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.moveTo(tx0, ty0);
      ctx.lineTo(px, py);
      ctx.stroke();
      // Head dot
      ctx.beginPath();
      ctx.fillStyle = `rgba(${streamColor},1)`;
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
      // Glow
      ctx.beginPath();
      const grd = ctx.createRadialGradient(px, py, 0, px, py, 8);
      grd.addColorStop(0, `rgba(${streamColor},0.3)`);
      grd.addColorStop(1, `rgba(${streamColor},0)`);
      ctx.fillStyle = grd;
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw nodes
    this.nodes.forEach(n => {
      const pulse = 0.5 + 0.5 * Math.sin(n.pulse);
      if (n.isHub) {
        // Hub: larger, glowing ring
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${nodeColor},${0.15 + pulse * 0.2})`;
        ctx.lineWidth = 0.8;
        ctx.arc(n.x, n.y, 5 + pulse * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = `rgba(${nodeColor},${0.5 + pulse * 0.3})`;
        ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${nodeColor},${0.25 + pulse * 0.15})`;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

// Route map path animation
class RouteMap {
  constructor(svgEl) {
    this.svg = svgEl;
    this.paths = [];
  }

  addPath(pathEl, opts = {}) {
    const length = pathEl.getTotalLength();
    pathEl.style.strokeDasharray = length;
    pathEl.style.strokeDashoffset = length;
    pathEl.style.transition = 'none';
    this.paths.push({ el: pathEl, length, opts });
  }

  animateIn(delay = 0) {
    this.paths.forEach((p, i) => {
      setTimeout(() => {
        p.el.style.transition = `stroke-dashoffset ${p.opts.duration || 1400}ms cubic-bezier(0.16,1,0.3,1)`;
        p.el.style.strokeDashoffset = '0';
      }, delay + i * (p.opts.stagger || 180));
    });
  }
}

// Counter animation
function animateCounter(el, target, duration = 1800, suffix = '') {
  const start = performance.now();
  const isFloat = String(target).includes('.');
  const decimals = isFloat ? String(target).split('.')[1].length : 0;
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // ease out expo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = target * eased;
    el.textContent = (isFloat
      ? current.toFixed(decimals)
      : Math.floor(current).toLocaleString('uk-UA')
    ) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

window.ParticleNetwork = ParticleNetwork;
window.RouteMap = RouteMap;
window.animateCounter = animateCounter;

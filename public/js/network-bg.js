/* Animated background: glowing particle network that reacts to the cursor. */
(function () {
  'use strict';

  var canvas = document.getElementById('network-bg');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Tunables
  var LINK_DIST    = 140;   // max distance between two particles to draw a line
  var MOUSE_RADIUS = 200;   // area of influence around the cursor
  var MOUSE_PULL   = 0.012; // attraction strength towards the cursor
  var BASE_SPEED   = 0.25;
  var MAX_SPEED    = 1.6;
  var FRICTION     = 0.985;
  var DENSITY      = 14000; // px² per particle (lower = more particles)
  var MAX_PARTICLES = 130;

  // ---- Colours from the theme tokens
  function hexToRgb(hex, fallback) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec((hex || '').trim());
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : fallback;
  }
  var styles = getComputedStyle(document.documentElement);
  var c1 = hexToRgb(styles.getPropertyValue('--accent'), [139, 147, 255]);
  var c2 = hexToRgb(styles.getPropertyValue('--accent-2'), [192, 139, 255]);
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  // Pre-rendered glow sprite for the dots (much cheaper than shadowBlur)
  var sprite = document.createElement('canvas');
  var SPRITE = 32;
  sprite.width = sprite.height = SPRITE;
  (function () {
    var s = sprite.getContext('2d');
    var g = s.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
    g.addColorStop(0, rgba([255, 255, 255], 1));
    g.addColorStop(0.18, rgba(c1, 0.9));
    g.addColorStop(0.45, rgba(c1, 0.25));
    g.addColorStop(1, rgba(c1, 0));
    s.fillStyle = g;
    s.fillRect(0, 0, SPRITE, SPRITE);
  })();

  var width = 0, height = 0, dpr = 1;
  var particles = [];
  var mouse = { x: 0, y: 0, tx: 0, ty: 0, active: false, strength: 0 };
  var running = false;
  var rafId = null;

  function rand(min, max) { return min + Math.random() * (max - min); }

  function makeParticle() {
    var angle = Math.random() * Math.PI * 2;
    var speed = rand(0.3, 1) * BASE_SPEED;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: rand(0.6, 1.4)
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var target = Math.min(MAX_PARTICLES, Math.round((width * height) / DENSITY));
    while (particles.length < target) particles.push(makeParticle());
    particles.length = target;
    particles.forEach(function (p) {
      if (p.x > width) p.x = Math.random() * width;
      if (p.y > height) p.y = Math.random() * height;
    });
  }

  function step() {
    // Ease the cursor so lines glide instead of snapping
    mouse.x += (mouse.tx - mouse.x) * 0.18;
    mouse.y += (mouse.ty - mouse.y) * 0.18;
    mouse.strength += ((mouse.active ? 1 : 0) - mouse.strength) * 0.06;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      if (mouse.strength > 0.01) {
        var dx = mouse.x - p.x;
        var dy = mouse.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 24) {
          var f = (1 - dist / MOUSE_RADIUS) * MOUSE_PULL * mouse.strength;
          p.vx += dx * f * 0.1;
          p.vy += dy * f * 0.1;
        }
      }

      var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > MAX_SPEED) {
        p.vx = (p.vx / speed) * MAX_SPEED;
        p.vy = (p.vy / speed) * MAX_SPEED;
      } else if (speed > BASE_SPEED) {
        p.vx *= FRICTION;
        p.vy *= FRICTION;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0)      { p.x = 0;      p.vx *= -1; }
      if (p.x > width)  { p.x = width;  p.vx *= -1; }
      if (p.y < 0)      { p.y = 0;      p.vy *= -1; }
      if (p.y > height) { p.y = height; p.vy *= -1; }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    var i, j, p, q, dx, dy, d2, a;
    var link2 = LINK_DIST * LINK_DIST;

    // Particle ↔ particle links
    ctx.lineWidth = 1;
    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      for (j = i + 1; j < particles.length; j++) {
        q = particles[j];
        dx = p.x - q.x;
        dy = p.y - q.y;
        d2 = dx * dx + dy * dy;
        if (d2 < link2) {
          a = (1 - Math.sqrt(d2) / LINK_DIST) * 0.35;
          ctx.strokeStyle = rgba(c1, a);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    // Cursor ↔ particle links: brighter, with a soft glow pass
    if (mouse.strength > 0.01) {
      var r2 = MOUSE_RADIUS * MOUSE_RADIUS;
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        dx = p.x - mouse.x;
        dy = p.y - mouse.y;
        d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          a = (1 - Math.sqrt(d2) / MOUSE_RADIUS) * mouse.strength;
          var grad = ctx.createLinearGradient(mouse.x, mouse.y, p.x, p.y);
          grad.addColorStop(0, rgba(c2, a * 0.9));
          grad.addColorStop(1, rgba(c1, a * 0.5));

          ctx.strokeStyle = grad;
          ctx.lineWidth = 4;
          ctx.globalAlpha = 0.18;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();

          ctx.lineWidth = 1.1;
          ctx.globalAlpha = 1;
          ctx.stroke();
        }
      }

      // Halo around the cursor
      var halo = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_RADIUS);
      halo.addColorStop(0, rgba(c2, 0.10 * mouse.strength));
      halo.addColorStop(1, rgba(c2, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(mouse.x - MOUSE_RADIUS, mouse.y - MOUSE_RADIUS, MOUSE_RADIUS * 2, MOUSE_RADIUS * 2);
    }

    // Dots
    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      var s = SPRITE * p.size * 0.5;
      ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  function frame() {
    step();
    draw();
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // ---- Events
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      if (reduceMotion) draw();
    }, 120);
  });

  if (!reduceMotion) {
    window.addEventListener('pointermove', function (e) {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
      if (!mouse.active) {
        mouse.x = mouse.tx;
        mouse.y = mouse.ty;
      }
      mouse.active = true;
    }, { passive: true });

    document.addEventListener('pointerleave', function () { mouse.active = false; });
    window.addEventListener('blur', function () { mouse.active = false; });
    window.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'touch') mouse.active = false;
    });
  }

  // Save battery when the tab is hidden
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  resize();
  canvas.classList.add('is-ready');
  if (reduceMotion) draw(); else start();
})();

/* Two particle systems in the flyer’s shapes: a drifting field of
   diamonds, stairs, crescents, and sunbursts, and a dance-floor figure
   built from the same marks. Nothing here is a listed performer. */
(function () {
  var RED = "#d21f18";
  var CREAM = "#f4ecdf";
  var INK = "#140e0c";
  var DEEP = "#6e100c";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var running = !document.hidden;
  var raf = 0;

  function fit(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (!w || !h) return null;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function diamond(ctx, x, y, s, rot, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.72, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.72, 0);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1, s * 0.12);
      ctx.stroke();
    }
    ctx.restore();
  }

  function crescent(ctx, x, y, s, rot, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, s, 0.55, Math.PI * 1.72);
    ctx.arc(s * 0.38, -s * 0.02, s * 0.76, Math.PI * 1.62, 0.7, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function stair(ctx, x, y, s, rot, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.9);
    ctx.lineTo(-s, s * 0.25);
    ctx.lineTo(-s * 0.25, s * 0.25);
    ctx.lineTo(-s * 0.25, -s * 0.35);
    ctx.lineTo(s * 0.5, -s * 0.35);
    ctx.lineTo(s * 0.5, -s);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.4, s * 0.2);
    ctx.lineJoin = "miter";
    ctx.stroke();
    ctx.restore();
  }

  function burst(ctx, x, y, s, rot, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    var n = 16;
    for (var i = 0; i < n; i++) {
      var r = i % 2 ? s : s * 0.36;
      var a = (i / n) * Math.PI * 2 - Math.PI / 2;
      var px = Math.cos(a) * r;
      var py = Math.sin(a) * r;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function mark(ctx, kind, x, y, s, rot, fill, stroke) {
    if (kind === "crescent") crescent(ctx, x, y, s, rot, fill);
    else if (kind === "stair") stair(ctx, x, y, s, rot, fill);
    else if (kind === "burst") burst(ctx, x, y, s, rot, fill);
    else diamond(ctx, x, y, s, rot, fill, stroke);
  }

  /* ---------- field: the flyer drifting across the page ---------- */

  var fieldCanvas = document.getElementById("flyer-field");
  var field = [];

  function spawnField(w, h) {
    var count = w < 700 ? 42 : 86;
    field = [];
    var kinds = ["diamond", "diamond", "diamond", "stair", "crescent", "burst"];
    var colors = [RED, CREAM, RED, CREAM, "#f0b2a4"];
    for (var i = 0; i < count; i++) {
      field.push({
        kind: kinds[i % kinds.length],
        x: Math.random() * w,
        y: Math.random() * h,
        s: 4 + Math.random() * (i % 7 === 0 ? 16 : 9),
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.01,
        vy: -(0.15 + Math.random() * 0.45),
        vx: (Math.random() - 0.5) * 0.25,
        phase: Math.random() * Math.PI * 2,
        color: colors[i % colors.length],
        stroke: i % 3 === 0 ? RED : null
      });
    }
  }

  function drawField(time) {
    if (!fieldCanvas) return;
    var view = fit(fieldCanvas);
    if (!view) return;
    var ctx = view.ctx;
    var w = view.w;
    var h = view.h;
    if (!field.length) spawnField(w, h);
    ctx.clearRect(0, 0, w, h);
    var t = time * 0.001;
    for (var i = 0; i < field.length; i++) {
      var p = field[i];
      if (!reduce) {
        p.x += p.vx + Math.sin(t * 0.7 + p.phase) * 0.15;
        p.y += p.vy;
        p.rot += p.spin;
        if (p.y < -30) {
          p.y = h + 20;
          p.x = Math.random() * w;
        }
        if (p.x < -30) p.x = w + 20;
        if (p.x > w + 30) p.x = -20;
      }
      ctx.globalAlpha = 0.55 + (i % 5) * 0.08;
      mark(ctx, p.kind, p.x, p.y, p.s, p.rot, p.color, p.stroke);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- dancers: a particle body in the flyer’s marks ---------- */

  var stage = document.getElementById("dancer-stage");

  function pose(t, ox, oy, scale, face) {
    var beat = t * Math.PI * 2 / 2.6;
    var sway = Math.sin(beat);
    var hipDrop = (0.5 + 0.5 * Math.cos(beat * 2)) * scale * 0.05;
    var hx = ox + face * sway * scale * 0.26;
    var hy = oy + hipDrop;
    var hip = { x: hx, y: hy };
    var waist = { x: hx - face * sway * scale * 0.06, y: hy - scale * 0.2 };
    var chest = { x: hx - face * sway * scale * 0.16, y: waist.y - scale * 0.26 };
    var head = {
      x: chest.x - face * sway * scale * 0.04,
      y: chest.y - scale * 0.27
    };
    var shoulderL = { x: chest.x - face * scale * 0.16, y: chest.y + scale * 0.05 };
    var shoulderR = { x: chest.x + face * scale * 0.15, y: chest.y + scale * 0.07 };
    var lift = -Math.PI * 0.72 + Math.sin(beat) * 0.7;
    var elbowL = {
      x: shoulderL.x + face * Math.cos(lift) * scale * 0.3,
      y: shoulderL.y + Math.sin(lift) * scale * 0.3
    };
    var handL = {
      x: elbowL.x + face * Math.cos(lift - 0.5) * scale * 0.26,
      y: elbowL.y + Math.sin(lift - 0.5) * scale * 0.26
    };
    var elbowR = {
      x: shoulderR.x + face * scale * 0.2,
      y: shoulderR.y + scale * 0.2 + sway * scale * 0.02
    };
    var handR = { x: hx + face * scale * 0.22, y: hy - scale * 0.02 };
    var kneeL = {
      x: hx - face * scale * (0.1 + Math.max(0, sway) * 0.12),
      y: hy + scale * (0.4 + Math.max(0, -sway) * 0.06)
    };
    var footL = { x: kneeL.x - face * scale * 0.08, y: oy + scale * 0.92 };
    var kneeR = {
      x: hx + face * scale * (0.16 + Math.max(0, -sway) * 0.08),
      y: hy + scale * (0.36 + Math.max(0, sway) * 0.1)
    };
    var footR = {
      x: kneeR.x + face * scale * (0.08 + sway * 0.05),
      y: oy + scale * 0.92
    };
    return {
      hip: hip,
      waist: waist,
      chest: chest,
      head: head,
      shoulderL: shoulderL,
      elbowL: elbowL,
      handL: handL,
      shoulderR: shoulderR,
      elbowR: elbowR,
      handR: handR,
      kneeL: kneeL,
      footL: footL,
      kneeR: kneeR,
      footR: footR
    };
  }

  function pointOn(chain, u) {
    var lengths = [];
    var total = 0;
    for (var i = 0; i < chain.length - 1; i++) {
      var dx = chain[i + 1].x - chain[i].x;
      var dy = chain[i + 1].y - chain[i].y;
      var len = Math.hypot(dx, dy) || 0.001;
      lengths.push(len);
      total += len;
    }
    var dist = u * total;
    for (var j = 0; j < lengths.length; j++) {
      if (dist <= lengths[j]) {
        var f = dist / lengths[j];
        var a = chain[j];
        var b = chain[j + 1];
        var dx2 = b.x - a.x;
        var dy2 = b.y - a.y;
        var nx = -dy2 / lengths[j];
        var ny = dx2 / lengths[j];
        return {
          x: a.x + dx2 * f,
          y: a.y + dy2 * f,
          nx: nx,
          ny: ny
        };
      }
      dist -= lengths[j];
    }
    var last = chain[chain.length - 1];
    return { x: last.x, y: last.y, nx: 0, ny: -1 };
  }

  function bodyBits(prefix) {
    var bits = [];
    function add(bone, n, girth, kind, color, stroke) {
      for (var i = 0; i < n; i++) {
        bits.push({
          bone: bone,
          u: (i + 0.5) / n,
          side: (i % 2 ? 1 : -1) * (0.25 + (i % 3) * 0.35),
          girth: girth,
          kind: kind,
          color: color,
          stroke: stroke || null,
          spin: prefix + i * 0.2
        });
      }
    }
    add("spine", 16, 1, "diamond", RED, null);
    add("legL", 9, 0.7, "diamond", INK, RED);
    add("legR", 9, 0.7, "diamond", INK, CREAM);
    add("armL", 8, 0.55, "diamond", CREAM, null);
    add("armR", 8, 0.55, "diamond", RED, null);
    return bits;
  }

  function skirtBits(n) {
    var bits = [];
    var kinds = ["crescent", "diamond", "stair", "diamond"];
    for (var i = 0; i < n; i++) {
      bits.push({
        angle: Math.PI * 0.15 + (i / n) * Math.PI * 0.7,
        len: 36 + (i % 6) * 22,
        lag: 0,
        kind: kinds[i % kinds.length],
        color: i % 2 ? RED : CREAM,
        s: 6 + (i % 4) * 2.5,
        phase: i * 0.37
      });
    }
    return bits;
  }

  var leadBits = bodyBits(0.4);
  var partnerBits = bodyBits(1.1);
  var leadSkirt = skirtBits(28);
  var partnerSkirt = skirtBits(22);
  var sparks = [];
  for (var s = 0; s < 18; s++) {
    sparks.push({ life: Math.random(), x: 0, y: 0, vx: 0, vy: 0, s: 3 + Math.random() * 4 });
  }

  function chains(p) {
    return {
      spine: [p.hip, p.waist, p.chest, p.head],
      legL: [p.hip, p.kneeL, p.footL],
      legR: [p.hip, p.kneeR, p.footR],
      armL: [p.shoulderL, p.elbowL, p.handL],
      armR: [p.shoulderR, p.elbowR, p.handR]
    };
  }

  function drawBody(ctx, bones, bits, scale, time) {
    var map = chains(bones);
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(210, 31, 24, 0.35)";
    ctx.lineWidth = Math.max(2, scale * 0.02);
    ["spine", "legL", "legR", "armL", "armR"].forEach(function (name) {
      var chain = map[name];
      ctx.beginPath();
      ctx.moveTo(chain[0].x, chain[0].y);
      for (var i = 1; i < chain.length; i++) ctx.lineTo(chain[i].x, chain[i].y);
      ctx.stroke();
    });
    for (var i = 0; i < bits.length; i++) {
      var bit = bits[i];
      var spot = pointOn(map[bit.bone], bit.u);
      var bulge = 0.7;
      if (bit.bone === "spine") {
        if (bit.u < 0.22) bulge = 2.6;
        else if (bit.u < 0.4) bulge = 0.55;
        else if (bit.u < 0.72) bulge = 1.9;
        else bulge = 0.4;
      }
      var g = bit.girth * scale * 0.06 * bulge;
      var x = spot.x + spot.nx * bit.side * g;
      var y = spot.y + spot.ny * bit.side * g;
      var size = (bit.bone === "spine" ? 6.5 + bulge * 2.2 : 5) * (scale / 240);
      size = Math.max(3.2, size);
      mark(ctx, bit.kind, x, y, size, time * 0.4 + bit.spin, bit.color, bit.stroke);
    }
    crescent(ctx, bones.head.x, bones.head.y, scale * 0.11, -0.5, CREAM);
    burst(ctx, bones.head.x + scale * 0.02, bones.head.y - scale * 0.02, scale * 0.035, time * 0.6, RED);
  }

  function drawSkirt(ctx, bones, bits, face, time) {
    var beat = time * Math.PI * 2 / 2.6;
    for (var i = 0; i < bits.length; i++) {
      var bit = bits[i];
      var swing = Math.sin(beat + bit.phase) * 0.55 * face;
      var target = bit.angle + swing;
      bit.lag += (target - bit.lag) * (reduce ? 1 : 0.08);
      var len = bit.len * (0.85 + 0.15 * Math.sin(beat * 2 + bit.phase));
      var x = bones.hip.x + Math.cos(bit.lag) * len * face;
      var y = bones.hip.y + Math.sin(bit.lag) * len * 0.95;
      mark(ctx, bit.kind, x, y, bit.s, bit.lag, bit.color, null);
    }
  }

  function drawSnake(ctx, x, y, width, time) {
    var n = 26;
    for (var i = 0; i < n; i++) {
      var u = i / (n - 1);
      var px = x - width / 2 + u * width;
      var wave = Math.sin(time * 2.4 + i * 0.45);
      var py = y + wave * 16;
      var s = 4 + (i % 5 === 0 ? 4 : 0);
      var color = i % 2 ? RED : INK;
      diamond(ctx, px, py, s, wave * 0.4, color, i % 2 ? null : RED);
      if (i === n - 2) burst(ctx, px + 10, py - 8, 7, time, CREAM);
    }
  }

  function drawSparks(ctx, hand, time) {
    var beat = (time * Math.PI * 2) / 2.6;
    var kick = Math.max(0, Math.sin(beat));
    for (var i = 0; i < sparks.length; i++) {
      var p = sparks[i];
      if (!reduce) {
        p.life -= 0.012;
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.02;
        if (p.life <= 0) {
          p.life = 0.4 + Math.random() * 0.8;
          p.x = hand.x;
          p.y = hand.y;
          p.vx = (Math.random() - 0.5) * 1.4;
          p.vy = -0.4 - Math.random() * 1.3 * (0.4 + kick);
        }
      } else if (!p.x) {
        p.x = hand.x + (i - 9) * 6;
        p.y = hand.y - i * 3;
        p.life = 0.8;
      }
      ctx.globalAlpha = Math.max(0, p.life);
      if (i % 3 === 0) burst(ctx, p.x, p.y, p.s, time + i, CREAM);
      else diamond(ctx, p.x, p.y, p.s, time + i, RED, null);
    }
    ctx.globalAlpha = 1;
  }

  function drawStage(time) {
    if (!stage) return;
    var view = fit(stage);
    if (!view) return;
    var ctx = view.ctx;
    var w = view.w;
    var h = view.h;
    var seconds = time * 0.001;
    ctx.clearRect(0, 0, w, h);
    var pair = w >= 760;
    var scale = Math.min(w, h) * (pair ? 0.34 : 0.46);
    var floorY = h * 0.74;
    drawSnake(ctx, w * 0.5, floorY + Math.min(18, h * 0.03), Math.min(w * 0.86, 920), seconds);

    var lead = pose(seconds, pair ? w * 0.36 : w * 0.5, floorY - scale * 0.92, scale, 1);
    drawSkirt(ctx, lead, leadSkirt, 1, seconds);
    drawBody(ctx, lead, leadBits, scale, seconds);
    drawSparks(ctx, lead.handL, seconds);

    if (pair) {
      var partner = pose(seconds + 0.85, w * 0.66, floorY - scale * 0.86, scale * 0.92, -1);
      ctx.globalAlpha = 0.92;
      drawSkirt(ctx, partner, partnerSkirt, -1, seconds + 0.85);
      drawBody(ctx, partner, partnerBits, scale * 0.92, seconds + 0.4);
      ctx.globalAlpha = 1;
    }
  }

  function frame(now) {
    drawField(now);
    drawStage(now);
    if (running && !reduce) raf = requestAnimationFrame(frame);
  }

  function boot() {
    if (fieldCanvas) {
      var box = fit(fieldCanvas);
      if (box) spawnField(box.w, box.h);
    }
    frame(performance.now());
  }

  window.addEventListener("resize", function () {
    field = [];
    if (!running || reduce) frame(performance.now());
  });

  document.addEventListener("visibilitychange", function () {
    running = !document.hidden && !reduce;
    if (running) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

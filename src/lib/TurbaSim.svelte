<script lang="ts">
    import { onMount, onDestroy } from "svelte";
  
    export let payload: {
      case_id: string;
      meta: Record<string, any>;
      series: Array<{
        date: string;
        engagement: number;
        contagio: number;
        pluralidad: number;
        resistencia: number;
        contra_flujo: number;
      }>;
    };
  
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;
  
    // timeline
    let t = 0;              // índice en series
    let playing = true;
    let speed = 1;          // pasos por frame “lento”
    let raf = 0;
  
    // hover
    let hoverId: number | null = null;
  
    // particles
    type P = {
      id: number;
      x: number; y: number;
      vx: number; vy: number;
      role: "turba" | "contra";
      base: number; // semilla individual 0..1
    };
  
    const N_TURBA = 120;
    const N_CONTRA = 55;
    let pts: P[] = [];
  
    function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
    function lerp(a: number, b: number, k: number) { return a + (b - a) * k; }
  
    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  
    function initParticles() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const cx = w * 0.5, cy = h * 0.5;
  
      const rnd = (seed: number) => {
        // pseudo random determinista (para que no “salte” al recargar)
        const x = Math.sin(seed * 9999) * 10000;
        return x - Math.floor(x);
      };
  
      pts = [];
      for (let i = 0; i < N_TURBA; i++) {
        const s = i + 1;
        const r = rnd(s);
        pts.push({
          id: i,
          role: "turba",
          base: r,
          x: cx + (rnd(s * 3) - 0.5) * 220,
          y: cy + (rnd(s * 7) - 0.5) * 220,
          vx: 0,
          vy: 0
        });
      }
      for (let i = 0; i < N_CONTRA; i++) {
        const id = N_TURBA + i;
        const s = id + 1;
        const r = rnd(s);
        // contra nace “en el borde” y entra cuando hay contra_flujo
        const angle = rnd(s * 11) * Math.PI * 2;
        const R = Math.max(w, h) * 0.55;
        pts.push({
          id,
          role: "contra",
          base: r,
          x: cx + Math.cos(angle) * R,
          y: cy + Math.sin(angle) * R,
          vx: 0,
          vy: 0
        });
      }
    }
  
    function narrative(row: any) {
      // micro-texto tipo “voz en off”
      const e = row.engagement ?? 0;
      const c = row.contagio ?? 0;
      const p = row.pluralidad ?? 0;
      const r = row.resistencia ?? 0;
      const k = row.contra_flujo ?? 0;
  
      if (e < 0.15 && k < 0.15) return "Silencio relativo: el tema no prende.";
      if (e > 0.55 && c > 0.5 && k < 0.25) return "La turba se alinea: mismo relato, menos matices.";
      if (p > 0.6 && e > 0.35) return "Debate fragmentado: memes, bandos, lecturas cruzadas.";
      if (k > 0.55 && e > 0.35) return "Contraataque: aparece un relato alternativo organizado.";
      if (r > 0.6 && e < 0.35) return "Fatiga: el interés baja, pero queda cicatriz.";
      return "Tensión estable: ruido sostenido sin giro claro.";
    }
  
    function step() {
      if (!ctx || !payload?.series?.length) return;
  
      // avance timeline
      if (playing) {
        t = Math.min(payload.series.length - 1, t + speed * 0.15);
        if (t >= payload.series.length - 1) playing = false;
      }
      const i = Math.floor(t);
      const row = payload.series[i];
  
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const cx = w * 0.5, cy = h * 0.5;
  
      // variables clave
      const engagement = clamp01(row.engagement ?? 0);
      const contagio = clamp01(row.contagio ?? 0);
      const pluralidad = clamp01(row.pluralidad ?? 0);
      const resistencia = clamp01(row.resistencia ?? 0);
      const contra = clamp01(row.contra_flujo ?? 0);
  
      // --- Mapeo visual “con sentido” ---
      // Tamaño: engagement
      const baseRadius = lerp(2.5, 7.5, engagement);
  
      // Cohesión: contagio (turba se compacta)
      const pullTurba = lerp(0.015, 0.09, contagio);
  
      // Dispersión: pluralidad (cuando hay debate, se separan en subgrupos)
      const scatter = lerp(0.00, 0.06, pluralidad);
  
      // Fricción: resistencia (cuesta moverlos)
      const friction = lerp(0.86, 0.94, resistencia);
  
      // Contra: fuerza de entrada del contra-flujo
      const pullContra = lerp(0.00, 0.08, contra);
  
      // “enemigo” (punto objetivo de turba vs contra)
      // La turba “ataca” un foco (victima) en el centro-izq
      // La contra “empuja” hacia un foco alternativo (derecha)
      const focusVictima = { x: cx - w * 0.12, y: cy };
      const focusContra = { x: cx + w * 0.18, y: cy };
  
      // fondo
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0b0b10";
      ctx.fillRect(0, 0, w, h);
  
      // líneas suaves entre vecinos si contagio alto (visualiza “enjambre”)
      if (contagio > 0.35) drawLinks(contagio);
  
      // actualiza puntos
      for (const p of pts) {
        // aparece contra gradualmente: si contra es bajo, se quedan fuera (o casi invisibles)
        const visible = p.role === "turba" ? 1 : contra;
        if (visible < 0.02) continue;
  
        // objetivo según rol
        const tx = p.role === "turba" ? focusVictima.x : focusContra.x;
        const ty = p.role === "turba" ? focusVictima.y : focusContra.y;
  
        // fuerzas: atracción + dispersión + “fricción social”
        const dx = tx - p.x;
        const dy = ty - p.y;
  
        const pull = p.role === "turba" ? pullTurba : pullContra;
  
        // dispersión pseudo-aleatoria controlada (pluralidad)
        const ang = p.base * Math.PI * 2 + t * 0.02;
        const sx = Math.cos(ang) * scatter * 220;
        const sy = Math.sin(ang) * scatter * 220;
  
        p.vx = (p.vx + dx * pull + sx) * friction;
        p.vy = (p.vy + dy * pull + sy) * friction;
  
        p.x += p.vx;
        p.y += p.vy;
  
        // límites suaves
        p.x = Math.max(10, Math.min(w - 10, p.x));
        p.y = Math.max(10, Math.min(h - 10, p.y));
  
        // estilo
        const isHover = hoverId === p.id;
  
        // color: turba = rojo/ámbar (mordida), contra = azul/verde (cura)
        // intensidad: contagio / contra
        let a = p.role === "turba" ? lerp(0.25, 0.95, contagio) : lerp(0.20, 0.95, contra);
        a *= visible;
  
        ctx.beginPath();
        const r = baseRadius * (p.role === "turba" ? 1 : 0.9) * (isHover ? 1.6 : 1);
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  
        if (p.role === "turba") {
          ctx.fillStyle = `rgba(255, 94, 77, ${a})`;
        } else {
          ctx.fillStyle = `rgba(80, 180, 255, ${a})`;
        }
        ctx.fill();
  
        // borde para lectura
        ctx.strokeStyle = `rgba(255,255,255,${isHover ? 0.35 : 0.10})`;
        ctx.lineWidth = isHover ? 2 : 1;
        ctx.stroke();
      }
  
      // dibuja los “focos” (víctima vs contra relato)
      drawFocus(focusVictima.x, focusVictima.y, "víctima/relato dominante", "rgba(255,94,77,0.55)");
      drawFocus(focusContra.x, focusContra.y, "contra-relato", "rgba(80,180,255,0.55)");
  
      // HUD leyenda + estado
      drawHUD(row, { engagement, contagio, pluralidad, resistencia, contra });
  
      raf = requestAnimationFrame(step);
    }
  
    function drawLinks(contagio: number) {
      if (!ctx) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
  
      // solo turba para no saturar
      const turba = pts.filter(p => p.role === "turba");
      const maxLinks = Math.floor(120 + contagio * 250);
  
      ctx.lineWidth = 1;
      let drawn = 0;
  
      for (let i = 0; i < turba.length && drawn < maxLinks; i++) {
        const a = turba[i];
        // vecino “aproximado” por índices (barato y funciona)
        const b = turba[(i + 7) % turba.length];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < 140*140) {
          const alpha = lerp(0.02, 0.18, contagio);
          ctx.strokeStyle = `rgba(255, 140, 120, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          drawn++;
        }
      }
    }
  
    function drawFocus(x: number, y: number, label: string, color: string) {
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
  
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(label, x + 14, y - 12);
    }
  
    function drawHUD(row: any, v: any) {
      if (!ctx) return;
      const w = canvas.clientWidth;
  
      const pad = 12;
      const boxW = Math.min(460, w - 24);
      const x = 12, y = 12;
  
      // caja
      ctx.fillStyle = "rgba(20, 20, 28, 0.72)";
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, boxW, 112, 14);
      ctx.fill();
      ctx.stroke();
  
      // título
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "600 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      const title = payload?.meta?.ejemplo ?? payload?.case_id ?? "Caso";
      ctx.fillText(title, x + pad, y + 22);
  
      // fecha
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(row?.date ?? "", x + pad, y + 42);
  
      // barras rápidas (leyenda “operativa”)
      drawBar(x + pad, y + 54, 160, "Engagement", v.engagement, "rgba(255,255,255,0.65)");
      drawBar(x + pad, y + 74, 160, "Contagio", v.contagio, "rgba(255,94,77,0.8)");
      drawBar(x + pad, y + 94, 160, "Contra", v.contra, "rgba(80,180,255,0.85)");
  
      // texto narrativo
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      const text = narrative(row);
      wrapText(ctx, text, x + pad + 180, y + 58, boxW - (pad*2 + 180), 16);
    }
  
    function drawBar(x: number, y: number, w: number, label: string, value: number, color: string) {
      if (!ctx) return;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(label, x, y);
  
      const bx = x + 76, bw = w - 76, bh = 8;
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(bx, y - 9, bw, bh);
      ctx.fillStyle = color;
      ctx.fillRect(bx, y - 9, bw * clamp01(value), bh);
    }
  
    function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      const rr = Math.min(r, w/2, h/2);
      ctx.beginPath();
      ctx.moveTo(x+rr, y);
      ctx.arcTo(x+w, y, x+w, y+h, rr);
      ctx.arcTo(x+w, y+h, x, y+h, rr);
      ctx.arcTo(x, y+h, x, y, rr);
      ctx.arcTo(x, y, x+w, y, rr);
      ctx.closePath();
    }
  
    function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
      const words = text.split(" ");
      let line = "";
      let yy = y;
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (ctx.measureText(test).width > maxW) {
          ctx.fillText(line, x, yy);
          line = w;
          yy += lineH;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, x, yy);
    }
  
    function onMouseMove(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
  
      // detecta punto cercano
      let best: { id: number; d2: number } | null = null;
      for (const p of pts) {
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx*dx + dy*dy;
        if (d2 < 12*12 && (!best || d2 < best.d2)) best = { id: p.id, d2 };
      }
      hoverId = best ? best.id : null;
    }
  
    function playPause() { playing = !playing; if (playing) raf = requestAnimationFrame(step); }
    function reset() { t = 0; playing = true; initParticles(); }
    function seek(k: number) { t = clamp01(k) * (payload.series.length - 1); }
  
    onMount(() => {
      ctx = canvas.getContext("2d");
      resize();
      initParticles();
      window.addEventListener("resize", resize);
      raf = requestAnimationFrame(step);
    });
  
    onDestroy(() => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    });
  </script>
  
  <div class="wrap">
    <canvas bind:this={canvas} on:mousemove={onMouseMove}></canvas>
  
    <div class="controls">
      <button on:click={playPause}>{playing ? "Pausa" : "Play"}</button>
      <button on:click={reset}>Reset</button>
  
      <label class="slider">
        <span>Timeline</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={payload?.series?.length ? (t / (payload.series.length - 1)) : 0}
          on:input={(e)=>seek(parseFloat((e.target as HTMLInputElement).value))}
        />
      </label>
  
      <label class="slider">
        <span>Velocidad</span>
        <input type="range" min="0.5" max="4" step="0.5" bind:value={speed} />
      </label>
  
      <div class="legend">
        <div class="item"><span class="dot turba"></span> Turba (relato dominante)</div>
        <div class="item"><span class="dot contra"></span> Contra-flujo (respuesta)</div>
        <div class="item small">Tamaño = engagement · Compactación = contagio · Dispersión = pluralidad</div>
      </div>
    </div>
  </div>
  
  <style>
    .wrap{
      position: relative;
      width: 100%;
      height: 560px;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
      background: #0b0b10;
    }
    canvas{
      width: 100%;
      height: 100%;
      display:block;
    }
    .controls{
      position:absolute;
      left: 12px;
      bottom: 12px;
      display:flex;
      gap: 10px;
      align-items:flex-end;
      padding: 10px;
      border-radius: 14px;
      background: rgba(20,20,28,0.72);
      border: 1px solid rgba(255,255,255,0.10);
      color: rgba(255,255,255,0.9);
      font: 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      backdrop-filter: blur(8px);
    }
    button{
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.14);
      color: rgba(255,255,255,0.9);
      border-radius: 10px;
      padding: 8px 10px;
      cursor: pointer;
    }
    button:hover{ background: rgba(255,255,255,0.14); }
    .slider{
      display:flex;
      flex-direction:column;
      gap: 6px;
      min-width: 220px;
    }
    .slider span{ opacity: 0.75; }
    input[type="range"]{ width: 220px; }
    .legend{
      display:flex;
      flex-direction:column;
      gap: 6px;
      margin-left: 6px;
      max-width: 260px;
    }
    .item{ display:flex; align-items:center; gap:8px; }
    .item.small{ opacity: 0.75; font-size: 11px; line-height: 1.2; }
    .dot{
      width: 10px; height: 10px; border-radius: 999px; display:inline-block;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .dot.turba{ background: rgba(255, 94, 77, 0.9); }
    .dot.contra{ background: rgba(80, 180, 255, 0.95); }
  </style>
  
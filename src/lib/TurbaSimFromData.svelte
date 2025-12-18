<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { getTurbaPayload, type TurbaPayload } from './turbaData';

    export let caseId: string;

    // -----------------------------
    // Tipos
    // -----------------------------
    type Cluster = {
        id: number;
        side: 'turba' | 'contra';
        x: number;
        y: number;
        vx: number;
        vy: number;
        w: number; // peso/masa del cluster
        active: boolean;
    };

    type Particle = {
        x: number;
        y: number;
        vx: number;
        vy: number;
        opinion: number; // -1 turba ... +1 contra (sirve solo como "bando")
        sus: number; // susceptibilidad 0..1
        cluster: number; // id del cluster al que sigue
        ox: number; // offset fijo dentro del cluster (para que haya nube)
        oy: number;
    };

    // -----------------------------
    // Estado / payload
    // -----------------------------
    let payload: TurbaPayload | null = null;

    // UI
    let speed = 20; // días por segundo
    let tDays = 0; // índice temporal continuo
    let running = true;

    // variables 0..1 del dataset (interpoladas)
    let engagement = 0.3;
    let contagio = 0.2;
    let pluralidad = 0.5;
    let resistencia = 0.2;
    let contra = 0.0;

    // -----------------------------
    // Canvas
    // -----------------------------
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;
    const W = 980;
    const H = 520;

    // -----------------------------
    // Simulación
    // -----------------------------
    // Partículas
    const N = 1400;
    let particles: Particle[] = [];

    // Clusters (centros de masa)
    let clusters: Cluster[] = [];
    const K_TURBA_MAX = 7;
    const K_CONTRA_MAX = 4;

    // “Focos” (solo para dibujar contexto, no gobiernan el movimiento como antes)
    const focusTurba = { x: 0, y: 0 };
    const focusContra = { x: 0, y: 0 };

    // Loop
    let raf = 0;
    let last = 0;

    // -----------------------------
    // Utilidades
    // -----------------------------
    const clamp = (v: number, a: number, b: number) =>
        Math.max(a, Math.min(b, v));
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // -----------------------------
    // Datos -> variables
    // -----------------------------
    function sampleSeries(series: TurbaPayload['series'], t: number) {
        if (!series?.length) return null;
        const max = series.length - 1;
        const tClamped = clamp(t, 0, max);

        const i0 = Math.floor(tClamped);
        const i1 = Math.min(max, i0 + 1);
        const f = clamp(tClamped - i0, 0, 1);

        const p0 = series[i0];
        const p1 = series[i1];

        return {
            date: f < 0.5 ? p0.date : p1.date,
            engagement: lerp(p0.engagement, p1.engagement, f),
            contagio: lerp(p0.contagio, p1.contagio, f),
            pluralidad: lerp(p0.pluralidad, p1.pluralidad, f),
            resistencia: lerp(p0.resistencia, p1.resistencia, f),
            contra: lerp(p0.contra_flujo, p1.contra_flujo, f),
        };
    }

    function applyData(dtSeconds: number) {
        if (!payload) return;

        // avanza timeline
        tDays += dtSeconds * speed;
        const maxDays = payload.series.length - 1;
        if (tDays > maxDays) tDays = maxDays;

        const s = sampleSeries(payload.series, tDays);
        if (!s) return;

        engagement = clamp(s.engagement, 0, 1);
        contagio = clamp(s.contagio, 0, 1);
        pluralidad = clamp(s.pluralidad, 0, 1);
        resistencia = clamp(s.resistencia, 0, 1);
        contra = clamp(s.contra, 0, 1);

        // focos (solo “story anchors” visuales)
        focusTurba.x = W * 0.42;
        focusTurba.y = H * 0.52;
        focusContra.x = W * 0.62;
        focusContra.y = H * 0.48;
    }

    // -----------------------------
    // Inicialización
    // -----------------------------
    function initClusters() {
        clusters = [];

        // turba clusters: zona izquierda-centro
        for (let k = 0; k < K_TURBA_MAX; k++) {
            clusters.push({
                id: k,
                side: 'turba',
                x: W * 0.40 + rand(-120, 80),
                y: H * 0.50 + rand(-150, 150),
                vx: rand(-8, 8),
                vy: rand(-8, 8),
                w: 1,
                active: true,
            });
        }

        // contra clusters: zona derecha-centro
        for (let k = 0; k < K_CONTRA_MAX; k++) {
            clusters.push({
                id: K_TURBA_MAX + k,
                side: 'contra',
                x: W * 0.62 + rand(-80, 120),
                y: H * 0.50 + rand(-150, 150),
                vx: rand(-8, 8),
                vy: rand(-8, 8),
                w: 0.2,
                active: false, // aparecen cuando contra sube
            });
        }
    }

    function resetParticles() {
        // cuantos clusters activos según pluralidad/contra (primer frame)
        const activeTurba = Math.max(
            1,
            Math.round(lerp(2, K_TURBA_MAX, pluralidad))
        );
        const activeContra = Math.max(
            1,
            Math.round(lerp(1, K_CONTRA_MAX, contra))
        );

        particles = Array.from({ length: N }, (_, i) => {
            // reparte población: siempre hay turba; contra aparece con contra (pero desde el inicio asignamos algunos)
            const isContra =
                Math.random() < 0.18 + 0.55 * contra; // proporción contra sube con contra_flujo
            const side: 'turba' | 'contra' = isContra ? 'contra' : 'turba';

            const clusterBase =
                side === 'turba'
                    ? (i % activeTurba)
                    : K_TURBA_MAX + (i % activeContra);

            const c = clusters[clusterBase] ?? {
                x: rand(0, W),
                y: rand(0, H),
            };

            return {
                x: c.x + rand(-40, 40),
                y: c.y + rand(-40, 40),
                vx: rand(-10, 10),
                vy: rand(-10, 10),
                opinion: side === 'contra' ? rand(0.2, 1.0) : rand(-1.0, -0.2),
                sus: rand(0.2, 1.0),
                cluster: clusterBase,
                ox: rand(-90, 90),
                oy: rand(-90, 90),
            };
        });
    }

    function rewind() {
        tDays = 0;
        initClusters();
        resetParticles();
    }

    // -----------------------------
    // Física de clusters
    // -----------------------------
    function stepClusters(dt: number) {
        // Cuántos clusters activos según pluralidad/contra
        const activeTurba = Math.max(
            1,
            Math.round(lerp(2, K_TURBA_MAX, pluralidad))
        );
        const activeContra = Math.max(
            1,
            Math.round(lerp(1, K_CONTRA_MAX, contra))
        );

        // Activa/desactiva clusters
        for (const c of clusters) {
            if (c.side === 'turba') {
                c.active = c.id < activeTurba;
                c.w = 0.7 + 1.7 * engagement; // turba crece con engagement
            } else {
                const idx = c.id - K_TURBA_MAX;
                c.active = idx < activeContra && contra > 0.05;
                c.w = 0.15 + 2.1 * contra; // contra “existe” cuando contra sube
            }
        }

        // Parámetros narrativos
        const cohesion = (0.004 + 0.032 * contagio) * (1 - 0.7 * pluralidad); // contagio compacta, pluralidad dificulta
        const repulsion = 0.015 + 0.12 * pluralidad; // pluralidad separa clusters
        const push = 0.03 + 0.20 * contra; // contra empuja a turba
        const drift = 14 + 60 * engagement; // caudal general
        const friction = 0.86 + 0.10 * resistencia; // resistencia = viscosidad

        // 1) atracción a focos (turba hacia focusTurba, contra hacia focusContra)
        for (const c of clusters) {
            if (!c.active) continue;

            const fx = c.side === 'turba' ? focusTurba.x : focusContra.x;
            const fy = c.side === 'turba' ? focusTurba.y : focusContra.y;

            const dx = fx - c.x;
            const dy = fy - c.y;

            c.vx += dx * cohesion * dt;
            c.vy += dy * cohesion * dt;

            // drift horizontal: turba “fluye” a la derecha; contra empuja a la izquierda
            const dir = c.side === 'turba' ? 1 : -1;
            c.vx += dir * drift * dt * (0.08 + 0.30 * (c.side === 'contra' ? contra : contagio));
        }

        // 2) repulsión entre clusters activos (separación)
        for (let i = 0; i < clusters.length; i++) {
            const a = clusters[i];
            if (!a.active) continue;
            for (let j = i + 1; j < clusters.length; j++) {
                const b = clusters[j];
                if (!b.active) continue;

                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const d2 = dx * dx + dy * dy + 1e-3;

                const f = (repulsion / d2) * dt * 220;

                a.vx += dx * f;
                a.vy += dy * f;
                b.vx -= dx * f;
                b.vy -= dy * f;
            }
        }

        // 3) contra empuja a turba (colisión de relatos)
        if (contra > 0.05) {
            for (const cC of clusters) {
                if (!cC.active || cC.side !== 'contra') continue;
                for (const cT of clusters) {
                    if (!cT.active || cT.side !== 'turba') continue;

                    const dx = cT.x - cC.x;
                    const dy = cT.y - cC.y;
                    const d = Math.sqrt(dx * dx + dy * dy) + 1e-3;

                    // empuje proporcional
                    cT.vx += (dx / d) * push * 160 * dt;
                    cT.vy += (dy / d) * push * 70 * dt;
                }
            }
        }

        // integrar + fricción + límites
        for (const c of clusters) {
            if (!c.active) continue;

            // límite de velocidad de cluster
            const vmax = 120 + 220 * engagement;
            const v = Math.sqrt(c.vx * c.vx + c.vy * c.vy) + 1e-3;
            if (v > vmax) {
                c.vx = (c.vx / v) * vmax;
                c.vy = (c.vy / v) * vmax;
            }

            c.vx *= friction;
            c.vy *= friction;

            c.x += c.vx * dt;
            c.y += c.vy * dt;

            // wrap horizontal (flujo continuo)
            if (c.x < -30) c.x = W + 30;
            if (c.x > W + 30) c.x = -30;

            // límites verticales suaves
            c.y = clamp(c.y, 40, H - 60);
        }
    }

    // -----------------------------
    // Física de partículas: siguen clusters
    // -----------------------------
    function stepParticles(dt: number) {
        // cómo “de apretados” van los puntos en torno a su cluster
        const follow = 0.030 + 0.12 * contagio; // contagio pega
        const spread = 0.65 + 2.8 * pluralidad; // pluralidad abre la nube
        const jitter = 8 + 22 * pluralidad; // vibración extra

        const friction = 0.86 + 0.10 * resistencia;

        for (const p of particles) {
            const c = clusters[p.cluster];

            // Si cluster está inactivo (por pluralidad/contra), reasigna a uno activo del mismo lado
            if (!c || !c.active) {
                const wantContra = p.opinion > 0;
                const candidates = clusters.filter(
                    (x) => x.active && (wantContra ? x.side === 'contra' : x.side === 'turba')
                );
                if (candidates.length) {
                    const pick = candidates[(Math.random() * candidates.length) | 0];
                    p.cluster = pick.id;
                }
            }

            const c2 = clusters[p.cluster];
            if (!c2 || !c2.active) continue;

            // target dentro del cluster
            const tx = c2.x + p.ox * spread * 0.22;
            const ty = c2.y + p.oy * spread * 0.22;

            // seguimiento al cluster
            p.vx += (tx - p.x) * follow;
            p.vy += (ty - p.y) * follow;

            // ruido controlado (pluralidad) para que no sea “bola perfecta”
            p.vx += rand(-1, 1) * jitter * dt;
            p.vy += rand(-1, 1) * jitter * dt;

            // fricción
            p.vx *= friction;
            p.vy *= friction;

            // mover
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // wrap horizontal
            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;

            // rebote vertical suave
            if (p.y < 0) {
                p.y = 0;
                p.vy *= -0.35;
            }
            if (p.y > H) {
                p.y = H;
                p.vy *= -0.35;
            }
        }
    }

    function stepPhysics(dtSeconds: number) {
        // 1) clusters se mueven como entidades
        stepClusters(dtSeconds);
        // 2) partículas siguen clusters
        stepParticles(dtSeconds);
    }

    // -----------------------------
    // Timeline inferior + narrativa
    // -----------------------------
    function topKPeaks(series: any[], key: string, k = 6) {
        const arr = series.map((d, i) => ({ i, v: Number(d?.[key] ?? 0) }));
        arr.sort((a, b) => b.v - a.v);
        const chosen: number[] = [];
        for (const it of arr) {
            if (chosen.length >= k) break;
            if (chosen.every((j) => Math.abs(j - it.i) > 7)) chosen.push(it.i);
        }
        chosen.sort((a, b) => a - b);
        return chosen;
    }

    function describeState() {
        if (engagement < 0.15) return 'Ruido débil: el tema no prende.';
        if (engagement > 0.6 && contagio > 0.5 && contra < 0.2)
            return 'La turba se alinea y amplifica el relato dominante.';
        if (pluralidad > 0.6)
            return 'El discurso se fragmenta: aparecen subgrupos y bandos.';
        if (contra > 0.5) return 'Aparece un contra-relato organizado que empuja.';
        if (resistencia > 0.6) return 'Fatiga social: el interés decae.';
        return 'Tensión sostenida.';
    }

    function drawTimeline() {
        if (!ctx || !payload) return;

        const S = payload.series;
        const n = S.length;
        if (n < 2) return;

        const padX = 18;
        const barH = 12;
        const y = H - 28;
        const x0 = padX;
        const x1 = W - padX;
        const w = x1 - x0;

        const prog = clamp(tDays / (n - 1), 0, 1);
        const px = x0 + w * prog;

        // base
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x0, y, w, barH);

        // relleno progreso
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x0, y, w * prog, barH);

        // picos
        const peaksE = topKPeaks(S, 'engagement', 5);
        const peaksC = topKPeaks(S, 'contra_flujo', 4);

        for (const i of peaksE) {
            const xx = x0 + (i / (n - 1)) * w;
            ctx.fillStyle = 'rgba(255,90,70,0.9)';
            ctx.fillRect(xx - 1, y - 6, 2, barH + 12);
        }
        for (const i of peaksC) {
            const xx = x0 + (i / (n - 1)) * w;
            ctx.fillStyle = 'rgba(80,180,255,0.9)';
            ctx.fillRect(xx - 1, y - 6, 2, barH + 12);
        }

        // playhead
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, y - 10);
        ctx.lineTo(px, y + barH + 10);
        ctx.stroke();

        // fecha
        const ii = Math.floor(clamp(tDays, 0, n - 1));
        const d = S[ii]?.date ?? '';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText(d, x0, y - 10);

        // mini leyenda derecha
        const lx = x1 - 190;
        ctx.fillStyle = 'rgba(255,90,70,0.9)';
        ctx.fillRect(lx, y - 12, 10, 10);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText('Pico engagement', lx + 14, y - 3);

        ctx.fillStyle = 'rgba(80,180,255,0.9)';
        ctx.fillRect(lx, y + 4, 10, 10);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText('Pico contra', lx + 14, y + 13);
    }

    // -----------------------------
    // Render
    // -----------------------------
    function draw() {
        if (!ctx || !payload) return;

        // fondo
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        // dibuja clusters (centroides) para que se entienda “formación de grupos”
        for (const c of clusters) {
            if (!c.active) continue;

            const a = c.side === 'turba' ? 0.28 + 0.35 * contagio : (0.18 + 0.55 * contra);
            const rr = 5 + 10 * clamp(c.w * 0.2, 0, 2);

            ctx.beginPath();
            ctx.arc(c.x, c.y, rr, 0, Math.PI * 2);
            ctx.fillStyle =
                c.side === 'turba'
                    ? `rgba(255,90,70,${a})`
                    : `rgba(80,180,255,${a})`;
            ctx.fill();
        }

        // partículas
        for (const p of particles) {
            const isContra = p.opinion > 0;

            const alpha =
                0.14 +
                0.55 * engagement +
                0.18 * Math.abs(p.opinion);

            // tamaño: engagement + polarización
            const r = 1.0 + engagement * 3.6 + Math.abs(p.opinion) * 1.2;

            ctx.globalAlpha = 0.75;
            ctx.fillStyle = isContra
                ? `rgba(80,180,255,${alpha})`
                : `rgba(255,90,70,${alpha})`;

            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // HUD
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

        const i = Math.floor(clamp(tDays, 0, payload.series.length - 1));
        const d = payload.series[i]?.date ?? '';

        ctx.fillText(`${payload.ejemplo} — ${d}`, 12, 22);
        ctx.fillText(
            `E:${engagement.toFixed(2)} C:${contagio.toFixed(2)} P:${pluralidad.toFixed(2)} R:${resistencia.toFixed(2)} F:${contra.toFixed(2)}`,
            12,
            44
        );
        ctx.fillText(`tDays=${tDays.toFixed(1)}  speed=${speed} días/s`, 12, 66);
        ctx.fillText(describeState(), 12, 90);

        // leyenda rápida
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(255,90,70,0.9)';
        ctx.fillRect(W - 140, 20, 10, 10);
        ctx.fillStyle = '#fff';
        ctx.fillText('Turba', W - 120, 30);

        ctx.fillStyle = 'rgba(80,180,255,0.9)';
        ctx.fillRect(W - 140, 40, 10, 10);
        ctx.fillStyle = '#fff';
        ctx.fillText('Contra-flujo', W - 120, 50);

        ctx.fillText('Tamaño = atención', W - 140, 70);
        ctx.fillText('Clusters = bandos', W - 140, 88);

        drawTimeline();
    }

    // -----------------------------
    // Loop
    // -----------------------------
    function loop(ts: number) {
        if (!running) return;

        const now = ts / 1000;
        const dt = clamp(now - last, 0, 0.033);
        last = now;

        applyData(dt);
        stepPhysics(dt);
        draw();

        raf = requestAnimationFrame(loop);
    }

    function startLoop() {
        running = true;
        last = performance.now() / 1000;
        raf = requestAnimationFrame(loop);
    }

    function stopLoop() {
        running = false;
        cancelAnimationFrame(raf);
    }

    function toggle() {
        if (running) stopLoop();
        else startLoop();
    }

    // -----------------------------
    // Lifecycle
    // -----------------------------
    onMount(() => {
        ctx = canvas.getContext('2d');
        canvas.width = W;
        canvas.height = H;

        payload = caseId ? getTurbaPayload(caseId) : null;

        initClusters();
        resetParticles();
        startLoop();
    });

    onDestroy(() => cancelAnimationFrame(raf));

    // recarga si cambia el caso
    $: if (caseId) {
        const next = getTurbaPayload(caseId);
        if (next && next !== payload) {
            payload = next;
            rewind();
        }
    }
</script>

<div class="wrap">
    <div class="canvasBox">
        <canvas bind:this={canvas} class="sim"></canvas>

        {#if !payload}
            <div class="overlay">
                <p>No encuentro datos para <b>{caseId}</b>.</p>
                <p>
                    Revisa que el JSON esté en <code>src/lib/data/json/</code> y tenga
                    <code>case_id</code>.
                </p>
            </div>
        {/if}
    </div>

    <div class="panel">
        {#if payload}
            <h3>{payload.ejemplo}</h3>
            <p class="meta">
                {payload.meta?.categoria ?? ''} · {payload.meta?.tipo_victima ?? ''}<br />
                <b>{payload.meta?.metafora_dominante ?? ''}</b> ·
                {payload.meta?.mecanismo_de_distorsion ?? ''} ·
                {payload.meta?.canal_difusion ?? ''}
            </p>
        {/if}

        <div class="row">
            <button on:click={toggle}>{running ? 'Pausar' : 'Reanudar'}</button>
            <button on:click={rewind}>Rewind</button>
        </div>

        {#if payload}
            <label>
                Velocidad (días/s): {speed}
                <input type="range" min="1" max="60" step="1" bind:value={speed} />
            </label>

            <label>
                Timeline (día): {tDays.toFixed(0)} / {payload.series.length - 1}
                <input
                    type="range"
                    min="0"
                    max={payload.series.length - 1}
                    step="0.1"
                    bind:value={tDays}
                />
            </label>
        {/if}
    </div>
</div>

<style>
    .wrap {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 16px;
        align-items: start;
    }
    .canvasBox {
        position: relative;
    }
    .sim {
        width: 100%;
        height: auto;
        border-radius: 12px;
        border: 1px solid #222;
        background: #000;
    }
    .panel {
        border: 1px solid #222;
        border-radius: 12px;
        padding: 12px;
        background: #0b0b0b;
        color: #eaeaea;
    }
    .row {
        display: flex;
        gap: 10px;
        margin: 10px 0;
    }
    button {
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid #333;
        background: #111;
        color: #eaeaea;
        cursor: pointer;
    }
    button:hover {
        border-color: #555;
    }
    label {
        display: block;
        margin: 10px 0;
    }
    input[type='range'] {
        width: 100%;
    }
    .meta {
        opacity: 0.9;
        line-height: 1.35;
    }
    .overlay {
        position: absolute;
        inset: 12px;
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.75);
        border: 1px dashed #444;
        color: #fff;
        padding: 12px;
    }
    code {
        background: #111;
        padding: 2px 6px;
        border-radius: 8px;
        border: 1px solid #333;
    }
    @media (max-width: 980px) {
        .wrap {
            grid-template-columns: 1fr;
        }
    }
</style>

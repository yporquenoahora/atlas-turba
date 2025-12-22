<script>
    import { onDestroy, onMount } from 'svelte';
    import { simCursor, simCaseId, simPlaying } from '../stores/simCursor.js';

    let caseId = 'abogados';
    let cases = [];
    let cursor = 0;
    let playing = false;

    let timeline = []; // events[]
    let chapters = []; // rows del csv
    let categories = []; // tags únicas (o "categorías")

    let activeTag = 'ALL';
    let timer = null;

    // sincroniza con stores
    const unsub1 = simCaseId.subscribe((v) => (caseId = v));
    const unsub2 = simCursor.subscribe((v) => (cursor = v));
    const unsub3 = simPlaying.subscribe((v) => (playing = v));

    onDestroy(() => {
        unsub1();
        unsub2();
        unsub3();
        if (timer) clearInterval(timer);
    });

    const BASE = '/DATA';
    const OUT_DIR = 'out2';
    const CASES_DIR = 'cases'; // ajusta si hace falta

    async function loadCase(id) {
        const tlUrl = `${BASE}/${OUT_DIR}/${CASES_DIR}/${id}/timeline.json`;
        const csvUrl = `${BASE}/${OUT_DIR}/${id}.csv`;

        // ---- TIMELINE (robusto) ----
        const tlRes = await fetch(tlUrl);
        const tlText = await tlRes.text();

        if (!tlRes.ok) {
            throw new Error(
                `No encuentro timeline: ${tlUrl} (${tlRes.status}) :: ${tlText.slice(0, 120)}`,
            );
        }

        const cleaned = tlText.replace(/^\uFEFF/, '').trim();

        if (!(cleaned.startsWith('{') || cleaned.startsWith('['))) {
            throw new Error(
                `Timeline NO es JSON en ${tlUrl}. Empieza por: ${cleaned.slice(0, 120)}`,
            );
        }

        let tl;
        try {
            tl = JSON.parse(cleaned);
        } catch (e) {
            throw new Error(
                `Timeline JSON inválido en ${tlUrl}. Empieza por: ${cleaned.slice(0, 120)}`,
            );
        }

        timeline = tl.events || [];

        // ---- CSV ----
        const csvRes = await fetch(csvUrl);
        if (!csvRes.ok) {
            const t = await csvRes.text().catch(() => '');
            throw new Error(
                `No encuentro CSV: ${csvUrl} (${csvRes.status}) :: ${t.slice(0, 120)}`,
            );
        }

        const csvText = await csvRes.text();
        chapters = parseCsv(csvText);

        // tags -> categorías
        const tags = new Set();
        for (const e of timeline) (e.tags || []).forEach((t) => tags.add(t));
        console.log(timeline, tags)
        categories = ['ALL', ...Array.from(tags).sort()];
        activeTag = 'ALL';

        // reseteo cursor
        simCursor.set(0);

        // opcional, si tienes store de caseId:
        // simCaseId.set(id);
    }

    // Carga inicial y cuando cambia caseId
    $: if (caseId) loadCase(caseId);

    function parseCsv(text) {
        // CSV simple con comillas (suficiente para tus exports)
        const lines = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .split('\n')
            .filter(Boolean);
        if (lines.length < 2) return [];
        const header = splitCsvLine(lines[0]).map((h) => h.trim());
        const rows = [];

       // console.log('chapters:', lines.length, 'sample:', lines[0]);
        console.log(
            't values sample:',
            lines.slice(0, 5).map((c) => {
                
                return c.t;
            }),
        );

        for (let li = 1; li < lines.length; li++) {
            const cols = splitCsvLine(lines[li]);
            if (!cols.length) continue;

            const obj = {};
            header.forEach((h, i) => (obj[h] = (cols[i] ?? '').trim()));

            obj.chapter = Number(obj.chapter);
            obj.t = Number(obj.t);

            try {
                obj.facts_json = JSON.parse(obj.facts_json || '[]');
            } catch {
                obj.facts_json = [];
            }
            try {
                obj.next_options_json = JSON.parse(
                    obj.next_options_json || '[]',
                );
            } catch {
                obj.next_options_json = [];
            }

            rows.push(obj);
        }

        return rows;
    }

    function splitCsvLine(line) {
        const out = [];
        let cur = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            const next = line[i + 1];

            if (ch === '"' && inQuotes && next === '"') {
                cur += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                out.push(cur);
                cur = '';
            } else {
                cur += ch;
            }
        }
        out.push(cur);
        return out;
    }

    function clampCursor(v) {
        const max = Math.max(0, filteredTimeline().length - 1);
        return Math.max(0, Math.min(max, v));
    }

    function filteredTimeline() {
        if (activeTag === 'ALL') return timeline;
        return timeline.filter((e) => (e.tags || []).includes(activeTag));
    }

    function setCursorFromFiltered(indexInFiltered) {
        const f = filteredTimeline();
        const ev = f[indexInFiltered];
        if (!ev) return;
        // cursor real = ev.t
        simCursor.set(ev.t);
    }

    // Capítulo “más cercano” al cursor actual (por t)
    $: console.log('currentChapter ', currentChapter);
    $: currentChapter = (() => {
        if (!chapters?.length) return null;

        // 1) match exacto por t
        const exact = chapters.find((c) => c.t === cursor);
        if (exact) return exact;

        // 2) si no hay exacto, coge el más cercano
        let best = null;
        let bestD = Infinity;
        for (const c of chapters) {
            if (!Number.isFinite(c.t)) continue;
            const d = Math.abs(c.t - cursor);
            if (d < bestD) {
                best = c;
                bestD = d;
            }
        }
        return best;
    })();

    // Evento del timeline en cursor actual
    $: currentEvent = timeline.find((e) => e.t === cursor) || null;

    function togglePlay() {
        simPlaying.update((v) => !v);
    }

    // Player: avanza t por pasos (puedes ajustar velocidad)
    $: {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        if (playing) {
            timer = setInterval(() => {
                simCursor.update((v) => {
                    const next = v + 1;
                    const maxT = timeline.length
                        ? Math.max(...timeline.map((e) => e.t))
                        : 0;
                    return next > maxT ? 0 : next;
                });
            }, 350);
        }
    }

    async function loadIndex() {
        const idxUrl = `${BASE}/${OUT_DIR}/index.json`;

        const res = await fetch(idxUrl);
        const txt = await res.text();

        if (!res.ok) {
            throw new Error(
                `No encuentro index: ${idxUrl} (${res.status}) :: ${txt.slice(0, 120)}`,
            );
        }

        const cleaned = txt.replace(/^\uFEFF/, '').trim();
        const idx = JSON.parse(cleaned);

        // soporta index como array ["abogados"] o como objeto { cases: [...] }
        cases = Array.isArray(idx) ? idx : idx.cases || [];
        cases = cases.filter(Boolean);

        if (!cases.length) return;

        // si el actual no existe, ponemos el primero
        if (!cases.includes(caseId)) caseId = cases[0];
    }

    function onChangeCase(e) {
        caseId = e.target.value;
        loadCase(caseId);
    }

    function onChangeCategory(e) {
        activeTag = e.target.value;
        // si quieres “saltar” al primer evento de esa categoría:
        // const first = timeline.find(ev => (ev.tags||[]).includes(activeTag));
        // if (first) simCursor.set(first.t);
    }

    onMount(async () => {
        await loadIndex();
        if (caseId) await loadCase(caseId);
    });
</script>

<div class="panel">
    <div class="row">
        <div class="left">
            <label>Caso</label>
            <select
                bind:value={caseId}
                on:change={onChangeCase}
                disabled={!cases.length}
            >
                {#each cases as c}
                    <option value={c}>{c}</option>
                {/each}
            </select>
            <small>Lee casos desde {BASE}/{OUT_DIR}/index.json</small>
        </div>

        <!-- <div class="right">
            <label>Categoría</label>
            <select bind:value={activeTag} on:change={onChangeCategory} disabled={!categories?.length}>
              {#each categories as c}
                <option value={c}>{c}</option>
              {/each}
            </select>
          </div> -->
    </div>

    <div class="row">
        <button on:click={togglePlay}>{playing ? '⏸ Pausa' : '▶ Play'}</button
        >
        <div class="slider">
            <input
                type="range"
                min="0"
                max={Math.max(
                    0,
                    timeline.length ? Math.max(...timeline.map((e) => e.t)) : 0,
                )}
                bind:value={cursor}
                on:input={(e) => simCursor.set(Number(e.target.value))}
            />
            <div class="meta">
                <span>t={cursor}</span>
                <span>{currentEvent?.date ?? ''}</span>
                <span>{currentEvent?.tags?.join(' · ') ?? ''}</span>
            </div>
        </div>
    </div>

    <div class="grid">
        <div class="timeline">
            <h3>Timeline ({activeTag})</h3>
            <div class="list">
                {#each filteredTimeline().slice(0, 200) as ev, i}
                    <button
                        class:selected={ev.t === cursor}
                        on:click={() => simCursor.set(ev.t)}
                        title={JSON.stringify(ev.estado || {})}
                    >
                        <span class="t">t={ev.t}</span>
                        <span class="d">{ev.date ?? ''}</span>
                        <span class="tags"
                            >{(ev.tags || []).slice(0, 3).join(', ')}</span
                        >
                    </button>
                {/each}
            </div>
            <small
                >Tip: truncando a 200 items para no freír el DOM; TODO
                virtualizado.</small
            >
        </div>

        <div class="chapter">
            <h3>Narrativa</h3>

            {#if currentChapter}
                <div class="card">
                    <div class="kpi">
                        <div>
                            <strong>Capítulo</strong>
                            {currentChapter.chapter}
                        </div>
                        <div><strong>t</strong> {currentChapter.t}</div>
                        <div><strong>fecha</strong> {currentChapter.date}</div>
                    </div>

                    <p class="summary">{currentChapter.summary}</p>

                    <details>
                        <summary>Ver texto completo</summary>
                        <pre>{currentChapter.text}</pre>
                    </details>
                </div>
            {:else}
                <p>No hay capítulos cargados para este caso.</p>
            {/if}
        </div>
    </div>
</div>

<style>
    .panel {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .row {
        display: flex;
        gap: 12px;
        align-items: center;
    }
    .left {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .right {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 220px;
    }
    .slider {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
        opacity: 0.8;
    }
    .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }
    .timeline .list {
        max-height: 420px;
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .timeline button {
        text-align: left;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 10px;
        background: #fff;
        cursor: pointer;
    }
    .timeline button.selected {
        border-color: #111;
    }
    .t {
        font-weight: 600;
        margin-right: 8px;
    }
    .d {
        margin-right: 8px;
    }
    .tags {
        opacity: 0.7;
    }
    .card {
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 12px;
        background: #fff;
        color: black;
    }
    .kpi {
        display: flex;
        gap: 16px;
        font-size: 12px;
        opacity: 0.85;
        margin-bottom: 8px;
    }
    .summary {
        font-size: 14px;
        line-height: 1.35;
    }
    pre {
        white-space: pre-wrap;
    }
</style>

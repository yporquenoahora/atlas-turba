<script lang="ts">
    import { turbaCases } from "./turbaData";
  
    export let caseId = turbaCases[0]?.id;
  </script>
  
  <label>
    Caso:
    <select bind:value={caseId}>
      {#each turbaCases as c}
        <option value={c.id}>
          {c.label}{c.categoria ? ` — ${c.categoria}` : ""}
        </option>
      {/each}
    </select>
  </label>
  
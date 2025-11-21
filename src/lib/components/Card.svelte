<script lang="ts">
  let { children } = $props();
</script>

<div
  class="relative bg-linear-[25deg,red_5%,yellow_60%,lime_90%,teal] flex items-center justify-center rounded-2xl p-2"
>
  <div
    class="flex flex-col justify-between rounded-2xl border border-[#f97316] bg-linear-to-r from-[#120700] to-[#120700]/0 p-8 w-full h-full flex-1 bg-black/40"
  >
    {@render children()}
  </div>
</div>

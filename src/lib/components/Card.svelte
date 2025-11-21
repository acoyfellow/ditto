<script lang="ts">
  let { children } = $props();
</script>

<div
  class="relative bg-linear-[25deg,red_5%,yellow_60%,orange_90%,white] flex items-center justify-center rounded-2xl p-[0.5px]"
>
  <div
    class="flex flex-col justify-between rounded-2xl border border-[#f97316] bg-linear-to-r from-[#120700] to-[#120700]/0 p-8 w-full h-full flex-1 bg-black/90"
  >
    {@render children()}
  </div>
</div>

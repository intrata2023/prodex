<script setup>
defineProps({
  partidoId: { type: String, required: true },
})
</script>

<template>
  <RouterLink :to="`/partido/${partidoId}/contrincantes`" class="partido-rivales-link">
    <span class="partido-rivales-link__label">Ver todos</span>
    <span class="partido-rivales-link__arrow" aria-hidden="true">›</span>
  </RouterLink>
</template>

<script setup>
defineProps({
  partidoId: { type: String, required: true },
})
</script>

<template>
  <RouterLink :to="`/partido/${partidoId}/contrincantes`" class="partido-rivales-link">
    Ver todos
  </RouterLink>
</template>

<script setup>
defineProps({
  to: { type: String, required: true },
  label: { type: String, required: true },
})
</script>

<template>
  <router-link :to="to" class="nav-back">
    <span class="nav-back-arrow" aria-hidden="true">←</span>
    {{ label }}
  </router-link>
</template>

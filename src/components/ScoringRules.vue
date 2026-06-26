<template>
  <details class="rules-panel">
    <summary class="rules-summary">¿Cómo suman los puntos?</summary>
    <div class="rules-body">
      <section class="rules-section">
        <h3>Fase de grupos</h3>
        <ul>
          <li><strong>2 pts</strong> — resultado exacto</li>
          <li><strong>1 pt</strong> — acertás ganador o empate</li>
          <li><strong>0 pts</strong> — no acertás</li>
        </ul>
      </section>
      <section class="rules-section">
        <h3>Eliminatorias</h3>
        <ul>
          <li><strong>3 pts</strong> — resultado exacto y acertás quién pasa por penales (P)</li>
          <li><strong>2 pts</strong> — resultado exacto</li>
          <li><strong>1 pt</strong> — acertás quién pasa de ronda</li>
          <li><strong>0 pts</strong> — no acertás</li>
        </ul>
      </section>
      <section class="rules-section">
        <h3>Finalistas y campeón</h3>
        <p class="rules-note">Solo suma una de estas opciones:</p>
        <ul>
          <li><strong>12 pts</strong> — los 2 finalistas + campeón</li>
          <li><strong>8 pts</strong> — solo campeón</li>
          <li><strong>5 pts</strong> — los 2 finalistas</li>
          <li><strong>3 pts</strong> — 1 finalista</li>
        </ul>
      </section>
    </div>
  </details>
</template>

<style scoped>
.rules-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.rules-summary {
  padding: 1rem 1.25rem;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.rules-summary::-webkit-details-marker {
  display: none;
}

.rules-summary::after {
  content: '+';
  float: right;
  color: var(--text-muted);
  font-weight: 400;
}

.rules-panel[open] .rules-summary::after {
  content: '−';
}

.rules-body {
  padding: 0 1.25rem 1.25rem;
  border-top: 1px solid var(--border);
}

.rules-section {
  margin-top: 1rem;
}

.rules-section h3 {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rules-section ul {
  margin: 0;
  padding-left: 1.125rem;
  font-size: 0.875rem;
  color: var(--text-muted);
  line-height: 1.6;
}

.rules-note {
  margin: 0 0 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.rules-section li + li {
  margin-top: 0.25rem;
}

.rules-section strong {
  color: var(--text);
}
</style>

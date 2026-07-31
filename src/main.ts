import './style.css';

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Application root was not found.');
}

app.innerHTML = `
  <section class="status-card">
    <p class="eyebrow">Beard Laws Casino</p>
    <h1>Project Gold Beard</h1>
    <p>Phase 1 engine foundation compiled successfully.</p>
  </section>
`;

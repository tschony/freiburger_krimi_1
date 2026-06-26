const app = document.querySelector("#app");

const state = {
  markdown: "",
  headings: [],
  fontScale: Number(localStorage.getItem("reader-font-scale") || "1"),
  theme: localStorage.getItem("reader-theme") || "paper",
};

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdown(markdown) {
  const lines = markdown.split("\n");
  const html = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);

    if (!trimmed) {
      flushParagraph();
      return;
    }

    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const text = heading[2];
      const tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      html.push(
        `<${tag} id="${slugify(text)}">${renderInlineMarkdown(text)}</${tag}>`,
      );
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph();
  return html.join("\n");
}

function renderLocked(error = "") {
  document.body.dataset.theme = "paper";
  app.className = "app-shell locked-shell";
  app.innerHTML = `
    <section class="lock-page" aria-labelledby="page-title">
      <div class="lock-background" aria-hidden="true"></div>
      <div class="lock-card">
        <p class="lock-status">Geschütztes Manuskript</p>
        <h1 id="page-title">Tod zwischen Kräutern</h1>
        <p class="subtitle">Ein Freiburg-Krimi</p>
        <form class="access-form" autocomplete="off">
          <label for="access-code">Code eingeben</label>
          <div class="code-row">
            <input
              id="access-code"
              name="code"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="4"
              placeholder="••••"
              aria-describedby="access-help"
              autofocus
            />
            <button type="submit">Öffnen</button>
          </div>
          <p id="access-help" class="help-text">
            Der Inhalt wird erst nach Freigabe geladen.
          </p>
          ${error ? `<p class="error-text" role="alert">${escapeHtml(error)}</p>` : ""}
        </form>
      </div>
    </section>
  `;

  app.querySelector("form").addEventListener("submit", unlockManuscript);
}

async function unlockManuscript(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.elements.code;
  const button = form.querySelector("button");
  const code = input.value.trim();

  button.disabled = true;
  button.textContent = "Prüfe...";

  try {
    const response = await fetch("/api/manuscript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const payload = await response.json();

    if (!response.ok) {
      renderLocked(payload.error || "Der Code ist nicht korrekt.");
      return;
    }

    state.markdown = payload.markdown;
    state.headings = payload.headings || [];
    renderReader();
  } catch {
    renderLocked("Der Zugriff ist gerade nicht erreichbar.");
  }
}

function renderReader() {
  document.body.dataset.theme = state.theme;
  app.className = "app-shell reader-shell";

  const sectionLinks = state.headings
    .filter((heading) => heading.level <= 2)
    .map(
      (heading) => `
        <a class="chapter-link level-${heading.level}" href="#${heading.id}">
          ${escapeHtml(heading.title)}
        </a>
      `,
    )
    .join("");

  app.innerHTML = `
    <aside class="reader-nav" aria-label="Kapitel">
      <div>
        <p class="reader-kicker">Manuskript</p>
        <h1>Tod zwischen Kräutern</h1>
        <p>Arbeitsfassung</p>
      </div>
      <nav>${sectionLinks}</nav>
      <button class="secondary-button" data-action="lock">Sperren</button>
    </aside>
    <section class="reader-main">
      <header class="reader-toolbar">
        <button class="icon-button" data-action="nav" aria-label="Kapitelmenü">☰</button>
        <div>
          <strong>Tod zwischen Kräutern</strong>
          <span>${state.headings.length} Abschnitte</span>
        </div>
        <div class="toolbar-actions">
          <button class="icon-button" data-action="font-down" aria-label="Schrift verkleinern">A−</button>
          <button class="icon-button" data-action="font-up" aria-label="Schrift vergrößern">A+</button>
          <button class="icon-button" data-action="theme" aria-label="Darstellung wechseln">◐</button>
        </div>
      </header>
      <article class="manuscript" style="--reader-scale: ${state.fontScale}">
        ${renderMarkdown(state.markdown)}
      </article>
    </section>
  `;

  app.querySelector('[data-action="lock"]').addEventListener("click", () => {
    renderLocked();
  });
  app.querySelector('[data-action="nav"]').addEventListener("click", () => {
    app.classList.toggle("nav-open");
  });
  app.querySelector('[data-action="font-down"]').addEventListener("click", () => {
    state.fontScale = Math.max(0.9, Number((state.fontScale - 0.05).toFixed(2)));
    localStorage.setItem("reader-font-scale", String(state.fontScale));
    renderReader();
  });
  app.querySelector('[data-action="font-up"]').addEventListener("click", () => {
    state.fontScale = Math.min(1.25, Number((state.fontScale + 0.05).toFixed(2)));
    localStorage.setItem("reader-font-scale", String(state.fontScale));
    renderReader();
  });
  app.querySelector('[data-action="theme"]').addEventListener("click", () => {
    state.theme = state.theme === "paper" ? "night" : "paper";
    localStorage.setItem("reader-theme", state.theme);
    renderReader();
  });
}

renderLocked();

// Build-time snapshot of the page's text, written into <div id="root"> in index.html.
// Search engines and link previews read it without running JavaScript; React replaces it
// as soon as the app starts. It is made from the same data the site shows (src/data.js).
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function loadData() {
  // data.js uses import.meta.env (a Vite feature), so load a copy with that filled in
  const src = readFileSync(fileURLToPath(new URL('./src/data.js', import.meta.url)), 'utf8')
    .replace(/import\.meta\.env\.BASE_URL/g, "'/'")
  const file = join(mkdtempSync(join(tmpdir(), 'seo-')), 'data.mjs')
  writeFileSync(file, src)
  return import(pathToFileURL(file).href)
}

export default function seoPrerender() {
  return {
    name: 'seo-prerender',
    apply: 'build',
    async transformIndexHtml(html) {
      const { socials, skills, projects, services, journey } = await loadData()
      const snapshot = `
      <div class="seo-snapshot">
        <header>
          <p><a href="/">sherin.fun</a></p>
          <nav aria-label="Sections"><a href="#about">About</a> · <a href="#projects">Projects</a> · <a href="#services">Services</a> · <a href="#journey">Journey</a> · <a href="#contact">Contact</a></nav>
        </header>
        <main>
          <section id="top">
            <h1>Sherin Varghese — software engineer in Berlin</h1>
            <p>Sherin Varghese builds web apps, databases and websites with a bit of play in them. Junior software engineer at Macrix in Berlin.</p>
            <p><a href="/assets/SherinV.pdf">Download the CV of Sherin Varghese (PDF)</a></p>
          </section>
          <section id="about">
            <h2>About Sherin Varghese: coding since 17, still having fun</h2>
            <p>Sherin Varghese has finished a master's in computer science and now builds software at Macrix, caring as much about how a product feels as how it works.</p>
            <p>Skills: ${skills.map(esc).join(', ')}.</p>
            <ul>${socials.map((s) => `<li><a href="${esc(s.href)}" rel="me">${esc(s.label)}</a></li>`).join('')}</ul>
          </section>
          <section id="projects">
            <h2>Projects by Sherin Varghese</h2>
            ${projects.map((p) => `<article>
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.blurb)}</p>
              <p>Built with ${p.tech.map(esc).join(', ')}.</p>
              ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.title)} by Sherin Varghese" width="640" height="400" loading="lazy" />` : ''}
              <p>${p.live ? `<a href="${esc(p.live)}">${esc(p.title)} live</a>` : ''}${p.code ? ` · <a href="${esc(p.code)}">${esc(p.title)} source code</a>` : ''}</p>
            </article>`).join('')}
          </section>
          <section id="services">
            <h2>Services</h2>
            <ul>${services.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ul>
          </section>
          <section id="journey">
            <h2>Journey</h2>
            <ol>${journey.map((j) => `<li><h3>${esc(j.title)}</h3><p>${esc(j.where)} · ${esc(j.when)}</p><p>${esc(j.text)}</p></li>`).join('')}</ol>
          </section>
          <section id="contact">
            <h2>Contact Sherin Varghese</h2>
            <p>Got an idea? Let's make it fun. Email <a href="mailto:admin@sherin.fun">admin@sherin.fun</a>.</p>
          </section>
        </main>
        <footer><p>© ${new Date().getFullYear()} Sherin Varghese · sherin.fun</p></footer>
      </div>`
      return html.replace('<div id="root"></div>', `<div id="root">${snapshot}\n    </div>`)
    },
  }
}

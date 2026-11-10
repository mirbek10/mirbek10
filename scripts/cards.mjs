// Генерирует SVG-карточки профиля (статистика, языки, серия, активность, проекты)
// прямо из GitHub API — без сторонних сервисов. Запускается в GitHub Actions.
import { writeFileSync, mkdirSync } from "node:fs";

const LOGIN = process.env.LOGIN || "mirbek10";
const PINNED = (process.env.PINNED || "easy-finance,Portfolio").split(",");
const OUT = process.env.OUT || "dist";
const MOCK = process.argv.includes("--mock");

const C = {
  bg: "#0d1117", border: "#1f2937", accent: "#10b981", accentDim: "#064e3b",
  text: "#e5e7eb", muted: "#6b7280",
};
const FONT = "'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif";
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => (n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n));

const frame = (w, h, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
<style>
  .t{font:600 18px ${FONT};fill:${C.accent}}
  .l{font:400 14px ${FONT};fill:${C.text}}
  .m{font:400 12px ${FONT};fill:${C.muted}}
  .v{font:700 14px ${FONT};fill:${C.text}}
  .big{font:700 28px ${FONT};fill:${C.text}}
  .fade{opacity:0;animation:f .6s ease forwards}
  @keyframes f{to{opacity:1}}
</style>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="12" fill="${C.bg}" stroke="${C.border}"/>
${title ? `<text x="24" y="38" class="t">${esc(title)}</text>` : ""}
${body}
</svg>`;

// ---------- data ----------
async function gql(query, variables) {
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

async function load() {
  if (MOCK) return mock();
  const { user } = await gql(`query($login:String!){ user(login:$login){
    followers{totalCount}
    pullRequests{totalCount}
    issues{totalCount}
    repositories(ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC, first:100){
      totalCount
      nodes{ name description stargazerCount forkCount primaryLanguage{name color}
        languages(first:10, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{name color} } } }
    }
    contributionsCollection{
      totalCommitContributions restrictedContributionsCount
      contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } }
    }
  }}`, { login: LOGIN });
  return user;
}

function mock() {
  const days = [];
  const start = new Date(Date.now() - 364 * 864e5);
  for (let i = 0; i < 365; i++) days.push({ date: new Date(+start + i * 864e5).toISOString().slice(0, 10), contributionCount: Math.random() < 0.55 ? Math.floor(Math.random() * 9) : 0 });
  const weeks = []; for (let i = 0; i < days.length; i += 7) weeks.push({ contributionDays: days.slice(i, i + 7) });
  const L = (name, color, size) => ({ size, node: { name, color } });
  return {
    followers: { totalCount: 42 }, pullRequests: { totalCount: 37 }, issues: { totalCount: 9 },
    repositories: { totalCount: 29, nodes: [
      { name: "easy-finance", description: "Personal finance tracker with charts & <budgets>", stargazerCount: 5, forkCount: 1, primaryLanguage: { name: "TypeScript", color: "#3178c6" }, languages: { edges: [L("TypeScript", "#3178c6", 90000), L("CSS", "#563d7c", 20000)] } },
      { name: "Portfolio", description: "My personal portfolio website", stargazerCount: 3, forkCount: 0, primaryLanguage: { name: "JavaScript", color: "#f1e05a" }, languages: { edges: [L("JavaScript", "#f1e05a", 60000), L("HTML", "#e34c26", 15000), L("SCSS", "#c6538c", 12000)] } },
      { name: "Smart-Kaffe-Server", description: null, stargazerCount: 1, forkCount: 0, primaryLanguage: { name: "Go", color: "#00ADD8" }, languages: { edges: [L("Go", "#00ADD8", 40000)] } },
    ] },
    contributionsCollection: { totalCommitContributions: 812, restrictedContributionsCount: 120, contributionCalendar: { totalContributions: 1034, weeks } },
  };
}

// ---------- cards ----------
const ICON = {
  star: "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z",
  commit: "M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z",
  pr: "M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z",
  issue: "M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z",
  repo: "M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z",
  people: "M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z",
  fork: "M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z",
};
const icon = (d, x, y) => `<path transform="translate(${x},${y})" d="${d}" fill="${C.accent}"/>`;

function statsCard(u) {
  const repos = u.repositories.nodes;
  const stars = repos.reduce((a, r) => a + r.stargazerCount, 0);
  const cc = u.contributionsCollection;
  const rows = [
    [ICON.star, "Total Stars", stars],
    [ICON.commit, "Commits (last year)", cc.totalCommitContributions + cc.restrictedContributionsCount],
    [ICON.pr, "Pull Requests", u.pullRequests.totalCount],
    [ICON.issue, "Issues", u.issues.totalCount],
    [ICON.repo, "Public Repos", u.repositories.totalCount],
    [ICON.people, "Followers", u.followers.totalCount],
  ];
  const body = rows.map(([d, label, v], i) => {
    const y = 66 + i * 25;
    return `<g class="fade" style="animation-delay:${i * 120}ms">${icon(d, 24, y - 12)}<text x="50" y="${y}" class="l">${label}</text><text x="${420 - 24}" y="${y}" text-anchor="end" class="v">${fmt(v)}</text></g>`;
  }).join("\n");
  return frame(420, 210, body, "GitHub Stats");
}

function langsCard(u) {
  const map = {};
  for (const r of u.repositories.nodes) for (const e of r.languages.edges) {
    map[e.node.name] ??= { size: 0, color: e.node.color || C.muted };
    map[e.node.name].size += e.size;
  }
  const list = Object.entries(map).sort((a, b) => b[1].size - a[1].size).slice(0, 8);
  const total = list.reduce((a, [, v]) => a + v.size, 0) || 1;
  let x = 24; const W = 340 - 48;
  const bar = list.map(([, v], i) => {
    const w = Math.max((v.size / total) * W, 2);
    const s = `<rect x="${x.toFixed(2)}" y="54" width="${w.toFixed(2)}" height="10" fill="${v.color}"/>`;
    x += w; return s;
  }).join("");
  const legend = list.map(([name, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const lx = 24 + col * 150, ly = 94 + row * 26;
    return `<g class="fade" style="animation-delay:${i * 90}ms"><circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${v.color}"/><text x="${lx + 16}" y="${ly}" class="l">${esc(name)}<tspan class="m" dx="6">${((v.size / total) * 100).toFixed(1)}%</tspan></text></g>`;
  }).join("\n");
  return frame(340, 210, `<clipPath id="r"><rect x="24" y="54" width="${W}" height="10" rx="5"/></clipPath><g clip-path="url(#r)">${bar}</g>\n${legend}`, "Top Languages");
}

function days(u) {
  return u.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
}

function streakCard(u) {
  const d = days(u);
  const total = u.contributionsCollection.contributionCalendar.totalContributions;
  let longest = 0, run = 0;
  for (const x of d) { run = x.contributionCount > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  let i = d.length - 1; if (d[i] && d[i].contributionCount === 0) i--; // сегодня ещё не вечер
  let current = 0; while (i >= 0 && d[i].contributionCount > 0) { current++; i--; }
  const col = (cx, value, label, hl) => `<g class="fade">
    <text x="${cx}" y="${hl ? 112 : 108}" text-anchor="middle" class="big" ${hl ? `style="fill:${C.accent}"` : ""}>${fmt(value)}</text>
    <text x="${cx}" y="${hl ? 168 : 138}" text-anchor="middle" class="${hl ? "v" : "l"}" ${hl ? `style="fill:${C.accent}"` : ""}>${label}</text></g>`;
  const ring = `<circle cx="190" cy="102" r="40" stroke="${C.accent}" stroke-width="5"/>
  <path d="M190 48c-6 8-12 10-12 18a12 12 0 0 0 24 0c0-8-6-10-12-18Z" fill="${C.accent}" stroke="${C.bg}" stroke-width="3" transform="translate(0,-14)"/>`;
  const body = `<line x1="126" y1="40" x2="126" y2="170" stroke="${C.border}"/><line x1="254" y1="40" x2="254" y2="170" stroke="${C.border}"/>
${col(64, total, "Contributions", false)}
${ring}${col(190, current, "Current Streak", true)}
${col(316, longest, "Longest Streak", false)}
<text x="190" y="196" text-anchor="middle" class="m">last 12 months</text>`;
  return frame(380, 210, body);
}

function activityCard(u) {
  const d = days(u).slice(-31);
  const W = 860, H = 280, pl = 50, pr = 24, pt = 60, pb = 44;
  const max = Math.max(4, ...d.map((x) => x.contributionCount));
  const step = (W - pl - pr) / (d.length - 1);
  const pts = d.map((x, i) => [pl + i * step, pt + (H - pt - pb) * (1 - x.contributionCount / max)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts.at(-1)[0].toFixed(1)} ${H - pb} L${pl} ${H - pb} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((g) => {
    const y = pt + (H - pt - pb) * (1 - g);
    return `<line x1="${pl}" y1="${y}" x2="${W - pr}" y2="${y}" stroke="${C.border}" stroke-dasharray="3 4"/><text x="${pl - 10}" y="${y + 4}" text-anchor="end" class="m">${Math.round(max * g)}</text>`;
  }).join("");
  const labels = d.map((x, i) => (i % 5 === 0 || i === d.length - 1) ? `<text x="${(pl + i * step).toFixed(1)}" y="${H - pb + 22}" text-anchor="middle" class="m">${x.date.slice(8)}.${x.date.slice(5, 7)}</text>` : "").join("");
  const dots = pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${C.bg}" stroke="${C.accent}" stroke-width="2"/>`).join("");
  const body = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.accent}" stop-opacity=".35"/><stop offset="1" stop-color="${C.accent}" stop-opacity="0"/></linearGradient></defs>
${grid}${labels}
<path d="${area}" fill="url(#g)"/>
<path d="${line}" stroke="${C.accent}" stroke-width="2.5" stroke-linejoin="round" stroke-dasharray="4000" stroke-dashoffset="4000"><animate attributeName="stroke-dashoffset" to="0" dur="1.6s" fill="freeze"/></path>
${dots}`;
  return frame(W, H, body, "Contribution Activity · last 30 days");
}

function wrap(text, max) {
  const words = text.split(/\s+/); const lines = [""];
  for (const w of words) { if ((lines.at(-1) + " " + w).trim().length > max) lines.push(w); else lines[lines.length - 1] = (lines.at(-1) + " " + w).trim(); }
  return lines.slice(0, 2).map((l, i, a) => (i === 1 && words.join(" ").length > a.join(" ").length ? l.replace(/.{0,3}$/, "…") : l));
}

function projectCard(r) {
  const desc = wrap(r.description || "No description provided.", 52);
  const lang = r.primaryLanguage;
  const body = `${icon(ICON.repo, 24, 25)}
<text x="48" y="38" class="t">${esc(r.name)}</text>
${desc.map((l, i) => `<text x="24" y="${68 + i * 20}" class="m" style="font-size:13px">${esc(l)}</text>`).join("")}
<g transform="translate(24,118)">
  ${lang ? `<circle cx="6" cy="-4" r="6" fill="${lang.color || C.muted}"/><text x="18" y="0" class="l" style="font-size:13px">${esc(lang.name)}</text>` : ""}
  ${icon(ICON.star, lang ? 120 : 0, -13)}<text x="${lang ? 140 : 20}" y="0" class="l" style="font-size:13px">${fmt(r.stargazerCount)}</text>
  ${icon(ICON.fork, lang ? 180 : 60, -13)}<text x="${lang ? 200 : 80}" y="0" class="l" style="font-size:13px">${fmt(r.forkCount)}</text>
</g>`;
  return frame(400, 140, body);
}

// ---------- run ----------
const u = await load();
mkdirSync(OUT, { recursive: true });
const write = (f, s) => { writeFileSync(`${OUT}/${f}`, s); console.log("✔", f); };
write("stats.svg", statsCard(u));
write("langs.svg", langsCard(u));
write("streak.svg", streakCard(u));
write("activity.svg", activityCard(u));
for (const name of PINNED) {
  const r = u.repositories.nodes.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (r) write(`project-${name}.svg`, projectCard(r));
  else console.warn("⚠ repo not found:", name);
}

// Seções alteradas no 2º turno. SVG desenhado à mão, sem biblioteca: são cinco gráficos simples.

const NS = "http://www.w3.org/2000/svg";
const fmt = (v, d = 0) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v, d = 1) => fmt(v, d) + "%";
const cor = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

// Mesmas fontes citadas no texto: as duas primeiras são números do TSE divulgados à imprensa.
const FUNIL = [
  { rotulo: "16/10 · TSE à imprensa", valor: 4352 },
  { rotulo: "18/10 · TSE à imprensa", valor: 2033 },
  { rotulo: "19/10 · lista do painel", valor: null, chave: "secoes" },
  { rotulo: "19/10 · com endereço diferente", valor: null, chave: "reais" },
];

function el(tag, attrs = {}, pai) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (pai) pai.appendChild(n);
  return n;
}

function texto(pai, x, y, conteudo, attrs = {}) {
  const t = el("text", { x, y, ...attrs }, pai);
  t.textContent = conteudo;
  return t;
}

// Barra com a ponta de dado arredondada (4px) e a base reta, ancorada no zero.
function barraH(pai, x, y, w, h, fill, r = 4) {
  if (w <= 0) return el("rect", { x, y, width: 0, height: h }, pai);
  r = Math.min(r, w, h / 2);
  const d = `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
  return el("path", { d, fill, class: "barra" }, pai);
}

function barraV(pai, x, y0, w, h, fill, r = 4) {
  if (h <= 0) return el("rect", { x, y: y0, width: w, height: 0 }, pai);
  r = Math.min(r, h, w / 2);
  const y = y0 - h;
  const d = `M${x},${y0}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y0}Z`;
  return el("path", { d, fill, class: "barra" }, pai);
}

function svgNovo(id, altura) {
  const box = document.getElementById(id);
  box.innerHTML = "";
  const largura = Math.max(box.clientWidth, 280);
  const svg = el("svg", { viewBox: `0 0 ${largura} ${altura}`, role: "img" }, box);
  return { svg, largura, altura, box };
}

// Tooltip único, reaproveitado por todos os gráficos.
const tip = document.getElementById("tooltip");
function mostrar(ev, html) {
  tip.innerHTML = html;
  tip.style.opacity = 1;
  const x = Math.min(ev.pageX + 14, window.scrollX + document.documentElement.clientWidth - tip.offsetWidth - 8);
  tip.style.left = x + "px";
  tip.style.top = ev.pageY + 14 + "px";
}
function esconder() { tip.style.opacity = 0; }
function alvo(no, html) {
  no.addEventListener("mousemove", (ev) => mostrar(ev, html()));
  no.addEventListener("mouseleave", esconder);
  no.addEventListener("touchstart", (ev) => mostrar(ev.touches[0], html()), { passive: true });
}

function legenda(id, itens) {
  document.getElementById(id).innerHTML = itens
    .map(([nome, c]) => `<span><i class="bloco" style="background:var(${c})"></i>${nome}</span>`).join("");
}

function tabela(id, cab, linhas) {
  const th = cab.map(([t, num]) => `<th${num ? ' class="num"' : ""}>${t}</th>`).join("");
  const tr = linhas.map((l) => "<tr>" + l.map((v, i) => `<td${cab[i][1] ? ' class="num"' : ""}>${v}</td>`).join("") + "</tr>").join("");
  document.getElementById(id).innerHTML = `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

// ---------- Blocos ----------

function tiles(d) {
  const t = d.resultados.reais.teste;
  const itens = [
    ["Seções na lista do TSE", fmt(d.painel.secoes), "painel de 19/10"],
    ["Com local e endereço diferentes", fmt(d.painel.reais), fmt(d.painel.eleitorado_reais) + " eleitores"],
    ["Fatia do Lula nas escolas alteradas", pct(100 * t.observado), "acaso: " + pct(100 * t.media_acaso)],
    ["p do teste", fmt(t.p, 2), "abaixo de 0,05 seria fora do normal"],
  ];
  document.getElementById("tiles").innerHTML = itens
    .map(([r, v, det]) => `<div class="cartao tile"><div class="rotulo">${r}</div><div class="valor">${v}</div><div class="detalhe">${det}</div></div>`)
    .join("");
  document.getElementById("veredito").innerHTML =
    `<p><strong>Não há sinal de direcionamento.</strong> Dentro das mesmas zonas eleitorais, as escolas que mudaram de local votaram como escolas sorteadas ao acaso: ${pct(100 * t.observado)} de Lula, contra ${pct(100 * t.faixa95[0])} a ${pct(100 * t.faixa95[1])} esperados pelo acaso.</p>`;
}

function funil(d) {
  const dados = FUNIL.map((f) => ({ ...f, valor: f.valor ?? d.painel[f.chave] }));
  const linha = 44, topo = 4;
  const { svg, largura } = svgNovo("g-funil", topo + dados.length * linha);
  const max = Math.max(...dados.map((f) => f.valor));
  const w = largura - 60;
  dados.forEach((f, i) => {
    const y = topo + i * linha;
    texto(svg, 0, y + 12, f.rotulo);
    const nosso = i >= 2;
    const b = barraH(svg, 0, y + 18, (f.valor / max) * w, 18, cor(nosso ? "--series-1" : "--neutral"));
    texto(svg, (f.valor / max) * w + 6, y + 31, fmt(f.valor), { class: "rotulo-forte" });
    alvo(b, () => `<div class="t-titulo">${f.rotulo}</div><div class="t-linha"><b>${fmt(f.valor)}</b><span>seções</span></div>`);
  });
  const p = d.painel;
  document.getElementById("limpeza").innerHTML = `<table><tbody>
    <tr><td>Na lista do painel</td><td class="num">${fmt(p.secoes)}</td></tr>
    <tr><td>Mesmo local nos dois turnos no cadastro</td><td class="num">−${fmt(p.mesmo_local)}</td></tr>
    <tr><td>Local mudou de nome, endereço idêntico</td><td class="num">−${fmt(p.mesmo_endereco)}</td></tr>
    <tr><td><strong>Local e endereço diferentes</strong></td><td class="num"><strong>${fmt(p.reais)}</strong></td></tr>
  </tbody></table>`;
}

function votos(d) {
  const nomes = { alteradas: "Seções alteradas", "mesmas zonas, não alteradas": "Mesmas zonas, não alteradas", Brasil: "Brasil" };
  const series = [["Lula", "lula", "--series-1"], ["Flávio", "flavio", "--series-2"], ["Outros candidatos", "outros", "--neutral"]];
  legenda("leg-votos", series.map(([n, , c]) => [n, c]));
  const g = d.resultados.reais.grupos;
  const linha = 58, topo = 2;
  const { svg, largura } = svgNovo("g-votos", topo + g.length * linha);
  g.forEach((r, i) => {
    const y = topo + i * linha;
    const validos = r.lula + r.flavio + r.outros;
    texto(svg, 0, y + 12, `${nomes[r.grupo]} · ${fmt(r.secoes)} seções`, { class: "rotulo-forte" });
    let x = 0;
    series.forEach(([nome, k, c]) => {
      const v = (100 * r[k]) / validos;
      const w = (v / 100) * largura;
      // 2px de fundo entre os segmentos
      const b = el("rect", { x: x + (x ? 1 : 0), y: y + 20, width: Math.max(w - (x ? 2 : 1), 0), height: 22, fill: cor(c), rx: 3, class: "barra" }, svg);
      if (w > 64) texto(svg, x + 8, y + 36, pct(v), { style: "fill:#fff;font-weight:600" });
      alvo(b, () => `<div class="t-titulo">${nomes[r.grupo]}</div><div class="t-linha"><i style="background:${cor(c)}"></i><b>${pct(v, 2)}</b><span>${nome} · ${fmt(r[k])} votos</span></div>`);
      x += w;
    });
  });
  tabela("t-votos",
    [["Grupo"], ["Seções", 1], ["Aptos", 1], ["Comparecimento", 1], ["Lula", 1], ["Flávio", 1], ["Outros", 1], ["Brancos", 1], ["Nulos", 1], ["Lula venceu", 1], ["Flávio venceu", 1]],
    g.map((r) => {
      const v = r.lula + r.flavio + r.outros;
      const c = r.comparecimento;
      return [nomes[r.grupo], fmt(r.secoes), fmt(r.aptos), pct((100 * c) / r.aptos),
        `${fmt(r.lula)} (${pct((100 * r.lula) / v)})`, `${fmt(r.flavio)} (${pct((100 * r.flavio) / v)})`, `${fmt(r.outros)} (${pct((100 * r.outros) / v)})`,
        `${fmt(r.branco)} (${pct((100 * r.branco) / c)})`, `${fmt(r.nulo)} (${pct((100 * r.nulo) / c)})`,
        fmt(r.lula_venceu) + " seções", fmt(r.flavio_venceu) + " seções"];
    }));
}

function permutacao(d) {
  const r = d.resultados.reais;
  const t = r.teste, h = r.histograma;
  document.getElementById("n-zonas").textContent = fmt(t.zonas);
  const altura = 240, base = 200, esq = 4;
  const { svg, largura } = svgNovo("g-perm", altura);
  const n = h.contagem.length;
  const x0 = h.inicio, x1 = h.inicio + n * h.passo;
  const xs = (v) => esq + ((v - x0) / (x1 - x0)) * (largura - 2 * esq);
  const max = Math.max(...h.contagem);
  el("rect", { x: xs(t.faixa95[0]), y: 16, width: xs(t.faixa95[1]) - xs(t.faixa95[0]), height: base - 16, class: "faixa" }, svg);
  const bw = (largura - 2 * esq) / n;
  h.contagem.forEach((c, i) => {
    const ini = x0 + i * h.passo;
    const b = barraV(svg, xs(ini) + 1, base, Math.max(bw - 2, 1), (c / max) * (base - 30), cor("--neutral"), 2);
    alvo(b, () => `<div class="t-titulo">${pct(100 * ini, 1)} a ${pct(100 * (ini + h.passo), 1)}</div><div class="t-linha"><b>${fmt(c)}</b><span>sorteios</span></div>`);
  });
  el("line", { x1: esq, x2: largura - esq, y1: base, y2: base, stroke: cor("--axis") }, svg);
  const xo = xs(t.observado);
  el("line", { x1: xo, x2: xo, y1: 6, y2: base, class: "linha-obs" }, svg);
  const anc = xo > largura * 0.7 ? "end" : "start";
  texto(svg, xo + (anc === "end" ? -6 : 6), 14, "real: " + pct(100 * t.observado), { class: "rotulo-forte", "text-anchor": anc });
  // Eixo: de ponto em ponto percentual
  for (let v = Math.ceil(x0 * 100); v <= Math.floor(x1 * 100); v++) {
    texto(svg, xs(v / 100), base + 18, v + "%", { "text-anchor": "middle" });
  }
  texto(svg, xs((t.faixa95[0] + t.faixa95[1]) / 2), base + 36, "faixa de 95% do acaso", { "text-anchor": "middle" });

  document.getElementById("txt-perm").innerHTML =
    `Nas <strong>${fmt(t.escolas_alteradas)}</strong> escolas que mudaram (entre ${fmt(t.escolas_total)} escolas dessas zonas), Lula teve <strong>${pct(100 * t.observado)}</strong> dos votos dados a Lula ou Flávio. Os sorteios deram em média ${pct(100 * t.media_acaso)}, e 95% deles ficaram entre ${pct(100 * t.faixa95[0])} e ${pct(100 * t.faixa95[1])}. ` +
    `O valor real está dentro da faixa, com <strong>p = ${fmt(t.p, 2)}</strong>: em ${fmt(100 * t.p, 0)}% dos sorteios, o acaso ficou tão longe da média quanto o real, ou mais. Para indicar que escolas lulistas foram escolhidas de propósito, o real teria que passar de ${pct(100 * t.faixa95[1])}; para indicar o contrário, ficar abaixo de ${pct(100 * t.faixa95[0])}.`;
  const td = d.resultados.todas.teste;
  document.getElementById("txt-todas").textContent =
    `${pct(100 * td.observado)} de Lula nas escolas alteradas, faixa do acaso de ${pct(100 * td.faixa95[0])} a ${pct(100 * td.faixa95[1])}, p = ${fmt(td.p, 2)}`;
}

function estados(d) {
  const cores = { Lula: "--series-1", "Flávio": "--series-2" };
  legenda("leg-estados", [["Lula venceu no estado", cores.Lula], ["Flávio venceu no estado", cores["Flávio"]]]);
  const pv = Object.fromEntries(d.por_vencedor.map((v) => [v.vencedor, v]));
  document.getElementById("lead-estados").textContent =
    `Os ${pv.Lula.estados} estados onde Lula venceu tiveram ${fmt(pv.Lula.por_10mil, 1)} seções alteradas a cada 10 mil, quase 3 vezes os ${fmt(pv["Flávio"].por_10mil, 1)} dos ${pv["Flávio"].estados} estados onde Flávio venceu. ` +
    `É o dado mais forte a favor da hipótese de direcionamento, mas a mudança é decidida pela zona eleitoral, escola por escola, e o padrão já existia: em 2022, os estados com mais alterações entre turnos foram PE, MA, PR, RR e PA.`;
  // Comparação agregada: a taxa por 10 mil seções, lado a lado
  legenda("leg-vencedor", [["Lula venceu no estado", cores.Lula], ["Flávio venceu no estado", cores["Flávio"]]]);
  {
    const lin = [pv.Lula, pv["Flávio"]];
    const { svg, largura } = svgNovo("g-vencedor", lin.length * 40);
    const maxv = Math.max(...lin.map((v) => v.por_10mil));
    const wv = largura - 240;
    lin.forEach((v, i) => {
      const y = i * 40;
      texto(svg, 0, y + 22, `${v.vencedor} venceu`, { class: "rotulo-forte" });
      const bw = (v.por_10mil / maxv) * wv;
      const b = barraH(svg, 100, y + 8, bw, 22, cor(cores[v.vencedor]));
      texto(svg, 100 + bw + 8, y + 24, `${fmt(v.por_10mil, 1)} a cada 10 mil`, { class: "rotulo-forte" });
      alvo(b, () => `<div class="t-titulo">${v.estados} estados onde ${v.vencedor} venceu</div><div class="t-linha"><b>${fmt(v.alteradas)}</b><span>seções alteradas de ${fmt(v.secoes)}</span></div>`);
    });
  }
  tabela("t-vencedor", [["Quem venceu no estado"], ["Estados", 1], ["Seções no total", 1], ["Seções alteradas", 1], ["A cada 10 mil seções", 1]],
    [pv.Lula, pv["Flávio"]].map((v) => [v.vencedor, fmt(v.estados), fmt(v.secoes), fmt(v.alteradas), fmt(v.por_10mil, 1)]));

  const est = [...d.estados].sort((a, b) => b.por_10mil - a.por_10mil || a.uf.localeCompare(b.uf));
  const linha = 22, esq = 34;
  const { svg, largura } = svgNovo("g-estados", est.length * linha + 4);
  const max = Math.max(...est.map((e) => e.por_10mil));
  const w = largura - esq - 120;
  est.forEach((e, i) => {
    const y = i * linha + 2;
    texto(svg, 0, y + 13, e.uf, { class: "rotulo-forte" });
    const bw = (e.por_10mil / max) * w;
    const alvoRect = el("rect", { x: 0, y, width: largura, height: linha, fill: "transparent" }, svg);
    barraH(svg, esq, y + 3, bw, linha - 8, cor(cores[e.vencedor]));
    texto(svg, esq + bw + 6, y + 14, `${fmt(e.por_10mil, 1)} (${fmt(e.alteradas)} ${e.alteradas === 1 ? "seção" : "seções"})`);
    alvo(alvoRect, () => `<div class="t-titulo">${e.uf} · ${e.vencedor} venceu (${pct(e.vencedor === "Lula" ? e.pct_lula : e.pct_flavio)} dos válidos)</div>` +
      `<div class="t-linha"><b>${fmt(e.alteradas)}</b><span>seções alteradas de ${fmt(e.secoes)}</span></div>` +
      (e.alteradas ? `<div class="t-linha"><span>Nas alteradas: Lula ${pct(e.pct_lula_alt)} · Flávio ${pct(e.pct_flavio_alt)}</span></div>` : ""));
  });
  tabela("t-estados",
    [["UF"], ["Seções", 1], ["Alteradas", 1], ["Por 10 mil", 1], ["Venceu no estado"], ["Lula no estado", 1], ["Flávio no estado", 1], ["Lula nas alteradas", 1], ["Flávio nas alteradas", 1]],
    [...d.estados].sort((a, b) => b.alteradas - a.alteradas || a.uf.localeCompare(b.uf)).map((e) => [
      e.uf, fmt(e.secoes), fmt(e.alteradas), fmt(e.por_10mil, 1), e.vencedor, pct(e.pct_lula), pct(e.pct_flavio),
      e.alteradas ? pct(e.pct_lula_alt) : "", e.alteradas ? pct(e.pct_flavio_alt) : ""]));
}

function historico(d) {
  const series = [["Entre turnos", "entre_turnos", "--series-3"], ["Desde o cadastro", "vs_original", "--neutral"]];
  legenda("leg-hist", series.map(([n, , c]) => [n, c]));
  const dados = d.historico.map((h) => (h.ano === 2026 ? { ...h, entre_turnos: d.painel.secoes } : h));
  const altura = 230, base = 196, topo = 20;
  const { svg, largura } = svgNovo("g-hist", altura);
  const max = Math.max(...dados.map((h) => h.vs_original));
  const grupo = largura / dados.length;
  const bw = Math.min(56, grupo / 3);
  el("line", { x1: 0, x2: largura, y1: base, y2: base, stroke: cor("--axis") }, svg);
  dados.forEach((h, i) => {
    const cx = grupo * i + grupo / 2;
    series.forEach(([nome, k, c], j) => {
      const x = cx - bw - 1 + j * (bw + 2);
      const alt = (h[k] / max) * (base - topo);
      const b = barraV(svg, x, base, bw, alt, cor(c));
      texto(svg, x + bw / 2, base - alt - 6, fmt(h[k]), { "text-anchor": "middle", class: "rotulo-forte" });
      alvo(b, () => `<div class="t-titulo">${h.ano} · ${nome.toLowerCase()}</div><div class="t-linha"><i style="background:${cor(c)}"></i><b>${fmt(h[k])}</b><span>seções de ${fmt(h.secoes)}</span></div>`);
    });
    texto(svg, cx, base + 20, String(h.ano), { "text-anchor": "middle", class: "rotulo-forte" });
  });
}

// ---------- Tema e montagem ----------

const ICONES = {
  light: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
};
function temaAtual() {
  const t = document.documentElement.getAttribute("data-theme");
  if (t) return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

let DADOS = null;
function desenhar() {
  if (!DADOS) return;
  funil(DADOS); votos(DADOS); permutacao(DADOS); estados(DADOS); historico(DADOS);
}

const btn = document.getElementById("btn-tema");
function iconeTema() { btn.innerHTML = temaAtual() === "dark" ? ICONES.light : ICONES.dark; }
btn.addEventListener("click", () => {
  const novo = temaAtual() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", novo);
  try { localStorage.setItem("tema", novo); } catch (e) {}
  iconeTema(); desenhar();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { iconeTema(); desenhar(); });
iconeTema();

let espera;
window.addEventListener("resize", () => { clearTimeout(espera); espera = setTimeout(desenhar, 150); });

fetch("data/resultados.json")
  .then((r) => r.json())
  .then((d) => { DADOS = d; tiles(d); desenhar(); });

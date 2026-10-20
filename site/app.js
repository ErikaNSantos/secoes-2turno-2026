// Seções alteradas no 2º turno. SVG desenhado à mão, sem biblioteca: são gráficos simples.

const NS = "http://www.w3.org/2000/svg";
// A mesma página em dois idiomas: /index.html (pt) e /en/index.html (en) carregam este arquivo.
const EN = document.documentElement.lang === "en";
const L = (pt, en) => (EN ? en : pt);
const RAIZ = new URL(".", document.currentScript.src);
const fmt = (v, d = 0) => v.toLocaleString(L("pt-BR", "en-US"), { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v, d = 1) => fmt(v, d) + "%";
const cor = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

// Mesmas fontes citadas no texto: as duas primeiras são números do TSE divulgados à imprensa.
const FUNIL = [
  { rotulo: L("16/10 · TSE à imprensa", "Oct 16 · TSE to the press"), valor: 4352 },
  { rotulo: L("18/10 · TSE à imprensa", "Oct 18 · TSE to the press"), valor: 2033 },
  { rotulo: L("19/10 · lista do painel", "Oct 19 · dashboard list"), valor: (d) => d.historico.secoes },
  { rotulo: L("20/10 · lista do painel", "Oct 20 · dashboard list"), valor: (d) => d.lista.secoes },
  { rotulo: L("20/10 · mudanças reais analisadas", "Oct 20 · real changes analyzed"), valor: (d) => d.lista.analisadas },
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
  const t = d.resultados.principal.teste;
  const itens = [
    [L("Seções na lista do TSE", "Sections on the TSE list"), fmt(d.lista.secoes), L("painel de 20/10", "dashboard, Oct 20")],
    [L("Mudanças reais analisadas", "Real changes analyzed"), fmt(d.lista.analisadas), fmt(d.lista.eleitores_analisadas) + L(" eleitores", " voters")],
    [L("Fatia do Lula nas escolas alteradas", "Lula's share in moved schools"), pct(100 * t.observado), L("acaso: ", "chance: ") + pct(100 * t.media_acaso)],
    [L("p do teste", "Test p-value"), fmt(t.p, 2), L("abaixo de 0,05 seria fora do normal", "below 0.05 would be unusual")],
  ];
  document.getElementById("tiles").innerHTML = itens
    .map(([r, v, det]) => `<div class="cartao tile"><div class="rotulo">${r}</div><div class="valor">${v}</div><div class="detalhe">${det}</div></div>`)
    .join("");
  document.getElementById("veredito").innerHTML =
    L(`<p><strong>Não há sinal de direcionamento.</strong> Dentro das mesmas zonas eleitorais, as escolas que mudaram de local votaram como escolas sorteadas ao acaso: ${pct(100 * t.observado)} de Lula, contra ${pct(100 * t.faixa95[0])} a ${pct(100 * t.faixa95[1])} esperados pelo acaso.</p>`,
      `<p><strong>No sign of targeting.</strong> Within the same electoral zones, the schools that moved voted like schools drawn at random: ${pct(100 * t.observado)} for Lula, against ${pct(100 * t.faixa95[0])} to ${pct(100 * t.faixa95[1])} expected by chance.</p>`);
}

function funil(d) {
  const dados = FUNIL.map((f) => ({ ...f, valor: typeof f.valor === "function" ? f.valor(d) : f.valor }));
  const linha = 44, topo = 4;
  const { svg, largura } = svgNovo("g-funil", topo + dados.length * linha);
  const max = Math.max(...dados.map((f) => f.valor));
  const w = largura - 60;
  dados.forEach((f, i) => {
    const y = topo + i * linha;
    texto(svg, 0, y + 12, f.rotulo);
    const nosso = i >= 3;
    const b = barraH(svg, 0, y + 18, (f.valor / max) * w, 18, cor(nosso ? "--accent" : "--neutral"));
    texto(svg, (f.valor / max) * w + 6, y + 31, fmt(f.valor), { class: "rotulo-forte" });
    alvo(b, () => `<div class="t-titulo">${f.rotulo}</div><div class="t-linha"><b>${fmt(f.valor)}</b><span>${L("seções", "sections")}</span></div>`);
  });
  const p = d.lista;
  document.getElementById("limpeza").innerHTML = `<table><tbody>
    <tr><td>${L("Na lista do painel de 20/10", "On the Oct 20 dashboard list")}</td><td class="num">${fmt(p.secoes)}</td></tr>
    <tr><td>${L("Só trocaram o código do local, mesmo endereço", "Only the place code changed, same address")}</td><td class="num">−${fmt(p.codigo)}</td></tr>
    <tr><td>${L("Fora da lista: mesmo código, outro endereço (mudança real)", "Off the list: same code, new address (real change)")}</td><td class="num">+${fmt(p.fora_real)}</td></tr>
    <tr><td><strong>${L("Mudanças reais analisadas", "Real changes analyzed")}</strong></td><td class="num"><strong>${fmt(p.analisadas)}</strong></td></tr>
  </tbody></table>`;
}

function votos(d) {
  const nomes = { alteradas: L("Seções alteradas", "Moved sections"), "mesmas zonas, não alteradas": L("Mesmas zonas, não alteradas", "Same zones, not moved"), Brasil: L("Brasil", "Brazil") };
  const series = [["Lula", "lula", "--lula"], ["Flávio", "flavio", "--flavio"], [L("Outros candidatos", "Other candidates"), "outros", "--neutral"]];
  legenda("leg-votos", series.map(([n, , c]) => [n, c]));
  const g = d.resultados.principal.grupos;
  const linha = 58, topo = 2;
  const { svg, largura } = svgNovo("g-votos", topo + g.length * linha);
  g.forEach((r, i) => {
    const y = topo + i * linha;
    const validos = r.lula + r.flavio + r.outros;
    texto(svg, 0, y + 12, `${nomes[r.grupo]} · ${fmt(r.secoes)} ${L("seções", "sections")}`, { class: "rotulo-forte" });
    let x = 0;
    series.forEach(([nome, k, c]) => {
      const v = (100 * r[k]) / validos;
      const w = (v / 100) * largura;
      // 2px de fundo entre os segmentos
      const b = el("rect", { x: x + (x ? 1 : 0), y: y + 20, width: Math.max(w - (x ? 2 : 1), 0), height: 22, fill: cor(c), rx: 3, class: "barra" }, svg);
      if (w > 64) texto(svg, x + 8, y + 36, pct(v), { style: "fill:#fff;font-weight:600" });
      alvo(b, () => `<div class="t-titulo">${nomes[r.grupo]}</div><div class="t-linha"><i style="background:${cor(c)}"></i><b>${pct(v, 2)}</b><span>${nome} · ${fmt(r[k])} ${L("votos", "votes")}</span></div>`);
      x += w;
    });
  });
  tabela("t-votos",
    [[L("Grupo", "Group")], [L("Seções", "Sections"), 1], [L("Aptos", "Registered"), 1], [L("Comparecimento", "Turnout"), 1], ["Lula", 1], ["Flávio", 1], [L("Outros", "Others"), 1], [L("Brancos", "Blank"), 1], [L("Nulos", "Null"), 1], [L("Lula venceu", "Lula won"), 1], [L("Flávio venceu", "Flávio won"), 1]],
    g.map((r) => {
      const v = r.lula + r.flavio + r.outros;
      const c = r.comparecimento;
      return [nomes[r.grupo], fmt(r.secoes), fmt(r.aptos), pct((100 * c) / r.aptos),
        `${fmt(r.lula)} (${pct((100 * r.lula) / v)})`, `${fmt(r.flavio)} (${pct((100 * r.flavio) / v)})`, `${fmt(r.outros)} (${pct((100 * r.outros) / v)})`,
        `${fmt(r.branco)} (${pct((100 * r.branco) / c)})`, `${fmt(r.nulo)} (${pct((100 * r.nulo) / c)})`,
        fmt(r.lula_venceu) + L(" seções", " sections"), fmt(r.flavio_venceu) + L(" seções", " sections")];
    }));
}

// Histograma dos sorteios com a faixa de 95% e a linha do valor real.
function histograma(id, t) {
  const h = t.histograma;
  const altura = 240, base = 200, esq = 4;
  const { svg, largura } = svgNovo(id, altura);
  const n = h.contagem.length;
  const x0 = h.inicio, x1 = h.inicio + n * h.passo;
  const xs = (v) => esq + ((v - x0) / (x1 - x0)) * (largura - 2 * esq);
  const max = Math.max(...h.contagem);
  el("rect", { x: xs(t.faixa95[0]), y: 16, width: xs(t.faixa95[1]) - xs(t.faixa95[0]), height: base - 16, class: "faixa" }, svg);
  const bw = (largura - 2 * esq) / n;
  h.contagem.forEach((c, i) => {
    const ini = x0 + i * h.passo;
    const b = barraV(svg, xs(ini) + 1, base, Math.max(bw - 2, 1), (c / max) * (base - 30), cor("--neutral"), 2);
    alvo(b, () => `<div class="t-titulo">${pct(100 * ini, 1)} ${L("a", "to")} ${pct(100 * (ini + h.passo), 1)}</div><div class="t-linha"><b>${fmt(c)}</b><span>${L("sorteios", "draws")}</span></div>`);
  });
  el("line", { x1: esq, x2: largura - esq, y1: base, y2: base, stroke: cor("--axis") }, svg);
  const xo = xs(t.observado);
  el("line", { x1: xo, x2: xo, y1: 6, y2: base, class: "linha-obs" }, svg);
  const anc = xo > largura * 0.7 ? "end" : "start";
  texto(svg, xo + (anc === "end" ? -6 : 6), 14, L("real: ", "actual: ") + pct(100 * t.observado), { class: "rotulo-forte", "text-anchor": anc });
  // Eixo: de ponto em ponto percentual
  for (let v = Math.ceil(x0 * 100); v <= Math.floor(x1 * 100); v++) {
    texto(svg, xs(v / 100), base + 18, v + "%", { "text-anchor": "middle" });
  }
  texto(svg, xs((t.faixa95[0] + t.faixa95[1]) / 2), base + 36, L("faixa de 95% do acaso", "95% range of chance"), { "text-anchor": "middle" });
}

function permutacao(d) {
  const t = d.resultados.principal.teste;
  document.getElementById("n-zonas").textContent = fmt(t.zonas);
  histograma("g-perm", t);
  document.getElementById("txt-perm").innerHTML =
    L(`Nas <strong>${fmt(t.escolas_alteradas)}</strong> escolas que mudaram (entre ${fmt(t.escolas_total)} escolas dessas zonas), Lula teve <strong>${pct(100 * t.observado)}</strong> dos votos dados a Lula ou Flávio. Os sorteios deram em média ${pct(100 * t.media_acaso)}, e 95% deles ficaram entre ${pct(100 * t.faixa95[0])} e ${pct(100 * t.faixa95[1])}. ` +
      `O valor real está dentro da faixa, com <strong>p = ${fmt(t.p, 2)}</strong>: em ${fmt(100 * t.p, 0)}% dos sorteios, o acaso ficou tão longe da média quanto o real, ou mais. Para indicar que escolas lulistas foram escolhidas de propósito, o real teria que passar de ${pct(100 * t.faixa95[1])}; para indicar o contrário, ficar abaixo de ${pct(100 * t.faixa95[0])}.`,
      `In the <strong>${fmt(t.escolas_alteradas)}</strong> schools that moved (out of ${fmt(t.escolas_total)} schools in those zones), Lula got <strong>${pct(100 * t.observado)}</strong> of the votes cast for Lula or Flávio. The draws averaged ${pct(100 * t.media_acaso)}, and 95% of them fell between ${pct(100 * t.faixa95[0])} and ${pct(100 * t.faixa95[1])}. ` +
      `The actual value is inside that range, with <strong>p = ${fmt(t.p, 2)}</strong>: in ${fmt(100 * t.p, 0)}% of the draws, chance landed as far from the average as the actual value, or farther. To suggest that pro-Lula schools were picked on purpose, the actual value would have to exceed ${pct(100 * t.faixa95[1])}; to suggest the opposite, fall below ${pct(100 * t.faixa95[0])}.`);

  const versoes = [
    ["principal", L("Lista limpa + mudanças reais fora dela (principal)", "Clean list + real changes off the list (main)")],
    ["so_lista", L("Só a lista limpa", "Clean list only")],
    ["com_mesma_rua", L("+ mesma rua, outro número", "+ same street, new number")],
    ["lista_inteira", L("Lista inteira, sem limpeza", "Full list, no cleaning")],
  ];
  tabela("t-robustez", [[L("Versão", "Version")], [L("Seções", "Sections"), 1], [L("Lula nas escolas alteradas", "Lula in moved schools"), 1], [L("95% do acaso", "95% of chance"), 1], ["p", 1]],
    versoes.map(([k, nome]) => {
      const r = d.resultados[k], tt = r.teste;
      return [nome, fmt(r.secoes), pct(100 * tt.observado), `${pct(100 * tt.faixa95[0])} ${L("a", "to")} ${pct(100 * tt.faixa95[1])}`, fmt(tt.p, 2)];
    }));
}

function saidas(d) {
  const s = d.saidas, t = s.teste, hh = d.historico;
  histograma("g-saidas", t);
  document.getElementById("txt-saidas").innerHTML =
    L(`Das <strong>${fmt(hh.reais)}</strong> mudanças reais da lista de 19/10, <strong>${fmt(hh.sairam)}</strong> não estão mais na lista de 20/10, e no cadastro atual essas seções voltam a votar no mesmo local do 1º turno. ` +
      `Nenhuma das ${fmt(s.zonas)} zonas teve só parte das mudanças desfeita: a decisão foi por zona inteira. Por isso o sorteio aqui é feito dentro de cada estado, onde o TRE decide. ` +
      `As escolas cuja mudança saiu deram <strong>${pct(100 * t.observado)}</strong> de Lula; sorteando o mesmo número de escolas dentro de cada estado, 95% dos sorteios ficaram entre ${pct(100 * t.faixa95[0])} e ${pct(100 * t.faixa95[1])} (<strong>p = ${fmt(t.p, 2)}</strong>). Dentro de cada estado, o que foi desfeito não pende para nenhum lado.`,
      `Of the <strong>${fmt(hh.reais)}</strong> real changes on the Oct 19 list, <strong>${fmt(hh.sairam)}</strong> are no longer on the Oct 20 list, and in the current registry those sections vote at their first-round place again. ` +
      `None of the ${fmt(s.zonas)} zones had only part of its changes undone: the decision was made per whole zone. So the draw here is made within each state, where the regional court decides. ` +
      `The schools whose change was dropped gave Lula <strong>${pct(100 * t.observado)}</strong>; drawing the same number of schools within each state, 95% of the draws fell between ${pct(100 * t.faixa95[0])} and ${pct(100 * t.faixa95[1])} (<strong>p = ${fmt(t.p, 2)}</strong>). Within each state, what was undone does not lean either way.`);
  tabela("t-saidas", [[L("UF", "State")], [L("Mudanças reais em 19/10", "Real changes, Oct 19"), 1], [L("Ainda na lista em 20/10", "Still listed, Oct 20"), 1], [L("Saíram", "Dropped"), 1]],
    s.por_uf.map((u) => [u.uf, fmt(u.em_19_10), fmt(u.mantidas), fmt(u.sairam)]));
}

function estados(d) {
  const cores = { Lula: "--lula", "Flávio": "--flavio" };
  const venceu = (nome) => L(`${nome} venceu`, `${nome} won`);
  const legVenc = [[L("Lula venceu no estado", "Lula won the state"), cores.Lula], [L("Flávio venceu no estado", "Flávio won the state"), cores["Flávio"]]];
  legenda("leg-estados", legVenc);
  const pv = Object.fromEntries(d.por_vencedor.map((v) => [v.vencedor, v]));
  document.getElementById("lead-estados").textContent =
    L(`Na lista atual, os ${pv.Lula.estados} estados onde Lula venceu têm ${fmt(pv.Lula.por_10mil, 1)} seções alteradas a cada 10 mil, e os ${pv["Flávio"].estados} onde Flávio venceu, ${fmt(pv["Flávio"].por_10mil, 1)}. ` +
      `Na lista de 19/10 a diferença era de quase 3 vezes (32,8 contra 11,3), e era o dado mais forte a favor da hipótese de direcionamento. Ela vinha das mudanças no Nordeste que saíram da lista (seção acima).`,
      `On the current list, the ${pv.Lula.estados} states Lula won have ${fmt(pv.Lula.por_10mil, 1)} moved sections per 10,000, and the ${pv["Flávio"].estados} states Flávio won have ${fmt(pv["Flávio"].por_10mil, 1)}. ` +
      `On the Oct 19 list the gap was almost 3 times (32.8 vs. 11.3), and it was the strongest data point for the targeting hypothesis. It came from the Northeast changes that were dropped from the list (section above).`);
  // Comparação agregada: a taxa por 10 mil seções, lado a lado
  legenda("leg-vencedor", legVenc);
  {
    const lin = [pv.Lula, pv["Flávio"]];
    const { svg, largura } = svgNovo("g-vencedor", lin.length * 40);
    const maxv = Math.max(...lin.map((v) => v.por_10mil));
    const wv = largura - 240;
    lin.forEach((v, i) => {
      const y = i * 40;
      texto(svg, 0, y + 22, venceu(v.vencedor), { class: "rotulo-forte" });
      const bw = (v.por_10mil / maxv) * wv;
      const b = barraH(svg, 100, y + 8, bw, 22, cor(cores[v.vencedor]));
      texto(svg, 100 + bw + 8, y + 24, `${fmt(v.por_10mil, 1)} ${L("a cada 10 mil", "per 10,000")}`, { class: "rotulo-forte" });
      alvo(b, () => L(`<div class="t-titulo">${v.estados} estados onde ${v.vencedor} venceu</div><div class="t-linha"><b>${fmt(v.alteradas)}</b><span>seções alteradas de ${fmt(v.secoes)}</span></div>`, `<div class="t-titulo">${v.estados} states ${v.vencedor} won</div><div class="t-linha"><b>${fmt(v.alteradas)}</b><span>moved sections out of ${fmt(v.secoes)}</span></div>`));
    });
  }
  tabela("t-vencedor", [[L("Quem venceu no estado", "State winner")], [L("Estados", "States"), 1], [L("Seções no total", "Total sections"), 1], [L("Seções alteradas", "Moved sections"), 1], [L("A cada 10 mil seções", "Per 10,000 sections"), 1], [L("Eleitores nas seções alteradas", "Voters in moved sections"), 1]],
    [pv.Lula, pv["Flávio"]].map((v) => [v.vencedor, fmt(v.estados), fmt(v.secoes), fmt(v.alteradas), fmt(v.por_10mil, 1), fmt(v.aptos_alteradas)]));

  // Exposição: votos do 1º turno dentro das seções alteradas, em número absoluto
  const alt = d.resultados.principal.grupos.find((g) => g.grupo === "alteradas");
  const brasil = d.resultados.principal.grupos.find((g) => g.grupo === "Brasil");
  legenda("leg-expostos", [["Lula", "--lula"], ["Flávio", "--flavio"]]);
  {
    const validos = alt.lula + alt.flavio + alt.outros;
    const lin = [["Lula", alt.lula, "--lula"], ["Flávio", alt.flavio, "--flavio"]];
    const { svg, largura } = svgNovo("g-expostos", lin.length * 40);
    const maxv = Math.max(...lin.map((l) => l[1]));
    const wv = largura - 290;
    lin.forEach(([nome, v, c], i) => {
      const y = i * 40;
      texto(svg, 0, y + 22, nome, { class: "rotulo-forte" });
      const bw = (v / maxv) * wv;
      const b = barraH(svg, 70, y + 8, bw, 22, cor(c));
      texto(svg, 70 + bw + 8, y + 24, L(`${fmt(v)} votos (${pct((100 * v) / validos)} dos válidos)`, `${fmt(v)} votes (${pct((100 * v) / validos)} of valid votes)`), { class: "rotulo-forte" });
      alvo(b, () => `<div class="t-titulo">${L("Seções alteradas · 1º turno", "Moved sections · 1st round")}</div><div class="t-linha"><i style="background:${cor(c)}"></i><b>${fmt(v)}</b><span>${L("votos em", "votes for")} ${nome}</span></div>`);
    });
  }
  document.getElementById("txt-expostos").innerHTML =
    L(`Lula teve <strong>${fmt(alt.lula - alt.flavio)} votos a mais</strong> que Flávio nessas seções, então, se a mudança de local reduzir o comparecimento, ele perde mais votos em número absoluto. ` +
      `O efeito é pequeno perto da eleição: são ${fmt(alt.aptos)} eleitores aptos nas seções alteradas, de ${fmt(brasil.aptos)} no país. ` +
      `E isso mostra quem é mais exposto, não quem foi escolhido como alvo: dentro das zonas, as escolas alteradas votam como as vizinhas.`,
      `Lula had <strong>${fmt(alt.lula - alt.flavio)} more votes</strong> than Flávio in these sections, so if the move lowers turnout, he loses more votes in absolute terms. ` +
      `The effect is small for an election this size: ${fmt(alt.aptos)} registered voters in moved sections, out of ${fmt(brasil.aptos)} nationwide. ` +
      `And this shows who is more exposed, not who was targeted: within the zones, moved schools vote like their neighbors.`);

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
    texto(svg, esq + bw + 6, y + 14, `${fmt(e.por_10mil, 1)} (${fmt(e.alteradas)} ${e.alteradas === 1 ? L("seção", "section") : L("seções", "sections")})`);
    alvo(alvoRect, () => `<div class="t-titulo">${e.uf} · ${venceu(e.vencedor)} (${pct(e.vencedor === "Lula" ? e.pct_lula : e.pct_flavio)} ${L("dos válidos", "of valid votes")})</div>` +
      `<div class="t-linha"><b>${fmt(e.alteradas)}</b><span>${L("seções alteradas de", "moved sections out of")} ${fmt(e.secoes)}</span></div>` +
      (e.alteradas ? `<div class="t-linha"><span>${L("Nas alteradas", "In moved sections")}: Lula ${pct(e.pct_lula_alt)} · Flávio ${pct(e.pct_flavio_alt)}</span></div>` : ""));
  });
  tabela("t-estados",
    [[L("UF", "State")], [L("Seções", "Sections"), 1], [L("Alteradas", "Moved"), 1], [L("Por 10 mil", "Per 10,000"), 1], [L("Venceu no estado", "State winner")], [L("Lula no estado", "Lula, state"), 1], [L("Flávio no estado", "Flávio, state"), 1], [L("Lula nas alteradas", "Lula, moved"), 1], [L("Flávio nas alteradas", "Flávio, moved"), 1]],
    [...d.estados].sort((a, b) => b.alteradas - a.alteradas || a.uf.localeCompare(b.uf)).map((e) => [
      e.uf, fmt(e.secoes), fmt(e.alteradas), fmt(e.por_10mil, 1), e.vencedor, pct(e.pct_lula), pct(e.pct_flavio),
      e.alteradas ? pct(e.pct_lula_alt) : "", e.alteradas ? pct(e.pct_flavio_alt) : ""]));
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
  funil(DADOS); votos(DADOS); permutacao(DADOS); saidas(DADOS); estados(DADOS);
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

fetch(new URL("data/resultados.json", RAIZ))
  .then((r) => r.json())
  .then((d) => { DADOS = d; tiles(d); desenhar(); });

// Baixa a lista "Seções Eleitorais Alteradas no Segundo Turno" do painel de Estatísticas do Eleitorado do TSE.
//
// O botão de exportar do painel falha (ORA-40441) e a tabela mostra só 20 linhas por vez. O painel é um
// relatório clássico do Oracle APEX, e o próprio botão "Próximo" chama apex.widget.report.paginate(região, id,
// {min, max}). O script chama essa função direto, página por página, e junta tudo num CSV.
//
// Como usar: abra o relatório no navegador, volte para a 1ª página, abra o Console (F12) e cole o script.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const btn = document.querySelector(".t-Report-paginationLink--next");
  if (!btn) return console.log('Botão "Próximo" não encontrado. Volte para a 1ª página e rode de novo.');
  const [, rid, ajax] = btn.getAttribute("href").match(/paginate\('([^']+)',\s*'([^']+)'/);
  const regiao = () => document.getElementById("report_" + rid) || btn.closest(".t-Region") || document;
  const tabela = () => [...regiao().querySelectorAll("table")].sort((a, b) => b.rows.length - a.rows.length)[0];
  const linhasTela = () => [...tabela().querySelectorAll("tr")].filter((tr) => tr.querySelector("td"))
    .map((tr) => [...tr.querySelectorAll("td")].map((td) => td.innerText.trim()));
  const assinatura = () => (linhasTela()[0] || []).join("|") + "#" + linhasTela().length;
  const cab = [...tabela().querySelectorAll("th")].map((th) => th.innerText.trim());

  // Pede a página e espera a tabela trocar antes de ler.
  const ir = async (min, max) => {
    const antes = assinatura();
    apex.widget.report.paginate(rid, ajax, { min, max, fetched: max });
    for (let i = 0; i < 80; i++) { await sleep(250); if (assinatura() !== antes) return true; }
    return false;
  };
  const linhas = [], vistos = new Set();
  const guarda = () => {
    for (const c of linhasTela()) { const k = c.join("|"); if (!vistos.has(k)) { vistos.add(k); linhas.push(c); } }
  };

  // 1) tenta tudo de uma vez
  await ir(1, 5000);
  guarda();

  // 2) se o servidor limitou a 20 linhas, pagina de 20 em 20
  if (linhasTela().length <= 20) {
    linhas.length = 0; vistos.clear();
    for (let min = 1; min < 100000; min += 20) {
      const mudou = await ir(min, 20);
      if (!mudou && min > 1) break;
      const antes = linhas.length; guarda();
      console.log("min", min, "| total:", linhas.length);
      if (linhas.length === antes && min > 1) break; // página repetida: acabou
    }
  }

  const esc = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const csv = [cab, ...linhas].map((r) => r.map(esc).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
  a.download = "secoes_alteradas_2turno.csv";
  a.click();
  console.log("Pronto. Linhas:", linhas.length);
})();

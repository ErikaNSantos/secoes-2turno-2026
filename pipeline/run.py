"""Roda tudo: baixa os arquivos do TSE, cruza com a lista do painel e grava os resultados.

    python -m pipeline.run
"""
import json
from pathlib import Path

import duckdb
import numpy as np

from pipeline import analise, base, fontes

PAINEL = Path("data/painel/secoes_alteradas_2026-10-19.csv")
TABELAS = Path("data/tabelas")
SITE = Path("site/data/resultados.json")

REAIS = ["local e endereço diferentes"]
TODAS = ["mesmo local", "mesmo endereço", "local e endereço diferentes"]


def histograma(sims: np.ndarray, passo: float = 0.001) -> dict:
    """Agrupa os sorteios em faixas de 0,1 ponto percentual para o gráfico."""
    ini = np.floor(sims.min() / passo) * passo
    bordas = np.arange(ini, sims.max() + passo, passo)
    contagem, _ = np.histogram(sims, bordas)
    return {"inicio": float(ini), "passo": passo, "contagem": contagem.tolist()}


def registros(df) -> list[dict]:
    """DataFrame -> lista de dicts, com NaN virando null no JSON (estado sem seção alterada)."""
    return json.loads(df.to_json(orient="records", force_ascii=False))


def main() -> None:
    con = duckdb.connect()
    base.criar_locais(con, fontes.csv_locais(2026), 2026)
    base.criar_votos(con, fontes.csv_votos(2026))
    base.criar_painel(con, PAINEL)

    painel = con.execute("""
        select count(*) secoes, count(mun) casadas, sum(eleitorado)::bigint eleitorado,
               count(*) filter (categoria = 'mesmo local') mesmo_local,
               count(*) filter (categoria = 'mesmo endereço') mesmo_endereco,
               count(*) filter (categoria = 'local e endereço diferentes') reais,
               sum(eleitorado) filter (categoria = 'local e endereço diferentes')::bigint eleitorado_reais
        from painel
    """).df().iloc[0].to_dict()

    resultados = {}
    for nome, cats in [("reais", REAIS), ("todas", TODAS)]:
        analise.marcar_alteradas(con, cats)
        g = analise.grupos(con)
        teste = analise.permutacao(analise.escolas(con))
        sims = teste.pop("sims")
        resultados[nome] = {"grupos": registros(g), "teste": teste, "histograma": histograma(sims)}
        if nome == "reais":
            est = analise.estados(con)
            vencedor = (est.groupby("vencedor")
                           .agg(estados=("uf", "size"), secoes=("secoes", "sum"), alteradas=("alteradas", "sum"))
                           .reset_index())
            vencedor["por_10mil"] = 10000 * vencedor.alteradas / vencedor.secoes
            TABELAS.mkdir(parents=True, exist_ok=True)
            g.to_csv(TABELAS / "grupos.csv", index=False)
            est.to_csv(TABELAS / "estados.csv", index=False, float_format="%.2f")

    saida = {
        "painel": {k: int(v) for k, v in painel.items()},
        "resultados": resultados,
        "estados": registros(est.round(2)),
        "por_vencedor": registros(vencedor.round(2)),
    }
    SITE.parent.mkdir(parents=True, exist_ok=True)
    SITE.write_text(json.dumps(saida, ensure_ascii=False, allow_nan=False, default=lambda o: o.item()))

    r = resultados["reais"]["teste"]
    print(f"{painel['reais']} seções com local e endereço diferentes | "
          f"observado {100 * r['observado']:.2f}% | acaso {100 * r['media_acaso']:.2f}% "
          f"(95%: {100 * r['faixa95'][0]:.2f} a {100 * r['faixa95'][1]:.2f}) | p {r['p']:.3f}")


if __name__ == "__main__":
    main()

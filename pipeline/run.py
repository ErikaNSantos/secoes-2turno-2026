"""Roda tudo: baixa os arquivos do TSE, cruza com a lista do painel e grava os resultados.

    python -m pipeline.run
"""
import json
from pathlib import Path

import duckdb
import numpy as np

from pipeline import analise, base, fontes

LISTA = Path("data/painel/secoes_alteradas_2026-10-20.csv")
REVISAO = Path("data/revisao/fora_da_lista_2026-10-20.csv")
HISTORICO = Path("data/painel/classificacao_2026-10-19.csv")
TABELAS = Path("data/tabelas")
SITE = Path("site/data/resultados.json")

LISTA_REAL = "lista: local e endereço diferentes"
LISTA_CODIGO = "lista: código mudou, mesmo endereço"
FORA_REAL = "fora da lista: real"
FORA_MESMA_RUA = "fora da lista: mesma rua, outro número"

# A análise principal e as variações que testam se a conclusão depende das escolhas de limpeza.
VERSOES = {
    "principal": [LISTA_REAL, FORA_REAL],
    "so_lista": [LISTA_REAL],
    "com_mesma_rua": [LISTA_REAL, FORA_REAL, FORA_MESMA_RUA],
    "lista_inteira": [LISTA_REAL, LISTA_CODIGO],
}


def histograma(sims: np.ndarray, passo: float = 0.001) -> dict:
    """Agrupa os sorteios em faixas de 0,1 ponto percentual para o gráfico."""
    ini = np.floor(sims.min() / passo) * passo
    bordas = np.arange(ini, sims.max() + passo, passo)
    contagem, _ = np.histogram(sims, bordas)
    return {"inicio": float(ini), "passo": passo, "contagem": contagem.tolist()}


def registros(df) -> list[dict]:
    """DataFrame -> lista de dicts, com NaN virando null no JSON (estado sem seção alterada)."""
    return json.loads(df.to_json(orient="records", force_ascii=False))


def teste(esc, estrato=("uf", "mun", "zona")) -> dict:
    t = analise.permutacao(esc, estrato=estrato)
    t["histograma"] = histograma(t.pop("sims"))
    return t


def main() -> None:
    con = duckdb.connect()
    base.criar_locais(con, fontes.csv_locais(2026), 2026)
    base.criar_votos(con, fontes.csv_votos(2026))
    base.criar_painel(con, LISTA, REVISAO)
    base.criar_historico(con, HISTORICO)

    contagem = dict(con.execute("select categoria, count(*) from painel group by 1").fetchall())
    eleitores = dict(con.execute("select categoria, sum(eleitorado)::bigint from painel group by 1").fetchall())
    hist = dict(con.execute("select categoria, count(*) from historico group by 1").fetchall())
    saidas_uf = analise.saidas_por_uf(con)

    resultados = {}
    for nome, cats in VERSOES.items():
        analise.marcar_alteradas(con, cats)
        resultados[nome] = {"secoes": len(con.execute("select 1 from secoes where alterada").fetchall()),
                            "teste": teste(analise.escolas(con))}
        if nome == "principal":
            g = analise.grupos(con)
            est = analise.estados(con)
            vencedor = (est.groupby("vencedor")
                           .agg(estados=("uf", "size"), secoes=("secoes", "sum"), alteradas=("alteradas", "sum"),
                                aptos_alteradas=("aptos_alteradas", "sum"))
                           .reset_index())
            vencedor["por_10mil"] = 10000 * vencedor.alteradas / vencedor.secoes
            resultados[nome]["grupos"] = registros(g)

    # Nenhuma zona teve só parte das mudanças desfeita: a decisão foi por zona inteira. Por isso o
    # sorteio das mudanças que saíram é feito dentro de cada UF (o TRE decide), não dentro da zona.
    esc_saidas = analise.escolas_saidas(con)
    zonas_mistas = int((esc_saidas.groupby(["uf", "mun", "zona"]).alterada.nunique() > 1).sum())
    saidas = teste(esc_saidas, estrato=("uf",))

    TABELAS.mkdir(parents=True, exist_ok=True)
    g.to_csv(TABELAS / "grupos.csv", index=False)
    est.to_csv(TABELAS / "estados.csv", index=False, float_format="%.2f")
    saidas_uf.to_csv(TABELAS / "saidas_por_uf.csv", index=False)

    saida = {
        "lista": {
            "data": "2026-10-20",
            "secoes": contagem.get(LISTA_REAL, 0) + contagem.get(LISTA_CODIGO, 0),
            "reais": contagem.get(LISTA_REAL, 0),
            "codigo": contagem.get(LISTA_CODIGO, 0),
            "fora_real": contagem.get(FORA_REAL, 0),
            "fora_mesma_rua": contagem.get(FORA_MESMA_RUA, 0),
            "fora_duvidosa": contagem.get("fora da lista: duvidosa", 0),
            "fora_escrita": contagem.get("fora da lista: escrita", 0),
            "fora_nao_revisada": contagem.get("fora da lista: não revisada", 0),
            "analisadas": contagem.get(LISTA_REAL, 0) + contagem.get(FORA_REAL, 0),
            "eleitores_analisadas": int(eleitores.get(LISTA_REAL, 0) + eleitores.get(FORA_REAL, 0)),
        },
        "historico": {
            "secoes": sum(hist.values()),
            "mesmo_local": hist.get("mesmo local", 0),
            "mesmo_endereco": hist.get("mesmo endereço", 0),
            "reais": hist.get("local e endereço diferentes", 0),
            "mantidas": int(saidas_uf.mantidas.sum()),
            "sairam": int(saidas_uf.sairam.sum()),
        },
        "resultados": resultados,
        "saidas": {"teste": saidas, "por_uf": registros(saidas_uf), "zonas_mistas": zonas_mistas,
                   "zonas": int(esc_saidas.groupby(["uf", "mun", "zona"]).ngroups)},
        "estados": registros(est.round(2)),
        "por_vencedor": registros(vencedor.round(2)),
    }
    SITE.parent.mkdir(parents=True, exist_ok=True)
    SITE.write_text(json.dumps(saida, ensure_ascii=False, allow_nan=False, default=lambda o: o.item()))

    for nome, r in resultados.items():
        t = r["teste"]
        print(f"{nome}: {r['secoes']} seções | observado {100 * t['observado']:.2f}% | "
              f"95% do acaso {100 * t['faixa95'][0]:.2f} a {100 * t['faixa95'][1]:.2f} | p {t['p']:.3f}")
    print(f"saíram da lista: {saidas['escolas_alteradas']} de {saidas['escolas_total']} escolas | "
          f"observado {100 * saidas['observado']:.2f}% | 95% do acaso {100 * saidas['faixa95'][0]:.2f} a "
          f"{100 * saidas['faixa95'][1]:.2f} | p {saidas['p']:.3f}")


if __name__ == "__main__":
    main()

"""As análises: votos por grupo, estados, teste de permutação e as mudanças que saíram da lista."""
import duckdb
import numpy as np
import pandas as pd


def marcar_alteradas(con: duckdb.DuckDBPyConnection, categorias: list[str]) -> None:
    """Tabela secoes: 1º turno de 2026 + votos + se a seção está entre as alteradas."""
    lista = ", ".join(f"'{c}'" for c in categorias)
    con.execute(f"""
        create or replace table secoes as
        select l.uf, l.mun, l.zona, l.secao, l.local_votacao, l.apto, v.* exclude (uf, mun, zona, secao),
               p.uf is not null alterada
        from locais_2026 l
        join votos v using (uf, mun, zona, secao)
        left join (select * from painel where categoria in ({lista})) p using (uf, mun, zona, secao)
        where l.turno = 1
    """)
    con.execute("""
        create or replace table zonas_alteradas as
        select uf, mun, zona from secoes group by all having bool_or(alterada)
    """)


SOMA = """
    count(*) secoes, sum(apto)::bigint aptos, sum(total)::bigint comparecimento,
    sum(lula)::bigint lula, sum(flavio)::bigint flavio, sum(outros)::bigint outros,
    sum(branco)::bigint branco, sum(nulo)::bigint nulo,
    sum((lula > flavio)::int)::bigint lula_venceu, sum((flavio > lula)::int)::bigint flavio_venceu
"""


def grupos(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    """Seções alteradas × não alteradas das mesmas zonas × Brasil."""
    return con.execute(f"""
        select 'alteradas' grupo, {SOMA} from secoes where alterada
        union all
        select 'mesmas zonas, não alteradas', {SOMA} from secoes join zonas_alteradas using (uf, mun, zona) where not alterada
        union all
        select 'Brasil', {SOMA} from secoes
    """).df()


def estados(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    """Por UF: quantas seções alteradas, quem venceu o estado e o voto nas seções alteradas."""
    return con.execute("""
        with uf as (
            select uf, count(*) secoes, sum(lula) lula, sum(flavio) flavio, sum(lula + flavio + outros) validos
            from secoes group by 1
        ),
        alt as (
            select uf, count(*) alteradas, sum(apto) aptos_alteradas,
                   sum(lula) lula_alt, sum(flavio) flavio_alt, sum(lula + flavio + outros) validos_alt
            from secoes where alterada group by 1
        )
        select uf.uf, uf.secoes, coalesce(alteradas, 0)::bigint alteradas, coalesce(aptos_alteradas, 0)::bigint aptos_alteradas,
               100.0 * uf.lula / uf.validos pct_lula, 100.0 * uf.flavio / uf.validos pct_flavio,
               case when uf.lula > uf.flavio then 'Lula' else 'Flávio' end vencedor,
               100.0 * lula_alt / validos_alt pct_lula_alt, 100.0 * flavio_alt / validos_alt pct_flavio_alt,
               10000.0 * coalesce(alteradas, 0) / uf.secoes por_10mil
        from uf left join alt using (uf)
        where uf.uf <> 'ZZ'
        order by alteradas desc, uf
    """).df()


def escolas(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    """Uma linha por local de votação (escola) das zonas com alguma alteração.

    A decisão de mudar é tomada por local: quando a escola fecha, todas as seções dela mudam.
    """
    return con.execute("""
        select uf, mun, zona, local_votacao, bool_or(alterada) alterada, sum(lula) lula, sum(flavio) flavio
        from secoes join zonas_alteradas using (uf, mun, zona)
        group by all
        order by uf, mun, zona, local_votacao  -- ordem fixa: com a mesma semente, o mesmo sorteio
    """).df()


def permutacao(esc: pd.DataFrame, n: int = 5000, semente: int = 7, estrato: tuple = ("uf", "mun", "zona")) -> dict:
    """Sorteia, dentro de cada zona, o mesmo número de escolas que mudou de verdade.

    Mede a fatia do Lula nos votos dados a Lula ou Flávio nas escolas sorteadas.
    As n repetições mostram o que uma escolha ao acaso produziria.
    """
    esc = esc.reset_index(drop=True)
    chave = esc[list(estrato)].astype(str).agg("|".join, axis=1)
    grupos = [(g.index.to_numpy(), int(g.alterada.sum())) for _, g in esc.groupby(chave)]
    lula, flavio = esc.lula.to_numpy(float), esc.flavio.to_numpy(float)

    obs = lula[esc.alterada].sum() / (lula[esc.alterada].sum() + flavio[esc.alterada].sum())
    rng = np.random.default_rng(semente)
    sims = np.empty(n)
    for i in range(n):
        idx = np.concatenate([rng.choice(ix, k, replace=False) for ix, k in grupos if k])
        sims[i] = lula[idx].sum() / (lula[idx].sum() + flavio[idx].sum())

    media = sims.mean()
    # Bicaudal: quantas vezes o acaso ficou tão longe da média quanto o observado (ou mais).
    p = float((np.abs(sims - media) >= abs(obs - media)).mean())
    return {
        "escolas_alteradas": int(esc.alterada.sum()),
        "escolas_total": len(esc),
        "zonas": len(grupos),  # estratos: zonas, ou UFs quando estrato=("uf",)
        "estratos_com_variacao": sum(1 for ix, k in grupos if 0 < k < len(ix)),
        "observado": float(obs),
        "media_acaso": float(media),
        "faixa95": [float(np.percentile(sims, 2.5)), float(np.percentile(sims, 97.5))],
        "p": p,
        "sims": sims,
    }



def saidas_por_uf(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    """Mudanças reais da lista de 19/10: quantas continuam na lista atual e quantas saíram."""
    return con.execute("""
        select h.uf, count(*) em_19_10, count(p.uf) mantidas, count(*) - count(p.uf) sairam
        from historico h
        left join (select * from painel where categoria like 'lista:%') p using (uf, mun, zona, secao)
        where h.categoria = 'local e endereço diferentes'
        group by 1 order by sairam desc, em_19_10 desc
    """).df()


def escolas_saidas(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    """Uma linha por escola que tinha mudança real na lista de 19/10.

    alterada = a mudança saiu da lista atual (todas as seções alteradas da escola saíram).
    Os votos são só das seções que estavam na lista de 19/10.
    """
    return con.execute("""
        select l.uf, l.mun, l.zona, l.local_votacao,
               bool_and(p.uf is null) alterada, sum(v.lula) lula, sum(v.flavio) flavio
        from historico h
        join locais_2026 l on l.turno = 1 and l.uf = h.uf and l.mun = h.mun and l.zona = h.zona and l.secao = h.secao
        join votos v on v.uf = h.uf and v.mun = h.mun and v.zona = h.zona and v.secao = h.secao
        left join (select * from painel where categoria like 'lista:%') p
               on p.uf = h.uf and p.mun = h.mun and p.zona = h.zona and p.secao = h.secao
        where h.categoria = 'local e endereço diferentes'
        group by all
        order by l.uf, l.mun, l.zona, l.local_votacao  -- ordem fixa: com a mesma semente, o mesmo sorteio
    """).df()

"""Monta as tabelas de trabalho no DuckDB a partir dos CSVs do TSE e da lista do painel."""
from pathlib import Path

import duckdb


def ler(csv: Path, encoding: str = "latin-1") -> str:
    return f"read_csv('{csv}', delim=';', header=true, encoding='{encoding}', all_varchar=true)"


def criar_locais(con: duckdb.DuckDBPyConnection, csv: Path, ano: int) -> None:
    """Uma linha por seção e turno: local de votação, endereço e eleitorado apto."""
    con.execute(f"""
        create or replace table locais_{ano} as
        select cast(NR_TURNO as int) turno, SG_UF uf, lpad(CD_MUNICIPIO, 5, '0') mun, NM_MUNICIPIO munnm,
               cast(NR_ZONA as int) zona, cast(NR_SECAO as int) secao,
               NR_LOCAL_VOTACAO local_votacao, NM_LOCAL_VOTACAO nome_local,
               upper(trim(DS_ENDERECO)) endereco, NR_LOCAL_VOTACAO_ORIGINAL local_original,
               try_cast(QT_ELEITOR_SECAO as int) apto
        from {ler(csv)}
    """)


def criar_votos(con: duckdb.DuckDBPyConnection, csv: Path) -> None:
    """Votos para presidente no 1º turno, uma linha por seção.

    O arquivo de votação traz o código do município sem o zero à esquerda ('2046'),
    e o de locais com ('02046'). Sem o lpad, AC, AM, AP, MA, PA, RO e RR somem do cruzamento.
    """
    con.execute(f"""
        create or replace table votos as
        select SG_UF uf, lpad(CD_MUNICIPIO, 5, '0') mun, cast(NR_ZONA as int) zona, cast(NR_SECAO as int) secao,
               sum(case when NR_VOTAVEL = '13' then q else 0 end) lula,
               sum(case when NR_VOTAVEL = '22' then q else 0 end) flavio,
               sum(case when NR_VOTAVEL not in ('13', '22', '95', '96') then q else 0 end) outros,
               sum(case when NR_VOTAVEL = '95' then q else 0 end) branco,
               sum(case when NR_VOTAVEL = '96' then q else 0 end) nulo,
               sum(q) total
        from (select *, cast(QT_VOTOS as int) q from {ler(csv)}
              where DS_CARGO = 'Presidente' and NR_TURNO = '1')
        group by all
    """)


def criar_painel(con: duckdb.DuckDBPyConnection, lista: Path, revisao: Path) -> None:
    """Seções alteradas para o 2º turno: as da lista oficial e as que mudaram fora dela.

    Lista do TSE (exportada do painel "Seções Eleitorais Alteradas no Segundo Turno"):
      - local e endereço diferentes: a mudança que o eleitor sente;
      - código mudou, mesmo endereço: o local ganhou outro código, mas fica no mesmo lugar.
    Fora da lista: seções que mantiveram o código do local e mudaram de endereço. A lista do TSE
    não pega esse caso. Cada uma foi revisada à mão (data/revisao/) como real, mesma rua com outro
    número, duvidosa ou só diferença de escrita; as que ainda não foram revisadas aparecem como tal.
    """
    con.execute(f"""
        create or replace table painel as
        with lista as (
            select sg_uf uf, nm_municipio munnm, cast(nr_zona as int) zona, cast(nr_secao as int) secao
            from {ler(lista, 'utf-8')}
        ),
        revisao as (
            select uf, munnm, cast(zona as int) zona, cast(secao as int) secao, classe
            from {ler(revisao, 'utf-8')}
        ),
        turnos as (
            select t1.uf, t1.munnm, t1.mun, t1.zona, t1.secao, t1.apto eleitorado,
                   t1.local_votacao l1, t2.local_votacao l2, t1.endereco e1, t2.endereco e2
            from locais_2026 t1 join locais_2026 t2 using (uf, mun, zona, secao)
            where t1.turno = 1 and t2.turno = 2
        )
        select t.*,
               case when l.uf is not null and t.e1 <> t.e2 then 'lista: local e endereço diferentes'
                    when l.uf is not null and t.l1 <> t.l2 then 'lista: código mudou, mesmo endereço'
                    when l.uf is not null then 'lista: nada mudou no cadastro'
                    else 'fora da lista: ' || coalesce(r.classe, 'não revisada') end categoria
        from turnos t
        left join lista l using (uf, munnm, zona, secao)
        left join revisao r using (uf, munnm, zona, secao)
        where l.uf is not null or (t.l1 = t.l2 and t.e1 <> t.e2)
    """)
    faltam = con.execute(f"""
        select count(*) from (select sg_uf uf, nm_municipio munnm, cast(nr_zona as int) zona, cast(nr_secao as int) secao
                              from {ler(lista, 'utf-8')}) l
        anti join (select * from locais_2026 where turno = 2) t using (uf, munnm, zona, secao)
    """).fetchone()[0]
    if faltam:
        raise ValueError(f"{faltam} seções da lista não foram encontradas no cadastro de locais")


def criar_historico(con: duckdb.DuckDBPyConnection, classificacao: Path) -> None:
    """Classificação da lista de 19/10, feita contra o cadastro de locais de 18/10.

    O TSE sobrescreve o cadastro a cada atualização, então a versão de 18/10 não pode ser baixada
    de novo: o resultado da classificação daquele dia fica versionado em data/painel/.
    """
    con.execute(f"""
        create or replace table historico as
        select h.uf, h.municipio munnm, l.mun, cast(h.zona as int) zona, cast(h.secao as int) secao, h.categoria
        from {ler(classificacao, 'utf-8')} h
        join (select distinct uf, munnm, mun from locais_2026) l on l.uf = h.uf and l.munnm = h.municipio
    """)

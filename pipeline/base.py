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


def criar_painel(con: duckdb.DuckDBPyConnection, csv: Path) -> None:
    """Lista "Seções Eleitorais Alteradas no Segundo Turno" do painel do TSE, casada com o cadastro.

    Classifica cada seção:
      - mesmo local: o próprio cadastro do TSE tem o mesmo local nos dois turnos;
      - mesmo endereço: o local mudou de nome/código, mas o endereço é idêntico;
      - local e endereço diferentes: a mudança que o eleitor sente.
    """
    con.execute(f"""
        create or replace table painel as
        with p as (
            select "UF" uf, "Município" munnm, cast("Zona" as int) zona, cast("Seção" as int) secao,
                   "Local de votação inicial" local_inicial, "Local de votação final" local_final,
                   cast("Eleitorado" as int) eleitorado
            from {ler(csv, 'utf-8')}
        )
        select p.*, t1.mun, t1.local_votacao l1, t2.local_votacao l2, t1.endereco e1, t2.endereco e2,
               case when t1.local_votacao = t2.local_votacao then 'mesmo local'
                    when t1.endereco = t2.endereco then 'mesmo endereço'
                    else 'local e endereço diferentes' end categoria
        from p
        left join locais_2026 t1 on t1.turno = 1 and t1.uf = p.uf and t1.munnm = p.munnm and t1.zona = p.zona and t1.secao = p.secao
        left join locais_2026 t2 on t2.turno = 2 and t2.uf = p.uf and t2.munnm = p.munnm and t2.zona = p.zona and t2.secao = p.secao
    """)

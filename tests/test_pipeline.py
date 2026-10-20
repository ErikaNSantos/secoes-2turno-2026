import duckdb
import numpy as np
import pandas as pd

from pipeline import analise, base


def escolas_sinteticas(direcionado: bool, semente: int = 1) -> pd.DataFrame:
    """40 zonas com 12 escolas cada; em cada zona, 2 escolas mudam de local."""
    rng = np.random.default_rng(semente)
    linhas = []
    for z in range(40):
        fatia = rng.uniform(0.2, 0.8, 12)  # fatia do Lula em cada escola
        mudadas = np.argsort(fatia)[-2:] if direcionado else rng.choice(12, 2, replace=False)
        for e in range(12):
            linhas.append({"uf": "BA", "mun": "00001", "zona": z, "local_votacao": str(e),
                           "alterada": e in mudadas, "lula": int(1000 * fatia[e]), "flavio": int(1000 * (1 - fatia[e]))})
    return pd.DataFrame(linhas)


def test_permutacao_nao_acusa_escolha_ao_acaso():
    r = analise.permutacao(escolas_sinteticas(direcionado=False), n=2000)
    assert r["faixa95"][0] <= r["observado"] <= r["faixa95"][1]
    assert r["p"] > 0.05


def test_permutacao_acusa_escolha_direcionada():
    # Mudar sempre as 2 escolas mais lulistas de cada zona tem que sair muito fora do acaso.
    r = analise.permutacao(escolas_sinteticas(direcionado=True), n=2000)
    assert r["observado"] > r["faixa95"][1]
    assert r["p"] < 0.01


def test_permutacao_mantem_numero_de_escolas_por_zona():
    esc = escolas_sinteticas(direcionado=False)
    r = analise.permutacao(esc, n=10)
    assert r["escolas_alteradas"] == 80 and r["zonas"] == 40


def test_votos_casam_mesmo_sem_zero_a_esquerda(tmp_path):
    cab = "SG_UF;CD_MUNICIPIO;NR_ZONA;NR_SECAO;DS_CARGO;NR_TURNO;NR_VOTAVEL;QT_VOTOS\n"
    (tmp_path / "v.csv").write_text(cab + "AM;2046;31;770;Presidente;1;13;10\nAM;2046;31;770;Presidente;1;95;2\n", encoding="latin-1")
    con = duckdb.connect()
    base.criar_votos(con, tmp_path / "v.csv")
    assert con.execute("select mun, lula, branco, total from votos").fetchall() == [("02046", 10, 2, 12)]


def test_painel_separa_lista_e_mudancas_fora_dela(tmp_path):
    cab = ("NR_TURNO;SG_UF;CD_MUNICIPIO;NM_MUNICIPIO;NR_ZONA;NR_SECAO;NR_LOCAL_VOTACAO;NM_LOCAL_VOTACAO;"
           "DS_ENDERECO;NR_LOCAL_VOTACAO_ORIGINAL;QT_ELEITOR_SECAO\n")
    linhas = [
        "1;PE;25313;RECIFE;1;1;100;ESCOLA A;RUA X;100;300", "2;PE;25313;RECIFE;1;1;300;ESCOLA B;RUA Y;100;300",  # na lista, mudou
        "1;PE;25313;RECIFE;1;2;100;ESCOLA A;RUA X;100;300", "2;PE;25313;RECIFE;1;2;200;ESCOLA A2;RUA X;100;300",  # na lista, só o código
        "1;PE;25313;RECIFE;1;3;100;ESCOLA A;RUA X;100;300", "2;PE;25313;RECIFE;1;3;100;ESCOLA A;RUA Z;100;300",  # fora da lista
        "1;PE;25313;RECIFE;1;4;100;ESCOLA A;RUA X;100;300", "2;PE;25313;RECIFE;1;4;100;ESCOLA A;RUA X;100;300",  # não mudou
    ]
    (tmp_path / "l.csv").write_text(cab + "\n".join(linhas) + "\n", encoding="latin-1")
    lista = "aa_eleicao;nm_pais;sg_uf;nm_municipio;nr_zona;nm_local_votacao_inicial;nr_secao;nm_local_votacao_final;qt_eleitores\n"
    lista += "".join(f"2026;Brasil;PE;RECIFE;1;A;{s};B;300\n" for s in (1, 2))
    (tmp_path / "lista.csv").write_text(lista, encoding="utf-8")
    (tmp_path / "rev.csv").write_text("uf;munnm;zona;secao;classe\nPE;RECIFE;1;3;real\n", encoding="utf-8")
    con = duckdb.connect()
    base.criar_locais(con, tmp_path / "l.csv", 2026)
    base.criar_painel(con, tmp_path / "lista.csv", tmp_path / "rev.csv")
    assert con.execute("select secao, categoria from painel order by secao").fetchall() == [
        (1, "lista: local e endereço diferentes"), (2, "lista: código mudou, mesmo endereço"), (3, "fora da lista: real")]


def test_permutacao_por_estrato_maior():
    # Em cada zona, ou todas as escolas mudam ou nenhuma: dentro da zona não há o que sortear.
    esc = escolas_sinteticas(direcionado=False)
    esc["alterada"] = esc.zona < 20
    assert analise.permutacao(esc, n=50)["faixa95"][0] == analise.permutacao(esc, n=50)["faixa95"][1]
    r = analise.permutacao(esc, n=500, estrato=("uf",))
    assert r["faixa95"][0] < r["faixa95"][1]

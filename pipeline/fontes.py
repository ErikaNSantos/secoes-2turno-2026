"""Arquivos abertos do TSE usados no projeto.

Os zips ficam em data/brutos/ (fora do git): juntos passam de 1,5 GB descompactados.
"""
import shutil
import urllib.request
import zipfile
from pathlib import Path

BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele"
BRUTOS = Path("data/brutos")


def url_locais(ano: int) -> str:
    return f"{BASE}/eleitorado_locais_votacao/eleitorado_local_votacao_{ano}.zip"


def url_votos(ano: int) -> str:
    return f"{BASE}/votacao_secao/votacao_secao_{ano}_BR.zip"


def csv_locais(ano: int) -> Path:
    return baixar_csv(url_locais(ano), f"eleitorado_local_votacao_{ano}_BRASIL.csv")


def csv_votos(ano: int) -> Path:
    return baixar_csv(url_votos(ano), f"votacao_secao_{ano}_BR.csv")


def baixar_csv(url: str, nome_csv: str) -> Path:
    """Baixa o zip (só se ainda não estiver em data/brutos) e extrai o CSV pedido."""
    BRUTOS.mkdir(parents=True, exist_ok=True)
    csv = BRUTOS / nome_csv
    if csv.exists():
        return csv
    zp = BRUTOS / url.rsplit("/", 1)[1]
    if not zp.exists():
        parcial = zp.with_suffix(".part")
        with urllib.request.urlopen(url) as resp, open(parcial, "wb") as f:
            shutil.copyfileobj(resp, f, 1 << 20)
        parcial.rename(zp)
    with zipfile.ZipFile(zp) as z:
        membro = next(n for n in z.namelist() if n.endswith(nome_csv))
        with z.open(membro) as src, open(csv, "wb") as dst:
            shutil.copyfileobj(src, dst, 1 << 20)
    return csv

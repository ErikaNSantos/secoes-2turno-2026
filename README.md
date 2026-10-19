# Seções alteradas no 2º turno de 2026

As mudanças de local de votação para o 2º turno de 2026 favoreceram algum candidato? Cruzei a lista oficial do TSE de seções alteradas com os votos do 1º turno de cada seção e testei, dentro de cada zona eleitoral, se as escolas que mudaram de local votaram diferente das que ficaram.

**Página:** https://erikansantos.github.io/secoes-2turno-2026/

**Resposta curta:** não há sinal de direcionamento. Nas 256 escolas que mudaram de local, Lula teve 54,5% dos votos dados a Lula ou Flávio. Sorteando 5.000 vezes o mesmo número de escolas em cada zona, 95% dos sorteios ficaram entre 53,1% e 56,3% (p = 0,75).

*English: did the polling-place changes for Brazil's 2026 presidential runoff favor either candidate? I scraped the official list of relocated polling sections from the electoral court's (TSE) statistics panel, matched it to the open voter registry and to first-round votes per section, and ran a within-district permutation test at the polling-place level. Relocated places voted exactly like randomly chosen places in the same districts (p = 0.75).*

## Os números

| | Seções |
|---|---|
| Divulgadas pelo TSE à imprensa em 16/10 | 4.352 |
| Divulgadas pelo TSE à imprensa em 18/10 | 2.033 |
| Lista do painel em 19/10 | 1.106 |
| Mesmo local nos dois turnos, segundo o próprio cadastro | −138 |
| Local mudou de nome, endereço idêntico | −36 |
| **Local e endereço diferentes (usadas na análise)** | **932** (277.853 eleitores) |

Votos válidos no 1º turno:

| | Seções | Lula | Flávio | Outros |
|---|---|---|---|---|
| Seções alteradas | 932 | 51,9% | 41,6% | 6,5% |
| Mesmas zonas, não alteradas | 17.589 | 48,5% | 44,1% | 7,5% |
| Brasil | 499.206 | 45,2% | 47,0% | 7,8% |

Somando os estados por quem venceu no 1º turno:

| Quem venceu no estado | Estados | Seções no total | Seções alteradas | A cada 10 mil seções |
|---|---|---|---|---|
| Lula | 12 | 171.726 | 563 | **32,8** |
| Flávio | 15 | 326.171 | 369 | **11,3** |

Os estados onde Lula venceu tiveram quase 3 vezes mais alterações por seção. É o dado mais forte a favor da hipótese de direcionamento. Mas a decisão de mudar é tomada pela zona, escola por escola. Por isso o teste compara cada escola com as vizinhas da mesma zona.

## Como funciona

```
painel do TSE (APEX) ──► coleta/painel_tse_devtools.js   lista de seções alteradas, colada no Console do navegador
                                                            → data/painel/secoes_alteradas_2026-10-19.csv
dados abertos do TSE ──► pipeline/fontes.py              baixa os zips de locais de votação (2026)
                                                            e de votação por seção (2026)
                         pipeline/base.py                monta as tabelas no DuckDB e classifica cada seção do painel
                         pipeline/analise.py             grupos, estados e teste de permutação
                         pipeline/run.py                 grava data/tabelas/*.csv e site/data/resultados.json
GitHub Actions ────────► testes e publicação da página a cada push
```

## Decisões que valem explicar

- **A lista veio do painel, e não do arquivo aberto.** O cadastro aberto de locais de votação tem os dois turnos de cada seção, mas é atualizado com atraso: das 1.106 seções do painel, 138 ainda aparecem no cadastro com o mesmo local nos dois turnos. O botão de exportar do painel falhava (`ORA-40441`) e a tabela mostra 20 linhas por vez, então a coleta chama direto a função de paginação do Oracle APEX que o botão "Próximo" usa.
- **Três situações na mesma lista.** O sistema do TSE contava como alteração seções que continuavam no mesmo lugar. Cada seção do painel é conferida contra o cadastro: mesmo local nos dois turnos, local com outro nome no mesmo endereço, ou local e endereço diferentes. Só a terceira entra na análise principal; com a lista inteira o resultado é o mesmo (55,3% de Lula, faixa do acaso de 54,2% a 57,1%, p = 0,68).
- **Comparar dentro da zona.** As mudanças se concentram onde há mais escola rural, falta de energia e chuva nessa época, e essas regiões votaram mais em Lula. Comparar com o Brasil inteiro mostra uma diferença que vem do lugar. Dentro da mesma zona, a cidade, o perfil urbano ou rural e o juiz que decide são os mesmos para os dois lados.
- **A unidade é a escola.** A decisão é tomada por local de votação: quando uma escola fecha, todas as seções dela mudam juntas. Contar por seção daria peso demais às escolas grandes.
- **Teste de permutação, não teste paramétrico.** Em cada uma das 175 zonas, sorteio o mesmo número de escolas que mudou de verdade e calculo a fatia do Lula entre Lula e Flávio. Repito 5.000 vezes, com semente fixa. A faixa de 95% descreve o que o acaso produz (não é um intervalo de confiança), e o `p` é a fração dos sorteios que ficou tão longe da média quanto o valor real, ou mais. Os testes conferem que o método não acusa uma escolha ao acaso e acusa uma escolha direcionada.
- **O código do município muda de formato entre arquivos.** A votação por seção traz `2046`, o cadastro de locais traz `02046`. Sem completar o zero à esquerda, AC, AM, AP, MA, PA, RO e RR somem do cruzamento.

## Limitações

- O painel do TSE mostra só a versão atual da lista. As versões de 16/10 e 18/10 existem apenas nos números divulgados à imprensa.
- Parte das 932 ainda pode ser só diferença de escrita no endereço ("Avenida Fernando Bezerra" e "Avenida Fernando Bezerra, S/N"). É um teto.
- Os relatórios de alguns TREs não batem com a lista nacional (o TRE-PE fala em 6 seções; o cadastro mostra 88 com endereço diferente).
- Correlação não prova intenção, e ausência de correlação não prova que a mudança não atrapalhou ninguém. O impacto real se mede com a abstenção do 2º turno nas seções alteradas, comparada com as vizinhas.

## Próximos passos

- Depois de 25/10: abstenção do 2º turno nas seções alteradas × vizinhas da mesma zona.
- O mesmo teste em 2018 (Haddad × Bolsonaro) e 2022 (Lula × Bolsonaro), com a votação por seção desses anos.

## Rodar localmente

```bash
pip install -r requirements.txt
python -m pytest -q
python -m pipeline.run          # baixa ~330 MB de zips do TSE na primeira vez
python -m http.server -d site 8000
```

## Fontes

- TSE, [Portal de Dados Abertos](https://dadosabertos.tse.jus.br/): eleitorado por local de votação e votação por seção (2026)
- TSE, painel de Estatísticas do Eleitorado, relatório "Seções Eleitorais Alteradas no Segundo Turno", coletado em 19/10/2026 às 10h33
- Agência Brasil (16/10/2026) e Folhapress (18/10/2026) para os números divulgados antes da lista de 19/10

Código sob licença MIT. Feito por [Érika Nogueira Santos](https://erikansantos.github.io).

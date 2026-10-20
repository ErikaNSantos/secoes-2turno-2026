# Seções alteradas no 2º turno de 2026

As mudanças de local de votação para o 2º turno de 2026 favoreceram algum candidato? Cruzei a lista oficial do TSE de seções alteradas com o cadastro de locais e com os votos do 1º turno de cada seção, e testei, dentro de cada zona eleitoral, se as escolas que mudaram de local votaram diferente das que ficaram. Na v2, também testei se as mudanças desfeitas entre 19/10 e 20/10 pendiam para algum lado.

**Página:** https://erikansantos.github.io/secoes-2turno-2026/ (em inglês: https://erikansantos.github.io/secoes-2turno-2026/en/)

**Resposta curta:** não há sinal de direcionamento, nem nas mudanças que ficaram nem nas que foram desfeitas.
- Nas 138 escolas que mudaram de local (lista de 20/10 mais as mudanças reais fora dela), Lula teve 51,9% dos votos dados a Lula ou Flávio. Sorteando 5.000 vezes o mesmo número de escolas em cada zona, 95% dos sorteios ficaram entre 50,7% e 55,7% (p = 0,33).
- Das 932 mudanças reais da lista de 19/10, 681 saíram da lista de 20/10. Dentro de cada estado, as escolas cuja mudança saiu votaram como escolas sorteadas ao acaso (p = 0,76).

*English: did the polling-place changes for Brazil's 2026 presidential runoff favor either candidate? I matched the electoral court's (TSE) official list of relocated polling sections with the open polling place registry and first-round votes per section, added the real changes the list misses, and ran within-zone permutation tests at the polling-place level. Relocated places voted like randomly chosen places in the same zones (p = 0.33), and the changes that were undone between Oct 19 and Oct 20 show no lean either (p = 0.76).*

## Os números

| | Seções |
|---|---|
| Divulgadas pelo TSE à imprensa em 16/10 | 4.352 |
| Divulgadas pelo TSE à imprensa em 18/10 | 2.033 |
| Lista do painel em 19/10 | 1.106 |
| Lista do painel em 20/10 | 441 |
| Só trocaram o código do local, mesmo endereço | −35 |
| Fora da lista: mesmo código, outro endereço (mudança real) | +84 |
| **Mudanças reais analisadas** | **490** (143.291 eleitores) |

Votos válidos no 1º turno (481 das 490 seções têm votos no 1º turno):

| | Seções | Lula | Flávio | Outros |
|---|---|---|---|---|
| Seções alteradas | 481 | 48,6% | 44,4% | 7,0% |
| Mesmas zonas, não alteradas | 11.159 | 46,7% | 45,9% | 7,4% |
| Brasil | 499.206 | 45,2% | 47,0% | 7,8% |

Somando os estados por quem venceu no 1º turno:

| Quem venceu no estado | Estados | Seções no total | Seções alteradas | A cada 10 mil seções |
|---|---|---|---|---|
| Lula | 12 | 171.726 | 187 | 10,9 |
| Flávio | 15 | 326.171 | 286 | 8,8 |

Na lista de 19/10, essa diferença era de quase 3 vezes (32,8 contra 11,3) e era o dado mais forte a favor da hipótese de direcionamento. Ela vinha das mudanças no Nordeste que saíram da lista: na Bahia, 104 das 109 mudanças reais saíram; em Pernambuco, 82 de 88; na Paraíba, 80 de 88; em Sergipe, 60 de 62.

A conclusão não depende das escolhas de limpeza:

| Versão | Seções | Lula nas escolas alteradas | 95% do acaso | p |
|---|---|---|---|---|
| Lista limpa + mudanças reais fora dela (principal) | 481 | 51,9% | 50,7% a 55,7% | 0,33 |
| Só a lista limpa | 406 | 52,9% | 51,8% a 57,2% | 0,29 |
| + mesma rua, outro número | 525 | 51,1% | 50,4% a 55,3% | 0,15 |
| Lista inteira, sem limpeza | 441 | 53,5% | 51,8% a 57,1% | 0,45 |

## Como funciona

```
painel do TSE ─────────► data/painel/                      listas de 19/10 (coletada pelo console, coleta/)
                                                            e de 20/10 (exportada pelo botão do painel)
revisão manual ────────► data/revisao/                     mudanças fora da lista: real, mesma rua, duvidosa ou escrita
dados abertos do TSE ──► pipeline/fontes.py                baixa os zips de locais de votação e de votação por seção (2026)
                         pipeline/base.py                  monta as tabelas no DuckDB e classifica cada seção
                         pipeline/analise.py               grupos, estados, testes de permutação e mudanças desfeitas
                         pipeline/run.py                   grava data/tabelas/*.csv e site/data/resultados.json
GitHub Actions ────────► testes e publicação da página a cada push
```

## Decisões que valem explicar

- **A lista do TSE conta código, não endereço.** A lista de 20/10 é exatamente o conjunto de seções cujo código do local mudou no cadastro. Isso deixa de fora quem mudou de endereço sem mudar de código (as 5 seções de Brás de Pina, no Rio, ficaram assim até o TSE dar um código novo ao local) e inclui 35 seções que só trocaram de código. Por isso a análise confere cada seção contra o cadastro de locais do mesmo dia.
- **Mudanças fora da lista revisadas à mão.** Há 277 seções com o mesmo código e outro endereço. Uma regra automática (rua e número) separou as candidatas e conferi os locais um a um: 84 mudanças reais, 45 na mesma rua com outro número, 11 duvidosas e 137 só diferenças de escrita ("S/N" virou "983", o nome do povoado foi para a frente do endereço). A revisão está em `data/revisao/` e só as reais entram na análise principal.
- **A lista de 19/10 é histórico.** O TSE sobrescreve o cadastro de locais a cada atualização, então a classificação da lista de 19/10 (feita contra o cadastro de 18/10) fica salva em `data/painel/classificacao_2026-10-19.csv`. Ela é a base do teste das mudanças desfeitas.
- **Comparar dentro da zona.** As mudanças não se espalham por igual pelo país, e comparar com o Brasil inteiro mostra uma diferença que vem do lugar. Dentro da mesma zona, a cidade, o perfil urbano ou rural e o juiz que decide são os mesmos para os dois lados.
- **A unidade é a escola.** A decisão é tomada por local de votação: quando uma escola fecha, todas as seções dela mudam juntas. Contar por seção daria peso demais às escolas grandes.
- **As mudanças desfeitas foram decididas por zona inteira.** Nenhuma das 175 zonas teve só parte das mudanças desfeita, então dentro da zona não há o que sortear. O teste das mudanças desfeitas sorteia escolas dentro de cada estado, onde o TRE decide.
- **Teste de permutação, não teste paramétrico.** Sorteio o mesmo número de escolas em cada estrato e calculo a fatia do Lula entre Lula e Flávio, 5.000 vezes, com semente fixa. A faixa de 95% descreve o que o acaso produz (não é um intervalo de confiança), e o `p` é a fração dos sorteios que ficou tão longe da média quanto o valor real, ou mais. Os testes conferem que o método acusa uma escolha direcionada e não acusa uma escolha ao acaso.
- **O código do município muda de formato entre arquivos.** A votação por seção traz `2046`, o cadastro de locais traz `02046`. Sem completar o zero à esquerda, AC, AM, AP, MA, PA, RO e RR somem do cruzamento.

## Limitações

- O painel do TSE mostra só a versão atual da lista. As versões de 16/10 e 18/10 existem apenas nos números divulgados à imprensa.
- Das mudanças que saíram da lista, não dá para saber pelos dados se foram desfeitas ou se o cadastro de 18/10 estava errado. No cadastro atual, essas seções votam no mesmo local do 1º turno.
- A separação entre mudança real e diferença de escrita tem julgamento. Os casos de mesma rua com outro número entram como teste de robustez, e os duvidosos ficam de fora.
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

O pipeline usa o cadastro de locais que estiver no ar. Se o TSE atualizar o cadastro depois de 20/10, os números podem mudar, e a revisão em `data/revisao/` pode precisar incluir seções novas (elas aparecem como "não revisada").

## Fontes

- TSE, [Portal de Dados Abertos](https://dadosabertos.tse.jus.br/): eleitorado por local de votação (versão de 20/10/2026) e votação por seção (2026)
- TSE, painel de Estatísticas do Eleitorado, relatório "Seções Eleitorais Alteradas no Segundo Turno", nas versões de 19/10/2026 (coletada às 10h33) e de 20/10/2026
- TRE-RJ (20/10/2026), sobre a seção de Brás de Pina
- Agência Brasil (16/10/2026) e Folhapress (18/10/2026) para os números divulgados antes da lista de 19/10

Código sob licença MIT. Feito por [Érika Nogueira Santos](https://erikansantos.github.io).

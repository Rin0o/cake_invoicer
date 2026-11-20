# Testes manuais (no telemóvel)

Os cálculos, as queries e o backup têm testes automáticos. Esta lista cobre o que só se verifica
no telemóvel: ecrãs, teclado, partilha e ficheiros. Correr antes de cada versão, com o APK final.

Preparar: o telemóvel deve ter dados de uma versão anterior, para testar a atualização.

## Atualização

- [ ] Instalar o APK novo **por cima** da versão anterior: a instalação é aceite.
- [ ] Os orçamentos, o catálogo e as definições continuam lá, com os mesmos totais.
- [ ] (0.1.0 → 0.2.0) O nome do negócio mantém-se; os orçamentos antigos aparecem como "Rascunho".

## Catálogo

- [ ] Criar um ingrediente em €/kg, um em €/l e um material em €/un.
- [ ] Preço com vírgula (`1,20`) e com ponto (`1.20`) dá o mesmo resultado.
- [ ] Nome vazio ou preço inválido mostram erro e não guardam.
- [ ] Pesquisar encontra o item; mudar entre Ingredientes e Materiais filtra a lista.
- [ ] Desativar um item: deixa de aparecer ao adicionar linhas, mas continua no catálogo.
- [ ] Apagar um item usado num orçamento: o aviso aparece; o orçamento mantém a linha.
- [ ] Apagar um item usado numa receita: a app recusa e diz em que receitas está.
- [ ] Mudar a unidade (kg → l) de um item usado numa receita: mostra erro; mudar o preço funciona.

## Receitas

- [ ] Criar uma receita: nome, dois ingredientes (um em g), um material e uma linha livre.
- [ ] O custo estimado bate com uma conta à mão; mudar o preço de um ingrediente no catálogo muda o custo da receita.
- [ ] Editar a quantidade e remover uma linha.
- [ ] Pesquisar a receita na lista; apagar a receita pede confirmação.
- [ ] Num orçamento novo, no "Bolo 1": **Receita** → escolher → escala `1,5`. O bolo passa a ter o
      nome da receita; os ingredientes têm 1,5× a quantidade; o material e a linha livre não mudam.
- [ ] Escala `0`, vazia ou `abc` mostra erro e não adiciona.
- [ ] Adicionar uma segunda receita ao mesmo bolo: as linhas juntam-se e o nome do bolo mantém-se.
- [ ] Mudar a receita depois: o orçamento não muda.

## Definições

- [ ] Alterar o valor/hora, os indiretos e a margem; guardar. Um orçamento **novo** usa os
      valores novos e os **antigos** não mudam.
- [ ] O nome do negócio aparece no texto partilhado e no topo do PDF.
- [ ] Escolher outra cor do PDF e guardar: o próximo PDF (também de um orçamento antigo) usa essa cor.
- [ ] Preencher só o telefone e o Instagram (como "@nome" e depois como link do perfil): o fundo do
      PDF mostra "912 345 678 · Instagram @nome". Os contactos vazios não aparecem.
- [ ] Os nomes das oito cores cabem por baixo dos círculos, sem cortar (num telemóvel pequeno).
- [ ] Atualizar por cima da 0.2.0, com orçamentos: a cor do PDF fica "Framboesa".

## Orçamento

- [ ] Criar um orçamento novo: abre com "Bolo 1" e o número seguinte do ano (ex.: `Nº 2026-004`)
      ao lado de "Cliente". Apagar o último e criar outro: o número não se repete.
- [ ] Depois de atualizar a app, os orçamentos antigos têm número (por ordem de criação em cada ano).
- [ ] **Pedido (interno)**: escrever "Aniversário 5 anos" → aparece na lista por baixo do nome e no
      cartão do cliente fechado. Sem pedido, a lista fica como antes (sem linha vazia).
- [ ] Pesquisar na lista pelo pedido ("aniv") e pelo número ("2026-004" ou "004").
- [ ] O cartão do cliente mostra "Nº 2026-004 · Ref. 2026-XXXX". Pesquisar pela referência, com e
      sem o ano ("2026-XXXX" e "xxxx"), encontra o orçamento.
- [ ] Cada cartão da lista: à esquerda cliente, pedido, estado e 📅 data de entrega; à direita o
      número por cima do total. Com um nome ou pedido comprido, o número e o total não são cortados.
- [ ] Preencher o cliente, o contacto e a data (`5/3/27` → `05/03/2027`); data inválida mostra erro.
- [ ] **Escolher dos contactos**: na primeira vez pede acesso aos contactos. Um contacto com um só
      número preenche o nome e o número. Com vários números e emails, aparece a lista para escolher
      ("Só o nome" deixa o contacto como estava). Sem telefone nem email, só muda o nome. Cancelar o
      seletor não altera nada. Recusar o acesso duas vezes e tentar de novo leva às definições.
- [ ] **Calendário** (ícone no campo Data de entrega): sem data abre em hoje; com data abre nessa
      data. Escolher um dia → o campo mostra `dd/mm/aaaa` e o cabeçalho "Guardado ✓". "Sem data"
      apaga a data; Cancelar não muda nada. Com algo escrito no campo, tocar no ícone fecha o teclado.
- [ ] Adicionar um ingrediente em g (ex.: 300 g a 1,20 €/kg = 0,36 €); a pré-visualização bate certo.
- [ ] Mudar para kg no seletor de unidade e voltar a g.
- [ ] Adicionar uma linha livre; editá-la; removê-la.
- [ ] Editar a quantidade de uma linha: o preço da linha continua o do momento em que foi adicionada.
- [ ] Tempo: `2h30`, `2:30` e `150` dão todos 2h30; `abc` mostra erro.
- [ ] O resumo do bolo (materiais, tempo, indiretos, custo, margem, preço) bate com uma conta à mão.
- [ ] Adicionar um segundo bolo; o total é a soma dos dois.
- [ ] Alterar a margem do orçamento: os preços calculados mudam.
- [ ] Editar o preço final de um bolo: aparece "Ajustado" e a diferença; o total usa o valor editado.
- [ ] Depois do ajuste, mudar uma quantidade: aparece o aviso "o preço calculado mudou".
- [ ] "Repor calculado" volta ao valor calculado.
- [ ] Preço final abaixo do custo: aparece o aviso.
- [ ] Apagar um bolo e apagar o orçamento pedem confirmação.
- [ ] O teclado não tapa o campo em edição (sobretudo o preço final, no fim do ecrã).
- [ ] Voltar à lista: o total do orçamento está atualizado; a pesquisa por cliente funciona.
- [ ] Ao sair de um campo, aparece "Guardado ✓" por baixo do título.
- [ ] Escrever no campo Cliente e, **sem sair do campo**, carregar em **Concluído**: volta à lista
      com a mensagem "Orçamento guardado" e o nome novo aparece.
- [ ] Margem `abc` e **Concluído**: avisa que falta corrigir um valor e não sai.
- [ ] Apagar o orçamento e um bolo só é possível pelo menu ⋮, com confirmação.
- [ ] O mesmo no editor de receita (Concluído, "Receita guardada", apagar no menu ⋮).
- [ ] Orçamento novo: dados do cliente abertos. Orçamento com cliente: fechados, com nome, entrega
      e contacto; tocar abre-os.
- [ ] Orçamento com vários bolos: os bolos com linhas começam fechados (nome, n.º de linhas e
      preço); tocar abre. Com um só bolo, começa aberto.
- [ ] Escrever no nome de um bolo e, sem sair do campo, fechá-lo: o nome fica guardado.
- [ ] Escrever `abc` no tempo de trabalho e fechar o bolo: fica aberto, com o campo a vermelho.
- [ ] O total está numa barra azul fixa no fundo, visível ao percorrer o orçamento, e não fica
      por baixo da barra de navegação do Android. Muda logo ao alterar um preço.
- [ ] Ao abrir o teclado, a barra do total desaparece; ao fechá-lo, volta.

## Estados e histórico

- [ ] Um orçamento novo está em "Rascunho", sem botões de passo seguinte. Tocar na etiqueta do
      estado abre a lista dos 5 estados, com o atual marcado; escolher outro muda-o e a lista
      mostra o estado novo. "Cancelar" ou tocar fora não muda nada.
- [ ] Em "Enviado" aparecem, na mesma linha e à direita do estado, "Aceitou" (em destaque) e
      "Recusou"; em "Aceite", "Entregue"; em "Recusado", "Reabrir"; em "Entregue", nenhum botão.
- [ ] Num "Recusado", "Reabrir" passa-o a "Rascunho" e mostra "Reaberto: está nos Abertos".
      Enviá-lo de novo passa-o a "Enviado".
- [ ] Na lista, toque longo num orçamento: abre a escolha de estado com o nome do cliente;
      escolher muda o estado, mostra uma mensagem curta e o cartão muda de cor. Um toque normal
      continua a abrir o orçamento.
- [ ] Enviar um rascunho (PDF ou texto) passa-o a "Enviado". Enviar um "Aceite" não muda o estado.
- [ ] A lista abre em "Abertos" (rascunho, enviado, aceite). Os separadores mostram quantos
      orçamentos há em cada lista. "Entregues" e "Recusados" só têm orçamentos desse estado e
      não mostram os chips de estado.
- [ ] Marcar um orçamento como "Entregue" (ou "Recusado") tira-o dos Abertos, com a mensagem
      "Passou para Entregues" (ou "Recusados"), e a contagem atualiza-se.
- [ ] Nos Abertos, filtrar por estado; "Todos" volta a todos os abertos. Mudar de separador limpa o filtro.
- [ ] Escrever na pesquisa esconde os separadores, mostra "A procurar em todos os orçamentos" e
      encontra também entregues e recusados. Apagar a pesquisa volta ao separador anterior.
- [ ] Ordem nos Abertos: entregas de hoje e futuras primeiro (a mais próxima no topo), depois as
      passadas, e no fim as sem data. Nos Entregues e Recusados: do mais recente para o mais antigo.
- [ ] Num telemóvel estreito, os três separadores com números (ex.: "Entregues (40)") cabem sem cortar.

## Partilha

- [ ] **Enviar PDF** → WhatsApp e → Drive: o ficheiro chama-se `Orcamento-<referência>-<cliente>.pdf`.
- [ ] O PDF abre em A4 com o nome do negócio no topo, referência (**não** o número interno), data, entrega, bolos com o preço
      final e total certo, e os contactos no fundo. Acentos corretos. **Sem** o nome do cliente.
- [ ] Sem nome do negócio nem contactos: o PDF começa em "Orçamento" e não tem linhas vazias.
- [ ] O texto começa por "*Orçamento ref. 2026-XXXX — <negócio>*", com a mesma referência do PDF.
- [ ] Orçamento sem data de entrega: o PDF não mostra linhas vazias.
- [ ] Muitos bolos (ex.: 15): o PDF passa para a segunda página sem cortar linhas a meio.
- [ ] **Enviar em texto** → WhatsApp: o texto chega formatado (negrito no título e no total).
- [ ] O PDF e o texto **não** incluem o nome do cliente, o pedido, ingredientes, o custo, as notas internas
      nem o preço calculado de um bolo ajustado. O texto também não inclui os contactos do negócio.

## Backup

- [ ] Exportar backup → guardar no Drive ou enviar por email: o ficheiro `.json` é criado.
- [ ] Criar um orçamento de teste; restaurar o backup: o orçamento de teste desaparece e os dados
      voltam ao estado do backup.
- [ ] Restaurar um backup feito na versão 0.1.0: importa sem erro.
- [ ] Restaurar um backup de antes dos números: os orçamentos ficam numerados; um orçamento novo
      continua a numeração.
- [ ] O backup inclui as receitas (restaurar e confirmar que voltam).
- [ ] Restaurar um ficheiro que não é backup (ex.: uma foto): mostra erro e não altera nada.
- [ ] Cancelar a escolha do ficheiro não faz nada.

## Geral

- [ ] Modo avião: tudo funciona.
- [ ] Rodar o ecrã: a app mantém-se na vertical.
- [ ] Fechar a app a meio de um orçamento e voltar: o que foi escrito (depois de sair do campo) foi guardado.

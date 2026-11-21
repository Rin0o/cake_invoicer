# Changelog

Todas as alterações relevantes da app ficam registadas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem
o [Semantic Versioning](https://semver.org/lang/pt-BR/):

- **MAJOR**: alteração que obriga a quem usa a app a fazer algo (ex.: backups antigos deixam de importar).
- **MINOR**: funcionalidade nova.
- **PATCH**: correção.

Enquanto a versão for `0.x`, a app está em desenvolvimento inicial: uma versão MINOR pode trazer
alterações incompatíveis (que ficam assinaladas aqui). A `1.0.0` marca a primeira versão estável.

Cada versão distribuída tem também um `android.versionCode` (em `app.json`) maior do que o da anterior.

## [Por lançar]

### Alterado

- **Novo nome: CakeForCash** (antes *Orçamentos de Bolos*). O APK novo instala-se por cima do
  anterior e mantém os dados. O ficheiro de backup passa a chamar-se `cakeforcash-….json`, e os
  backups antigos continuam a restaurar.

### Adicionado

- **Idiomas**: a app passa a existir em português, inglês, espanhol e francês. Escolhe-se em
  Definições → Idioma e aplica-se a tudo: ecrãs, PDF, texto para o cliente e nome do ficheiro. Em
  inglês os preços escrevem-se `€12.50`. Uma instalação nova segue o idioma do telemóvel (ou
  inglês, se for outro); quem já usava a app continua em português. O idioma vai no backup.
  Os nomes escritos por quem usa a app (bolos, itens, receitas) não são traduzidos.

- **Abertos, Entregues e Recusados**: a lista de orçamentos passa a mostrar só os abertos
  (rascunho, enviado, aceite). Os entregues e os recusados ficam cada um no seu separador, do mais
  recente para o mais antigo, e cada separador mostra quantos orçamentos tem. A pesquisa continua
  a procurar em todos. Ao mudar de estado, uma mensagem diz para que lista foi o orçamento.
- **Data do estado**: a app guarda quando cada orçamento mudou de estado pela última vez. No
  orçamento aparece ao lado do estado ("desde 12/11/2026"). Nos entregues e recusados, o cartão da
  lista mostra essa data em vez da entrega, e o histórico ordena-se por ela. Nos orçamentos que já
  existiam, a data é a da última alteração (aproximada).
- **Reabrir um recusado**: no orçamento recusado há um botão "Reabrir", que o volta a rascunho
  para ajustar e reenviar.
- **Cor do PDF**: escolher uma de oito cores nas Definições. Quem já tinha orçamentos fica com a
  cor de sempre (framboesa); uma instalação nova começa em azul-marinho.
- **Contactos no PDF**: telefone, email, Instagram, Facebook, TikTok e site, nas Definições. Aparecem
  no fundo do PDF e os vazios não aparecem. Nas redes sociais pode escrever "@nome" ou colar o link
  do perfil.

### Alterado

- **O cliente deixa de ver o número sequencial** (`2026-001`), que revelava quantos orçamentos já
  foram feitos. O PDF, o texto e o nome do ficheiro passam a ter uma referência que não segue uma
  ordem (ex.: `2026-QJQX`). Na app continua o número, com a referência ao lado ("Nº 2026-001 · Ref.
  2026-QJQX"), e a pesquisa aceita os dois. Os orçamentos já enviados mantêm o número que o cliente
  recebeu, que também se pode pesquisar.
- O PDF deixa de ter um logótipo fixo e mostra no topo o nome do negócio (Definições). Sem nome,
  mostra só "Orçamento".
- O nome, a cor e os contactos aplicam-se a todos os PDF, também aos de orçamentos antigos. Os preços
  e as percentagens continuam guardados em cada orçamento.

### Schema da base de dados

- v4: colunas `definicoes.pdf_cor`, `contacto_telefone`, `contacto_email`, `contacto_instagram`,
  `contacto_facebook`, `contacto_tiktok` e `contacto_site`. Os backups antigos continuam a importar.
- v5: coluna `orcamentos.estado_em`, preenchida com `atualizado_em` nos orçamentos existentes (e nos
  backups antigos ao importar).

## [0.2.0] — 2026-11-20

Fase 2 da especificação e primeiras melhorias da fase 3.

**Para atualizar:** instalar o APK novo por cima do anterior (exportar antes um backup). Esta
versão traz módulos nativos novos (contactos e calendário), por isso não chega uma atualização OTA.

### Adicionado

- **Receitas**: novo separador para criar receitas a partir dos ingredientes e materiais do catálogo
  (mais linhas livres), com custo estimado aos preços atuais. Sem tempo de trabalho.
- **Adicionar receita a um bolo**, com escala decimal (ex.: 1,5) aplicada às quantidades dos
  ingredientes; materiais e linhas livres ficam iguais. As linhas juntam-se às do bolo, por isso
  um bolo pode juntar várias receitas (massa + recheio + cobertura). Os preços são copiados no
  momento: mudar a receita depois não altera o orçamento.
- **PDF do orçamento** com logótipo, data, entrega, bolos e total,
  enviado pela folha de partilha.
- **Estados** do orçamento (rascunho, enviado, aceite, recusado, entregue), escolhidos no editor.
  Enviar um rascunho (PDF ou texto) passa-o a "enviado".
- Histórico com filtro por estado; o estado aparece em cada orçamento da lista.
- **Escolher o cliente dos contactos** do telemóvel: no editor de orçamento, "Escolher dos
  contactos" preenche o nome e o telefone (ou email; se houver vários, pergunta qual). Os dados
  são copiados para o orçamento e continuam editáveis. Pede acesso aos contactos só para leitura
  (a app nunca altera os contactos).
- **Calendário para a data de entrega**: o ícone de calendário no campo abre o calendário do
  Android (semana a começar à segunda); "Sem data" apaga a data. Continua a dar para escrever a
  data à mão.
- **Número do orçamento** ("2026-014"): sequencial por ano, atribuído ao criar e nunca reutilizado
  (nem depois de apagar). Aparece na lista, no editor, no PDF (e no nome do ficheiro,
  `Orcamento-2026-014-Ana-Silva.pdf`) e no texto partilhado, para o cliente o poder indicar.
  Os orçamentos que já existiam são numerados pela ordem em que foram criados.
- **Pedido (interno)**: título curto do pedido (ex.: "Aniversário 5 anos"), mostrado na lista por
  baixo do nome do cliente, para distinguir pedidos do mesmo cliente. Não vai para o PDF nem
  para o texto.
- A pesquisa da lista encontra também pelo pedido e pelo número.
- Botão **Concluído** nos editores de orçamento e de receita: guarda o campo em edição, confirma
  que tudo ficou gravado e volta à lista. Por baixo do título aparece "A guardar…" / "Guardado ✓".
- Mensagem curta de confirmação ao guardar, adicionar ou apagar (orçamento, receita, item, linha,
  definições).

### Alterado

- Os botões de apagar (orçamento, bolo, receita, item) passaram para o menu ⋮, para não se
  carregar neles por engano. Continuam a pedir confirmação.
- A lista de orçamentos passa a estar ordenada pela data de entrega: primeiro as próximas, depois
  as passadas, e no fim as que não têm data.
- Não é possível apagar nem mudar a unidade de um item usado numa receita (a app diz em quais).
- Backups feitos na versão 0.1.0 continuam a poder ser importados (os orçamentos ficam numerados
  ao importar).
- Cada cartão da lista de orçamentos mostra à esquerda o cliente, o pedido, o estado e a data de
  entrega, e à direita o número por cima do total.
- O PDF passa a chamar-se `Orcamento-<número>-<cliente>.pdf` (antes levava a data).
- **Novo ícone** da app (bolo com moeda), também no ecrã de arranque e no cabeçalho. Inclui ícone
  monocromático para os temas do Android.
- **Visual mais colorido**: tons de azul claro, com dourado e chocolate do ícone; cabeçalhos em
  azul claro e o separador ativo com ícone cheio.
- As listas de orçamentos, receitas e catálogo passam a mostrar cartões com ícone colorido e o
  preço em destaque. Nos orçamentos, a cor e o ícone mostram o estado, que aparece também numa
  etiqueta. Os chips do filtro por estado ficam com a cor do estado quando escolhidos.
- **Mudar o estado** de um orçamento: no editor, a fila de chips dá lugar a uma etiqueta com o
  estado atual (tocar abre a lista de estados) e, à direita, botões com o passo seguinte:
  "Aceitou" / "Recusou" num orçamento enviado, "Entregue" num aceite. Na lista de
  orçamentos, um toque longo num orçamento muda o estado sem o abrir.
- No editor de orçamento, **cada bolo pode ser fechado** (mostra só o nome, o número de linhas e
  o preço final, com aviso se estiver abaixo do custo) e os **dados do cliente também** (mostram
  nome, entrega e contacto). Ao fechar, o que estava a ser escrito é guardado. Com vários bolos,
  os que já têm linhas começam fechados; os dados do cliente começam fechados quando já há nome.
- O **total** do orçamento fica numa barra fixa no fundo do editor, sempre visível (com o número
  de bolos, o custo e os ajustes). Esconde-se enquanto o teclado está aberto.

### Removido

- Contacto do negócio nas definições e no resumo em texto.
- Nota "Orçamento — não serve de fatura" no resumo em texto (continua no PDF).
- Nome do cliente no resumo em texto (o PDF também não o mostra; fica só no nome do ficheiro).

### Corrigido

- Acentos e símbolos estragados no cartão do bolo (ex.: "PreÃ§o final" em vez de "Preço final").

### Schema da base de dados

- v2: tabelas `receitas` e `receita_linhas`; saem as colunas `definicoes.contacto` e
  `definicoes.logotipo`. A migração corre sozinha ao abrir a app, com backup automático antes.
- v3: colunas `orcamentos.titulo`, `numero_ano` e `numero_seq` (índice único) e tabela
  `numeracao`. Os orçamentos existentes são numerados por ordem de criação em cada ano.

## [0.1.0] — MVP

Primeira versão (fase 1 da especificação).

### Adicionado

- Catálogo de ingredientes e materiais com preço por kg, litro ou unidade; pesquisa; desativar e apagar itens.
- Definições: valor/hora, custos indiretos, margem por omissão, nome e contacto do negócio.
- Orçamentos com cliente, contacto, data de entrega, notas internas e margem própria.
- Vários bolos por orçamento, cada um com linhas do catálogo (quantidade em g/kg, ml/l ou un),
  linhas livres e tempo de trabalho (aceita `2h30`, `2:30` ou `150`).
- Cálculo por bolo: materiais × (1 + margem) + tempo + indiretos, arredondado ao euro.
  O total é a soma dos bolos.
- Preço final de cada bolo editável, com "Repor calculado", aviso quando o calculado muda e
  aviso quando o preço fica abaixo do custo.
- Preços, valor/hora e percentagens copiados para o orçamento: mudar o catálogo ou as
  definições não altera orçamentos existentes.
- Lista de orçamentos com pesquisa por cliente.
- Partilha do orçamento em texto (WhatsApp, SMS, email…), só com os preços finais.
- Backup: exportar e restaurar toda a base em JSON; backup automático antes de migrar a base.

### Schema da base de dados

- v1: `items`, `definicoes`, `orcamentos`, `orcamento_bolos`, `orcamento_linhas`.

[Por lançar]: https://github.com/Rin0o/cake_invoicer/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Rin0o/cake_invoicer/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Rin0o/cake_invoicer/releases/tag/v0.1.0

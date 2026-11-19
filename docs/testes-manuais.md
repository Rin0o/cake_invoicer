# Testes manuais (no telemóvel)

Os cálculos, as queries e o backup têm testes automáticos. Esta lista cobre o que só se verifica
no telemóvel: ecrãs, teclado, partilha e ficheiros. Correr antes de cada versão, com o APK final.

Preparar: o telemóvel deve ter dados de uma versão anterior, para testar a atualização.

## Atualização

- [ ] Instalar o APK novo **por cima** da versão anterior: a instalação é aceite.
- [ ] Os orçamentos, o catálogo e as definições continuam lá, com os mesmos totais.

## Catálogo

- [ ] Criar um ingrediente em €/kg, um em €/l e um material em €/un.
- [ ] Preço com vírgula (`1,20`) e com ponto (`1.20`) dá o mesmo resultado.
- [ ] Nome vazio ou preço inválido mostram erro e não guardam.
- [ ] Pesquisar encontra o item; mudar entre Ingredientes e Materiais filtra a lista.
- [ ] Desativar um item: deixa de aparecer ao adicionar linhas, mas continua no catálogo.
- [ ] Apagar um item usado num orçamento: o aviso aparece; o orçamento mantém a linha.

## Definições

- [ ] Alterar o valor/hora, os indiretos e a margem; guardar. Um orçamento **novo** usa os
      valores novos e os **antigos** não mudam.
- [ ] O nome e o contacto do negócio aparecem no texto partilhado.

## Orçamento

- [ ] Criar um orçamento novo: abre com "Bolo 1".
- [ ] Preencher o cliente, o contacto e a data (`5/3/27` → `05/03/2027`); data inválida mostra erro.
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

## Partilha

- [ ] Partilhar → WhatsApp: o texto chega formatado (negrito no título e no total).
- [ ] O texto **não** inclui ingredientes, o custo, as notas internas nem o preço calculado de um
      bolo ajustado.

## Backup

- [ ] Exportar backup → guardar no Drive ou enviar por email: o ficheiro `.json` é criado.
- [ ] Criar um orçamento de teste; restaurar o backup: o orçamento de teste desaparece e os dados
      voltam ao estado do backup.
- [ ] Restaurar um ficheiro que não é backup (ex.: uma foto): mostra erro e não altera nada.
- [ ] Cancelar a escolha do ficheiro não faz nada.

## Geral

- [ ] Modo avião: tudo funciona.
- [ ] Rodar o ecrã: a app mantém-se na vertical.
- [ ] Fechar a app a meio de um orçamento e voltar: o que foi escrito (depois de sair do campo) foi guardado.

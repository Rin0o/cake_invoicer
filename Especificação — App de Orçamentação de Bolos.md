# Especificação — App de Orçamentação de Bolos

Nov 19, 2026 · @Pedro Rino

## 1. Visão geral e âmbito

App Android nativa, sem backend, para calcular orçamentos de bolos a partir de um catálogo local de ingredientes e materiais com preço por unidade (€/kg, €/l, €/un), das quantidades efetivamente usadas em cada bolo e do tempo de trabalho. O resultado é partilhado por WhatsApp ou ficheiro.

- **Utilizador:** uma pessoa que faz bolos por encomenda, a trabalhar num único telemóvel. Não é quem desenvolve a app, por isso a interface tem de ser autoexplicativa e as atualizações fáceis de instalar.
- **Plataforma:** Android, distribuída como APK (sem Play Store na fase inicial).
- **Dados:** 100% locais (SQLite no dispositivo), com backup/restauro manual em JSON.
- **Fora de âmbito:** sincronização entre dispositivos, multiutilizador, iOS, faturação certificada, IVA (preços sem IVA; o PDF indica "Orçamento — não serve de fatura"), validade e sinal do orçamento, escala automática por tamanho (a escala das receitas indica-se à mão), receitas dentro de receitas, contactos do negócio no PDF, duplicação de orçamentos, histórico de preços.

## 2. Requisitos funcionais

| ID | Requisito | Detalhe |
| --- | --- | --- |
| RF01 | Catálogo de ingredientes | Nome, unidade (kg, l, un), preço por unidade (€/kg, €/l, €/un) |
| RF02 | Catálogo de materiais | Caixas, bases, toppers, fitas; mesmos campos que RF01 (normalmente €/un) |
| RF03 | Atualizar preços | Editar o preço de um item substitui o valor atual; orçamentos já criados não mudam |
| RF04 | Valor do tempo e margem | Valor/hora, margem por omissão e custo indireto configuráveis nas definições |
| RF05 | Criar orçamento | Cliente, contacto (ambos podem vir dos contactos do telemóvel, copiados), título interno do pedido (ex.: "Aniversário 5 anos"), data de entrega (escrita ou escolhida no calendário), notas, margem (pré-preenchida com a das definições, ajustável); um ou mais bolos. Cada orçamento recebe ao ser criado um **número** sequencial por ano ("2026-014"), que nunca é reutilizado (nem depois de apagar) |
| RF06 | Bolos do orçamento | Cada bolo tem nome (ex.: "Bolo 1 — chocolate"), lista de ingredientes/materiais com a quantidade usada e o tempo de trabalho |
| RF07 | Linha livre | Linha com descrição e valor, para custos que não estão no catálogo |
| RF08 | Cálculo automático | Valor de cada linha, custo por bolo, total do orçamento |
| RF09 | Ajuste dos valores finais | Preço final de cada bolo editável e guardado; mostra a diferença face ao calculado, avisa se ficar abaixo do custo e permite repor o valor calculado |
| RF10 | Exportar | PDF do orçamento para o cliente: logótipo (incluído na app), número do orçamento, data, data de entrega, cada bolo com o preço final, total e "Orçamento — não serve de fatura". Sem nome do negócio (já está no logótipo), sem nome do cliente, sem título do pedido, sem contactos, sem notas internas nem detalhe de ingredientes. Ficheiro `Orcamento-<número>-<cliente>.pdf` |
| RF11 | Partilhar | Folha de partilha nativa (WhatsApp, email, Drive) com o PDF ou um resumo em texto. O resumo em texto tem título (com o número e o nome do negócio), entrega, bolos e total, sem o nome do cliente, sem o título do pedido e sem a nota "não serve de fatura" (que fica só no PDF) |
| RF12 | Histórico | Lista de orçamentos com cliente, título do pedido, estado, entrega e número; filtro por estado e pesquisa por cliente, título ou número. Ordem: entregas de hoje em diante (a mais próxima primeiro), depois as passadas (a mais recente primeiro), e no fim os orçamentos sem data |
| RF13 | Backup | Exportar e importar toda a base em JSON. Backups de versões anteriores da app continuam a importar |
| RF14 | Estados | Rascunho, enviado, aceite, recusado, entregue; mudam-se à mão. Partilhar um rascunho (PDF ou texto) passa-o a enviado. O orçamento é editável em qualquer estado |
| RF15 | Receitas | Nome, notas e linhas de ingredientes/materiais do catálogo (com quantidade) e linhas livres. Sem tempo de trabalho. Mostra o custo estimado com os preços atuais do catálogo |
| RF16 | Receita no orçamento | Adicionar uma receita a um bolo, com escala (decimal, ex.: 1,5). As linhas são copiadas com os preços atuais e juntam-se às que o bolo já tem, para montar um bolo a partir de várias receitas (massa + recheio + cobertura) |

## 3. Stack técnica

React Native com Expo e TypeScript, persistência em SQLite local e build do APK via EAS ou localmente.

| Camada | Escolha | Motivo |
| --- | --- | --- |
| Framework | Expo (SDK atual) + TypeScript | Configuração mínima, acesso nativo, modelo mental React |
| Navegação | Expo Router | Rotas por ficheiro, simples para ecrãs CRUD |
| Persistência | expo-sqlite com SQL direto | Sete tabelas: queries tipadas à mão em `db/repo.ts` e migrations versionadas por `PRAGMA user_version`, sem ORM |
| UI | React Native Paper | Componentes Material prontos para formulários e listas |
| Formulários | Estado local + validação em `domain/format.ts` | Formulários pequenos; o editor do orçamento guarda ao sair de cada campo |
| Estado | Sem biblioteca | O estado principal vive no SQLite e é recarregado ao voltar a cada ecrã |
| PDF | expo-print + expo-asset | PDF A4 gerado a partir de template HTML; o logótipo vem com a app e é embebido em base64 |
| Partilha | expo-sharing (ficheiro) + Share.share (texto) | Folha de partilha nativa do Android |
| Backup | expo-file-system + expo-document-picker | Exportar/importar JSON para fora da pasta da app |
| Testes | Jest + `node:sqlite` | Testes ao cálculo e às queries/migrations/backup, sem telemóvel |
| Build | EAS Build (perfil apk) ou expo prebuild + Gradle | APK instalável diretamente |

## 4. Modelo de dados

Oito tabelas SQLite. Valores monetários guardados em **cêntimos (inteiros)**; quantidades em decimal. Os orçamentos guardam uma cópia (snapshot) dos preços e das percentagens em vigor, para não dependerem do catálogo nem das definições atuais.

| Tabela | Campos principais | Notas |
| --- | --- | --- |
| items | id, tipo (ingrediente/material), nome, unidade (kg/l/un), preco\_unidade\_cent, ativo, atualizado\_em | Preço por kg, por litro ou por unidade. `ativo = false` esconde o item sem apagar |
| definicoes | valor\_hora\_cent, custo\_indireto\_pct, margem\_pct, moeda, nome\_negocio | Linha única. `margem_pct` é o valor por omissão para novos orçamentos |
| receitas | id, nome, notas, atualizado\_em | Só quantidades; os preços vêm sempre do catálogo atual |
| receita\_linhas | id, receita\_id, item\_id (nulo em linha livre), livre, descricao, unidade\_entrada, quantidade, valor\_cent, ordem | Quantidade na unidade do item. Um item usado numa receita não pode ser apagado nem mudar de unidade |
| numeracao | ano, ultimo | Último número de orçamento usado em cada ano, para nunca reutilizar um número |
| orcamentos | id, numero\_ano, numero\_seq, cliente, titulo, contacto, data\_entrega, estado, notas, valor\_hora\_snap, indireto\_pct\_snap, margem\_pct, total\_calc\_cent, total\_cent, criado\_em, atualizado\_em | Número = `numero_ano`-`numero_seq` (único). `titulo` é interno. `estado`: rascunho / enviado / aceite / recusado / entregue. `margem_pct` copiada das definições e editável. `total_cent` = soma dos preços finais dos bolos |
| orcamento\_bolos | id, orcamento\_id, nome, ordem, tempo\_min, custo\_cent, preco\_calc\_cent, preco\_final\_cent | Um orçamento tem 1..n bolos. Um bolo de andares é um só bolo. `preco_final` nulo = usa o calculado |
| orcamento\_linhas | id, bolo\_id, item\_id (nulo em linha livre), descricao\_snap, unidade\_snap, quantidade, preco\_unit\_snap\_cent, valor\_cent | Nome, unidade e preço copiados do item no momento em que a linha é adicionada |

## 5. Regras de cálculo

Toda a lógica vive num módulo puro (`domain/pricing.ts`), sem dependências de UI.

1. **Quantidade usada:** introduzida na unidade do item. Para itens em kg ou l, a app aceita também g ou ml e converte (250 g → 0,25 kg).
2. **Valor da linha** = quantidade (na unidade do item) × preço por unidade. Ex.: farinha a 1,20 €/kg, 300 g usadas → 0,300 × 1,20 = 0,36 €.
3. **Por bolo:**
   - **Materiais** = soma das linhas do bolo.
   - **Tempo** = tempo\_min / 60 × valor/hora.
   - **Custos indiretos** (energia, desgaste) = percentagem sobre materiais + tempo.
   - **Margem** (markup) = percentagem do orçamento aplicada **só aos materiais**; o tempo e os indiretos não levam margem.
   - **Custo do bolo** = materiais + tempo + indiretos.
   - **Preço do bolo** = materiais × (1 + margem) + tempo + indiretos, **arredondado ao euro** (0,50 arredonda para cima).
4. **Total** = soma dos preços finais dos bolos (o preço editado, quando existe, ou o calculado). Assim o total no PDF bate sempre certo com a soma dos bolos. O total não se edita diretamente.
5. **Sem IVA:** os preços são finais e não se aplica IVA.
6. **Snapshot:** ao adicionar uma linha, copia-se o preço em vigor; ao criar o orçamento, copiam-se o valor/hora, o custo indireto e a margem por omissão. Alterações posteriores ao catálogo ou às definições não mexem em orçamentos existentes.
7. **Margem ajustável:** mudar a margem de um orçamento recalcula logo o preço dos bolos e o total.
8. **Ajuste manual:** depois de calculados, os preços finais de cada bolo podem ser editados (em euros inteiros) e ficam guardados.
   - A app mostra, por bolo e no total, a diferença face ao calculado.
   - Avisa quando o preço final de um bolo fica abaixo do seu custo.
   - Cada bolo ajustado tem uma ação **"Repor calculado"**, que limpa o valor editado e volta ao calculado.
   - Se o bolo for alterado depois do ajuste (linhas, quantidades, tempo, margem), o preço editado mantém-se. A app indica que o calculado mudou e mostra o novo valor, para quem usa a app decidir se o repõe.
9. **Precisão:** cálculos intermédios sem arredondar (em cêntimos com casas decimais); só o preço de cada bolo é arredondado ao euro.
10. **Receitas:**
    - Ao adicionar uma receita a um bolo, cada linha é copiada com o nome, a unidade e o preço atuais do item (snapshot, como uma linha adicionada à mão). Mudar ou apagar a receita depois não altera o bolo.
    - A **escala** multiplica só as quantidades dos **ingredientes**. Materiais (caixa, base, topper) e linhas livres ficam iguais.
    - Se o bolo estiver vazio e tiver o nome por omissão ("Bolo 1"), passa a ter o nome da receita.
    - O custo estimado da receita é a soma das linhas com os preços atuais, sem margem nem tempo.

```latex
V_{linha} = q \cdot P_{unidade}
```

```latex
Preco_{bolo} = \mathrm{round}\left(M (1 + p_{margem}) + T + p_{ind}(M + T)\right), \quad M = \sum V_{linha},\; T = \frac{t_{min}}{60} \cdot V_{hora}
```

```latex
Total = \sum_{bolos} Preco_{bolo}
```

**Apresentação ao cliente:** o PDF e o resumo em texto mostram cada bolo com o seu preço e o total. São sempre os preços finais (editados ou calculados); o cliente não vê a diferença. O detalhe de ingredientes e quantidades fica só na app.

## 6. Estrutura do projeto e build

Ecrãs em `src/app/` (Expo Router), lógica e dados no resto de `src/`.

```
src/
  app/
    (tabs)/index.tsx      # histórico de orçamentos: pesquisa e filtro por estado
    (tabs)/receitas.tsx   # lista de receitas
    (tabs)/catalogo.tsx   # ingredientes e materiais
    (tabs)/definicoes.tsx # valor/hora, percentagens, nome do negócio, backup
    item/[id].tsx         # item do catálogo
    orcamento/[id].tsx    # editor do orçamento: estado, bolos, linhas, tempo, preço final, envio
    orcamento/linha.tsx   # adicionar/editar linha
    orcamento/receita.tsx # adicionar receita a um bolo, com escala
    receita/[id].tsx      # editor de receita
    receita/linha.tsx     # adicionar/editar linha de receita
  db/migrations.ts        # schema versionado
  db/repo.ts              # queries
  domain/pricing.ts       # cálculo puro, testado com Jest
  domain/receitas.ts      # escala das receitas
  domain/estados.ts       # estados do orçamento
  domain/numero.ts        # número do orçamento (por ano)
  domain/contacto.ts      # telefone/email de um contacto do telemóvel
  domain/units.ts         # conversões g↔kg, ml↔l
  domain/format.ts        # leitura/formatação de euros, decimais, tempo e datas
  pdf/template.ts         # HTML do orçamento
  pdf/pdf.ts              # gerar e partilhar o PDF
  share/texto.ts          # resumo em texto
  backup/backup.ts
```

- **Desenvolvimento:** development build no telemóvel via QR code.
- **APK via EAS:** perfil em `eas.json` com `"android": { "buildType": "apk" }`.
- **APK local:** `npx expo prebuild` seguido de `./gradlew assembleRelease` (requer Android SDK e keystore própria).
- **Keystore:** todas as versões têm de ser assinadas com a mesma chave. Se a chave se perder, o novo APK não instala por cima e desinstalar **apaga os dados**. Guardar a keystore (ou usar a gerida pelo EAS) e documentar onde está.
- **Atualizações:** instala-se o novo APK por cima do anterior. Os dados mantêm-se e as migrations correm no arranque.

## 7. Plano de rollout

Três fases incrementais; cada uma termina com um APK instalado e em uso.

1. **MVP:** catálogo de ingredientes e materiais, definições (valor/hora, percentagens), orçamento com vários bolos, linhas e tempo, total calculado e ajustável, partilha em texto, **backup e restauro em JSON**.
2. **Saída profissional e receitas:** PDF com logótipo, estados e histórico com filtro e pesquisa, receitas com escala.
3. **Melhorias:** a definir após uso real. Já feito na 0.2.0: cliente a partir dos contactos, calendário para a data de entrega, número do orçamento e título interno do pedido. Planeado:
   - **Rever o PDF:** aspeto e conteúdo do orçamento enviado ao cliente (organização, o que mostrar, legibilidade no telemóvel).
   - **Opções de branding:** escolher na app o logótipo, as cores e outros elementos da marca usados no PDF e no texto (hoje o logótipo vem com a app e as cores estão fixas).
   - Outras ideias: backup automático periódico, estatísticas.

## 8. Requisitos não funcionais e questões em aberto

- **Offline total:** nenhuma funcionalidade depende de rede.
- **Moeda e idioma:** EUR e português (PT) por omissão.
- **Usabilidade:** criar um orçamento típico em menos de 2 minutos, com uma só mão; pesquisa rápida de itens do catálogo ao adicionar linhas; texto claro para quem não é técnico.
- **Fiabilidade:** migrations versionadas; backup JSON automático antes de cada migração, gravado na pasta da app (protege contra falhas de migração). Contra perda do telemóvel ou desinstalação, o backup manual é exportado pela folha de partilha para fora da app (Drive, email, WhatsApp).
- **Testes:** cobertura do módulo de cálculo com casos de conversão de unidades, vários bolos, margem só sobre materiais, ajuste manual e arredondamento ao euro (incluindo o caso 0,50).

**Questões em aberto:** nenhuma de momento.

# TechNova · Modelagem e aplicação de bancos NoSQL em um problema real

Trabalho acadêmico: a loja virtual fictícia **TechNova**, com persistência poliglota em **MongoDB Atlas** (produtos, clientes e pedidos) e **Neo4j** (recomendações por filtragem colaborativa).

## Links

- **Telas da loja (abrem no navegador):** https://loreandradee.github.io/technova-nosql/
  - Catálogo: https://loreandradee.github.io/technova-nosql/#/
  - Detalhe do produto: https://loreandradee.github.io/technova-nosql/#/produto/P1
  - Minha conta e recomendações: https://loreandradee.github.io/technova-nosql/#/conta/C1
  - Detalhe do pedido: https://loreandradee.github.io/technova-nosql/#/pedido/PED-1001
  - Painel de vendas: https://loreandradee.github.io/technova-nosql/#/admin
  - Outros clientes: use o seletor **Entrar como** no topo da tela (Ana, Bruno, Carla ou Diego) ou troque o fim do link para `#/conta/C2`, `C3` ou `C4`
- **Artigo (PDF):** [artigo/Artigo_NoSQL_TechNova_versao_final.pdf](artigo/Artigo_NoSQL_TechNova_versao_final.pdf)
- **Artigo (Word):** [artigo/Artigo_NoSQL_TechNova_versao_final.docx](artigo/Artigo_NoSQL_TechNova_versao_final.docx)
- **Prints do MongoDB Atlas e das telas:** [prints/](prints/)

## Banco de dados no MongoDB Atlas

Banco `loja`, com três coleções:

| Coleção | Documentos | Modelagem |
|---|---|---|
| `produtos` | 5 | ficha técnica no subdocumento `atributos`, que muda conforme a categoria |
| `clientes` | 4 | endereço incorporado ao cliente |
| `pedido` | 4 | itens incorporados; cliente e produto referenciados por `clienteId` e `produtoId` |

Índices em `pedido`: `clienteId_1_data_-1` (histórico do cliente) e `data_1` (análises por período).
Os documentos estão em [`docs/data/`](docs/data/).

## Telas e consultas

| Tela | Consulta |
|---|---|
| Catálogo | `db.produtos.find({ ativo: true }).sort({ nome: 1 })` |
| Detalhe do produto | `db.produtos.findOne({ _id: "P1" })` |
| Minha conta | `db.pedido.find({ clienteId: "C1" }).sort({ data: -1 })` + consulta Cypher de recomendação no Neo4j |
| Detalhe do pedido | `db.pedido.findOne({ _id: "PED-1001" })` |
| Painel de vendas | `db.pedido.aggregate([$match, $unwind, $group, $sort])` |

## Como rodar

- **Versão publicada (GitHub Pages):** não precisa instalar nada. Como o GitHub Pages não executa servidor, as telas leem os documentos exportados do banco `loja` (`docs/data/*.json`) e aplicam a mesma lógica das consultas.
- **Demonstração local:** `node demo-server.js` e abrir http://localhost:3000
- **Ligado ao Atlas e ao Neo4j:**
  ```bash
  npm install express mongodb neo4j-driver
  MONGODB_URI="mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net" \
  NEO4J_URI="neo4j+s://xxxx.databases.neo4j.io" NEO4J_USER=neo4j NEO4J_PASSWORD=SENHA \
  node server.js
  ```

## Estrutura

```
server.js        API Node.js + Express + driver oficial do MongoDB e do Neo4j
demo-server.js   servidor de demonstração sem dependências
docs/            telas (HTML, CSS, JS) publicadas no GitHub Pages
docs/data/       documentos das coleções produtos, clientes e pedido
artigo/          artigo final (PDF e Word)
prints/          capturas do MongoDB Atlas e das telas
```

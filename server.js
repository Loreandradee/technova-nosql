// TechNova - API da loja virtual (Node.js + Express + driver oficial do MongoDB)
// Executar:  npm install express mongodb neo4j-driver
//            MONGODB_URI="mongodb+srv://<usuario>:<senha>@cluster0.xxxxx.mongodb.net" node server.js
const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const client = new MongoClient(process.env.MONGODB_URI);
let db;

app.use(express.static("docs"));

// Tela 1 - Catálogo: lista produtos ativos, com filtro opcional por categoria
app.get("/api/produtos", async (req, res) => {
  const filtro = { ativo: true };
  if (req.query.categoria) filtro.categoria = req.query.categoria;
  res.json(await db.collection("produtos").find(filtro).sort({ nome: 1 }).toArray());
});

// Tela 2 - Detalhe do produto: leitura por identificador
app.get("/api/produtos/:id", async (req, res) => {
  res.json(await db.collection("produtos").findOne({ _id: req.params.id }));
});

// Tela 3 - Minha conta: dados do cliente + histórico (usa o índice clienteId_1_data_-1)
app.get("/api/clientes/:id", async (req, res) => {
  const cliente = await db.collection("clientes").findOne({ _id: req.params.id });
  const pedidos = await db.collection("pedido")
    .find({ clienteId: req.params.id })
    .sort({ data: -1 })
    .toArray();
  res.json({ cliente, pedidos });
});

// Tela 4 - Detalhe do pedido: um único documento já traz os itens incorporados
app.get("/api/pedidos/:id", async (req, res) => {
  res.json(await db.collection("pedido").findOne({ _id: req.params.id }));
});

// Tela 5 - Painel: faturamento por produto no período (aggregation pipeline)
app.get("/api/painel/faturamento", async (req, res) => {
  const inicio = new Date(req.query.inicio || "2026-10-01T00:00:00Z");
  const fim = new Date(req.query.fim || "2026-11-01T00:00:00Z");
  const pipeline = [
    { $match: { status: "PAGO", data: { $gte: inicio, $lt: fim } } },
    { $unwind: "$itens" },
    { $group: {
        _id: "$itens.produtoId",
        produto: { $first: "$itens.nome" },
        receita: { $sum: { $multiply: ["$itens.precoUnit", "$itens.qtd"] } },
        unidades: { $sum: "$itens.qtd" } } },
    { $sort: { receita: -1 } }
  ];
  res.json(await db.collection("pedido").aggregate(pipeline).toArray());
});

// Recomendações: consulta Cypher no Neo4j (ver Código 4 do artigo)
app.get("/api/recomendacoes/:clienteId", async (req, res) => {
  const neo4j = require("neo4j-driver");
  const driver = neo4j.driver(process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));
  const { records } = await driver.executeQuery(
    `MATCH (a:Customer {id:$id})-[:BOUGHT]->(:Product)<-[:BOUGHT]-(:Customer)-[:BOUGHT]->(rec:Product)
     WHERE NOT (a)-[:BOUGHT]->(rec)
     RETURN rec.id AS produtoId, rec.name AS produto, count(*) AS pontuacao
     ORDER BY pontuacao DESC`, { id: req.params.clienteId });
  await driver.close();
  res.json(records.map(r => ({ produtoId: r.get("produtoId"), produto: r.get("produto"),
    pontuacao: r.get("pontuacao").toNumber() })));
});

client.connect().then(() => {
  db = client.db("loja");
  app.listen(3000, () => console.log("TechNova em http://localhost:3000"));
});

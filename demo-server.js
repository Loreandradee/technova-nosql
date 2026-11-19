// Servidor de demonstração sem dependências: responde às mesmas rotas do server.js
// usando os documentos exportados do Atlas (docs/data/*.json).
const http = require("http"), fs = require("fs"), path = require("path");
const pub = path.join(__dirname, "docs");
const load = f => JSON.parse(fs.readFileSync(path.join(pub, "data", f)));
const produtos = load("produtos.json"), clientes = load("clientes.json"), pedidos = load("pedido.json");
const d = x => new Date(x.$date || x);

function api(url) {
  const u = new URL(url, "http://x"); const p = u.pathname.split("/").filter(Boolean);
  if (p[1] === "produtos" && !p[2]) {
    const c = u.searchParams.get("categoria");
    return produtos.filter(x => x.ativo && (!c || x.categoria === c)).sort((a, b) => a.nome.localeCompare(b.nome));
  }
  if (p[1] === "produtos") return produtos.find(x => x._id === p[2]);
  if (p[1] === "clientes") return { cliente: clientes.find(x => x._id === p[2]),
    pedidos: pedidos.filter(x => x.clienteId === p[2]).sort((a, b) => d(b.data) - d(a.data)) };
  if (p[1] === "pedidos") return pedidos.find(x => x._id === p[2]);
  if (p[1] === "painel") { // mesma lógica do pipeline $match > $unwind > $group > $sort
    const ini = new Date("2026-10-01T00:00:00Z"), fim = new Date("2026-11-01T00:00:00Z"), g = {};
    pedidos.filter(x => x.status === "PAGO" && d(x.data) >= ini && d(x.data) < fim)
      .forEach(x => x.itens.forEach(i => {
        g[i.produtoId] ??= { _id: i.produtoId, produto: i.nome, receita: 0, unidades: 0 };
        g[i.produtoId].receita += i.precoUnit * i.qtd; g[i.produtoId].unidades += i.qtd; }));
    return Object.values(g).sort((a, b) => b.receita - a.receita);
  }
  if (p[1] === "recomendacoes") { // mesma contagem de caminhos da consulta Cypher
    const comprou = {}; pedidos.forEach(x => x.itens.forEach(i => (comprou[x.clienteId] ??= new Set()).add(i.produtoId)));
    const meus = comprou[p[2]] || new Set(), score = {};
    for (const [c, set] of Object.entries(comprou)) if (c !== p[2])
      for (const m of meus) if (set.has(m)) for (const r of set) if (!meus.has(r)) score[r] = (score[r] || 0) + 1;
    return Object.entries(score).map(([id, s]) => ({ produtoId: id, produto: produtos.find(x => x._id === id).nome, pontuacao: s }))
      .sort((a, b) => b.pontuacao - a.pontuacao);
  }
}
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) { res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify(api(req.url))); }
  const f = path.join(pub, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  fs.readFile(f, (e, b) => { if (e) { res.statusCode = 404; return res.end(); }
    res.setHeader("Content-Type", types[path.extname(f)] || "text/plain"); res.end(b); });
}).listen(3000, () => console.log("Demo em http://localhost:3000"));

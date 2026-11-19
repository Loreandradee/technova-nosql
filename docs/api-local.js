// Fallback para o GitHub Pages (sem servidor): responde às mesmas rotas da API
// usando os documentos exportados do banco "loja" do MongoDB Atlas (data/*.json).
const LocalAPI = (() => {
  let cache;
  const load = async () => cache ??= Object.fromEntries(await Promise.all(
    ["produtos", "clientes", "pedido"].map(async n => [n, await fetch(`data/${n}.json`).then(r => r.json())])));
  const d = x => new Date(x.$date || x);
  return async function (url) {
    const { produtos, clientes, pedido: pedidos } = await load();
    const u = new URL(url, location.href); const p = u.pathname.split("/api/")[1].split("/").map(decodeURIComponent);
    if (p[0] === "produtos" && !p[1]) {
      const c = u.searchParams.get("categoria");
      return produtos.filter(x => x.ativo && (!c || x.categoria === c)).sort((a, b) => a.nome.localeCompare(b.nome));
    }
    if (p[0] === "produtos") return produtos.find(x => x._id === p[1]);
    if (p[0] === "clientes") return { cliente: clientes.find(x => x._id === p[1]),
      pedidos: pedidos.filter(x => x.clienteId === p[1]).sort((a, b) => d(b.data) - d(a.data)) };
    if (p[0] === "pedidos") return pedidos.find(x => x._id === p[1]);
    if (p[0] === "painel") { // $match > $unwind > $group > $sort
      const ini = new Date("2026-10-01T00:00:00Z"), fim = new Date("2026-11-01T00:00:00Z"), g = {};
      pedidos.filter(x => x.status === "PAGO" && d(x.data) >= ini && d(x.data) < fim).forEach(x => x.itens.forEach(i => {
        g[i.produtoId] ??= { _id: i.produtoId, produto: i.nome, receita: 0, unidades: 0 };
        g[i.produtoId].receita += i.precoUnit * i.qtd; g[i.produtoId].unidades += i.qtd; }));
      return Object.values(g).sort((a, b) => b.receita - a.receita);
    }
    if (p[0] === "recomendacoes") { // mesma contagem de caminhos da consulta Cypher do Neo4j
      const comprou = {}; pedidos.forEach(x => x.itens.forEach(i => (comprou[x.clienteId] ??= new Set()).add(i.produtoId)));
      const meus = comprou[p[1]] || new Set(), score = {};
      for (const [c, set] of Object.entries(comprou)) if (c !== p[1])
        for (const m of meus) if (set.has(m)) for (const r of set) if (!meus.has(r)) score[r] = (score[r] || 0) + 1;
      return Object.entries(score).map(([id, s]) => ({ produtoId: id, produto: produtos.find(x => x._id === id).nome, pontuacao: s }))
        .sort((a, b) => b.pontuacao - a.pontuacao);
    }
  };
})();

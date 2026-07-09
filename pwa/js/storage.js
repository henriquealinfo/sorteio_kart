window.SorteioStorage = (() => {
  const CHAVE = "sorteio-kart-v2";

  function criarEvento(nome = "Evento principal") {
    return {
      id: crypto.randomUUID(),
      nome,
      pilotos: [],
      karts: [],
      kartsExcluidos: [],
      criadoEm: new Date().toISOString(),
    };
  }

  function estadoPadrao() {
    const evento = criarEvento();
    return {
      eventoAtivo: evento.id,
      tema: "dark",
      eventos: { [evento.id]: evento },
      historico: [],
    };
  }

  function carregar() {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (!bruto) return estadoPadrao();
      const dados = JSON.parse(bruto);
      if (!dados.eventos || !dados.eventoAtivo) return estadoPadrao();
      return dados;
    } catch {
      return estadoPadrao();
    }
  }

  function salvar(dados) {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  }

  function eventoAtivo(dados) {
    return dados.eventos[dados.eventoAtivo] || Object.values(dados.eventos)[0];
  }

  function salvarEventoAtual(dados, campos) {
    const evento = eventoAtivo(dados);
    if (!evento) return dados;
    Object.assign(evento, campos);
    salvar(dados);
    return dados;
  }

  function adicionarEvento(dados, nome) {
    const evento = criarEvento(nome);
    dados.eventos[evento.id] = evento;
    dados.eventoAtivo = evento.id;
    salvar(dados);
    return dados;
  }

  function removerEvento(dados, id) {
    if (Object.keys(dados.eventos).length <= 1) return dados;
    delete dados.eventos[id];
    if (dados.eventoAtivo === id) {
      dados.eventoAtivo = Object.keys(dados.eventos)[0];
    }
    salvar(dados);
    return dados;
  }

  function registrarHistorico(dados, registro) {
    dados.historico.unshift({
      id: crypto.randomUUID(),
      ...registro,
      data: new Date().toISOString(),
    });
    dados.historico = dados.historico.slice(0, 50);
    salvar(dados);
    return dados;
  }

  return {
    carregar,
    salvar,
    eventoAtivo,
    salvarEventoAtual,
    adicionarEvento,
    removerEvento,
    registrarHistorico,
    criarEvento,
  };
})();

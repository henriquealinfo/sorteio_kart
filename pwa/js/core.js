window.SorteioCore = (() => {
  const CORRECOES_NOMES = {
    Joao: "João",
    Jose: "José",
    Antonio: "Antônio",
    Luiz: "Luís",
    Andre: "André",
    Lucia: "Lúcia",
    Fabricio: "Fabrício",
    Conceicao: "Conceição",
    Sebastiao: "Sebastião",
  };

  function lerLinhas(texto) {
    return texto
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function encontrarDuplicados(itens) {
    const contagem = new Map();
    for (const item of itens) {
      contagem.set(item, (contagem.get(item) || 0) + 1);
    }
    return [...contagem.entries()]
      .filter(([, qtd]) => qtd > 1)
      .map(([item]) => item);
  }

  function corrigirNome(nome) {
    if (CORRECOES_NOMES[nome]) return CORRECOES_NOMES[nome];
    for (const [errado, certo] of Object.entries(CORRECOES_NOMES)) {
      if (nome.startsWith(`${errado} `)) {
        return certo + nome.slice(errado.length);
      }
    }
    return nome;
  }

  function aplicarCorrecoesNomes(pilotos) {
    return pilotos.map(corrigirNome);
  }

  function criarRng(seed) {
    let estado = seed >>> 0;
    return () => {
      estado += 0x6d2b79f5;
      let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function embaralharComSeed(lista, seed) {
    const copia = [...lista];
    const rng = criarRng(seed);
    for (let i = copia.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  function gerarSeed() {
    return Math.floor(100000 + Math.random() * 900000);
  }

  function kartsDisponiveis(karts, excluidos, atribuicoes = []) {
    const emUso = new Set(atribuicoes.map(([, kart]) => kart));
    const bloqueados = new Set(excluidos);
    return karts.filter((kart) => !bloqueados.has(kart) && !emUso.has(kart));
  }

  function validarSorteio(pilotos, karts, excluidos = [], pilotosAlvo = null) {
    const alvo = pilotosAlvo || pilotos;

    if (!pilotos.length) return { ok: false, erro: "Informe pelo menos um piloto." };
    if (!karts.length) return { ok: false, erro: "Informe pelo menos um kart." };

    const dupPilotos = encontrarDuplicados(pilotos);
    if (dupPilotos.length) {
      return {
        ok: false,
        erro: `Os seguintes pilotos estão repetidos: ${dupPilotos.join(", ")}.`,
      };
    }

    const dupKarts = encontrarDuplicados(karts);
    if (dupKarts.length) {
      return {
        ok: false,
        erro: `Os seguintes karts estão repetidos: ${dupKarts.join(", ")}.`,
      };
    }

    const disponiveis = kartsDisponiveis(karts, excluidos);
    if (!disponiveis.length) {
      return { ok: false, erro: "Nenhum kart disponível após exclusões." };
    }

    if (alvo.length > disponiveis.length) {
      return {
        ok: false,
        erro: `Há ${alvo.length} piloto(s) para sortear e apenas ${disponiveis.length} kart(s) disponível(is).`,
      };
    }

    for (const piloto of alvo) {
      if (!pilotos.includes(piloto)) {
        return { ok: false, erro: `Piloto não encontrado na lista: ${piloto}` };
      }
    }

    return { ok: true, disponiveis };
  }

  function kartsDisponiveisRepescagem(karts, excluidos, atribuicoes, selecionados) {
    const setSel = new Set(selecionados);
    const emUso = new Set(
      atribuicoes.filter(([piloto]) => !setSel.has(piloto)).map(([, kart]) => kart)
    );
    const bloqueados = new Set(excluidos);
    return karts.filter((kart) => !bloqueados.has(kart) && !emUso.has(kart));
  }

  function validarRepescagem(pilotos, karts, excluidos, atribuicoes, selecionados) {
    const base = validarSorteio(pilotos, karts, excluidos);
    if (!base.ok) return base;
    if (!selecionados.length) return { ok: false, erro: "Selecione pelo menos um piloto." };
    const disponiveis = kartsDisponiveisRepescagem(karts, excluidos, atribuicoes, selecionados);
    if (selecionados.length > disponiveis.length) {
      return {
        ok: false,
        erro: `Há ${selecionados.length} piloto(s) na repescagem e apenas ${disponiveis.length} kart(s) disponível(is).`,
      };
    }
    return { ok: true, disponiveis };
  }

  function realizarSorteio(pilotosAlvo, kartsDisponiveisLista, seed = null) {
    const seedUsado = seed ?? gerarSeed();
    const kartsEmbaralhados = embaralharComSeed(kartsDisponiveisLista, seedUsado);
    const atribuicoes = pilotosAlvo.map((piloto, index) => [
      piloto,
      kartsEmbaralhados[index],
    ]);
    return { atribuicoes, seed: seedUsado };
  }

  function mesclarAtribuicoes(anteriores, novas) {
    const novosPilotos = new Set(novas.map(([piloto]) => piloto));
    const mantidos = anteriores.filter(([piloto]) => !novosPilotos.has(piloto));
    return [...mantidos, ...novas];
  }

  function formatarDataHora() {
    return new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function mensagemKartsMinimos(qtd) {
    return `Total de ${qtd} piloto(s) na lista. Adicione no mínimo ${qtd} kart(s) para realizar o sorteio.`;
  }

  function formatarMensagemWhatsApp(atribuicoes, seed, evento) {
    let titulo = "🏁 *Resultado do Sorteio de Kart*";
    if (evento) titulo += ` — ${evento}`;
    titulo += `\n📅 ${formatarDataHora()}`;
    if (seed != null) titulo += `\n🔑 Código de auditoria: \`${seed}\``;
    const linhas = atribuicoes.map(([p, k]) => `• ${p} → Kart ${k}`);
    return `${titulo}\n\n${linhas.join("\n")}`;
  }

  function parseCsvConteudo(conteudo) {
    const itens = [];
    for (const linha of conteudo.split(/\r?\n/)) {
      const texto = linha.trim();
      if (!texto) continue;
      let valor = texto;
      if (texto.includes(",")) valor = texto.split(",")[0].trim().replace(/^"|"$/g, "");
      else if (texto.includes(";")) valor = texto.split(";")[0].trim().replace(/^"|"$/g, "");
      if (valor) itens.push(valor);
    }
    return aplicarCorrecoesNomes(itens);
  }

  return {
    lerLinhas,
    encontrarDuplicados,
    corrigirNome,
    aplicarCorrecoesNomes,
    embaralharComSeed,
    gerarSeed,
    kartsDisponiveis,
    kartsDisponiveisRepescagem,
    validarSorteio,
    validarRepescagem,
    realizarSorteio,
    mesclarAtribuicoes,
    formatarDataHora,
    mensagemKartsMinimos,
    formatarMensagemWhatsApp,
    parseCsvConteudo,
  };
})();

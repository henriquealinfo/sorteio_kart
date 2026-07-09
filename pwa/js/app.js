const Core = window.SorteioCore;
const Storage = window.SorteioStorage;
const Export = window.SorteioExport;

const pilotosEl = document.getElementById("pilotos");
const kartsEl = document.getElementById("karts");
const kartsExcluidosEl = document.getElementById("karts-excluidos");
const statusEl = document.getElementById("status");
const selectEventoEl = document.getElementById("select-evento");
const resultadoVazioEl = document.getElementById("resultado-vazio");
const resultadoTabelaEl = document.getElementById("resultado-tabela");
const resultadoLinhasEl = document.getElementById("resultado-linhas");
const resultadoActionsEl = document.getElementById("resultado-actions");
const seedInfoEl = document.getElementById("seed-info");
const statusEventoEl = document.getElementById("status-evento");
const dialogImportarEl = document.getElementById("dialog-importar");
const dialogMenuEl = document.getElementById("dialog-menu");
const dialogPreviewEl = document.getElementById("dialog-preview");
const dialogColarEl = document.getElementById("dialog-colar");
const dialogOcrEl = document.getElementById("dialog-ocr");
const dialogRepescarEl = document.getElementById("dialog-repescar");
const dialogHistoricoEl = document.getElementById("dialog-historico");
const loadingEl = document.getElementById("loading");
const loadingTextEl = document.getElementById("loading-text");

let dados = Storage.carregar();
let ultimasAtribuicoes = [];
let ultimoSeed = null;
let arquivoOcrPendente = null;
let ocrPreviewCanvas = null;
let deferredInstallPrompt = null;
let salvando = false;

function definirStatus(texto) {
  statusEl.textContent = texto;
}

function mostrarLoading(texto) {
  loadingTextEl.textContent = texto;
  loadingEl.classList.remove("hidden");
}

function esconderLoading() {
  loadingEl.classList.add("hidden");
}

function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = tema === "light" ? "#ffffff" : "#1a1a2e";
}

function lerFormulario() {
  return {
    pilotos: Core.lerLinhas(pilotosEl.value),
    karts: Core.lerLinhas(kartsEl.value),
    kartsExcluidos: Core.lerLinhas(kartsExcluidosEl.value),
  };
}

function salvarAutomatico() {
  if (salvando) return;
  const form = lerFormulario();
  dados = Storage.salvarEventoAtual(dados, {
    pilotos: form.pilotos,
    karts: form.karts,
    kartsExcluidos: form.kartsExcluidos,
  });
}

function carregarEventoAtivoNaTela() {
  salvando = true;
  const evento = Storage.eventoAtivo(dados);
  if (!evento) return;
  pilotosEl.value = (evento.pilotos || []).join("\n");
  kartsEl.value = (evento.karts || []).join("\n");
  kartsExcluidosEl.value = (evento.kartsExcluidos || []).join("\n");
  salvando = false;
  atualizarSelectEventos();
}

function atualizarSelectEventos() {
  const valorAtual = dados.eventoAtivo;
  selectEventoEl.innerHTML = "";
  let nomeAtivo = "";
  for (const evento of Object.values(dados.eventos)) {
    const opt = document.createElement("option");
    opt.value = evento.id;
    opt.textContent = evento.nome;
    if (evento.id === valorAtual) {
      opt.selected = true;
      nomeAtivo = evento.nome;
    }
    selectEventoEl.appendChild(opt);
  }
  if (statusEventoEl) statusEventoEl.textContent = nomeAtivo || "Evento";
}

function exibirResultado(atribuicoes, seed) {
  ultimasAtribuicoes = atribuicoes;
  ultimoSeed = seed;
  resultadoLinhasEl.innerHTML = "";

  for (const [piloto, kart] of atribuicoes) {
    const row = document.createElement("div");
    row.className = "resultado-row";
    row.innerHTML = `<span>${piloto}</span><span>${kart}</span>`;
    resultadoLinhasEl.appendChild(row);
  }

  resultadoVazioEl.classList.add("hidden");
  resultadoTabelaEl.classList.remove("hidden");
  resultadoActionsEl.classList.remove("hidden");
  seedInfoEl.textContent = `Código ${seed} · ${Core.formatarDataHora()}`;
  seedInfoEl.classList.remove("hidden");
}

function limparResultado() {
  ultimasAtribuicoes = [];
  ultimoSeed = null;
  resultadoLinhasEl.innerHTML = "";
  resultadoTabelaEl.classList.add("hidden");
  resultadoVazioEl.classList.remove("hidden");
  resultadoActionsEl.classList.add("hidden");
  seedInfoEl.classList.add("hidden");
}

function registrarHistorico(tipo) {
  const evento = Storage.eventoAtivo(dados);
  dados = Storage.registrarHistorico(dados, {
    eventoId: evento?.id,
    eventoNome: evento?.nome,
    tipo,
    seed: ultimoSeed,
    atribuicoes: ultimasAtribuicoes,
  });
}

function sortear() {
  const form = lerFormulario();
  const validacao = Core.validarSorteio(form.pilotos, form.karts, form.kartsExcluidos);

  if (!validacao.ok) {
    window.alert(validacao.erro);
    return;
  }

  const { atribuicoes, seed } = Core.realizarSorteio(form.pilotos, validacao.disponiveis);
  exibirResultado(atribuicoes, seed);
  registrarHistorico("sorteio");

  const sobrando = validacao.disponiveis.length - form.pilotos.length;
  definirStatus(
    sobrando > 0
      ? `Sorteio concluído: ${form.pilotos.length} piloto(s). ${sobrando} kart(s) sem uso.`
      : `Sorteio concluído: ${form.pilotos.length} piloto(s) atribuído(s).`
  );
  salvarAutomatico();
  resultadoTabelaEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function abrirRepescagem() {
  if (!ultimasAtribuicoes.length) return;
  const lista = document.getElementById("repescar-lista");
  lista.innerHTML = "";
  for (const [piloto, kart] of ultimasAtribuicoes) {
    const label = document.createElement("label");
    label.className = "repescar-item";
    label.innerHTML = `<input type="checkbox" value="${piloto}" /> ${piloto} (atual: Kart ${kart})`;
    lista.appendChild(label);
  }
  dialogRepescarEl.showModal();
}

function repescar() {
  const selecionados = [...dialogRepescarEl.querySelectorAll('input[type="checkbox"]:checked')].map(
    (el) => el.value
  );
  if (!selecionados.length) {
    window.alert("Selecione pelo menos um piloto para repescar.");
    return;
  }

  const form = lerFormulario();
  const validacao = Core.validarRepescagem(
    form.pilotos,
    form.karts,
    form.kartsExcluidos,
    ultimasAtribuicoes,
    selecionados
  );

  if (!validacao.ok) {
    window.alert(validacao.erro);
    return;
  }

  const { atribuicoes: novas, seed } = Core.realizarSorteio(selecionados, validacao.disponiveis);
  const mescladas = Core.mesclarAtribuicoes(ultimasAtribuicoes, novas);
  exibirResultado(mescladas, seed);
  registrarHistorico("repescagem");
  definirStatus(`Repescagem concluída para ${selecionados.length} piloto(s). Novo código: ${seed}.`);
}

function limparTudo() {
  if (!window.confirm("Limpar listas e resultado deste evento?")) return;
  pilotosEl.value = "";
  kartsEl.value = "";
  kartsExcluidosEl.value = "";
  limparResultado();
  salvarAutomatico();
  definirStatus("Listas e resultado limpos.");
}

function aplicarPilotosImportados(linhas, modo) {
  const corrigidos = Core.aplicarCorrecoesNomes(linhas);
  if (modo === "substituir") {
    pilotosEl.value = `${corrigidos.join("\n")}\n`;
  } else {
    const atual = Core.lerLinhas(pilotosEl.value);
    pilotosEl.value = `${[...atual, ...corrigidos].join("\n")}\n`;
  }
  salvarAutomatico();
  const total = Core.lerLinhas(pilotosEl.value).length;
  const msg = `${corrigidos.length} piloto(s) importado(s).\n\n${Core.mensagemKartsMinimos(total)}`;
  window.alert(msg);
  definirStatus(Core.mensagemKartsMinimos(total));
}

function abrirPreviewPilotos(pilotos) {
  document.getElementById("preview-pilotos").value = pilotos.join("\n");
  document.getElementById("preview-info").textContent =
    `Foram encontrados ${pilotos.length} piloto(s). Revise antes de confirmar.`;
  dialogPreviewEl.showModal();
}

async function processarOcrComAjustes() {
  if (!arquivoOcrPendente) return;
  const brilho = parseFloat(document.getElementById("ocr-brightness").value);
  const contraste = parseFloat(document.getElementById("ocr-contrast").value);

  dialogOcrEl.close();
  mostrarLoading("Lendo texto da imagem...");

  try {
    const pilotos = await window.OcrKart.extrairPilotosDaImagem(
      arquivoOcrPendente,
      (p) => { loadingTextEl.textContent = `Lendo texto... ${p}%`; },
      { brightness: brilho, contrast: contraste }
    );
    esconderLoading();
    if (!pilotos.length) {
      window.alert("Não foi possível identificar nomes na imagem.");
      return;
    }
    abrirPreviewPilotos(pilotos);
  } catch (erro) {
    esconderLoading();
    const msg =
      erro?.message === "offline"
        ? "Sem conexão com a internet. Na primeira leitura, o app precisa baixar o motor de OCR."
        : window.OcrKart.mensagemErroImagem(erro, arquivoOcrPendente);
    window.alert(msg);
    console.error(erro);
  } finally {
    arquivoOcrPendente = null;
    limparInputsImagem();
  }
}

async function prepararOcr(file) {
  if (!file) return;

  mostrarLoading("Abrindo imagem...");

  try {
    arquivoOcrPendente = file;
    ocrPreviewCanvas = await window.OcrKart.prepararPreview(file);
    esconderLoading();
    atualizarCanvasOcr();
    dialogOcrEl.showModal();
  } catch (erro) {
    esconderLoading();
    arquivoOcrPendente = null;
    ocrPreviewCanvas = null;
    window.alert(window.OcrKart.mensagemErroImagem(erro, file));
    console.error(erro);
    limparInputsImagem();
  }
}

function atualizarCanvasOcr() {
  if (!ocrPreviewCanvas) return;
  const canvas = document.getElementById("ocr-canvas");
  const brilho = parseFloat(document.getElementById("ocr-brightness").value);
  const contraste = parseFloat(document.getElementById("ocr-contrast").value);
  const maxLargura = 600;
  const escala = Math.min(1, maxLargura / ocrPreviewCanvas.width);
  canvas.width = Math.round(ocrPreviewCanvas.width * escala);
  canvas.height = Math.round(ocrPreviewCanvas.height * escala);
  const ctx = canvas.getContext("2d");
  ctx.filter = `brightness(${brilho}) contrast(${contraste})`;
  ctx.drawImage(ocrPreviewCanvas, 0, 0, canvas.width, canvas.height);
}

function importarArquivoTexto(file, parser) {
  if (!file) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    const itens = parser(leitor.result);
    if (!itens.length) {
      window.alert("Nenhum piloto encontrado no arquivo.");
      return;
    }
    abrirPreviewPilotos(itens);
  };
  leitor.readAsText(file, "UTF-8");
}

function importarExcel(file) {
  if (!file) return;
  const leitor = new FileReader();
  leitor.onload = (e) => {
    const dadosPlanilha = XLSX.read(e.target.result, { type: "array" });
    const folha = dadosPlanilha.Sheets[dadosPlanilha.SheetNames[0]];
    const linhas = XLSX.utils.sheet_to_json(folha, { header: 1 });
    const itens = Core.aplicarCorrecoesNomes(
      linhas.map((row) => String(row[0] || "").trim()).filter(Boolean)
    );
    if (!itens.length) {
      window.alert("Nenhum piloto encontrado na planilha.");
      return;
    }
    abrirPreviewPilotos(itens);
  };
  leitor.readAsArrayBuffer(file);
}

function carregarDoHistorico(item) {
  if (!item.atribuicoes?.length) {
    window.alert("Este registro não possui dados de sorteio.");
    return;
  }
  exibirResultado(item.atribuicoes, item.seed);
  dialogHistoricoEl.close();
  const data = new Date(item.data).toLocaleString("pt-BR");
  definirStatus(
    `Consultando: ${item.eventoNome || "Evento"} — ${data} (${item.tipo})`
  );
  resultadoTabelaEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function abrirHistorico() {
  const lista = document.getElementById("historico-lista");
  const dica = dialogHistoricoEl.querySelector(".historico-dica");
  lista.innerHTML = "";
  if (!dados.historico.length) {
    if (dica) dica.classList.add("hidden");
    lista.innerHTML = '<p class="hint">Nenhum sorteio registrado ainda.</p>';
  } else {
    if (dica) dica.classList.remove("hidden");
    for (const item of dados.historico) {
      const div = document.createElement("button");
      div.type = "button";
      div.className = "historico-item";
      const data = new Date(item.data).toLocaleString("pt-BR");
      const resumo = (item.atribuicoes || [])
        .slice(0, 3)
        .map(([p, k]) => `${p} → Kart ${k}`)
        .join(" · ");
      div.innerHTML = `<strong>${item.eventoNome || "Evento"}</strong>
        <span class="historico-meta">${data} · ${item.tipo} · Código ${item.seed}</span>
        <span class="historico-resumo">${resumo}${item.atribuicoes?.length > 3 ? " …" : ""}</span>`;
      div.addEventListener("click", () => carregarDoHistorico(item));
      lista.appendChild(div);
    }
  }
  dialogHistoricoEl.showModal();
}

function abrirApresentacao() {
  const evento = Storage.eventoAtivo(dados);
  document.getElementById("apresentacao-titulo").textContent =
    evento?.nome || "Sorteio de Kart";
  document.getElementById("apresentacao-meta").textContent =
    `Código ${ultimoSeed} — ${Core.formatarDataHora()}`;
  const container = document.getElementById("apresentacao-linhas");
  container.innerHTML = "";
  for (const [piloto, kart] of ultimasAtribuicoes) {
    const row = document.createElement("div");
    row.className = "apresentacao-row";
    row.innerHTML = `<span>${piloto}</span><span>${kart}</span>`;
    container.appendChild(row);
  }
  document.getElementById("apresentacao").classList.remove("hidden");
}

function configurarAutoSave() {
  [pilotosEl, kartsEl, kartsExcluidosEl].forEach((el) => {
    el.addEventListener("input", () => {
      salvarAutomatico();
    });
  });
}

function limparInputsImagem() {
  document.querySelectorAll("[data-import-file]").forEach((input) => {
    input.value = "";
  });
}

function configurarImportacaoImagem() {
  document.querySelectorAll("[data-import-file]").forEach((input) => {
    input.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      dialogImportarEl.close();
      prepararOcr(file);
    });
    input.addEventListener("cancel", () => dialogImportarEl.close());
  });
}

function configurarSheets() {
  document.getElementById("btn-importar").addEventListener("click", () => {
    dialogImportarEl.showModal();
  });

  document.querySelectorAll("[data-close-sheet]").forEach((btn) => {
    btn.addEventListener("click", () => dialogImportarEl.close());
  });

  document.querySelectorAll("[data-import]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tipo = btn.dataset.import;
      if (tipo === "colar") {
        dialogImportarEl.close();
        dialogColarEl.showModal();
      } else if (tipo === "csv") {
        const input = document.getElementById("input-csv");
        input.value = "";
        input.click();
        dialogImportarEl.close();
      } else if (tipo === "excel") {
        const input = document.getElementById("input-excel");
        input.value = "";
        input.click();
        dialogImportarEl.close();
      }
    });
  });

  document.getElementById("btn-menu").addEventListener("click", () => {
    dialogMenuEl.showModal();
  });

  document.querySelectorAll("[data-close-menu]").forEach((btn) => {
    btn.addEventListener("click", () => dialogMenuEl.close());
  });
}

function configurarInstalacaoPwa() {
  const appInstalado =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  if (appInstalado) document.getElementById("btn-como-instalar").classList.add("hidden");

  document.getElementById("btn-como-instalar").addEventListener("click", () => {
    dialogMenuEl.close();
    document.getElementById("dialog-instalar").showModal();
  });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById("btn-install").classList.remove("hidden");
  });

  document.getElementById("btn-install").addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    dialogMenuEl.close();
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    document.getElementById("btn-install").classList.add("hidden");
  });
}

function registrarServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}

// Event listeners
document.getElementById("btn-sortear").addEventListener("click", sortear);
document.getElementById("btn-limpar").addEventListener("click", limparTudo);
document.getElementById("btn-repescar-inline").addEventListener("click", abrirRepescagem);
document.getElementById("btn-whatsapp").addEventListener("click", async () => {
  const evento = Storage.eventoAtivo(dados);
  await Export.exportarWhatsApp(ultimasAtribuicoes, ultimoSeed, evento?.nome);
  definirStatus("Resultado enviado para WhatsApp.");
});
document.getElementById("btn-imagem").addEventListener("click", async () => {
  const evento = Storage.eventoAtivo(dados);
  await Export.exportarImagem(ultimasAtribuicoes, ultimoSeed, evento?.nome);
  definirStatus("Imagem do resultado exportada.");
});
document.getElementById("btn-apresentacao").addEventListener("click", abrirApresentacao);
document.getElementById("btn-fechar-apresentacao").addEventListener("click", () => {
  document.getElementById("apresentacao").classList.add("hidden");
});

document.getElementById("input-csv").addEventListener("change", (e) => {
  importarArquivoTexto(e.target.files?.[0], Core.parseCsvConteudo);
  e.target.value = "";
});
document.getElementById("input-excel").addEventListener("change", (e) => {
  importarExcel(e.target.files?.[0]);
  e.target.value = "";
});

document.getElementById("btn-tema").addEventListener("click", () => {
  dados.tema = dados.tema === "dark" ? "light" : "dark";
  aplicarTema(dados.tema);
  Storage.salvar(dados);
  dialogMenuEl.close();
});

document.getElementById("btn-novo-evento").addEventListener("click", () => {
  const nome = window.prompt("Nome do novo evento:", "Novo evento");
  if (!nome?.trim()) return;
  salvarAutomatico();
  dados = Storage.adicionarEvento(dados, nome.trim());
  carregarEventoAtivoNaTela();
  limparResultado();
  definirStatus(`Evento "${nome.trim()}" criado.`);
});

document.getElementById("btn-remover-evento").addEventListener("click", () => {
  if (!window.confirm("Excluir este evento?")) return;
  dados = Storage.removerEvento(dados, dados.eventoAtivo);
  carregarEventoAtivoNaTela();
  limparResultado();
  definirStatus("Evento excluído.");
});

selectEventoEl.addEventListener("change", () => {
  salvarAutomatico();
  dados.eventoAtivo = selectEventoEl.value;
  Storage.salvar(dados);
  carregarEventoAtivoNaTela();
  limparResultado();
  definirStatus("Evento carregado.");
});

document.getElementById("btn-historico").addEventListener("click", abrirHistorico);

dialogPreviewEl.addEventListener("close", () => {
  if (dialogPreviewEl.returnValue === "confirm") {
    const linhas = Core.lerLinhas(document.getElementById("preview-pilotos").value);
    if (!linhas.length) { window.alert("Informe pelo menos um piloto."); return; }
    const modo = document.querySelector('input[name="modo-import"]:checked').value;
    aplicarPilotosImportados(linhas, modo);
  }
});

dialogColarEl.addEventListener("close", () => {
  if (dialogColarEl.returnValue === "confirm") {
    const linhas = Core.lerLinhas(document.getElementById("colar-pilotos").value);
    if (!linhas.length) { window.alert("Cole pelo menos um piloto."); return; }
    const modo = document.querySelector('input[name="modo-colar"]:checked').value;
    aplicarPilotosImportados(linhas, modo);
    document.getElementById("colar-pilotos").value = "";
  }
});

dialogRepescarEl.addEventListener("close", () => {
  if (dialogRepescarEl.returnValue === "confirm") repescar();
});

document.getElementById("btn-ocr-cancelar").addEventListener("click", () => {
  arquivoOcrPendente = null;
  ocrPreviewCanvas = null;
  dialogOcrEl.close();
});
document.getElementById("btn-ocr-confirmar").addEventListener("click", processarOcrComAjustes);
document.getElementById("ocr-brightness").addEventListener("input", atualizarCanvasOcr);
document.getElementById("ocr-contrast").addEventListener("input", atualizarCanvasOcr);

configurarImportacaoImagem();
configurarSheets();
configurarAutoSave();
configurarInstalacaoPwa();
registrarServiceWorker();

aplicarTema(dados.tema || "dark");
carregarEventoAtivoNaTela();
definirStatus("Pronto para sortear.");

const pilotosEl = document.getElementById("pilotos");
const kartsEl = document.getElementById("karts");
const statusEl = document.getElementById("status");
const resultadoVazioEl = document.getElementById("resultado-vazio");
const resultadoTabelaEl = document.getElementById("resultado-tabela");
const resultadoLinhasEl = document.getElementById("resultado-linhas");
const btnCameraEl = document.getElementById("btn-camera");
const btnGaleriaEl = document.getElementById("btn-galeria");
const dialogPreviewEl = document.getElementById("dialog-preview");
const previewPilotosEl = document.getElementById("preview-pilotos");
const previewInfoEl = document.getElementById("preview-info");
const loadingEl = document.getElementById("loading");
const loadingTextEl = document.getElementById("loading-text");
const btnInstallEl = document.getElementById("btn-install");

let deferredInstallPrompt = null;

function lerLinhas(textarea) {
  return textarea.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

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

function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function exibirResultado(atribuicoes) {
  resultadoLinhasEl.innerHTML = "";

  for (const [piloto, kart] of atribuicoes) {
    const row = document.createElement("div");
    row.className = "resultado-row";
    row.innerHTML = `<span>${piloto}</span><span>${kart}</span>`;
    resultadoLinhasEl.appendChild(row);
  }

  resultadoVazioEl.classList.add("hidden");
  resultadoTabelaEl.classList.remove("hidden");
}

function limparResultado() {
  resultadoLinhasEl.innerHTML = "";
  resultadoTabelaEl.classList.add("hidden");
  resultadoVazioEl.classList.remove("hidden");
}

function sortear() {
  const pilotos = lerLinhas(pilotosEl);
  const karts = lerLinhas(kartsEl);

  if (!pilotos.length) {
    window.alert("Informe pelo menos um piloto.");
    return;
  }

  if (!karts.length) {
    window.alert("Informe pelo menos um kart.");
    return;
  }

  if (pilotos.length > karts.length) {
    window.alert(
      `Há ${pilotos.length} pilotos e apenas ${karts.length} karts.\nAdicione mais karts ou remova pilotos.`
    );
    return;
  }

  const kartsEmbaralhados = embaralhar(karts);
  const atribuicoes = pilotos.map((piloto, index) => [piloto, kartsEmbaralhados[index]]);

  exibirResultado(atribuicoes);

  const kartsSobrando = karts.length - pilotos.length;
  if (kartsSobrando > 0) {
    definirStatus(
      `Sorteio concluído: ${pilotos.length} piloto(s). ${kartsSobrando} kart(s) ficaram sem uso.`
    );
  } else {
    definirStatus(`Sorteio concluído: ${pilotos.length} piloto(s) atribuído(s).`);
  }
}

function limparTudo() {
  pilotosEl.value = "";
  kartsEl.value = "";
  limparResultado();
  definirStatus("Listas e resultado limpos.");
}

function abrirPreview(pilotos) {
  previewPilotosEl.value = pilotos.join("\n");
  previewInfoEl.textContent = `Foram encontrados ${pilotos.length} piloto(s). Revise antes de confirmar.`;
  dialogPreviewEl.showModal();
}

function aplicarImportacao() {
  const linhas = lerLinhas(previewPilotosEl);
  if (!linhas.length) {
    window.alert("Informe pelo menos um piloto.");
    return;
  }

  const modo = document.querySelector('input[name="modo-import"]:checked').value;
  if (modo === "substituir") {
    pilotosEl.value = `${linhas.join("\n")}\n`;
  } else {
    const atual = pilotosEl.value.trim();
    pilotosEl.value = atual ? `${atual}\n${linhas.join("\n")}\n` : `${linhas.join("\n")}\n`;
  }

  definirStatus(`${linhas.length} piloto(s) importado(s) do print.`);
}

async function processarImagem(file) {
  if (!file) return;

  mostrarLoading("Preparando leitura da imagem...");

  try {
    const pilotos = await window.OcrKart.extrairPilotosDaImagem(file, (progresso) => {
      loadingTextEl.textContent = `Lendo texto... ${progresso}%`;
    });

    esconderLoading();

    if (!pilotos.length) {
      window.alert(
        "Não foi possível identificar nomes na imagem.\nTente uma foto mais nítida ou edite manualmente."
      );
      definirStatus("Nenhum piloto identificado no print.");
      return;
    }

    abrirPreview(pilotos);
  } catch (error) {
    esconderLoading();
    window.alert("Não foi possível ler a imagem. Tente novamente ou adicione os nomes manualmente.");
    definirStatus("Falha ao ler o print.");
    console.error(error);
  } finally {
    document.getElementById("input-camera").value = "";
    document.getElementById("input-galeria").value = "";
  }
}

function configurarImportacaoImagem(inputEl, botaoEl, mensagemStatus) {
  botaoEl.addEventListener("click", () => {
    definirStatus(mensagemStatus);
    inputEl.value = "";
    inputEl.click();
  });

  inputEl.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    processarImagem(file);
  });

  inputEl.addEventListener("cancel", () => {
    definirStatus("Seleção de imagem cancelada.");
  });
}

function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker não registrado:", error);
    });
  });
}

function configurarInstalacaoPwa() {
  const dialogInstalarEl = document.getElementById("dialog-instalar");
  const btnComoInstalarEl = document.getElementById("btn-como-instalar");
  const appInstalado =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  if (appInstalado) {
    btnComoInstalarEl.classList.add("hidden");
  }

  btnComoInstalarEl.addEventListener("click", () => {
    dialogInstalarEl.showModal();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    btnInstallEl.classList.remove("hidden");
  });

  btnInstallEl.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    btnInstallEl.classList.add("hidden");
  });

  window.addEventListener("appinstalled", () => {
    btnInstallEl.classList.add("hidden");
    definirStatus("App instalado no celular.");
  });
}

document.getElementById("btn-sortear").addEventListener("click", sortear);
document.getElementById("btn-limpar").addEventListener("click", limparTudo);
configurarImportacaoImagem(
  document.getElementById("input-camera"),
  btnCameraEl,
  "Abrindo câmera..."
);
configurarImportacaoImagem(
  document.getElementById("input-galeria"),
  btnGaleriaEl,
  "Abrindo galeria..."
);

dialogPreviewEl.addEventListener("close", () => {
  if (dialogPreviewEl.returnValue === "confirm") {
    aplicarImportacao();
  }
});

registrarServiceWorker();
configurarInstalacaoPwa();

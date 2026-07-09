const HEADER_PATTERN =
  /^(pilotos?|nome|lista|participantes?|classifica|posi[cç][aã]o|kart|grid|total|inscri[cç][oõ]es?)$/i;
const NUMBER_ONLY = /^\d+$/;
const PREFIX_NUMBER = /^\d+[\.\)\-:\s]+/;

function limparLinha(line) {
  let texto = line.trim();
  texto = texto.replace(PREFIX_NUMBER, "").trim();
  return texto;
}

function filtrarPilotos(lines) {
  const pilotos = [];

  for (const raw of lines) {
    const line = limparLinha(raw);
    if (line.length < 2) continue;
    if (NUMBER_ONLY.test(line)) continue;
    if (HEADER_PATTERN.test(line)) continue;
    pilotos.push(line);
  }

  return window.SorteioCore.aplicarCorrecoesNomes(pilotos);
}

async function preprocessarImagem(file, brightness = 1.1, contrast = 1.25) {
  const imagem = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = imagem.width;
  canvas.height = imagem.height;
  const ctx = canvas.getContext("2d");
  ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
  ctx.drawImage(imagem, 0, 0);
  return canvas;
}

async function extrairPilotosDaImagem(file, onProgress, opcoes = {}) {
  const canvas = await preprocessarImagem(
    file,
    opcoes.brightness ?? 1.1,
    opcoes.contrast ?? 1.25
  );

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const { data } = await Tesseract.recognize(blob, "por", {
    logger: (message) => {
      if (onProgress && message.status === "recognizing text") {
        onProgress(Math.round((message.progress || 0) * 100));
      }
    },
  });

  const lines = data.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return filtrarPilotos(lines);
}

function carregarPreviewImagem(file) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = reject;
    leitor.readAsDataURL(file);
  });
}

window.OcrKart = {
  extrairPilotosDaImagem,
  filtrarPilotos,
  preprocessarImagem,
  carregarPreviewImagem,
};

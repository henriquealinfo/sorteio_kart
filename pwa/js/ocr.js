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

  return pilotos;
}

async function extrairPilotosDaImagem(file, onProgress) {
  const { data } = await Tesseract.recognize(file, "por", {
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

window.OcrKart = {
  extrairPilotosDaImagem,
  filtrarPilotos,
};

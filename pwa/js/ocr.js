const HEADER_PATTERN =
  /^(pilotos?|nome|lista|participantes?|classifica|posi[cç][aã]o|kart|grid|total|inscri[cç][oõ]es?)$/i;
const NUMBER_ONLY = /^\d+$/;
const PREFIX_NUMBER = /^\d+[\.\)\-:\s]+/;
const MAX_LADO_OCR = 1600;

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

function mensagemErroImagem(erro, file) {
  const tipo = (file?.type || "").toLowerCase();
  const nome = (file?.name || "").toLowerCase();

  if (!navigator.onLine) {
    return "Sem conexão com a internet. Na primeira leitura, o app precisa baixar o motor de OCR.";
  }

  if (tipo.includes("heic") || tipo.includes("heif") || nome.endsWith(".heic") || nome.endsWith(".heif")) {
    return "Formato HEIC (foto do iPhone) não suportado neste aparelho. Tire um print (captura de tela) ou salve a imagem como JPG/PNG.";
  }

  if (erro?.name === "InvalidStateError" || erro?.message?.includes("memory")) {
    return "Imagem muito grande para processar. Tente um print menor ou uma foto mais próxima da lista.";
  }

  if (erro?.message?.includes("could not be decoded") || erro?.message?.includes("decode")) {
    return "Formato de imagem não suportado. Use JPG ou PNG.";
  }

  return "Não foi possível abrir esta imagem. Tente outra foto, um print da tela ou cole a lista manualmente.";
}

function carregarImagemViaElemento(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

function extrairLinhasOrdenadas(data) {
  const itens = [];

  if (data.lines?.length) {
    for (const line of data.lines) {
      const texto = line.text?.trim();
      if (!texto) continue;
      itens.push({
        texto,
        y: line.bbox.y0,
        x: line.bbox.x0,
        h: line.bbox.y1 - line.bbox.y0,
      });
    }
  }

  if (!itens.length && data.text) {
    return data.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (!itens.length) return [];

  const alturaMedia = itens.reduce((soma, item) => soma + item.h, 0) / itens.length;
  const tolerancia = Math.max(12, alturaMedia * 0.6);

  itens.sort((a, b) => {
    if (Math.abs(a.y - b.y) <= tolerancia) return a.x - b.x;
    return a.y - b.y;
  });

  return itens.map((item) => item.texto);
}

async function carregarFonteImagem(file) {
  const opcoesBitmap = { imageOrientation: "from-image" };

  try {
    const bitmap = await createImageBitmap(file, opcoesBitmap);
    return { fonte: bitmap, fechar: () => bitmap.close?.() };
  } catch {
    const img = await carregarImagemViaElemento(file);
    return { fonte: img, fechar: () => {} };
  }
}

async function preprocessarImagem(file, brightness = 1.1, contrast = 1.25) {
  const { fonte, fechar } = await carregarFonteImagem(file);

  try {
    const maiorLado = Math.max(fonte.width, fonte.height);
    const escala = Math.min(1, MAX_LADO_OCR / maiorLado);
    const largura = Math.max(1, Math.round(fonte.width * escala));
    const altura = Math.max(1, Math.round(fonte.height * escala));

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
    ctx.drawImage(fonte, 0, 0, largura, altura);
    return canvas;
  } finally {
    fechar();
  }
}

async function extrairPilotosDaImagem(file, onProgress, opcoes = {}) {
  if (!navigator.onLine) {
    throw new Error("offline");
  }

  const canvas = await preprocessarImagem(
    file,
    opcoes.brightness ?? 1.1,
    opcoes.contrast ?? 1.25
  );

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((resultado) => {
      if (resultado) resolve(resultado);
      else reject(new Error("blob"));
    }, "image/png");
  });

  const { data } = await Tesseract.recognize(blob, "por", {
    logger: (message) => {
      if (onProgress && message.status === "recognizing text") {
        onProgress(Math.round((message.progress || 0) * 100));
      }
    },
  });

  const lines = extrairLinhasOrdenadas(data);

  return filtrarPilotos(lines);
}

async function prepararPreview(file) {
  return preprocessarImagem(file, 1, 1);
}

window.OcrKart = {
  extrairPilotosDaImagem,
  filtrarPilotos,
  preprocessarImagem,
  prepararPreview,
  mensagemErroImagem,
};

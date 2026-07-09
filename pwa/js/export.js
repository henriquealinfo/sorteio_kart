window.SorteioExport = (() => {
  const { formatarMensagemWhatsApp } = window.SorteioCore;

  async function exportarWhatsApp(atribuicoes, seed, evento) {
    const mensagem = formatarMensagemWhatsApp(atribuicoes, seed, evento);

    if (navigator.share) {
      try {
        await navigator.share({ text: mensagem });
        return true;
      } catch (erro) {
        if (erro.name === "AbortError") return false;
      }
    }

    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }

  function desenharImagemResultado(atribuicoes, seed, evento) {
    const largura = 720;
    const alturaCabecalho = 120;
    const alturaLinha = 48;
    const altura = alturaCabecalho + atribuicoes.length * alturaLinha + 40;
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, largura, altura);

    ctx.fillStyle = "#e94560";
    ctx.fillRect(0, 0, largura, 6);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Segoe UI, sans-serif";
    ctx.fillText("Sorteio de Kart", 32, 48);

    ctx.fillStyle = "#a0a0b8";
    ctx.font = "16px Segoe UI, sans-serif";
    const subtitulo = evento
      ? `${evento} — ${new Date().toLocaleString("pt-BR")}`
      : new Date().toLocaleString("pt-BR");
    ctx.fillText(subtitulo, 32, 78);
    if (seed != null) ctx.fillText(`Código: ${seed}`, 32, 102);

    ctx.strokeStyle = "#2f2f4a";
    ctx.beginPath();
    ctx.moveTo(32, alturaCabecalho - 8);
    ctx.lineTo(largura - 32, alturaCabecalho - 8);
    ctx.stroke();

    atribuicoes.forEach(([piloto, kart], index) => {
      const y = alturaCabecalho + index * alturaLinha;
      if (index % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(24, y, largura - 48, alturaLinha);
      }
      ctx.fillStyle = "#f5f5f7";
      ctx.font = "20px Segoe UI, sans-serif";
      ctx.fillText(piloto, 40, y + 32);
      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 24px Segoe UI, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(kart, largura - 40, y + 32);
      ctx.textAlign = "left";
    });

    return canvas;
  }

  async function exportarImagem(atribuicoes, seed, evento) {
    const canvas = desenharImagemResultado(atribuicoes, seed, evento);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

    if (navigator.share && navigator.canShare?.({ files: [new File([blob], "sorteio.png")] })) {
      const arquivo = new File([blob], "sorteio-kart.png", { type: "image/png" });
      try {
        await navigator.share({ files: [arquivo], title: "Sorteio de Kart" });
        return true;
      } catch (erro) {
        if (erro.name === "AbortError") return false;
      }
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sorteio-kart.png";
    link.click();
    URL.revokeObjectURL(link.href);
    return true;
  }

  return { exportarWhatsApp, exportarImagem, desenharImagemResultado };
})();

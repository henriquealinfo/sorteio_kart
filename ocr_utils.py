import re
from pathlib import Path

from PIL import Image, ImageGrab

HEADER_PATTERN = re.compile(
    r"^(pilotos?|nome|lista|participantes?|classifica|posi[cç][aã]o|kart|grid|total|inscri[cç][oõ]es?)$",
    re.IGNORECASE,
)
NUMBER_ONLY = re.compile(r"^\d+$")
PREFIX_NUMBER = re.compile(r"^\d+[\.\)\-:\s]+")


def _limpar_linha(line: str) -> str:
    line = line.strip()
    line = PREFIX_NUMBER.sub("", line).strip()
    return line


def filtrar_pilotos(lines: list[str]) -> list[str]:
    pilotos: list[str] = []
    for raw in lines:
        line = _limpar_linha(raw)
        if len(line) < 2:
            continue
        if NUMBER_ONLY.match(line):
            continue
        if HEADER_PATTERN.match(line):
            continue
        pilotos.append(line)
    return pilotos


def _linhas_do_clipocr(result) -> list[str]:
    if result.blocks:
        return [block.text.strip() for block in result.blocks if block.text.strip()]
    return [line.strip() for line in result.text.splitlines() if line.strip()]


def _ler_com_clipocr_arquivo(caminho: str) -> list[str]:
    from clipocr import ocr

    resultado = ocr(caminho)
    return _linhas_do_clipocr(resultado)


def _ler_com_clipocr_area_transferencia() -> list[str]:
    from clipocr import ocr_clipboard

    resultado = ocr_clipboard()
    return _linhas_do_clipocr(resultado)


def _ler_com_natocr(imagem: Image.Image | str | Path) -> list[str] | None:
    try:
        from natocr import OCR
    except ImportError:
        return None

    try:
        ocr = OCR(language="pt")
        paginas = ocr.recognize(imagem)
        if not paginas:
            return None
        return [linha.strip() for linha in paginas[0].lines if linha.strip()]
    except Exception:
        return None


def imagem_na_area_transferencia() -> bool:
    conteudo = ImageGrab.grabclipboard()
    return isinstance(conteudo, Image.Image)


def extrair_pilotos_de_arquivo(caminho: str) -> list[str]:
    linhas = _ler_com_natocr(caminho)
    if not linhas:
        linhas = _ler_com_clipocr_arquivo(caminho)
    return filtrar_pilotos(linhas)


def extrair_pilotos_da_area_transferencia() -> list[str]:
    if not imagem_na_area_transferencia():
        raise ValueError("Não há imagem na área de transferência.")

    imagem = ImageGrab.grabclipboard()
    linhas = _ler_com_natocr(imagem)
    if not linhas:
        linhas = _ler_com_clipocr_area_transferencia()
    return filtrar_pilotos(linhas)

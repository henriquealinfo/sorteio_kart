"""Persistência local para a versão desktop."""

from __future__ import annotations

import json
import uuid
from pathlib import Path

DADOS_PATH = Path(__file__).parent / "dados_sorteio.json"


def estado_padrao() -> dict:
    evento_id = str(uuid.uuid4())
    return {
        "evento_ativo": evento_id,
        "tema": "dark",
        "eventos": {
            evento_id: {
                "nome": "Evento principal",
                "pilotos": [],
                "karts": [],
                "karts_excluidos": [],
            }
        },
        "historico": [],
    }


def carregar() -> dict:
    if not DADOS_PATH.exists():
        return estado_padrao()
    try:
        with DADOS_PATH.open(encoding="utf-8") as arquivo:
            dados = json.load(arquivo)
        if "eventos" not in dados:
            return estado_padrao()
        return dados
    except (json.JSONDecodeError, OSError):
        return estado_padrao()


def salvar(dados: dict) -> None:
    with DADOS_PATH.open("w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)

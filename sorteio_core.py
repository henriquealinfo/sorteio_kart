"""Lógica compartilhada de validação e sorteio."""

from __future__ import annotations

import random
from datetime import datetime


def ler_linhas(texto: str) -> list[str]:
    return [line.strip() for line in texto.splitlines() if line.strip()]


def encontrar_duplicados(itens: list[str]) -> list[str]:
    contagem: dict[str, int] = {}
    for item in itens:
        contagem[item] = contagem.get(item, 0) + 1
    return [item for item, quantidade in contagem.items() if quantidade > 1]


def corrigir_nome(nome: str) -> str:
    correcoes = {
        "Joao": "João",
        "Jose": "José",
        "Antonio": "Antônio",
        "Luiz": "Luís",
        "Andre": "André",
        "Lucia": "Lúcia",
        "Fabricio": "Fabrício",
        "Rodrigo": "Rodrigo",
        "Conceicao": "Conceição",
        "Sebastiao": "Sebastião",
    }
    for errado, certo in correcoes.items():
        if nome == errado:
            return certo
        if nome.startswith(errado + " "):
            return certo + nome[len(errado) :]
    return nome


def aplicar_correcoes_nomes(pilotos: list[str]) -> list[str]:
    return [corrigir_nome(p) for p in pilotos]


def karts_disponiveis(
    karts: list[str],
    excluidos: list[str],
    atribuicoes: list[tuple[str, str]] | None = None,
) -> list[str]:
    em_uso = {kart for _, kart in (atribuicoes or [])}
    bloqueados = set(excluidos)
    return [kart for kart in karts if kart not in bloqueados and kart not in em_uso]


def karts_disponiveis_repescagem(
    karts: list[str],
    excluidos: list[str],
    atribuicoes: list[tuple[str, str]],
    pilotos_selecionados: list[str],
) -> list[str]:
    selecionados = set(pilotos_selecionados)
    em_uso = {kart for piloto, kart in atribuicoes if piloto not in selecionados}
    bloqueados = set(excluidos)
    return [kart for kart in karts if kart not in bloqueados and kart not in em_uso]


def validar_repescagem(
    pilotos: list[str],
    karts: list[str],
    excluidos: list[str],
    atribuicoes: list[tuple[str, str]],
    pilotos_selecionados: list[str],
) -> tuple[bool, str, list[str]]:
    ok, erro, _ = validar_sorteio(pilotos, karts, excluidos)
    if not ok:
        return ok, erro, []

    if not pilotos_selecionados:
        return False, "Selecione pelo menos um piloto.", []

    disponiveis = karts_disponiveis_repescagem(karts, excluidos, atribuicoes, pilotos_selecionados)
    if len(pilotos_selecionados) > len(disponiveis):
        return (
            False,
            f"Há {len(pilotos_selecionados)} piloto(s) na repescagem e apenas "
            f"{len(disponiveis)} kart(s) disponível(is).",
            [],
        )

    return True, "", disponiveis


def validar_sorteio(
    pilotos: list[str],
    karts: list[str],
    excluidos: list[str] | None = None,
    pilotos_alvo: list[str] | None = None,
) -> tuple[bool, str, list[str]]:
    alvo = pilotos_alvo or pilotos
    excluidos = excluidos or []

    if not pilotos:
        return False, "Informe pelo menos um piloto.", []

    if not karts:
        return False, "Informe pelo menos um kart.", []

    duplicados_pilotos = encontrar_duplicados(pilotos)
    if duplicados_pilotos:
        return (
            False,
            f"Os seguintes pilotos estão repetidos: {', '.join(duplicados_pilotos)}.",
            [],
        )

    duplicados_karts = encontrar_duplicados(karts)
    if duplicados_karts:
        return (
            False,
            f"Os seguintes karts estão repetidos: {', '.join(duplicados_karts)}.",
            [],
        )

    disponiveis = karts_disponiveis(karts, excluidos)
    if not disponiveis:
        return False, "Nenhum kart disponível após exclusões.", []

    if len(alvo) > len(disponiveis):
        return (
            False,
            f"Há {len(alvo)} piloto(s) para sortear e apenas {len(disponiveis)} kart(s) disponível(is).",
            [],
        )

    for piloto in alvo:
        if piloto not in pilotos:
            return False, f"Piloto não encontrado na lista: {piloto}", []

    return True, "", disponiveis


def gerar_seed() -> int:
    return random.randint(100000, 999999)


def embaralhar_com_seed(itens: list[str], seed: int) -> list[str]:
    rng = random.Random(seed)
    copia = itens.copy()
    rng.shuffle(copia)
    return copia


def realizar_sorteio(
    pilotos: list[str],
    karts_disponiveis_lista: list[str],
    seed: int | None = None,
    pilotos_alvo: list[str] | None = None,
) -> tuple[list[tuple[str, str]], int]:
    alvo = pilotos_alvo or pilotos
    seed_usado = seed if seed is not None else gerar_seed()
    karts_embaralhados = embaralhar_com_seed(karts_disponiveis_lista, seed_usado)
    atribuicoes = list(zip(alvo, karts_embaralhados[: len(alvo)]))
    return atribuicoes, seed_usado


def mesclar_atribuicoes(
    anteriores: list[tuple[str, str]],
    novas: list[tuple[str, str]],
) -> list[tuple[str, str]]:
    novos_pilotos = {piloto for piloto, _ in novas}
    mantidos = [(p, k) for p, k in anteriores if p not in novos_pilotos]
    return mantidos + novas


def formatar_data_hora() -> str:
    return datetime.now().strftime("%d/%m/%Y %H:%M")


def mensagem_karts_minimos(quantidade_pilotos: int) -> str:
    return (
        f"Total de {quantidade_pilotos} piloto(s) na lista. "
        f"Adicione no mínimo {quantidade_pilotos} kart(s) para realizar o sorteio."
    )


def formatar_mensagem_whatsapp(
    atribuicoes: list[tuple[str, str]],
    seed: int | None = None,
    evento: str | None = None,
) -> str:
    titulo = "🏁 *Resultado do Sorteio de Kart*"
    if evento:
        titulo += f" — {evento}"
    titulo += f"\n📅 {formatar_data_hora()}"
    if seed is not None:
        titulo += f"\n🔑 Código de auditoria: `{seed}`"

    linhas = [f"• {piloto} → Kart {kart}" for piloto, kart in atribuicoes]
    return f"{titulo}\n\n" + "\n".join(linhas)


def parse_csv_conteudo(conteudo: str) -> list[str]:
    itens: list[str] = []
    for linha in conteudo.splitlines():
        linha = linha.strip()
        if not linha:
            continue
        if "," in linha:
            parte = linha.split(",")[0].strip().strip('"')
            if parte:
                itens.append(parte)
        elif ";" in linha:
            parte = linha.split(";")[0].strip().strip('"')
            if parte:
                itens.append(parte)
        else:
            itens.append(linha)
    return aplicar_correcoes_nomes(itens)

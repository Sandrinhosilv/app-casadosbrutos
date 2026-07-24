from pathlib import Path

PASTA_RAIZ = Path.cwd()

IGNORAR = {
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    ".vercel",
    ".turbo",
    "coverage",
    "__pycache__",
    ".idea",
    ".vscode",
}

ARQUIVO_SAIDA = PASTA_RAIZ / "estrutura-projeto.txt"


def gerar_estrutura(pasta: Path, prefixo: str = "") -> list[str]:
    itens = sorted(
        [
            item
            for item in pasta.iterdir()
            if item.name not in IGNORAR
            and item.name != ARQUIVO_SAIDA.name
        ],
        key=lambda item: (item.is_file(), item.name.lower()),
    )

    linhas = []

    for indice, item in enumerate(itens):
        ultimo = indice == len(itens) - 1
        conector = "└── " if ultimo else "├── "

        linhas.append(f"{prefixo}{conector}{item.name}")

        if item.is_dir():
            novo_prefixo = prefixo + ("    " if ultimo else "│   ")

            try:
                linhas.extend(gerar_estrutura(item, novo_prefixo))
            except PermissionError:
                linhas.append(f"{novo_prefixo}└── [SEM PERMISSÃO]")

    return linhas


def main():
    linhas = [
        f"Projeto: {PASTA_RAIZ.name}",
        f"Caminho: {PASTA_RAIZ}",
        "",
    ]

    linhas.extend(gerar_estrutura(PASTA_RAIZ))

    ARQUIVO_SAIDA.write_text(
        "\n".join(linhas),
        encoding="utf-8",
    )

    print(f"Estrutura salva em: {ARQUIVO_SAIDA}")


if __name__ == "__main__":
    main()
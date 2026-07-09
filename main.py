import random
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from ocr_utils import extrair_pilotos_da_area_transferencia, extrair_pilotos_de_arquivo


class SorteioKartApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Sorteio de Kart")
        self.root.geometry("900x600")
        self.root.minsize(800, 500)

        self._build_ui()

    def _build_ui(self) -> None:
        main = ttk.Frame(self.root, padding=16)
        main.pack(fill=tk.BOTH, expand=True)

        title = ttk.Label(
            main,
            text="Sorteio de Pilotos x Karts",
            font=("Segoe UI", 18, "bold"),
        )
        title.pack(anchor=tk.W, pady=(0, 12))

        subtitle = ttk.Label(
            main,
            text="Informe um piloto ou número de kart por linha. O sorteio embaralha e atribui um kart para cada piloto.",
            wraplength=860,
        )
        subtitle.pack(anchor=tk.W, pady=(0, 16))

        columns = ttk.Frame(main)
        columns.pack(fill=tk.BOTH, expand=True)

        self._build_list_panel(columns, "Pilotos", "pilotos", side=tk.LEFT, com_ocr=True)
        self._build_list_panel(columns, "Karts", "karts", side=tk.RIGHT)

        actions = ttk.Frame(main)
        actions.pack(fill=tk.X, pady=16)

        ttk.Button(actions, text="Sortear", command=self._sortear).pack(side=tk.LEFT)
        ttk.Button(actions, text="Limpar tudo", command=self._limpar).pack(side=tk.LEFT, padx=8)

        result_frame = ttk.LabelFrame(main, text="Resultado do sorteio", padding=12)
        result_frame.pack(fill=tk.BOTH, expand=True)

        self.result_tree = ttk.Treeview(
            result_frame,
            columns=("piloto", "kart"),
            show="headings",
            height=10,
        )
        self.result_tree.heading("piloto", text="Piloto")
        self.result_tree.heading("kart", text="Kart")
        self.result_tree.column("piloto", width=350, anchor=tk.W)
        self.result_tree.column("kart", width=120, anchor=tk.CENTER)

        scrollbar = ttk.Scrollbar(result_frame, orient=tk.VERTICAL, command=self.result_tree.yview)
        self.result_tree.configure(yscrollcommand=scrollbar.set)

        self.result_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.status = ttk.Label(main, text="Pronto para sortear.")
        self.status.pack(anchor=tk.W, pady=(8, 0))

    def _build_list_panel(
        self,
        parent: ttk.Frame,
        title: str,
        attr: str,
        side: str,
        com_ocr: bool = False,
    ) -> None:
        frame = ttk.LabelFrame(parent, text=title, padding=12)
        frame.pack(side=side, fill=tk.BOTH, expand=True, padx=(0, 8) if side == tk.LEFT else (8, 0))

        text = tk.Text(frame, height=12, font=("Segoe UI", 11), wrap=tk.WORD)
        text.pack(fill=tk.BOTH, expand=True)
        setattr(self, f"{attr}_text", text)

        if com_ocr:
            ocr_actions = ttk.Frame(frame)
            ocr_actions.pack(fill=tk.X, pady=(8, 0))

            ttk.Button(
                ocr_actions,
                text="Ler print da área de transferência",
                command=self._importar_pilotos_da_area_transferencia,
            ).pack(side=tk.LEFT)

            ttk.Button(
                ocr_actions,
                text="Ler print de arquivo",
                command=self._importar_pilotos_de_arquivo,
            ).pack(side=tk.LEFT, padx=8)

            hint = ttk.Label(
                frame,
                text="Dica: use Win+Shift+S para capturar a lista e depois clique em \"Ler print da área de transferência\".",
                foreground="gray",
                wraplength=380,
            )
        else:
            hint = ttk.Label(frame, text="Um item por linha", foreground="gray")

        hint.pack(anchor=tk.W, pady=(6, 0))

    def _ler_linhas(self, text_widget: tk.Text) -> list[str]:
        raw = text_widget.get("1.0", tk.END)
        return [line.strip() for line in raw.splitlines() if line.strip()]

    def _sortear(self) -> None:
        pilotos = self._ler_linhas(self.pilotos_text)
        karts = self._ler_linhas(self.karts_text)

        if not pilotos:
            messagebox.showwarning("Atenção", "Informe pelo menos um piloto.")
            return

        if not karts:
            messagebox.showwarning("Atenção", "Informe pelo menos um kart.")
            return

        if len(pilotos) > len(karts):
            messagebox.showerror(
                "Erro",
                f"Há {len(pilotos)} pilotos e apenas {len(karts)} karts.\n"
                "Adicione mais karts ou remova pilotos.",
            )
            return

        karts_embaralhados = karts.copy()
        random.shuffle(karts_embaralhados)
        atribuicoes = list(zip(pilotos, karts_embaralhados[: len(pilotos)]))

        self._exibir_resultado(atribuicoes)

        karts_sobrando = len(karts) - len(pilotos)
        if karts_sobrando > 0:
            self.status.config(
                text=f"Sorteio concluído: {len(pilotos)} piloto(s) atribuído(s). "
                f"{karts_sobrando} kart(s) ficaram sem uso."
            )
        else:
            self.status.config(text=f"Sorteio concluído: {len(pilotos)} piloto(s) atribuído(s).")

    def _exibir_resultado(self, atribuicoes: list[tuple[str, str]]) -> None:
        for item in self.result_tree.get_children():
            self.result_tree.delete(item)

        for piloto, kart in atribuicoes:
            self.result_tree.insert("", tk.END, values=(piloto, kart))

    def _limpar(self) -> None:
        self.pilotos_text.delete("1.0", tk.END)
        self.karts_text.delete("1.0", tk.END)

        for item in self.result_tree.get_children():
            self.result_tree.delete(item)

        self.status.config(text="Listas e resultado limpos.")

    def _importar_pilotos_de_arquivo(self) -> None:
        caminho = filedialog.askopenfilename(
            title="Selecione o print da lista de pilotos",
            filetypes=[
                ("Imagens", "*.png *.jpg *.jpeg *.bmp *.webp *.gif *.tif *.tiff"),
                ("Todos os arquivos", "*.*"),
            ],
        )
        if not caminho:
            return

        self._executar_ocr(
            "Lendo imagem...",
            lambda: extrair_pilotos_de_arquivo(caminho),
        )

    def _importar_pilotos_da_area_transferencia(self) -> None:
        self._executar_ocr(
            "Lendo print da área de transferência...",
            extrair_pilotos_da_area_transferencia,
        )

    def _executar_ocr(self, mensagem_status: str, funcao_ocr) -> None:
        self.status.config(text=mensagem_status)
        self.root.config(cursor="watch")
        self.root.update_idletasks()

        def tarefa() -> None:
            try:
                pilotos = funcao_ocr()
            except ValueError as erro:
                self.root.after(0, lambda: self._falha_ocr(str(erro)))
                return
            except Exception:
                self.root.after(
                    0,
                    lambda: self._falha_ocr(
                        "Não foi possível ler o texto da imagem. Tente outro print ou adicione os nomes manualmente."
                    ),
                )
                return

            self.root.after(0, lambda: self._finalizar_ocr(pilotos))

        threading.Thread(target=tarefa, daemon=True).start()

    def _falha_ocr(self, mensagem: str) -> None:
        self.root.config(cursor="")
        self.status.config(text="Falha ao ler o print.")
        messagebox.showerror("Erro ao ler print", mensagem)

    def _finalizar_ocr(self, pilotos: list[str]) -> None:
        self.root.config(cursor="")

        if not pilotos:
            self.status.config(text="Nenhum piloto identificado no print.")
            messagebox.showwarning(
                "Nenhum piloto encontrado",
                "Não foi possível identificar nomes na imagem.\n"
                "Tente um print mais nítido ou edite a lista manualmente.",
            )
            return

        self._mostrar_preview_pilotos(pilotos)

    def _mostrar_preview_pilotos(self, pilotos: list[str]) -> None:
        janela = tk.Toplevel(self.root)
        janela.title("Confirmar pilotos lidos do print")
        janela.geometry("480x420")
        janela.transient(self.root)
        janela.grab_set()

        ttk.Label(
            janela,
            text=f"Foram encontrados {len(pilotos)} piloto(s). Revise e confirme antes de adicionar.",
            wraplength=440,
        ).pack(anchor=tk.W, padx=16, pady=(16, 8))

        texto = tk.Text(janela, height=14, font=("Segoe UI", 11))
        texto.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 8))
        texto.insert("1.0", "\n".join(pilotos))

        modo = tk.StringVar(value="substituir")
        opcoes = ttk.Frame(janela)
        opcoes.pack(fill=tk.X, padx=16, pady=(0, 8))
        ttk.Radiobutton(opcoes, text="Substituir lista atual", variable=modo, value="substituir").pack(anchor=tk.W)
        ttk.Radiobutton(opcoes, text="Adicionar à lista atual", variable=modo, value="adicionar").pack(anchor=tk.W)

        botoes = ttk.Frame(janela)
        botoes.pack(fill=tk.X, padx=16, pady=(0, 16))

        def confirmar() -> None:
            linhas = [line.strip() for line in texto.get("1.0", tk.END).splitlines() if line.strip()]
            if not linhas:
                messagebox.showwarning("Atenção", "Informe pelo menos um piloto.", parent=janela)
                return

            if modo.get() == "substituir":
                self.pilotos_text.delete("1.0", tk.END)
                self.pilotos_text.insert("1.0", "\n".join(linhas) + "\n")
            else:
                atual = self.pilotos_text.get("1.0", tk.END).strip()
                novos = "\n".join(linhas)
                conteudo = f"{atual}\n{novos}\n" if atual else f"{novos}\n"
                self.pilotos_text.delete("1.0", tk.END)
                self.pilotos_text.insert("1.0", conteudo)

            self.status.config(text=f"{len(linhas)} piloto(s) importado(s) do print.")
            janela.destroy()

        ttk.Button(botoes, text="Confirmar", command=confirmar).pack(side=tk.RIGHT)
        ttk.Button(botoes, text="Cancelar", command=janela.destroy).pack(side=tk.RIGHT, padx=8)


def main() -> None:
    root = tk.Tk()
    SorteioKartApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()

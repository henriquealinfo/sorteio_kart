# Sorteio de Kart

Aplicativo para sortear a atribuição de karts aos pilotos de forma aleatória, com suporte a importação por OCR, múltiplos eventos, histórico e exportação para WhatsApp.

| Versão | Pasta | Uso |
|--------|-------|-----|
| **Desktop** | `main.py` | Windows com interface gráfica (Tkinter) |
| **PWA** | `pwa/` | Navegador e celular (instalável na tela inicial) |

**Demo online:** [henriquealinfo.github.io/sorteio_kart](https://henriquealinfo.github.io/sorteio_kart/)

---

## Funcionalidades

### Sorteio
- Atribuição aleatória 1 piloto → 1 kart
- Validação de **pilotos duplicados**
- Validação de **karts duplicados**
- **Karts indisponíveis** (excluídos do sorteio)
- **Código de auditoria** (seed) em cada sorteio
- **Repescagem** para pilotos selecionados
- **Histórico** dos últimos 50 sorteios

### Importação de pilotos
- Digitação manual
- **OCR** por foto/print (câmera, galeria ou arquivo)
- Ajuste de **brilho e contraste** antes do OCR (PWA)
- **Colar lista** de texto
- Importação **CSV** e **Excel**
- Correção automática de nomes comuns (Joao → João)
- Aviso da **quantidade mínima de karts** após importar

### Exportação e apresentação
- **WhatsApp** com data/hora e código de auditoria
- **Imagem PNG** do resultado
- **Modo apresentação** (tela cheia para TV/projetor)

### Organização
- **Múltiplos eventos** salvos (ex.: Corrida 1, Corrida 2)
- **Salvamento automático** das listas
- **Tema claro/escuro**

---

## Regras do sorteio

- Pelo menos **1 piloto** e **1 kart**
- Pilotos e karts devem ser **únicos** (sem repetição)
- Pilotos ≤ karts disponíveis (total menos excluídos)
- Karts excluídos não entram no sorteio
- Karts extras ficam sem uso se sobrar

---

## Versão desktop

### Instalação

```bash
pip install -r requirements.txt
python main.py
```

### Dependências

| Pacote | Uso |
|--------|-----|
| `clipocr` | OCR de prints |
| `pillow` | Imagens e exportação PNG |
| `openpyxl` | Importar Excel (opcional) |

Dados salvos em `dados_sorteio.json` na pasta do projeto.

---

## Versão PWA (celular)

### Testar localmente

```bash
cd pwa
python -m http.server 8080
```

### Publicar no GitHub Pages

1. Envie o código para um repositório **público** no GitHub
2. **Settings → Pages → Source:** GitHub Actions
3. Aguarde o workflow **Deploy PWA no GitHub Pages**
4. Acesse `https://SEU_USUARIO.github.io/NOME_DO_REPO/`

```bash
git add .
git commit -m "Atualizar app"
git push
```

### Instalar no celular

- **Android:** Chrome → ⋮ → Instalar app
- **iPhone:** Safari → Compartilhar → Adicionar à Tela de Início

---

## Estrutura do projeto

```
Sorteio_kart/
├── main.py                 # App desktop
├── sorteio_core.py         # Lógica compartilhada (validação, seed, WhatsApp)
├── storage_desktop.py      # Persistência JSON (desktop)
├── ocr_utils.py            # OCR desktop
├── requirements.txt
├── dados_sorteio.json      # Dados salvos (desktop, gerado automaticamente)
├── pwa/
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js
│   ├── css/styles.css
│   └── js/
│       ├── core.js         # Lógica do sorteio
│       ├── storage.js      # localStorage + eventos
│       ├── export.js       # WhatsApp e imagem
│       ├── ocr.js          # OCR com ajustes
│       └── app.js          # Interface
└── .github/workflows/
    └── deploy-pages.yml
```

---

## Exemplo

**Pilotos:** João, Maria, Pedro  
**Karts:** 1, 2, 3, 4  
**Excluídos:** 4 (kart quebrado)

| Piloto | Kart |
|--------|------|
| João   | 2    |
| Maria  | 1    |
| Pedro  | 3    |

---

## Licença

Uso livre para fins pessoais e eventos de kart.

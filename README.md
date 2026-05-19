# Obsidian Emoji Title Plugin

Este é um plugin para o [Obsidian](https://obsidian.md) que adiciona automaticamente emojis aos títulos de notas e pastas no explorador de arquivos (*File Explorer*), bem como nas abas de navegação ativas.

A resolução do emoji é feita de forma inteligente com base no frontmatter da nota, na herança da pasta pai ou na extensão do arquivo.

---

## 🚀 Funcionalidades

1. **Emojis em Títulos e Abas:** Exibe emojis correspondentes ao arquivo tanto na barra lateral quanto no topo da aba aberta.
2. **Resolução Inteligente de Emojis:** A escolha de qual emoji exibir segue uma ordem de prioridade específica:
   * **Frontmatter:** Verifica se a nota possui os campos `emoji` ou `icon` definidos no metadado (YAML frontmatter).
   * **Herança de Pastas:** Pastas com notas de pasta (*Folder Notes*) configuradas com `apply_to_children: true` (ou `inherit_emoji: true`) transmitem seu emoji recursivamente para todos os arquivos e subpastas internos.
   * **Extensões de Arquivos:** Caso nenhum emoji seja especificado, o plugin atribui um emoji padrão com base no tipo de arquivo (Markdown, Canvas, Imagem, PDF, Planilhas, etc.).
3. **Folder Notes Automáticas:** Criação e sincronização automática de notas de pastas para gerenciar metadados de diretórios de forma limpa.
4. **Prevenção de Glitches no Rename:** Sistema inteligente que detecta quando um arquivo ou pasta está sendo renomeado na barra lateral, suspendendo a injeção do emoji no DOM para impedir que o Obsidian capture o emoji como parte do novo nome do arquivo.
5. **Debounce de Renderização:** Otimizado com `requestAnimationFrame` para evitar lentidão e sobrecarga no processamento visual em cofres muito grandes.

---

## 🛠️ Estrutura do Projeto

O código do plugin foi modularizado a partir do `main.ts` inicial para facilitar a manutenção e legibilidade:

```
├── main.ts               # Ponto de entrada do plugin (registro de comandos, eventos e ciclo de vida)
├── manifest.json         # Metadados e identificação do plugin no Obsidian
├── styles.css            # Estilos CSS necessários para a renderização correta
├── esbuild.config.mjs    # Configuração de empacotamento do esbuild
├── package.json          # Dependências do projeto e scripts de compilação
└── src/                  # Módulos especializados
    ├── emoji-resolver.ts # Lógica de prioridade e herança para definição dos emojis
    ├── folder-notes.ts   # Criação, sincronização e gerenciamento de notas de pasta
    ├── modal.ts          # Modal interativo de seleção de emojis
    ├── settings.ts       # Esquema de configurações e aba de preferências do usuário
    ├── types.ts          # Definições de tipos e extensões da API interna do Obsidian
    └── ui-updater.ts     # Manipulação do DOM para injeção de emojis na interface
```

---

## ⚙️ Configurações Disponíveis

Na aba de configurações do plugin, você pode personalizar:
* **Auto-criar Folder Notes:** Cria automaticamente uma nota de pasta correspondente sempre que uma nova pasta for criada.
* **Emojis Padrão por Tipo:**
  * Pastas (`📁`)
  * Markdown (`🗒️`)
  * Canvas (`🎨`)
  * Bases de Dados/Dataview (`📊`)
  * Imagens (`🖼️`)
  * PDFs (`📄`)
  * Planilhas (`📈`)
  * Documentos e Outros formatos
* **Personalização de Ícones:** Modificar rapidamente os fallbacks padrão.

---

## 💻 Desenvolvimento Local e Compilação

### Requisitos
* [Node.js](https://nodejs.org/) instalado.

### Passos para Compilar
1. Instale as dependências do projeto:
   ```bash
   npm install
   ```

2. Compile o plugin:
   ```bash
   npm run build
   ```

> [!NOTE]  
> O script de `build` está configurado para copiar o arquivo final empacotado (`main.js`), o `manifest.json` e o `styles.css` diretamente para a pasta de desenvolvimento de plugins do seu cofre local do Obsidian:
> `~/obsidian/Cofre de Artur Tupiassu/.obsidian/plugins/emoji-title-plugin/`

---

## 📜 Licença

Este projeto é disponibilizado sob a licença MIT.

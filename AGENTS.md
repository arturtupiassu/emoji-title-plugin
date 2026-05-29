# AI Agents Context & Guidelines

Bem-vindo(a) ao repositório do **Emoji Title Plugin** para Obsidian. Este documento serve como memória, contexto e guia de boas práticas para qualquer agente de IA operando neste repositório (Antigravity/Gemini, GitHub Copilot, Cursor, Claude, etc.).

Sempre leia este arquivo antes de propor mudanças arquiteturais ou de infraestrutura.

## 1. Contexto do Projeto
- **Nome:** Emoji Title
- **Ambiente:** Plugin para o Obsidian (Desktop e Mobile).
- **Linguagem Principal:** TypeScript, empacotado usando o `esbuild`.
- **Propósito:** Adicionar emojis do frontmatter aos títulos no Explorador de Arquivos e nas Abas do Obsidian, com suporte à herança de pastas.

## 2. Padrões de Segurança (Security Guidelines)

A segurança é levada muito a sério neste projeto. Alterações no DOM ou em rotinas de CI/CD exigem atenção redobrada.

### 2.1. Manipulação de DOM e Injeção de Dados (Frontmatter)
- Valores vindos do Obsidian Metadata (frontmatter) não são confiáveis por padrão. Eles podem conter textos massivos ou objetos anômalos.
- **Sempre** converta explicitamente qualquer valor lido para `string`, apare (`trim()`) e aplique limites de tamanho restritivos (ex: truncar em 20 caracteres) antes de injetá-los no DOM.
- Não permita que exceções como `.toString()` quebrem a árvore de atualização do UI.

### 2.2. CI/CD (GitHub Actions)
> [!TIP]
> **Pinning de Actions:** Em futuros updates ou adições de Actions na pipeline (`.github/workflows`), mantenha sempre a prática de fixar as versões por **commit SHA imutável**.
> Você pode descobrir o SHA de uma tag executando: `git ls-remote https://github.com/OWNER/REPO.git refs/tags/TAG_DESEJADA`
> Exemplo: `uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4`

- **Separação de Privilégios:** O processo de publicação (`release.yml`) divide o `build` (que executa `npm ci` sem privilégios para evitar sequestro de tokens via scripts de instalação de dependências) do processo de `release` (com os tokens de permissão para atestação e publicação no GitHub).
- **Validação:** Qualquer disparo de trigger de tag no fluxo de release deve ser validado contra o valor explicitado no `manifest.json`.

## 3. Padrões de Código
- Favoreça **funções puras** e exportáveis (como visto em `emoji-resolver.ts`) para facilitar os testes automatizados em Jest.
- Evite espalhar seletores CSS `querySelectorAll` desnecessariamente pelo código. Se precisar lidar com elementos do Obsidian UI, faça-o de forma otimizada para evitar repaints onerosos.

## 4. Memória de Bugs Resolvidos e Histórico
- **XSS via Atributos / Frontmatter Massivo:** Anteriormente resolvido pela injeção segura limitando grafemas no `setAttribute('data-emoji')` em `ui-updater.ts`.
- **Scripts de NPM em CI de Release:** Evitado migrando de um monojob de build+release para jobs separados e atestados.

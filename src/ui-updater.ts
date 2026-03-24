import { App, TFile } from 'obsidian';
import type { EmojiTitleSettings } from './settings';
import { resolveFolderNote, isFolderNote } from './folder-notes';
import { getFileEmoji, resolveInheritedEmoji } from './emoji-resolver';
import { ObsidianLeafInternal, ObsidianViewInternal } from './types';

/**
 * Insere (ou atualiza) o span de emoji em um elemento de navegação.
 * Remove spans antigos primeiro para evitar duplicação.
 * Usa `data-emoji` + CSS `::before` para que o emoji não seja capturado
 * pelo mecanismo de rename do Obsidian.
 */
export function applyEmojiToNav(
    navEl: Element,
    emoji: string | null | undefined,
    contentSelector: string
): void {
    // Não mexe no DOM se estiver sendo renomeado para não quebrar o input do Obsidian
    if (navEl.classList.contains('is-being-renamed')) return;

    // Remove todos os spans de emoji existentes
    navEl.querySelectorAll('.emoji-title-plugin-span').forEach(span => span.remove());

    const titleContent = contentSelector ? navEl.querySelector(contentSelector) : navEl;
    if (titleContent && emoji) {
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'emoji-title-plugin-span';
        emojiSpan.setAttribute('data-emoji', emoji);
        titleContent.prepend(emojiSpan);
    }
}

/**
 * Atualiza os emojis de todos os itens do explorador de arquivos (nav).
 */
export function updateAllFileExplorers(app: App, settings: EmojiTitleSettings): void {
    // Arquivos
    document.querySelectorAll('.nav-file-title').forEach((navEl) => {
        const path = navEl.getAttribute('data-path');
        if (!path) return;

        const abstractFile = app.vault.getAbstractFileByPath(path);
        if (!(abstractFile instanceof TFile)) return;

        // Marcação visual de folder note
        if (abstractFile.extension === 'md') {
            const isFN = isFolderNote(app.vault, abstractFile);
            navEl.parentElement?.classList.toggle('emoji-title-folder-note', isFN);
        }

        const emoji = getFileEmoji(abstractFile, app, settings);
        applyEmojiToNav(navEl, emoji, '.nav-file-title-content');
    });

    // Pastas
    document.querySelectorAll('.nav-folder-title').forEach((navEl) => {
        const path = navEl.getAttribute('data-path');
        if (!path || path === '/') return;

        const emoji = resolveFolderEmoji(path, app, settings);
        applyEmojiToNav(navEl, emoji, '.nav-folder-title-content');
    });
}

/**
 * Resolve o emoji a exibir para uma pasta. Prioridade:
 *  1. Emoji da folder note própria da pasta
 *  2. Emoji herdado de uma pasta superior (recursivo)
 *  3. Emoji padrão de pasta das configurações
 */
function resolveFolderEmoji(folderPath: string, app: App, settings: EmojiTitleSettings): string | null {
    // 1. Folder note própria
    const ownNote = resolveFolderNote(app.vault, folderPath);
    if (ownNote) {
        const cache = app.metadataCache.getFileCache(ownNote);
        const emoji = cache?.frontmatter?.emoji || cache?.frontmatter?.icon;
        if (emoji) return emoji;
    }

    // 2. Herança recursiva
    const inheritedEmoji = resolveInheritedEmoji(folderPath, app);
    if (inheritedEmoji) return inheritedEmoji;

    // 3. Fallback padrão de pasta
    return settings.defaultFolderEmoji || null;
}

/** Seletores de título de aba que o Obsidian usa (em ordem de preferência). */
const TAB_TITLE_SELECTORS = [
    '.tab-header-title',
    '.tab-header-title-content',
    '.tab-header-title-text',
    '.workspace-tab-header-inner-title',
];

/**
 * Atualiza os emojis nos títulos de todas as abas abertas.
 */
export function updateAllTabTitles(app: App, settings: EmojiTitleSettings): void {
    app.workspace.iterateAllLeaves((leaf) => {
        const view = leaf.view;
        const file = (view as unknown as ObsidianViewInternal).file;
        if (!(file instanceof TFile)) return;

        const emoji = getFileEmoji(file, app, settings);

        // 1. Título no cabeçalho do editor (breadcrumb/title pane)
        const headerTitle = view.containerEl.querySelector('.view-header-title');
        if (headerTitle) {
            applyEmojiToNav(headerTitle, emoji, '');
        }

        // 2. Título da aba
        const leafInternal = leaf as unknown as ObsidianLeafInternal;
        const tabHeaderEl = leafInternal.tabHeaderEl || leafInternal.tabHeaderInnerEl;
        if (!tabHeaderEl) return;

        for (const selector of TAB_TITLE_SELECTORS) {
            const tabTitleEl = tabHeaderEl.querySelector(selector);
            if (tabTitleEl) {
                applyEmojiToNav(tabTitleEl, emoji, '');
                break; // Apenas o primeiro seletor que encontrar
            }
        }
    });
}

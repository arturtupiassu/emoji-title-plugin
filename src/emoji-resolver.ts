import { App, TFile } from 'obsidian';
import type { EmojiTitleSettings } from './settings';
import { resolveFolderNote } from './folder-notes';

/**
 * Mapeamento de extensão de arquivo → chave de settings correspondente.
 * Centraliza a lógica que antes era uma cascata de else-if.
 */
const EXTENSION_EMOJI_SETTING: Partial<Record<string, keyof EmojiTitleSettings>> = {
    canvas: 'defaultCanvasEmoji',
    base:   'defaultBaseEmoji',
    pdf:    'defaultPDFEmoji',
    // Imagens
    png:    'defaultImageEmoji',
    jpg:    'defaultImageEmoji',
    jpeg:   'defaultImageEmoji',
    gif:    'defaultImageEmoji',
    svg:    'defaultImageEmoji',
    webp:   'defaultImageEmoji',
    // Planilhas
    xlsx:   'defaultSpreadsheetEmoji',
    xls:    'defaultSpreadsheetEmoji',
    csv:    'defaultSpreadsheetEmoji',
    ods:    'defaultSpreadsheetEmoji',
    // Documentos
    docx:   'defaultDocumentEmoji',
    doc:    'defaultDocumentEmoji',
    txt:    'defaultDocumentEmoji',
    rtf:    'defaultDocumentEmoji',
    // Mídia
    mp3:    'defaultMediaEmoji',
    wav:    'defaultMediaEmoji',
    m4a:    'defaultMediaEmoji',
    mp4:    'defaultMediaEmoji',
    mov:    'defaultMediaEmoji',
    mkv:    'defaultMediaEmoji',
};

/**
 * Função pura: retorna o emoji padrão para uma extensão de arquivo.
 * Não depende da instância do plugin — facilmente testável.
 */
export function getEmojiByExtension(ext: string, settings: EmojiTitleSettings): string | null {
    const key = EXTENSION_EMOJI_SETTING[ext.toLowerCase()];
    return key ? (settings[key] as string) || null : null;
}

/**
 * Resolve o emoji a exibir para um arquivo. Prioridade:
 *  1. Frontmatter `emoji` / `icon` do próprio arquivo (apenas .md)
 *  2. Herança: frontmatter da nota de pasta pai com `apply_to_children` / `inherit_emoji`
 *  3. Emoji padrão por tipo de arquivo (settings)
 */
export function getFileEmoji(
    file: TFile,
    app: App,
    settings: EmojiTitleSettings
): string | null {
    // 1. Frontmatter do próprio arquivo
    if (file.extension === 'md') {
        const cache = app.metadataCache.getFileCache(file);
        const emoji = cache?.frontmatter?.emoji || cache?.frontmatter?.icon;
        if (emoji) return emoji;
    }

    // 2. Herança de emoji da pasta pai
    const inheritedEmoji = resolveInheritedEmoji(file.path, app);
    if (inheritedEmoji) return inheritedEmoji;

    // 3. Fallback por extensão
    if (file.extension === 'md') {
        return settings.defaultMarkdownEmoji || null;
    }
    return getEmojiByExtension(file.extension, settings);
}

/**
 * Tenta obter um emoji herdado subindo na hierarquia de pastas.
 * Procura por uma nota de pasta que tenha `apply_to_children: true`.
 */
export function resolveInheritedEmoji(path: string, app: App): string | null {
    const parts = path.split('/');
    if (parts.length <= 1) return null;

    // Começamos do pai imediato e subimos até encontrar herança ou chegar na raiz
    for (let i = parts.length - 1; i > 0; i--) {
        const currentParentPath = parts.slice(0, i).join('/');
        const folderNote = resolveFolderNote(app.vault, currentParentPath);
        if (folderNote) {
            const cache = app.metadataCache.getFileCache(folderNote);
            const applyToChildren =
                cache?.frontmatter?.inherit_emoji ||
                cache?.frontmatter?.apply_to_children;

            if (applyToChildren) {
                const emoji = cache?.frontmatter?.emoji || cache?.frontmatter?.icon;
                if (emoji) return emoji;
            }
        }
    }

    return null;
}

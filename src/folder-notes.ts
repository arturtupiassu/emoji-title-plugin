import { App, TFile, TFolder, Vault } from 'obsidian';
import type { EmojiTitleSettings } from './settings';

/**
 * Encontra a nota de pasta associada a um caminho de pasta.
 * Procura tanto a nota "dentro" da pasta (ex: Projetos/Projetos.md)
 * quanto "fora" dela (ex: Projetos.md ao lado da pasta).
 */
export function resolveFolderNote(vault: Vault, folderPath: string): TFile | null {
    const parts = folderPath.split('/');
    const folderName = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    const insidePath  = `${folderPath}/${folderName}.md`;
    const outsidePath = parentPath ? `${parentPath}/${folderName}.md` : `${folderName}.md`;

    const inside  = vault.getAbstractFileByPath(insidePath);
    const outside = vault.getAbstractFileByPath(outsidePath);

    return (inside instanceof TFile)  ? inside
         : (outside instanceof TFile) ? outside
         : null;
}

/**
 * Retorna true se o arquivo é uma nota de pasta
 * (seu nome coincide com o nome da pasta pai ou da pasta irmã de mesmo nome).
 */
export function isFolderNote(vault: Vault, file: TFile): boolean {
    const parts = file.path.split('/');
    // Nota "dentro": Projetos/Projetos.md
    const isInsideFolderNote = parts.length > 1 && file.basename === parts[parts.length - 2];
    if (isInsideFolderNote) return true;

    // Nota "fora": existe uma pasta irmã com o mesmo nome
    if (parts.length > 1) {
        const siblingFolderPath = `${parts.slice(0, -1).join('/')}/${file.basename}`;
        return vault.getAbstractFileByPath(siblingFolderPath) instanceof TFolder;
    }
    return false;
}

/**
 * Cria a nota padrão de uma pasta com frontmatter de emoji e herança.
 */
export async function createDefaultFolderNote(
    vault: Vault,
    folder: TFolder,
    settings: EmojiTitleSettings
): Promise<void> {
    const notePath = `${folder.path}/${folder.name}.md`;
    const content = `---
apply_to_children: false
---
> [!info] Nota de Pasta (Folder Note)
> Esta nota foi criada automaticamente pelo plugin **Emoji Title**.
> Ela serve para guardar as configurações desta pasta (como o emoji e a herança dele para os arquivos contidos aqui).
> Sinta-se à vontade para escrever o conteúdo/resumo desta pasta logo abaixo!

`;
    try {
        const existing = vault.getAbstractFileByPath(notePath);
        if (!existing) {
            await vault.create(notePath, content);
        }
    } catch (e) {
        console.error('Emoji Title: failed to create automatic folder note', e);
    }
}

/**
 * Sincroniza a nota de pasta quando uma pasta é renomeada.
 * Renomeia a nota existente ou cria uma nova se não existir.
 */
export async function syncFolderNoteOnRename(
    app: App,
    folder: TFolder,
    oldPath: string,
    settings: EmojiTitleSettings
): Promise<void> {
    const oldName = oldPath.split('/').pop();
    const newName = folder.name;
    if (!oldName || oldName === newName) return;

    const oldNotePath = `${folder.path}/${oldName}.md`;
    const oldNote = app.vault.getAbstractFileByPath(oldNotePath);

    if (oldNote instanceof TFile) {
        const newNotePath = `${folder.path}/${newName}.md`;
        const existingNew = app.vault.getAbstractFileByPath(newNotePath);
        if (!existingNew) {
            await app.vault.rename(oldNote, newNotePath);
        }
    } else {
        await createDefaultFolderNote(app.vault, folder, settings);
    }
}

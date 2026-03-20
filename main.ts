import { Plugin, TFile, TFolder, Notice } from 'obsidian';

import { EmojiTitleSettings, DEFAULT_SETTINGS, EmojiTitleSettingTab } from './src/settings';
import { EmojiInputModal } from './src/modal';
import { createDefaultFolderNote, syncFolderNoteOnRename } from './src/folder-notes';
import { updateAllFileExplorers, updateAllTabTitles } from './src/ui-updater';

export default class EmojiTitlePlugin extends Plugin {
    settings: EmojiTitleSettings;

    private styleEl: HTMLStyleElement;
    private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    async onload() {
        console.log('Loading Emoji Title Plugin');

        await this.loadSettings();
        this.addSettingTab(new EmojiTitleSettingTab(this.app, this));

        this.injectStyles();
        this.registerCommands();
        this.registerEventListeners();

        // Execução inicial após o layout estar pronto
        this.app.workspace.onLayoutReady(() => this.refreshUI());
    }

    onunload() {
        console.log('Unloading Emoji Title Plugin');

        // Cancela refresh pendente para evitar execução após unload
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
            this.refreshTimeout = null;
        }

        if (this.styleEl) this.styleEl.remove();
        document.querySelectorAll('.emoji-title-plugin-span').forEach(el => el.remove());
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // ─── UI Refresh ──────────────────────────────────────────────────────────

    refreshUI() {
        if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
        this.refreshTimeout = setTimeout(() => {
            updateAllFileExplorers(this.app, this.settings);
            updateAllTabTitles(this.app, this.settings);
            this.refreshTimeout = null;
        }, 100);
    }

    // ─── Setup ───────────────────────────────────────────────────────────────

    private injectStyles() {
        this.styleEl = document.createElement('style');
        this.styleEl.id = 'emoji-title-plugin-styles';
        this.styleEl.innerHTML = `
            .emoji-title-plugin-span::before {
                content: attr(data-emoji);
                margin-right: 5px;
            }
            /* Impede que o Obsidian capture o emoji como texto durante rename */
            .emoji-title-plugin-span {
                user-select: none;
            }
        `;
        document.head.appendChild(this.styleEl);
    }

    private registerCommands() {
        this.addCommand({
            id: 'emoji-title-set-emoji',
            name: 'Set/Review Emoji for current file',
            checkCallback: (checking) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) return false;
                if (!checking) {
                    new EmojiInputModal(this.app, async (emoji) => {
                        if (!emoji) return;
                        await this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                            fm['emoji'] = emoji;
                        });
                        new Notice(`Emoji updated to ${emoji}`);
                    }).open();
                }
                return true;
            },
        });

        this.addCommand({
            id: 'emoji-title-remove-emoji',
            name: 'Remove Emoji from current file',
            checkCallback: (checking) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) return false;
                if (!checking) {
                    this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                        delete fm['emoji'];
                    });
                    new Notice('Emoji removed.');
                }
                return true;
            },
        });

        this.addCommand({
            id: 'emoji-title-toggle-inheritance',
            name: 'Toggle Emoji Inheritance',
            checkCallback: (checking) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) return false;
                if (!checking) {
                    this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                        if (fm['apply_to_children']) {
                            delete fm['apply_to_children'];
                            new Notice('Emoji inheritance removed.');
                        } else {
                            fm['apply_to_children'] = true;
                            new Notice('Emoji inheritance applied.');
                        }
                    });
                }
                return true;
            },
        });

        this.addCommand({
            id: 'emoji-title-generate-folder-note',
            name: 'Generate Folder Note',
            checkCallback: (checking) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile?.parent) return false;
                if (!checking) {
                    const folder = activeFile.parent;
                    if (folder.path === '/') {
                        new Notice('Cannot generate folder note for the vault root.');
                        return;
                    }
                    const notePath = `${folder.path}/${folder.name}.md`;
                    if (this.app.vault.getAbstractFileByPath(notePath)) {
                        new Notice('Folder note already exists.');
                    } else {
                        createDefaultFolderNote(this.app.vault, folder, this.settings)
                            .then(() => new Notice(`Folder note for ${folder.name} generated.`));
                    }
                }
                return true;
            },
        });
    }

    private registerEventListeners() {
        // Atualização seletiva: metadataCache dispara com o arquivo alterado
        this.registerEvent(
            this.app.metadataCache.on('changed', (_file: TFile) => {
                this.refreshUI();
            })
        );

        this.registerEvent(
            this.app.workspace.on('layout-change', () => this.refreshUI())
        );

        this.registerEvent(
            this.app.workspace.on('file-open', () => this.refreshUI())
        );

        this.registerEvent(
            this.app.vault.on('rename', () => this.refreshUI())
        );

        // Auto-criação de folder note ao criar pasta nova
        this.registerEvent(
            this.app.vault.on('create', async (file) => {
                if (!(file instanceof TFolder)) return;
                if (!this.settings.autoCreateFolderNote) return;
                const isDefaultName = /^(untitled folder|sem t[íi]tulo|nova pasta|new folder)(\s\d+)?$/i.test(file.name);
                if (!isDefaultName) {
                    await createDefaultFolderNote(this.app.vault, file, this.settings);
                }
            })
        );

        // Sincronização de folder note ao renomear pasta
        this.registerEvent(
            this.app.vault.on('rename', async (file, oldPath) => {
                if (!(file instanceof TFolder)) return;
                if (!this.settings.autoCreateFolderNote) return;
                await syncFolderNoteOnRename(this.app, file, oldPath, this.settings);
            })
        );
    }
}

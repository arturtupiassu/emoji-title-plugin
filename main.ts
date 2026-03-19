import { App, Plugin, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';

interface EmojiTitleSettings {
    autoCreateFolderNote: boolean;
    defaultFolderEmoji: string;
}

const DEFAULT_SETTINGS: EmojiTitleSettings = {
    autoCreateFolderNote: false,
    defaultFolderEmoji: '🗒️'
}

export default class EmojiTitlePlugin extends Plugin {
    settings: EmojiTitleSettings;

    async onload() {
        console.log('Loading Emoji Title Plugin');
        
        await this.loadSettings();
        this.addSettingTab(new EmojiTitleSettingTab(this.app, this));

        // Initial update (when plugin is enabled via settings)
        this.updateAllFileExplorers();

        // Initial update (when Obsidian first launches)
        this.app.workspace.onLayoutReady(() => {
            this.updateAllFileExplorers();
        });

        // Listen for frontmatter changes
        this.registerEvent(
            this.app.metadataCache.on('changed', (file: TFile) => {
                this.updateAllFileExplorers();
            })
        );

        // Listen for workspace layout changes (e.g. opening a new file explorer, showing new files)
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.updateAllFileExplorers();
            })
        );

        // Listen for new folder creation to auto-create folder notes
        this.registerEvent(
            this.app.vault.on('create', async (file) => {
                if (file instanceof TFolder && this.settings.autoCreateFolderNote) {
                    await this.createDefaultFolderNote(file);
                }
            })
        );
    }

    async createDefaultFolderNote(folder: TFolder) {
        // Obter o caminho completo final p/ a nota (ex: Minha Pasta/Minha Pasta.md)
        const notePath = `${folder.path}/${folder.name}.md`;
        
        // Criar o conteúdo padronizado de frontmatter
        const content = `---\nemoji: ${this.settings.defaultFolderEmoji}\napply_to_children: true\n---\n`;
        
        try {
            const existingFile = this.app.vault.getAbstractFileByPath(notePath);
            if (!existingFile) {
                await this.app.vault.create(notePath, content);
            }
        } catch (e) {
            console.error('Emoji Title: failed to create automatic folder note', e);
        }
    }

    onunload() {
        console.log('Unloading Emoji Title Plugin');
        // Clean up when the plugin is disabled
        const emojiElements = document.querySelectorAll('.emoji-title-plugin-span');
        emojiElements.forEach(el => el.remove());
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    updateAllFileExplorers() {
        // Query all .nav-file-title elements in the DOM
        const navFiles = document.querySelectorAll('.nav-file-title');
        
        navFiles.forEach((navEl) => {
            const path = navEl.getAttribute('data-path');
            if (path) {
                const abstractFile = this.app.vault.getAbstractFileByPath(path);
                if (abstractFile instanceof TFile && abstractFile.extension === 'md') {
                    const cache = this.app.metadataCache.getFileCache(abstractFile);
                    // Support standard frontmatter like emojis or custom icons
                    let emoji = cache?.frontmatter?.emoji || cache?.frontmatter?.icon;

                    if (!emoji) {
                        const parts = path.split('/');
                        if (parts.length > 1) { // Only if file is inside a folder
                            const parentPath = parts.slice(0, -1).join('/');
                            const folderName = parts[parts.length - 2];

                            const folderNotePath = `${parentPath}/${folderName}.md`;
                            const outsideFolderNotePath = parentPath.includes('/') 
                                ? `${parts.slice(0, -2).join('/')}/${folderName}.md` 
                                : `${folderName}.md`;

                            const folderNote = this.app.vault.getAbstractFileByPath(folderNotePath);
                            const outsideFolderNote = this.app.vault.getAbstractFileByPath(outsideFolderNotePath);

                            const noteToUse = (folderNote instanceof TFile) ? folderNote : (outsideFolderNote instanceof TFile ? outsideFolderNote : null);

                            if (noteToUse) {
                                const parentCache = this.app.metadataCache.getFileCache(noteToUse);
                                const applyToChildren = parentCache?.frontmatter?.inherit_emoji || parentCache?.frontmatter?.apply_to_children;
                                if (applyToChildren) {
                                    emoji = parentCache?.frontmatter?.emoji || parentCache?.frontmatter?.icon;
                                }
                            }
                        }
                    }

                    this.applyEmojiToNav(navEl, emoji, '.nav-file-title-content');
                }
            }
        });

        // Query all .nav-folder-title elements in the DOM
        const navFolders = document.querySelectorAll('.nav-folder-title');

        navFolders.forEach((navEl) => {
            const path = navEl.getAttribute('data-path');
            if (path && path !== '/') {
                const parts = path.split('/');
                const folderName = parts[parts.length - 1];
                
                // Allow note inside folder: Folder/Folder.md
                const folderNotePath = `${path}/${folderName}.md`;
                // Allow note outside folder: Folder.md
                const outsideFolderNotePath = parts.length > 1 
                    ? `${parts.slice(0, -1).join('/')}/${folderName}.md` 
                    : `${folderName}.md`;

                const folderNote = this.app.vault.getAbstractFileByPath(folderNotePath);
                const outsideFolderNote = this.app.vault.getAbstractFileByPath(outsideFolderNotePath);

                const noteToUse = (folderNote instanceof TFile) ? folderNote : (outsideFolderNote instanceof TFile ? outsideFolderNote : null);

                if (noteToUse) {
                    const cache = this.app.metadataCache.getFileCache(noteToUse);
                    const emoji = cache?.frontmatter?.emoji || cache?.frontmatter?.icon;
                    this.applyEmojiToNav(navEl, emoji, '.nav-folder-title-content');
                } else {
                    this.applyEmojiToNav(navEl, null, '.nav-folder-title-content');
                }
            }
        });
    }

    applyEmojiToNav(navEl: Element, emoji: string | null | undefined, contentSelector: string) {
        const titleContent = navEl.querySelector(contentSelector);
        if (titleContent) {
            let emojiSpan = titleContent.querySelector('.emoji-title-plugin-span') as HTMLSpanElement | null;
            
            if (emoji) {
                if (!emojiSpan) {
                    emojiSpan = document.createElement('span');
                    emojiSpan.className = 'emoji-title-plugin-span';
                    emojiSpan.style.marginRight = '5px';
                    titleContent.prepend(emojiSpan);
                }
                emojiSpan.textContent = emoji;
            } else {
                if (emojiSpan) {
                    emojiSpan.remove();
                }
            }
        }
    }
}

class EmojiTitleSettingTab extends PluginSettingTab {
    plugin: EmojiTitlePlugin;

    constructor(app: App, plugin: EmojiTitlePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Ativar emoji padrão em novas pastas')
            .setDesc('Quando uma nova pasta for criada, gerar automaticamente uma nota filha com o mesmo nome contendo o emoji padrão.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoCreateFolderNote)
                .onChange(async (value) => {
                    this.plugin.settings.autoCreateFolderNote = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Emoji padrão para pastas')
            .setDesc('O ícone que será aplicado nas novas pastas criadas (se a opção acima estiver ativa).')
            .addText(text => text
                .setPlaceholder('🗒️')
                .setValue(this.plugin.settings.defaultFolderEmoji)
                .onChange(async (value) => {
                    this.plugin.settings.defaultFolderEmoji = value;
                    await this.plugin.saveSettings();
                }));
    }
}

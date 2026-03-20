import { App, Plugin, PluginSettingTab, Setting, TFile, TFolder, Modal, TextComponent, Notice } from 'obsidian';

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

        // Add Commands
        this.addCommand({
            id: 'emoji-title-set-emoji',
            name: 'Set/Review Emoji for current file',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    if (!checking) {
                        new EmojiInputModal(this.app, async (emoji) => {
                            if (!emoji) return; // cancel empty input
                            await this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                                frontmatter['emoji'] = emoji;
                            });
                            new Notice(`Emoji updated to ${emoji}`);
                        }).open();
                    }
                    return true;
                }
                return false;
            }
        });

        this.addCommand({
            id: 'emoji-title-remove-emoji',
            name: 'Remove Emoji from current file',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    if (!checking) {
                        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                            delete frontmatter['emoji'];
                        });
                        new Notice('Emoji removed.');
                    }
                    return true;
                }
                return false;
            }
        });

        this.addCommand({
            id: 'emoji-title-toggle-inheritance',
            name: 'Toggle Emoji Inheritance',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    if (!checking) {
                        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                            if (frontmatter['apply_to_children']) {
                                delete frontmatter['apply_to_children'];
                                new Notice('Emoji inheritance removed.');
                            } else {
                                frontmatter['apply_to_children'] = true;
                                new Notice('Emoji inheritance applied.');
                            }
                        });
                    }
                    return true;
                }
                return false;
            }
        });

        this.addCommand({
            id: 'emoji-title-generate-folder-note',
            name: 'Generate Folder Note',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                // Check if activeFile has a parent
                if (activeFile && activeFile.parent) {
                    if (!checking) {
                        const folder = activeFile.parent;
                        // Avoid generating folder note for the vault root
                        if (folder.path === '/') {
                            new Notice("Cannot generate folder note for the vault root.");
                            return;
                        }

                        const notePath = `${folder.path}/${folder.name}.md`;
                        const existingFile = this.app.vault.getAbstractFileByPath(notePath);
                        
                        if (existingFile) {
                            new Notice("Folder note already exists.");
                        } else {
                            this.createDefaultFolderNote(folder).then(() => {
                                new Notice(`Folder note for ${folder.name} generated.`);
                            });
                        }
                    }
                    return true;
                }
                return false;
            }
        });

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
                    // Evitar criar a nota imediatamente se o nome for um padrão ("Sem título", "Untitled", etc).
                    // Isso previne o "glitch" do Obsidian recarregar a interface enquanto o usuário digita o nome real.
                    // A nota será gerada com segurança no evento 'rename' abaixo, quando ele der o Enter!
                    const isDefaultName = /^(untitled folder|sem t[íi]tulo|nova pasta|new folder)(\s\d+)?$/i.test(file.name);
                    if (isDefaultName) return;

                    await this.createDefaultFolderNote(file);
                }
            })
        );

        // Listen for folder rename to keep folder notes in sync
        this.registerEvent(
            this.app.vault.on('rename', async (file, oldPath) => {
                if (file instanceof TFolder && this.settings.autoCreateFolderNote) {
                    const oldName = oldPath.split('/').pop();
                    const newName = file.name;
                    if (oldName && oldName !== newName) {
                        const oldNotePath = `${file.path}/${oldName}.md`;
                        const oldNote = this.app.vault.getAbstractFileByPath(oldNotePath);
                        if (oldNote instanceof TFile) {
                            const newNotePath = `${file.path}/${newName}.md`;
                            const existingNew = this.app.vault.getAbstractFileByPath(newNotePath);
                            if (!existingNew) {
                                await this.app.vault.rename(oldNote, newNotePath);
                            }
                        } else {
                            // Se a nota por algum motivo ainda não existe, cria ela com o nome certo!
                            await this.createDefaultFolderNote(file);
                        }
                    }
                }
            })
        );
    }

    async createDefaultFolderNote(folder: TFolder) {
        // Obter o caminho completo final p/ a nota (ex: Minha Pasta/Minha Pasta.md)
        const notePath = `${folder.path}/${folder.name}.md`;
        
        // Criar o conteúdo padronizado de frontmatter e a explicação
        const content = `---
emoji: ${this.settings.defaultFolderEmoji}
apply_to_children: true
---
> [!info] Nota de Pasta (Folder Note)
> Esta nota foi criada automaticamente pelo plugin **Emoji Title**.
> Ela serve para guardar as configurações desta pasta (como o emoji e a herança dele para os arquivos contidos aqui).
> Sinta-se à vontade para escrever o conteúdo/resumo desta pasta logo abaixo!

`;
        
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
                    
                    // -- Folder Note UI Enhancements --
                    const parts = path.split('/');
                    const isInsideFolderNote = parts.length > 1 && abstractFile.basename === parts[parts.length - 2];
                    
                    let isOutsideFolderNote = false;
                    const siblingPath = parts.length > 1 ? `${parts.slice(0, -1).join('/')}/${abstractFile.basename}` : abstractFile.basename;
                    const siblingFolder = this.app.vault.getAbstractFileByPath(siblingPath);
                    if (siblingFolder instanceof TFolder) {
                        isOutsideFolderNote = true;
                    }

                    if (isInsideFolderNote || isOutsideFolderNote) {
                        navEl.parentElement?.classList.add('emoji-title-folder-note');
                    } else {
                        navEl.parentElement?.classList.remove('emoji-title-folder-note');
                    }
                    // ---------------------------------

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

class EmojiInputModal extends Modal {
    result: string;
    onSubmit: (result: string) => void;

    constructor(app: App, onSubmit: (result: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Enter Emoji' });
        
        const inputDiv = contentEl.createDiv();
        const textInput = new TextComponent(inputDiv);
        textInput.setPlaceholder('e.g. 🚀');
        textInput.inputEl.style.width = '100%';
        textInput.inputEl.style.marginBottom = '15px';
        
        textInput.onChange((value) => {
            this.result = value;
        });
        
        textInput.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.close();
                this.onSubmit(this.result);
            }
        });

        // Small delay to focus the input text element when modal opens
        setTimeout(() => {
            textInput.inputEl.focus();
        }, 50);

        const btnDiv = contentEl.createDiv({ cls: 'modal-button-container' });
        const submitBtn = btnDiv.createEl('button', { text: 'Save' });
        submitBtn.className = 'mod-cta';
        submitBtn.onclick = () => {
            this.close();
            this.onSubmit(this.result);
        };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

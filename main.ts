import { Plugin, TFile } from 'obsidian';

export default class EmojiTitlePlugin extends Plugin {
    async onload() {
        console.log('Loading Emoji Title Plugin');

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
    }

    onunload() {
        console.log('Unloading Emoji Title Plugin');
        // Clean up when the plugin is disabled
        const emojiElements = document.querySelectorAll('.emoji-title-plugin-span');
        emojiElements.forEach(el => el.remove());
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

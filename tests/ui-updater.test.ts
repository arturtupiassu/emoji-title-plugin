import { applyEmojiToNav, updateAllFileExplorers, updateAllTabTitles } from '../src/ui-updater';
import { App, TFile, TFolder } from 'obsidian';
import { DEFAULT_SETTINGS } from '../src/settings';

function createMockFile(path: string): TFile {
    const name = path.split('/').pop() || path;
    const extension = name.includes('.') ? name.split('.').pop()! : '';
    const basename = extension ? name.slice(0, -extension.length - 1) : name;
    const file = Object.create(TFile.prototype);
    Object.assign(file, { path, name, basename, extension, parent: null, stat: {}, vault: {} });
    return file;
}

function createMockFolder(path: string): TFolder {
    const name = path.split('/').pop() || path;
    const folder = Object.create(TFolder.prototype);
    Object.assign(folder, { path, name, parent: null, children: [], isRoot: () => path === '/' });
    return folder;
}

describe('ui-updater', () => {
    describe('applyEmojiToNav', () => {
        let navEl: HTMLElement;
        let titleContent: HTMLElement;

        beforeEach(() => {
            navEl = document.createElement('div');
            navEl.classList.add('nav-file-title');
            
            titleContent = document.createElement('div');
            titleContent.classList.add('nav-file-title-content');
            titleContent.textContent = 'My Note';
            
            navEl.appendChild(titleContent);
        });

        it('should add emoji span if emoji is provided', () => {
            applyEmojiToNav(navEl, '🚀', '.nav-file-title-content');
            
            const span = navEl.querySelector('.emoji-title-plugin-span');
            expect(span).not.toBeNull();
            expect(span?.getAttribute('data-emoji')).toBe('🚀');
        });

        it('should remove existing emoji spans before adding new one', () => {
            const oldSpan = document.createElement('span');
            oldSpan.className = 'emoji-title-plugin-span';
            titleContent.appendChild(oldSpan);
            
            applyEmojiToNav(navEl, '🔥', '.nav-file-title-content');
            
            const spans = navEl.querySelectorAll('.emoji-title-plugin-span');
            expect(spans.length).toBe(1);
            expect(spans[0].getAttribute('data-emoji')).toBe('🔥');
        });

        it('should update data-emoji in-place without removing the span if span already exists', () => {
            const oldSpan = document.createElement('span');
            oldSpan.className = 'emoji-title-plugin-span';
            oldSpan.setAttribute('data-emoji', '🔥');
            titleContent.appendChild(oldSpan);
            
            applyEmojiToNav(navEl, '🚀', '.nav-file-title-content');
            
            const spans = navEl.querySelectorAll('.emoji-title-plugin-span');
            expect(spans.length).toBe(1);
            expect(spans[0]).toBe(oldSpan); // Verifica reuso in-place
            expect(spans[0].getAttribute('data-emoji')).toBe('🚀');
        });

        it('should do nothing if navEl is being renamed', () => {
            navEl.classList.add('is-being-renamed');
            applyEmojiToNav(navEl, '🚀', '.nav-file-title-content');
            
            const span = navEl.querySelector('.emoji-title-plugin-span');
            expect(span).toBeNull();
        });

        it('should remove existing spans if emoji is null or undefined', () => {
            const oldSpan = document.createElement('span');
            oldSpan.className = 'emoji-title-plugin-span';
            titleContent.appendChild(oldSpan);
            
            applyEmojiToNav(navEl, null, '.nav-file-title-content');
            
            const spans = navEl.querySelectorAll('.emoji-title-plugin-span');
            expect(spans.length).toBe(0);
        });

        it('should truncate string if longer than 20 characters', () => {
            applyEmojiToNav(navEl, '🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀', '.nav-file-title-content');

            const span = navEl.querySelector('.emoji-title-plugin-span');
            expect(span).not.toBeNull();
            expect(Array.from(span?.getAttribute('data-emoji') || '')).toHaveLength(20);
        });

        it('should limit input before trimming oversized strings', () => {
            applyEmojiToNav(navEl, `${' '.repeat(1000)}🚀`, '.nav-file-title-content');

            const span = navEl.querySelector('.emoji-title-plugin-span');
            expect(span).toBeNull();
        });

        it('should ignore non-string types like arrays or objects', () => {
            applyEmojiToNav(navEl, ['🚀', '🔥'], '.nav-file-title-content');
            let span = navEl.querySelector('.emoji-title-plugin-span');
            expect(span).toBeNull();

            applyEmojiToNav(navEl, { toString: () => '🚀' }, '.nav-file-title-content');
            span = navEl.querySelector('.emoji-title-plugin-span');
            expect(span).toBeNull();

            applyEmojiToNav(navEl, 123, '.nav-file-title-content');
            span = navEl.querySelector('.emoji-title-plugin-span');
            expect(span).toBeNull();
        });
    });

    describe('updateAllFileExplorers', () => {
        let app: App;

        beforeEach(() => {
            app = new App();
            document.body.innerHTML = '';
        });

        it('should add emojis to file explorer titles', () => {
            const fileTitle = document.createElement('div');
            fileTitle.className = 'nav-file-title';
            fileTitle.setAttribute('data-path', 'A/note.md');
            
            const fileContent = document.createElement('div');
            fileContent.className = 'nav-file-title-content';
            fileContent.textContent = 'note';
            fileTitle.appendChild(fileContent);
            
            document.body.appendChild(fileTitle);

            const file = createMockFile('A/note.md');
            (app.vault as any).files['A/note.md'] = file;

            (app.metadataCache as any).caches['A/note.md'] = {
                frontmatter: { emoji: '📝' }
            };

            updateAllFileExplorers(app, DEFAULT_SETTINGS);

            const span = fileTitle.querySelector('.emoji-title-plugin-span');
            expect(span).not.toBeNull();
            expect(span?.getAttribute('data-emoji')).toBe('📝');
        });

        it('should add emojis to folder titles', () => {
            const folderTitle = document.createElement('div');
            folderTitle.className = 'nav-folder-title';
            folderTitle.setAttribute('data-path', 'A/Folder');
            
            const folderContent = document.createElement('div');
            folderContent.className = 'nav-folder-title-content';
            folderContent.textContent = 'Folder';
            folderTitle.appendChild(folderContent);
            
            document.body.appendChild(folderTitle);

            const folder = createMockFolder('A/Folder');
            (app.vault as any).files['A/Folder'] = folder;

            const folderNote = createMockFile('A/Folder/Folder.md');
            (app.vault as any).files['A/Folder/Folder.md'] = folderNote;
            (app.metadataCache as any).caches['A/Folder/Folder.md'] = {
                frontmatter: { emoji: '📂' }
            };

            updateAllFileExplorers(app, DEFAULT_SETTINGS);

            const span = folderTitle.querySelector('.emoji-title-plugin-span');
            expect(span).not.toBeNull();
            expect(span?.getAttribute('data-emoji')).toBe('📂');
        });
    });

    describe('updateAllTabTitles', () => {
        let app: App;

        beforeEach(() => {
            app = new App();
            document.body.innerHTML = '';
        });

        it('should add emojis to editor header and tab titles', () => {
            const file = createMockFile('A/note.md');
            (app.vault as any).files['A/note.md'] = file;
            (app.metadataCache as any).caches['A/note.md'] = {
                frontmatter: { emoji: '🚀' }
            };

            const viewHeaderTitle = document.createElement('div');
            viewHeaderTitle.className = 'view-header-title';

            const tabHeaderTitle = document.createElement('div');
            tabHeaderTitle.className = 'tab-header-title';

            const containerEl = document.createElement('div');
            containerEl.appendChild(viewHeaderTitle);

            const tabHeaderEl = document.createElement('div');
            tabHeaderEl.appendChild(tabHeaderTitle);

            const leaf = {
                view: {
                    file: file,
                    containerEl: containerEl
                },
                tabHeaderEl: tabHeaderEl
            };

            const leaves = [leaf];
            app.workspace.iterateAllLeaves = (callback: (leaf: any) => void) => {
                leaves.forEach(callback);
            };

            updateAllTabTitles(app, DEFAULT_SETTINGS);

            const spanInHeader = viewHeaderTitle.querySelector('.emoji-title-plugin-span');
            expect(spanInHeader).not.toBeNull();
            expect(spanInHeader?.getAttribute('data-emoji')).toBe('🚀');

            const spanInTab = tabHeaderTitle.querySelector('.emoji-title-plugin-span');
            expect(spanInTab).not.toBeNull();
            expect(spanInTab?.getAttribute('data-emoji')).toBe('🚀');
        });
    });
});

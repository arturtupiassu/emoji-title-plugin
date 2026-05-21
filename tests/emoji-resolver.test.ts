import { App, TFile } from 'obsidian';
import { getEmojiByExtension, getFileEmoji, resolveInheritedEmoji } from '../src/emoji-resolver';
import type { EmojiTitleSettings } from '../src/settings';
import { DEFAULT_SETTINGS } from '../src/settings';

function createMockFile(path: string): TFile {
    const name = path.split('/').pop() || path;
    const extension = name.includes('.') ? name.split('.').pop()! : '';
    const basename = extension ? name.slice(0, -extension.length - 1) : name;
    
    const file = Object.create(TFile.prototype);
    Object.assign(file, {
        path,
        name,
        basename,
        extension,
        parent: null,
        stat: {},
        vault: {}
    });
    return file;
}

describe('emoji-resolver', () => {
    let app: App;
    let settings: EmojiTitleSettings;

    beforeEach(() => {
        app = new App();
        settings = { ...DEFAULT_SETTINGS };
        settings.defaultCanvasEmoji = '🎨';
        settings.defaultMarkdownEmoji = '📝';
        settings.defaultFolderEmoji = '📁';
        settings.defaultImageEmoji = '🖼️';
    });

    describe('getEmojiByExtension', () => {
        it('should return null for unknown extensions', () => {
            expect(getEmojiByExtension('unknown', settings)).toBeNull();
        });

        it('should return correct emoji for canvas', () => {
            expect(getEmojiByExtension('canvas', settings)).toBe('🎨');
        });

        it('should return correct emoji for images', () => {
            expect(getEmojiByExtension('png', settings)).toBe('🖼️');
            expect(getEmojiByExtension('jpg', settings)).toBe('🖼️');
        });

        it('should be case insensitive', () => {
            expect(getEmojiByExtension('PNG', settings)).toBe('🖼️');
            expect(getEmojiByExtension('Canvas', settings)).toBe('🎨');
        });
    });

    describe('getFileEmoji', () => {
        it('should use frontmatter emoji if available for .md files', () => {
            const file = createMockFile('Notes/MyNote.md');
            (app.metadataCache as any).caches['Notes/MyNote.md'] = {
                frontmatter: { emoji: '⭐' }
            };

            const emoji = getFileEmoji(file, app, settings);
            expect(emoji).toBe('⭐');
        });

        it('should use frontmatter icon if emoji is not available for .md files', () => {
            const file = createMockFile('Notes/MyNote.md');
            (app.metadataCache as any).caches['Notes/MyNote.md'] = {
                frontmatter: { icon: '🚀' }
            };

            const emoji = getFileEmoji(file, app, settings);
            expect(emoji).toBe('🚀');
        });

        it('should inherit emoji from folder note if apply_to_children is true', () => {
            const file = createMockFile('Projects/SecretProject/Doc.md');
            
            const folderNote = createMockFile('Projects/Projects.md');
            (app.vault as any).files['Projects/Projects.md'] = folderNote;
            (app.metadataCache as any).caches['Projects/Projects.md'] = {
                frontmatter: { 
                    emoji: '💼',
                    apply_to_children: true
                }
            };

            const emoji = getFileEmoji(file, app, settings);
            expect(emoji).toBe('💼');
        });

        it('should use fallback settings if no frontmatter or inheritance', () => {
            const mdFile = createMockFile('Notes/Empty.md');
            expect(getFileEmoji(mdFile, app, settings)).toBe('📝');

            const pngFile = createMockFile('Assets/image.png');
            expect(getFileEmoji(pngFile, app, settings)).toBe('🖼️');
        });
    });

    describe('resolveInheritedEmoji', () => {
        it('should return null if path is root or has no parents', () => {
            expect(resolveInheritedEmoji('RootFile.md', app)).toBeNull();
        });

        it('should correctly traverse up and find inherited emoji', () => {
            const folderNote = createMockFile('A/B/B.md');
            (app.vault as any).files['A/B/B.md'] = folderNote;
            (app.metadataCache as any).caches['A/B/B.md'] = {
                frontmatter: { 
                    emoji: '🔥',
                    inherit_emoji: true
                }
            };

            const emoji = resolveInheritedEmoji('A/B/C/D.md', app);
            expect(emoji).toBe('🔥');
        });

        it('should return null if folder note exists but apply_to_children is false', () => {
            const folderNote = createMockFile('A/B/B.md');
            (app.vault as any).files['A/B/B.md'] = folderNote;
            (app.metadataCache as any).caches['A/B/B.md'] = {
                frontmatter: { 
                    emoji: '🔥',
                    apply_to_children: false
                }
            };

            const emoji = resolveInheritedEmoji('A/B/C/D.md', app);
            expect(emoji).toBeNull();
        });
    });
});

import { App, TFile, TFolder } from 'obsidian';
import { resolveFolderNote, isFolderNote, syncFolderNoteOnRename, createDefaultFolderNote } from '../src/folder-notes';
import type { EmojiTitleSettings } from '../src/settings';
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

describe('folder-notes', () => {
    let app: App;
    let settings: EmojiTitleSettings;

    beforeEach(() => {
        app = new App();
        app.fileManager = { renameFile: jest.fn() } as any;
        settings = { ...DEFAULT_SETTINGS };
    });

    describe('resolveFolderNote', () => {
        it('should resolve inside folder note', () => {
            const folderNote = createMockFile('A/B/B.md');
            (app.vault as any).files['A/B/B.md'] = folderNote;

            const resolved = resolveFolderNote(app.vault, 'A/B');
            expect(resolved).toBe(folderNote);
        });

        it('should resolve outside folder note', () => {
            const folderNote = createMockFile('A/B.md');
            (app.vault as any).files['A/B.md'] = folderNote;

            const resolved = resolveFolderNote(app.vault, 'A/B');
            expect(resolved).toBe(folderNote);
        });

        it('should return null if no folder note exists', () => {
            expect(resolveFolderNote(app.vault, 'A/B')).toBeNull();
        });
    });

    describe('isFolderNote', () => {
        it('should return true for inside folder note', () => {
            const file = createMockFile('A/B/B.md');
            expect(isFolderNote(app.vault, file)).toBe(true);
        });

        it('should return true for outside folder note if sibling folder exists', () => {
            const file = createMockFile('A/B.md');
            const folder = createMockFolder('A/B');
            (app.vault as any).files['A/B'] = folder;
            
            expect(isFolderNote(app.vault, file)).toBe(true);
        });

        it('should return true for root-level outside folder note if sibling folder exists', () => {
            const file = createMockFile('Projetos.md');
            const folder = createMockFolder('Projetos');
            (app.vault as any).files['Projetos'] = folder;
            
            expect(isFolderNote(app.vault, file)).toBe(true);
        });

        it('should return false for regular file', () => {
            const file = createMockFile('A/B/C.md');
            expect(isFolderNote(app.vault, file)).toBe(false);
        });
    });

    describe('createDefaultFolderNote', () => {
        it('should create a new file with default content if it does not exist', async () => {
            const folder = createMockFolder('A/B');
            await createDefaultFolderNote(app.vault, folder, settings);

            expect(app.vault.create).toHaveBeenCalled();
            expect((app.vault.create as jest.Mock).mock.calls[0][0]).toBe('A/B/B.md');
            expect((app.vault.create as jest.Mock).mock.calls[0][1]).toContain('apply_to_children: false');
        });

        it('should not create if file already exists', async () => {
            const folder = createMockFolder('A/B');
            (app.vault as any).files['A/B/B.md'] = createMockFile('A/B/B.md');
            
            await createDefaultFolderNote(app.vault, folder, settings);
            expect(app.vault.create).not.toHaveBeenCalled();
        });
    });

    describe('syncFolderNoteOnRename', () => {
        it('should rename inside folder note when folder is renamed', async () => {
            settings.autoCreateFolderNote = true;
            const folder = createMockFolder('A/NewName');
            const oldNote = createMockFile('A/NewName/OldName.md');
            (app.vault as any).files['A/NewName/OldName.md'] = oldNote;

            await syncFolderNoteOnRename(app, folder, 'A/OldName', settings);

            expect(app.fileManager.renameFile).toHaveBeenCalledWith(oldNote, 'A/NewName/NewName.md');
        });

        it('should rename outside folder note when folder is renamed', async () => {
            settings.autoCreateFolderNote = true;
            const folder = createMockFolder('A/NewName');
            const oldNote = createMockFile('A/OldName.md');
            (app.vault as any).files['A/OldName.md'] = oldNote;

            await syncFolderNoteOnRename(app, folder, 'A/OldName', settings);

            expect(app.fileManager.renameFile).toHaveBeenCalledWith(oldNote, 'A/NewName.md');
        });

        it('should create a new folder note if none existed and autoCreateFolderNote is true', async () => {
            settings.autoCreateFolderNote = true;
            const folder = createMockFolder('A/NewName');

            await syncFolderNoteOnRename(app, folder, 'A/OldName', settings);

            expect(app.vault.create).toHaveBeenCalledWith('A/NewName/NewName.md', expect.any(String));
        });

        it('should move outside folder note when folder is moved to another parent without being renamed', async () => {
            settings.autoCreateFolderNote = true;
            const folder = createMockFolder('X/B');
            const oldNote = createMockFile('A/B.md');
            (app.vault as any).files['A/B.md'] = oldNote;

            await syncFolderNoteOnRename(app, folder, 'A/B', settings);

            expect(app.fileManager.renameFile).toHaveBeenCalledWith(oldNote, 'X/B.md');
        });
    });
});

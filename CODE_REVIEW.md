# Code Quality Analysis & Review

This document contains a detailed analysis of the Emoji Title Plugin codebase, focusing on functional correctness, regression risk, security, testing, and maintainability.

## Summary of Findings

We identified 6 material findings concerning functional correctness, performance, maintainability, and testing:
- **1 High Severity** performance issue (redundant DOM mutations causing reflows during explorer refreshes).
- **2 Medium Severity** bugs (root-level outside folder notes ignored; outside folder notes orphaned when folders are moved).
- **3 Low Severity** issues (un-cleaned styling classes on unload; hardcoded local development path in esbuild configuration; missing test coverage on core updater routines).

---

## Detailed Findings

### Redundant DOM mutations causing explorer reflows
- **Severity**: HIGH
- **File**: src/ui-updater.ts
- **Line**: 25-46
- **Evidence**:
  In `applyEmojiToNav`, the DOM elements representing file or folder titles are mutated on every call to `updateAllFileExplorers` (which runs on all metadata changes, opens, layouts, etc.):
  ```typescript
  navEl.querySelectorAll('.emoji-title-plugin-span').forEach(span => span.remove());
  ...
  titleContent.prepend(emojiSpan);
  ```
  It removes and recreates the spans regardless of whether the emoji value has actually changed.
- **Impact**: Unnecessary layout recalculations (reflows) on every metadata update, leading to high CPU usage and noticeable UI lag/freezes in vaults containing a large number of files.
- **Suggestion**: Check if the existing span's `data-emoji` value already matches the target emoji, and only perform mutations (updates, insertions, or removals) if there is an actual difference:
  ```typescript
  export function applyEmojiToNav(
      navEl: Element,
      emoji: unknown,
      contentSelector: string
  ): void {
      if (navEl.classList.contains('is-being-renamed')) return;

      const existingSpan = navEl.querySelector('.emoji-title-plugin-span');
      const safeEmoji = normalizeDisplayEmoji(emoji);

      if (safeEmoji) {
          if (existingSpan) {
              if (existingSpan.getAttribute('data-emoji') !== safeEmoji) {
                  existingSpan.setAttribute('data-emoji', safeEmoji);
              }
          } else {
              const titleContent = contentSelector ? navEl.querySelector(contentSelector) : navEl;
              if (titleContent) {
                  const emojiSpan = document.createElement('span');
                  emojiSpan.className = 'emoji-title-plugin-span';
                  emojiSpan.setAttribute('data-emoji', safeEmoji);
                  titleContent.prepend(emojiSpan);
              }
          }
      } else {
          if (existingSpan) {
              existingSpan.remove();
          }
      }
  }
  ```

---

### Root-level outside folder notes ignored
- **Severity**: MEDIUM
- **File**: src/folder-notes.ts
- **Line**: 29-41
- **Evidence**:
  In `isFolderNote`, the function checks if `parts.length > 1` for outside folder notes:
  ```typescript
  if (parts.length > 1) {
      const siblingFolderPath = `${parts.slice(0, -1).join('/')}/${file.basename}`;
      return vault.getAbstractFileByPath(siblingFolderPath) instanceof TFolder;
  }
  ```
  For files at the root of the vault (e.g. `Projetos.md` corresponding to the root folder `Projetos`), `parts.length` is 1, so the guard prevents matching the sibling folder.
- **Impact**: Root-level folder notes of type "outside" are not recognized as folder notes. They do not get the visual styling class `emoji-title-folder-note` added, causing inconsistent visual behavior.
- **Suggestion**: Remove the `parts.length > 1` guard and resolve the sibling folder path relative to the root when the file is in the root directory:
  ```typescript
  export function isFolderNote(vault: Vault, file: TFile): boolean {
      const parts = file.path.split('/');
      const isInsideFolderNote = parts.length > 1 && file.basename === parts[parts.length - 2];
      if (isInsideFolderNote) return true;

      const parentPath = parts.slice(0, -1).join('/');
      const siblingFolderPath = parentPath ? `${parentPath}/${file.basename}` : file.basename;
      return vault.getAbstractFileByPath(siblingFolderPath) instanceof TFolder;
  }
  ```

---

### Outside folder notes orphaned when folders are moved
- **Severity**: MEDIUM
- **File**: src/folder-notes.ts
- **Line**: 71-82
- **Evidence**:
  In `syncFolderNoteOnRename`, there is a guard:
  ```typescript
  const newName = folder.name;
  if (!oldName || oldName === newName) return;
  ```
  If a folder is moved to another parent directory (e.g., from `A/B` to `X/B`) without changing its name, `oldName === newName` is true, and the function returns early. For outside folder notes, they are not moved automatically by Obsidian and will be orphaned at the old path.
- **Impact**: Outside folder notes are orphaned when a folder is moved without being renamed, resulting in lost folder settings and emojis.
- **Suggestion**: Refactor the check so that outside folder notes are moved if either the name OR the parent path changes:
  ```typescript
  export async function syncFolderNoteOnRename(
      app: App,
      folder: TFolder,
      oldPath: string,
      settings: EmojiTitleSettings
  ): Promise<void> {
      const oldParts = oldPath.split('/');
      const oldName = oldParts[oldParts.length - 1];
      const oldParentPath = oldParts.slice(0, -1).join('/');
      const newName = folder.name;
      if (!oldName) return;

      const insideOldNotePath = `${folder.path}/${oldName}.md`;
      let insideOldNote = app.vault.getAbstractFileByPath(insideOldNotePath);
      if (!insideOldNote) {
          insideOldNote = folder.children.find(c => c instanceof TFile && c.name === `${oldName}.md`) || null;
      }

      const outsideOldNotePath = oldParentPath ? `${oldParentPath}/${oldName}.md` : `${oldName}.md`;
      const outsideOldNote = app.vault.getAbstractFileByPath(outsideOldNotePath);
      const oldNote = (insideOldNote instanceof TFile) ? insideOldNote : (outsideOldNote instanceof TFile) ? outsideOldNote : null;

      if (oldNote instanceof TFile) {
          const isInside = oldNote === insideOldNote;
          let newNotePath = '';
          if (isInside) {
              if (oldName === newName) return;
              newNotePath = `${folder.path}/${newName}.md`;
          } else {
              const newParentPath = folder.path.split('/').slice(0, -1).join('/');
              newNotePath = newParentPath ? `${newParentPath}/${newName}.md` : `${newName}.md`;
              if (oldNote.path === newNotePath) return;
          }

          const existingNew = app.vault.getAbstractFileByPath(newNotePath);
          if (!existingNew) {
              try {
                  await app.fileManager.renameFile(oldNote, newNotePath);
              } catch (e) {
                  console.error("Emoji Title: Erro ao renomear folder note", e);
              }
          }
      } else if (settings.autoCreateFolderNote) {
          await createDefaultFolderNote(app.vault, folder, settings);
      }
  }
  ```

---

### Un-cleaned styling classes on unload
- **Severity**: LOW
- **File**: main.ts
- **Line**: 38
- **Evidence**:
  In `onunload`, the class `emoji-title-folder-note` is not cleaned up from the file explorer DOM elements.
- **Impact**: Leftover DOM classes remain on file explorer tree items after the plugin is disabled or reloaded.
- **Suggestion**: Perform query selector cleanup on unload:
  ```typescript
  document.querySelectorAll('.emoji-title-folder-note').forEach(el => el.classList.remove('emoji-title-folder-note'));
  ```

---

### Hardcoded local development path in esbuild configuration
- **Severity**: LOW
- **File**: esbuild.config.mjs
- **Line**: 6
- **Evidence**:
  The configuration file has a hardcoded local absolute path for copy actions:
  ```javascript
  const vaultPluginPath = "/Users/arturtupiassu/obsidian/Cofre de Artur Tupiassu/.obsidian/plugins/emoji-title-plugin";
  ```
- **Impact**: Decreased maintainability and portability. Builds on other systems will catch unlink and copy errors silently, but it relies on hardcoded environment parameters.
- **Suggestion**: Load target vault paths from a git-ignored configuration file (e.g. `local.config.json`) or environment variable.

---

### Missing test coverage on core updater routines
- **Severity**: LOW
- **File**: tests/ui-updater.test.ts
- **Line**: N/A
- **Evidence**:
  `tests/ui-updater.test.ts` only contains assertions for the helper `applyEmojiToNav`. There is no test coverage for the core DOM-scanning routines `updateAllFileExplorers` and `updateAllTabTitles`.
- **Impact**: Updates to the explorer iteration and view leaf mapping logic are fragile and run the risk of introducing regressions unnoticed.
- **Suggestion**: Mock DOM structure and Obsidian workspace leaves in `ui-updater.test.ts` to fully assert update behaviors.

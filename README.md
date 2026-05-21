# Obsidian Emoji Title Plugin
This is a plugin for Obsidian that automatically adds emojis to note and folder titles in the File Explorer, as well as in active navigation tabs.
Emoji resolution is handled intelligently based on the note's frontmatter, parent folder inheritance, or file extension.
---
## 🚀 Features
 1. **Emojis in Titles and Tabs:** Displays emojis corresponding to the file both in the sidebar and at the top of the open tab.
 2. **Smart Emoji Resolution:** The choice of which emoji to display follows a specific priority order:
   * **Frontmatter:** Checks if the note has the emoji or icon fields defined in the metadata (YAML frontmatter).
   * **Folder Inheritance:** Folders with Folder Notes configured with apply_to_children: true (or inherit_emoji: true) recursively transmit their emoji to all internal files and subfolders.
   * **File Extensions:** If no emoji is specified, the plugin assigns a default emoji based on the file type (Markdown, Canvas, Image, PDF, Spreadsheets, etc.).
 3. **Automatic Folder Notes:** Automatic creation and synchronization of folder notes to manage directory metadata cleanly.
 4. **Rename Glitch Prevention:** Smart system that detects when a file or folder is being renamed in the sidebar, suspending emoji injection in the DOM to prevent Obsidian from capturing the emoji as part of the new file name.
 5. **Rendering Debounce:** Optimized with requestAnimationFrame to prevent slowdowns and visual processing overhead in very large vaults.
---
## 🛠️ Project Structure
The plugin code has been modularized from the initial main.ts to facilitate maintenance and readability:
```text
├── main.ts               # Plugin entry point (command registration, events, and lifecycle)
├── manifest.json         # Metadata and plugin identification in Obsidian
├── styles.css            # CSS styles required for correct rendering
├── esbuild.config.mjs    # esbuild bundler configuration
├── package.json          # Project dependencies and build scripts
└── src/                  # Specialized modules
    ├── emoji-resolver.ts # Priority and inheritance logic for defining emojis
    ├── folder-notes.ts   # Creation, synchronization, and management of folder notes
    ├── modal.ts          # Interactive emoji selection modal
    ├── settings.ts       # Configuration schema and user preferences tab
    ├── types.ts          # Type definitions and extensions for the internal Obsidian API
    └── ui-updater.ts     # DOM manipulation for emoji injection in the interface

```
---
## ⚙️ Available Settings
In the plugin's settings tab, you can customize:
 * **Auto-create Folder Notes:** Automatically creates a corresponding folder note whenever a new folder is created.
 * **Default Emojis by Type:**
   * Folders (📁)
   * Markdown (🗒️)
   * Canvas (🎨)
   * Databases/Dataview (📊)
   * Images (🖼️)
   * PDFs (📄)
   * Spreadsheets (📈)
   * Documents and Other formats
 * **Icon Customization:** Quickly modify default fallbacks.
---
## 💻 Local Development and Compilation
### Requirements
 * Node.js installed.
### Steps to Compile
 1. Install project dependencies:
   ```bash
   npm install
   
   ```
 2. Compile the plugin:
   ```bash
   npm run build
   
   ```
> [!NOTE]
> The build script is configured to copy the final bundled file (main.js), manifest.json, and styles.css directly to the plugin development folder of your local Obsidian vault:
> ~/obsidian/Your Vault/.obsidian/plugins/emoji-title-plugin/
> 
---
## 📜 License
This project is made available under the MIT license.

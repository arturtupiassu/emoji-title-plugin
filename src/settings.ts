import { App, PluginSettingTab, Setting } from 'obsidian';
import type EmojiTitlePlugin from '../main';

export interface EmojiTitleSettings {
    autoCreateFolderNote: boolean;
    defaultFolderEmoji: string;
    defaultMarkdownEmoji: string;
    defaultCanvasEmoji: string;
    defaultBaseEmoji: string;
    defaultImageEmoji: string;
    defaultPDFEmoji: string;
    defaultSpreadsheetEmoji: string;
    defaultDocumentEmoji: string;
    defaultMediaEmoji: string;
}

export const DEFAULT_SETTINGS: EmojiTitleSettings = {
    autoCreateFolderNote: false,
    defaultFolderEmoji: '📁',
    defaultMarkdownEmoji: '🗒️',
    defaultCanvasEmoji: '🎨',
    defaultBaseEmoji: '📊',
    defaultImageEmoji: '🖼️',
    defaultPDFEmoji: '📄',
    defaultSpreadsheetEmoji: '📈',
    defaultDocumentEmoji: '📝',
    defaultMediaEmoji: '🎥',
};

export class EmojiTitleSettingTab extends PluginSettingTab {
    plugin: EmojiTitlePlugin;

    constructor(app: App, plugin: EmojiTitlePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Configurações de Notas de Pasta' });

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

        containerEl.createEl('h2', { text: 'Emojis por Tipo de Arquivo' });
        containerEl.createEl('p', { text: 'Estes emojis serão usados caso o arquivo não tenha um emoji próprio e não herde de uma nota de pasta.' });

        const fileTypeSettings: Array<{
            name: string;
            placeholder: string;
            key: keyof EmojiTitleSettings;
        }> = [
            { name: 'Markdown (notas)',          placeholder: '🗒️', key: 'defaultMarkdownEmoji' },
            { name: 'Canvas',                   placeholder: '🎨', key: 'defaultCanvasEmoji' },
            { name: 'Base (Database)',           placeholder: '📊', key: 'defaultBaseEmoji' },
            { name: 'Imagens (PNG, JPG, etc.)',  placeholder: '🖼️', key: 'defaultImageEmoji' },
            { name: 'PDF',                      placeholder: '📄', key: 'defaultPDFEmoji' },
            { name: 'Planilhas (XLSX, CSV)',     placeholder: '📈', key: 'defaultSpreadsheetEmoji' },
            { name: 'Documentos (DOCX, TXT)',    placeholder: '📝', key: 'defaultDocumentEmoji' },
            { name: 'Mídia (Áudio/Vídeo)',       placeholder: '🎥', key: 'defaultMediaEmoji' },
        ];

        for (const { name, placeholder, key } of fileTypeSettings) {
            new Setting(containerEl)
                .setName(name)
                .addText(text => text
                    .setPlaceholder(placeholder)
                    .setValue(this.plugin.settings[key] as string)
                    .onChange(async (value) => {
                        (this.plugin.settings[key] as string) = value;
                        await this.plugin.saveSettings();
                    }));
        }
    }
}

import { TFile } from 'obsidian';

/**
 * Propriedades internas do WorkspaceLeaf do Obsidian que não fazem parte
 * da API pública tipada, mas são estáveis o suficiente para uso em plugins.
 */
export interface ObsidianLeafInternal {
    tabHeaderEl?: HTMLElement;
    tabHeaderInnerEl?: HTMLElement;
}

/**
 * Propriedades internas de Views do Obsidian (e.g. MarkdownView, FileView)
 * que expõem o arquivo associado mas não estão na tipagem pública.
 */
export interface ObsidianViewInternal {
    file?: TFile;
}

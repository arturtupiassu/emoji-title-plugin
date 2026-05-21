export class App {
  vault: Vault;
  metadataCache: MetadataCache;
  workspace: Workspace;
  fileManager: FileManager;

  constructor() {
    this.vault = new Vault();
    this.metadataCache = new MetadataCache();
    this.workspace = new Workspace();
    this.fileManager = new FileManager();
  }
}

export class Vault {
  files: Record<string, TAbstractFile> = {};
  
  getAbstractFileByPath(path: string): TAbstractFile | null {
    return this.files[path] || null;
  }
  
  create = jest.fn(async (path: string, data: string) => {
    const file = new TFile(path);
    this.files[path] = file;
    return file;
  });

  rename = jest.fn(async (file: TAbstractFile, newPath: string) => {
    const oldPath = file.path;
    delete this.files[oldPath];
    file.path = newPath;
    file.name = newPath.split('/').pop()!;
    this.files[newPath] = file;
  });
}

export class MetadataCache {
  caches: Record<string, any> = {};

  getFileCache(file: TFile): any {
    return this.caches[file.path] || null;
  }
  
  on(name: string, callback: (...data: any) => any): EventRef {
      return {} as EventRef;
  }
}

export class Workspace {
  on(name: string, callback: (...data: any) => any): EventRef {
      return {} as EventRef;
  }
  getActiveFile() { return null; }
}

export class FileManager {
  processFrontMatter = jest.fn();
}

export abstract class TAbstractFile {
  path: string;
  name: string;
  parent: TFolder | null = null;
  
  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || path;
  }
}

export class TFile extends TAbstractFile {
  extension: string;
  basename: string;
  
  constructor(path: string) {
    super(path);
    const parts = this.name.split('.');
    this.extension = parts.length > 1 ? parts.pop()! : '';
    this.basename = parts.join('.');
  }
}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];
  
  isRoot(): boolean {
      return this.path === '/';
  }
}

export class Notice {
  constructor(message: string) {}
}

export class Plugin {
    app: App;
    constructor(app: App) {
        this.app = app;
    }
    registerEvent() {}
}

export class PluginSettingTab {
    app: App;
    plugin: Plugin;
    constructor(app: App, plugin: Plugin) {
        this.app = app;
        this.plugin = plugin;
    }
}

export interface EventRef {}

export function setIcon() {}

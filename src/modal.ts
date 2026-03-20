import { App, Modal, TextComponent } from 'obsidian';

export class EmojiInputModal extends Modal {
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

        // Pequeno delay para focar o input quando o modal abre
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

import { applyEmojiToNav } from '../src/ui-updater';

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
    });
});

import { beforeAll, describe, expect, it } from 'vitest';

import { Pane } from 'tweakpane';
import { openModal } from '../src';

describe('Tweakpane Modal', () => {
    beforeAll(() => {
        document.body.innerHTML = '<div id="app"></div>';
    });
    it('should create a Tweakpane', () => {
        const container = document.getElementById('app');
        expect(container).not.toBeNull();
        const pane = openModal(container!);
        expect(pane).toBeInstanceOf(Pane);
    });
});

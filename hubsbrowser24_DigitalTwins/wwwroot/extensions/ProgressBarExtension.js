import { BaseExtension } from './BaseExtension.js';
import { ProgressBarPanel } from './ProgressBarPanel.js';

class ProgressBarExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this.panel = null;
    }

    async load() {
        await super.load();
        console.log('ProgressBarExtension loaded.');
        if (!this.panel) {
            this.panel = new ProgressBarPanel(this, 'bim-quality-panel', 'progress-chart');
        }
        return true;
    }

    unload() {
        if (this.panel) {
            this.panel = null;
        }
        console.log('Extension unloaded.');
        return true;
    }

    // Este método se llamará automáticamente cuando el árbol de objetos esté listo,
    onModelLoaded(model) {
        super.onModelLoaded(model);
        if (this.panel) {
            this.panel.update(model);
        }
    }
}
Autodesk.Viewing.theExtensionManager.registerExtension('ProgressBarExtension', ProgressBarExtension);

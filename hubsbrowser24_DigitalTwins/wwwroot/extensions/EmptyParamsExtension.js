import { BaseExtension } from './BaseExtension.js';
import { EmptyParamsPanel } from './EmptyParamsPanel.js';

class EmptyParamsExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this.panel = null;
    }

    async load() {
        await super.load();
        console.log('EmptyParamsExtension loaded.');
        if (!this.panel) {
            this.panel = new EmptyParamsPanel(this, 'bim-quality-panel', 'empty-params-chart');
        }
        return true;
    }

    unload() {
        if (this.panel) {
            this.panel = null;
        }
        console.log('EmptyParamsExtension unloaded.');
        return true;
    }

    onModelLoaded(model) {
        super.onModelLoaded(model);
        if (this.panel) {
            this.panel.update(model);
        }
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('EmptyParamsExtension', EmptyParamsExtension);

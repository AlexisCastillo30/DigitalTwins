//import { BaseExtension } from './BaseExtension.js';
//import { ProgressBarPanel } from './ProgressBarPanel.js';

//class ProgressBarExtension extends BaseExtension {
//    constructor(viewer, options) {
//        super(viewer, options);
//        this.panel = null;
//    }

//    async load() {
//        await super.load();
//        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.5.1/chart.min.js', 'Chart');
//        Chart.defaults.plugins.legend.display = false;

//        // Crear el panel, pero no inicializar el gráfico todavía
//        if (!this.panel) {
//            this.panel = new ProgressBarPanel(this, 'bim-quality-panel', 'Panel de Progreso BIM', {
//                x: 10,
//                y: 10,
//                width: 500,
//                height: 400
//            });
//            this.panel.setVisible(true); // Asegura que el panel esté visible
//        }

//        console.log('ProgressBarExtension loaded.');
//        return true;
//    }

//    unload() {
//        if (this.panel) {
//            this.panel.uninitialize();
//            this.panel.setVisible(false);
//            this.panel = null;
//        }
//        console.log('Extension unloaded.');
//        return true;
//    }

//    onModelLoaded(model) {
//        super.onModelLoaded(model);
//        if (this.panel && this.panel.isVisible()) {
//            this.panel.update(model); // Llama a update solo después de que el modelo esté cargado
//        }
//    }
//}

//Autodesk.Viewing.theExtensionManager.registerExtension('ProgressBarExtension', ProgressBarExtension);
import { BaseExtension } from './BaseExtension.js';
import { ProgressBarPanel } from './ProgressBarPanel.js';

class ProgressBarExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this.panel = null;
    }

    async load() {
        await super.load();
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.5.1/chart.min.js', 'Chart');
        Chart.defaults.plugins.legend.display = false;

        // Usa el panel ya existente en el HTML
        if (!this.panel) {
            this.panel = new ProgressBarPanel(this, 'bim-quality-panel', 'progress-chart');
        }

        console.log('ProgressBarExtension loaded.');
        return true;
    }

    unload() {
        if (this.panel) {
            this.panel = null; // Elimina la referencia al panel
        }
        console.log('Extension unloaded.');
        return true;
    }

    onModelLoaded(model) {
        super.onModelLoaded(model);
        if (this.panel) {
            this.panel.update(model);
        }
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('ProgressBarExtension', ProgressBarExtension);
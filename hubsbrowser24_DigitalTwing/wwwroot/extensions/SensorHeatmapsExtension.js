import { BaseExtension } from './BaseExtension.js';
import { SensorHeatmapsPanel } from './SensorHeatmapsPanel.js';

class SensorHeatmapsExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this.panel = null;
        this.currentChannelID = null;
    }

    async load() {
        super.load();

        // Crear el panel para heatmaps
        this.panel = new SensorHeatmapsPanel(this.viewer, 'heatmaps-panel', 'Heatmaps Control', {});
        this.panel.onChannelChanged = (channelId) => {
            this.currentChannelID = channelId;
            this.updateHeatmaps();
        };

        console.log('SensorHeatmapsExtension loaded');
        return true;
    }

    unload() {
        super.unload();
        if (this.panel) {
            this.panel.uninitialize();
            this.panel = null;
        }
        console.log('SensorHeatmapsExtension unloaded');
        return true;
    }

    activate() {
        super.activate();
        if (this.panel) this.panel.setVisible(true);
        return true;
    }

    deactivate() {
        super.deactivate();
        if (this.panel) this.panel.setVisible(false);
        return true;
    }

    onToolbarCreated() {
        this._button = this.createDigitalTwinsToolbarButton(
            'heatmaps-button',
            'https://img.icons8.com/ios-filled/50/heat-map.png',
            'Heatmaps'
        );
        this._button.onClick = () => {
            if (this.isActive()) {
                this.deactivate();
            } else {
                this.activate();
            }
        };
    }

    updateHeatmaps() {
        // Aquí puedes usar tus datos para generar o actualizar mapas de calor.
        console.log('Updating heatmaps for channel:', this.currentChannelID);
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('SensorHeatmapsExtension', SensorHeatmapsExtension);

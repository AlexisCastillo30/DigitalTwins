import { BaseExtension } from './BaseExtension.js';



class SensorHeatmapsExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
    }


    async load() {
        super.load();
        console.log('SensorHeatmapsExtension loaded');
        return true;
    }

    unload() {
        super.unload();
        if (this._button) {
            this.removeToolbarButton(this._button);
            this._button = null;
        }
        console.log('SensorHeatmapsExtension unloaded');
        return true;
    }
    onToolbarCreated() {
        this._button = this.createDigitalTwinsToolbarButton('SensorHeatmaps-button', 'https://img.icons8.com/material-rounded/32/humidity.png', 'SensorHeatmaps');
        this._button.onClick = () => {
            // TODO
        };
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('SensorHeatmapsExtension', SensorHeatmapsExtension);
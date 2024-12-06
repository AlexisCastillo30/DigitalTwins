import { BaseExtension } from './BaseExtension.js';

class SensorDetailExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
    }


    async load() {
        super.load();
        console.log('SensorDetailExtension loaded');
        return true;
    }

    unload() {
        super.unload();
        if (this._button) {
            this.removeToolbarButton(this._button);
            this._button = null;
        }
        console.log('SensorDetailExtension unloaded');
        return true;
    }
    onToolbarCreated() {
        this._button = this.createDigitalTwinsToolbarButton('SensorDetail-button', 'https://img.icons8.com/android/32/electrical-sensor.png', 'SensorDetail');
        this._button.onClick = () => {
            // TODO
        };
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('SensorDetailExtension', SensorDetailExtension);

import { BaseExtension } from './BaseExtension.js';



class SensorListExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
    }


    async load() {
        super.load();
        console.log('SensorListExtension loaded');
        return true;
    }

    unload() {
        super.unload();
        if (this._button) {
            this.removeToolbarButton(this._button)
            this._button = null;
        }
        console.log('SensorListExtension unloaded');
        return true;
    }
    onToolbarCreated() {
        this._button = this.createDigitalTwinsToolbarButton('SensorList-button', 'https://img.icons8.com/material-outlined/32/todo-list--v2.png', 'SensorList');
        this._button.onClick = () => {
            // TODO
        };
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('SensorListExtension', SensorListExtension);
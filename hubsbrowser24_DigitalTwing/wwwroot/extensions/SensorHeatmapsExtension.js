import { BaseExtension } from './BaseExtension.js';
import { SensorHeatmapsPanel } from './SensorHeatmapsPanel.js';

class SensorHeatmapsExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this.panel = null;
        this.isActive = false; // Para manejar la visibilidad del panel
        this.currentChannelID = null;
        this._surfaceShadingData = null;
        this.heatmapConfig = {
            confidence: 50.0,
            powerParameter: 2.0,
            alpha: 1.0,
        };
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
        this.removeHeatmaps();
        console.log('SensorHeatmapsExtension unloaded');
        return true;
    }

    onToolbarCreated() {
        this._button = this.createDigitalTwinsToolbarButton(
            'heatmaps-button',
            'https://img.icons8.com/ios-filled/50/heat-map.png',
            'Heatmaps'
        );

        // Al hacer clic, alternar la visibilidad del panel
        this._button.onClick = () => {
            this.togglePanel();
        };
    }

    togglePanel() {
        if (this.panel) {
            this.isActive = !this.isActive;
            this.panel.setVisible(this.isActive);
            if (this.isActive) {
                this.updateHeatmaps();
            } else {
                this.removeHeatmaps();
            }
        }
    }

    async updateHeatmaps() {
        if (!this.currentChannelID) {
            console.warn('No channel selected for heatmaps.');
            return;
        }

        const dataVizExt = await this.viewer.loadExtension('Autodesk.DataVisualization');
        if (!this._surfaceShadingData) {
            await this.setupSurfaceShading(dataVizExt);
        }

        await dataVizExt.renderSurfaceShading(
            'heatmap-group',
            this.currentChannelID,
            (surfaceShadingPoint) => {
                // Simula valores para los puntos (personaliza esto según tu fuente de datos)
                return Math.random();
            },
            { heatmapConfig: this.heatmapConfig }
        );

        console.log('Heatmaps updated for channel:', this.currentChannelID);
    }

    removeHeatmaps() {
        if (this._surfaceShadingData) {
            const dataVizExt = this.viewer.getExtension('Autodesk.DataVisualization');
            dataVizExt?.removeSurfaceShading();
            this._surfaceShadingData = null;
        }
    }

    async setupSurfaceShading(dataVizExt) {
        const model = this.viewer.model;
        const shadingGroup = new Autodesk.DataVisualization.Core.SurfaceShadingGroup('heatmap-group');
        const nodes = new Map();

        const sensors = [
            { id: 'sensor1', objectId: 1, location: { x: 10, y: 10, z: 10 } },
            { id: 'sensor2', objectId: 2, location: { x: 20, y: 20, z: 20 } },
        ]; // Simulación de sensores

        sensors.forEach((sensor) => {
            if (!nodes.has(sensor.objectId)) {
                const node = new Autodesk.DataVisualization.Core.SurfaceShadingNode(sensor.objectId, sensor.objectId);
                shadingGroup.addChild(node);
                nodes.set(sensor.objectId, node);
            }
            const node = nodes.get(sensor.objectId);
            node.addPoint(new Autodesk.DataVisualization.Core.SurfaceShadingPoint(sensor.id, sensor.location, ['temperature', 'humidity', 'co2']));
        });

        this._surfaceShadingData = new Autodesk.DataVisualization.Core.SurfaceShadingData();
        this._surfaceShadingData.addChild(shadingGroup);
        this._surfaceShadingData.initialize(model);

        await dataVizExt.setupSurfaceShading(model, this._surfaceShadingData);

        // Configura colores personalizados
        await dataVizExt.registerSurfaceShadingColors('temperature', [0x0000FF, 0x00FF00, 0xFFFF00, 0xFF0000]); // Azul a rojo
        await dataVizExt.registerSurfaceShadingColors('humidity', [0x0000FF, 0x00FFFF, 0x00FF00]); // Azul a verde
        await dataVizExt.registerSurfaceShadingColors('co2', [0x00FF00, 0xFFFF00, 0xFF0000]); // Verde a rojo
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('SensorHeatmapsExtension', SensorHeatmapsExtension);

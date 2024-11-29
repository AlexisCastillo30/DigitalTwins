import { BaseExtension } from './BaseExtension.js';

class GeorefExtension extends BaseExtension {
    load() {
        super.load();
        console.log('GeorefExtension loaded.');
        return true;
    }

    unload() {
        super.unload();
        console.log('GeorefExtension unloaded.');
        return true;
    }

    async onModelLoaded(model) {
        super.onModelLoaded(model);

        const modelData = model.getData(); // Obtener los datos del modelo
        if (modelData && modelData.metadata && modelData.metadata.georeference) {
            const georeference = modelData.metadata.georeference;
            const coordNS = georeference.positionNative ? georeference.positionNative[0] * 0.3048 : 'No disponible';
            const coordEW = georeference.positionNative ? georeference.positionNative[1] * 0.3048 : 'No disponible';
            const coordAngle = georeference.positionNative ? georeference.positionNative[2] : 'No disponible';
            const sysCoord = georeference.positionNative ? georeference.nativeCoordSys : 'No disponible';
            
            console.log('Coordenadas de georeferenciación N/S:', coordNS, "m");
            console.log('Coordenadas de georeferenciación E/W:', coordEW, "m");
            console.log('Coordenadas de georeferenciación Angulo:', coordAngle, "°");
            console.log('Sistema de coordenadas:', sysCoord);
        } else {
            console.warn('El modelo cargado no contiene datos de georreferenciación.');
        }
    }

    async onSelectionChanged(model) {
        super.onSelectionChanged(model);
        console.log('Model has changed');
    }

    onIsolationChanged(model) {
        super.onIsolationChanged(model);
        console.log('Isolation has changed');
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('GeorefExtension', GeorefExtension);
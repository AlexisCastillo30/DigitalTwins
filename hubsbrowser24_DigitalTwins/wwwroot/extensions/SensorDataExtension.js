import { BaseExtension } from './BaseExtension.js';
import { SensorDataClient } from './SensorDataClient.js';

class SensorDataExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._enabled = false; // Controla si los markups están activos
        this._overlayName = 'sensor-data-markups'; // Nombre para los overlays
        this._frags = {}; // Fragmentos asociados a los dbId
        this._labels = []; // Almacena referencias a los labels creados
    }

    async load() {
        super.load();

        // Escuchar el evento de carga completa del modelo
        this.onModelLoaded = this.onModelLoaded.bind(this);
        this.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onModelLoaded);

        // Conectar a SignalR
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl("/sensorHub")
            .build();

        this.connection.on("ReceiveSensorData", (sensorData) => {
            console.log('Datos de sensor recibidos:', sensorData);

            // Actualizar los datos de temperatura
            SensorDataClient.update(sensorData);

            // Actualizar los marcadores inmediatamente
            this.updateMarkup(sensorData.dbId);
        });

        await this.connection.start();

        console.log('SensorDataExtension loaded');
        return true;
    }

    unload() {
        super.unload();

        // Desconectar de SignalR
        if (this.connection) {
            this.connection.stop();
        }

        // Limpia los markups y eventos
        this.clearLabels();
        this.viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.updateMarkups.bind(this));

        if (this._button) {
            this.removeToolbarButton(this._button);
            this._button = null;
        }

        console.log('TemperatureExtension unloaded');
        return true;
    }

    onModelLoaded() {
        // Remover el listener para evitar llamadas múltiples
        this.viewer.removeEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onModelLoaded);

        // Construir el mapeo de dbId a fragmentos
        this.buildFragmentMapping();
    }

    buildFragmentMapping() {
        const instanceTree = this.viewer.model.getInstanceTree();

        if (!instanceTree) {
            console.error('El árbol de instancias no está disponible.');
            return;
        }

        this._frags = {}; // Reiniciar el mapeo

        const _this = this;

        function traverseTree(nodeId) {
            const fragIds = [];
            instanceTree.enumNodeFragments(nodeId, function (fragId) {
                fragIds.push(fragId);
            });

            if (fragIds.length > 0) {
                _this._frags['dbId' + nodeId] = fragIds;
            }

            instanceTree.enumNodeChildren(nodeId, function (childId) {
                traverseTree(childId);
            });
        }

        traverseTree(instanceTree.getRootId());

        // Agrega este log
        console.log('Mapeo de fragmentos:', this._frags);
    }


    onToolbarCreated() {
        // Crear el botón en la barra de herramientas
        this._button = this.createDigitalTwinsToolbarButton(
            'SensorData-button',
            'https://img.icons8.com/small/32/temperature.png',             
            'Sensor Data'
        );

        // Lógica al hacer clic en el botón
        this._button.onClick = () => {
            this._enabled = !this._enabled; // Alterna el estado
            if (this._enabled) {
                this.showMarkups(true);
                this.viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.updateMarkups.bind(this));
            } else {
                this.showMarkups(false);
                this.viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.updateMarkups.bind(this));
            }
        };
    }

    showMarkups(show) {
        // Limpia los labels previos
        this.clearLabels();

        if (!show) return;

        const sensorDataArray = SensorDataClient.getSensorData().data;
        const instanceTree = this.viewer.model.getInstanceTree();

        if (!instanceTree) {
            console.error('El árbol de instancias no está disponible.');
            return;
        }

        // Crear los markups para cada dbId
        sensorDataArray.forEach((sensorData) => {
            const dbId = sensorData.dbId;
            this.createMarkup(dbId, sensorData);
        });

        // Actualizar las posiciones iniciales
        this.updateMarkups();
        console.log('Sensor data markups applied');
    }


    createMarkup(dbId, sensorData) {
        const bbox = this.getModifiedWorldBoundingBox(dbId);
        if (!bbox || bbox.isEmpty()) {
            console.warn(`No se pudo obtener el boundingBox para dbId: ${dbId}`);
            return;
        }

        const position = bbox.getCenter(new THREE.Vector3());

        // Crear un label (markup) en HTML
        const label = document.createElement('div');
        label.className = 'sensorMarkup';

        // Construir el contenido del label con los tres valores
        const temperatureText = `Temperature: ${sensorData.temperature}°C`;
        const co2Text = `Co2: ${sensorData.co2} ppm`;
        const humidityText = `humidity: ${sensorData.humidity}%`;

        label.innerHTML = `
        <div class="${this.getClassForValue('temperature', sensorData.temperature)}">
            ${temperatureText}
        </div>
        <div class="${this.getClassForValue('co2', sensorData.co2)}">
            ${co2Text}
        </div>
        <div class="${this.getClassForValue('humidity', sensorData.humidity)}">
            ${humidityText}
        </div>
    `;

        label.style.position = 'absolute';
        label.style.pointerEvents = 'auto';
        label.style.zIndex = '10';

        // Agregar el label al contenedor del visor
        const viewerContainer = this.viewer.clientContainer;
        viewerContainer.appendChild(label);

        // Guardar referencia al label para actualizaciones posteriores
        this._labels.push({ label, dbId });
    }


    updateMarkup(dbId) {
        const sensorData = SensorDataClient.data.find(item => item.dbId === dbId);
        if (!sensorData) return;

        const existingLabelInfo = this._labels.find(labelInfo => labelInfo.dbId === dbId);

        if (existingLabelInfo) {
            const label = existingLabelInfo.label;

            // Actualizar el contenido del label
            const temperatureText = `Temperature: ${sensorData.temperature}°C`;
            const co2Text = `Co2: ${sensorData.co2} ppm`;
            const humidityText = `humidity: ${sensorData.humidity}%`;

            label.innerHTML = `
            <div class="${this.getClassForValue('temperature', sensorData.temperature)}">
                ${temperatureText}
            </div>
            <div class="${this.getClassForValue('co2', sensorData.co2)}">
                ${co2Text}
            </div>
            <div class="${this.getClassForValue('humidity', sensorData.humidity)}">
                ${humidityText}
            </div>
        `;
        } else {
            // Crear un nuevo label
            this.createMarkup(dbId, sensorData);
            // Actualizar posiciones
            this.updateMarkups();
        }
    }


    
    

    getModifiedWorldBoundingBox(dbId) {
        const fragList = this.viewer.model.getFragmentList();
        const bbox = new THREE.Box3();

        const fragIds = this._frags['dbId' + dbId];

        if (!fragIds || fragIds.length === 0) {
            console.warn(`No se encontraron fragmentos para dbId: ${dbId}`);
            return null;
        }

        fragIds.forEach((fragId) => {
            const fragBBox = new THREE.Box3();
            fragList.getWorldBounds(fragId, fragBBox);
            bbox.union(fragBBox);
        });

        return bbox;
    }


    updateMarkups() {
        this._labels.forEach(({ label, dbId }) => {
            const bbox = this.getModifiedWorldBoundingBox(dbId);
            if (!bbox || bbox.isEmpty()) return;

            const position = bbox.getCenter(new THREE.Vector3());
            const screenPosition = this.viewer.worldToClient(position);

            // Actualiza la posición en pantalla
            label.style.left = `${Math.floor(screenPosition.x - label.offsetWidth / 2)}px`;
            label.style.top = `${Math.floor(screenPosition.y - label.offsetHeight / 2)}px`;
        });
    }


    clearLabels() {
        // Eliminar todos los labels creados
        this._labels.forEach(({ label }) => {
            if (label.parentNode) {
                label.parentNode.removeChild(label);
            }
        });
        this._labels = [];
    }

    getClassForValue(type, value) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'maintenance'; // Clase para valores no disponibles
        }

        value = parseFloat(value);

        switch (type) {
            case 'temperature':
                if (value >= 30) return 'temperatureHigh';
                if (value >= 27) return 'temperatureYellow';
                if (value >= 20) return 'temperatureOk';
                if (value >= 15) return 'temperatureBlue';
                return 'temperatureLow';
            case 'co2':
                if (value >= 1000) return 'co2High';
                if (value >= 800) return 'co2Medium';
                return 'co2Low';
            case 'humidity':
                if (value >= 70) return 'humidityHigh';
                if (value >= 30) return 'humidityOk';
                return 'humidityLow';
            default:
                return 'sensorValue';
        }
    }


    getLabelTextForType(sensorData, type) {
        switch (type) {
            case 'temperature':
                return `${sensorData.temperature}°C`;
            case 'co2':
                return `${sensorData.co2} ppm`;
            case 'humidity':
                return `${sensorData.humidity}%`;
            default:
                return '';
        }
    }


}
Autodesk.Viewing.theExtensionManager.registerExtension('SensorDataExtension', SensorDataExtension);
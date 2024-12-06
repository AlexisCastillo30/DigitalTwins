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

            // Verificar si los valores están llegando correctamente
            if (!sensorData || !sensorData.dbId || !sensorData.data) {
                console.warn('Datos de sensor incompletos:', sensorData);
                return;
            }

            // Actualizar los datos de temperatura en el cliente
            SensorDataClient.update(sensorData);

            // Actualizar los markups sólo si el botón está activo
            if (this._enabled) {
                this.updateMarkup(sensorData.dbId); // Asegurarse de usar dbId y los datos correctos
            }
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

        this._button.onClick = () => {
            this._enabled = !this._enabled; // Alterna el estado
            if (this._enabled) {
                // Mostrar los markups al activar
                this.showMarkups(true);
                this.viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.updateMarkups.bind(this));
            } else {
                // Ocultar los markups al desactivar
                this.showMarkups(false);
                this.viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.updateMarkups.bind(this));
            }
        };
    }
    showMarkups(show) {
        this.clearLabels();

        if (!show) return;

        // Obtener los datos más recientes almacenados
        const sensorDataArray = SensorDataClient.getLatestData();

        if (!sensorDataArray || sensorDataArray.length === 0) {
            console.warn("No hay datos de sensores disponibles.");
            return;
        }

        // Crear markups para cada dbId
        sensorDataArray.forEach(sensorData => {
            this.createMarkup(sensorData.dbId, sensorData.data);
        });

        // Actualizar posiciones iniciales
        this.updateMarkups();
        console.log("Markups de datos de sensores aplicados.");
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
        label.innerHTML = `
            <div class="sensorTitle">Sensor Data</div>
                <div class="sensorSectionContainer">
                    <div class="sensorSection">
                        <div class="title">Temperature</div>
                        <div class="value ${this.getClassForValue('temperature', sensorData.temperature)}">${sensorData.temperature}°C</div>
                    </div>
                    <div class="sensorSection">
                        <div class="title">CO2</div>
                        <div class="value ${this.getClassForValue('co2', sensorData.co2)}">${sensorData.co2} ppm</div>
                    </div>
                    <div class="sensorSection">
                        <div class="title">Humidity</div>
                        <div class="value ${this.getClassForValue('humidity', sensorData.humidity)}">${sensorData.humidity}%</div>
                    </div>
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
        if (!this._enabled) return; // No actualizar si el botón está desactivado

        const sensorData = SensorDataClient.data.find(item => item.dbId === dbId);
        if (!sensorData) return;

        const existingLabelInfo = this._labels.find(labelInfo => labelInfo.dbId === dbId);

        if (existingLabelInfo) {
            const label = existingLabelInfo.label;

            // Actualizar las clases y contenido de los valores
            label.innerHTML = `
            <div class="sensorTitle">Sensor Data</div>
            <div class="sensorSectionContainer">
            <div class="sensorSection">
                <div class="title">Temperature</div>
                <div class="value ${this.getClassForValue('temperature', sensorData.data.temperature)}">${sensorData.data.temperature}°C</div>
            </div>
            <div class="sensorSection">
                <div class="title">CO2</div>
                <div class="value ${this.getClassForValue('co2', sensorData.data.co2)}">${sensorData.data.co2} ppm</div>
            </div>
            <div class="sensorSection">
                <div class="title">Humidity</div>
                <div class="value ${this.getClassForValue('humidity', sensorData.data.humidity)}">${sensorData.data.humidity}%</div>
            </div>
            </div>
        `;
            console.log(`Markup actualizado para dbId: ${dbId}`);
        } else {
            // Crear un nuevo label si no existe
            this.createMarkup(dbId, sensorData.data);
            this.updateMarkups(); // Actualizar posiciones
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

        const classesByType = {
            temperature: [
                { max: Infinity, min: 30, className: 'temperatureHigh' },      // Rojo
                { max: 30, min: 27, className: 'temperatureYellow' },          // Amarillo
                { max: 27, min: 20, className: 'temperatureGreen' },           // Verde
                { max: 20, min: 15, className: 'temperatureCyan' },            // Cyan
                { max: 15, min: -Infinity, className: 'temperatureBlueDark' }  // Azul oscuro
            ],
            co2: [
                { max: Infinity, min: 1000, className: 'co2High' },
                { max: 1000, min: 800, className: 'co2Medium' },
                { max: 800, min: -Infinity, className: 'co2Low' }
            ],
            humidity: [
                { max: Infinity, min: 70, className: 'humidityHigh' },
                { max: 70, min: 30, className: 'humidityOk' },
                { max: 30, min: -Infinity, className: 'humidityLow' }
            ]
        };

        // Si el tipo no está definido, usa una clase por defecto
        if (!classesByType[type]) {
            return 'sensorValue';
        }

        // Buscar la clase correspondiente al rango
        const ranges = classesByType[type];
        for (const range of ranges) {
            if (value >= range.min && value < range.max) {
                return range.className;
            }
        }

        // Clase por defecto si no encaja en ningún rango
        return 'sensorValue';
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
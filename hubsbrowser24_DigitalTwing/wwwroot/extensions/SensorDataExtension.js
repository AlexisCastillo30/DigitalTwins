import { BaseExtension } from './BaseExtension.js';
import { SensorDataClient } from './SensorDataClient.js';

class SensorDataExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._enabled = false;
        this._frags = {}; // Fragmentos asociados a los dbId
        this._labels = []; // Almacena los Markups creados
        this._pushpins = []; // Almacena los Pushpins creados
        this._activeSensors = new Set(); // Almacena los dbIds de sensores activados
    }
    async load() {
        super.load();

        // Escuchar evento de carga completa del modelo
        this.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onModelLoaded.bind(this));

        // Conectar a SignalR
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl("/sensorHub")
            .build();

        // Escuchar nuevas señales y actualizar Markups
        this.connection.on("ReceiveSensorData", (sensorData) => {
            console.log('Datos de sensor recibidos:', sensorData);

            if (!sensorData || !sensorData.dbId || !sensorData.data) {
                console.warn('Datos de sensor incompletos:', sensorData);
                return;
            }

            // Actualizar datos en el cliente (siempre)
            SensorDataClient.update(sensorData);

            // Actualizar contenido del Markup sin alterar visibilidad
            this.updateMarkup(sensorData.dbId, sensorData.data);

            // Crear o actualizar Pushpins solo si el botón está activado
            if (this._enabled) {
                const existingPushpin = this._pushpins.find(pin => pin.dbId === sensorData.dbId);
                if (!existingPushpin) {
                    this.createPushpin(sensorData.dbId, sensorData.data);
                } else {
                    this.updatePushpinPosition(existingPushpin.pushpin);
                }
            }
        });
        
        await this.connection.start();

        console.log('SensorDataExtension loaded');
        return true;
    }


    unload() {
        super.unload();

        if (this.connection) {
            this.connection.stop();
        }

        this.clearLabels();
        this.clearPushpins();
        this.viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.updatePositions.bind(this));

        if (this._button) {
            this.removeToolbarButton(this._button);
            this._button = null;
        }

        console.log('SensorDataExtension unloaded');
        return true;
    }

    onModelLoaded() {
        this.viewer.removeEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onModelLoaded);
        this.buildFragmentMapping();
    }

    buildFragmentMapping() {
        const instanceTree = this.viewer.model.getInstanceTree();

        if (!instanceTree) {
            console.error('El árbol de instancias no está disponible.');
            return;
        }

        this._frags = {};

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
        console.log('Mapeo de fragmentos:', this._frags);
    }

    onToolbarCreated() {
        this._button = this.createDigitalTwinsToolbarButton(
            'SensorData-button',
            'https://img.icons8.com/small/32/temperature.png',
            'Sensor Data'
        );

        // Actualizar el estado visual del botón al cargar
        this.updateButtonState();

        this._button.onClick = () => {
            this._enabled = !this._enabled;

            if (this._enabled) {
                this.showPushpins(true);
                this.viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.updatePositions.bind(this));
            } else {
                this.clearPushpins();
                this.clearLabels();
                this.viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.updatePositions.bind(this));
            }

            // Actualizar el estado visual del botón tras el clic
            this.updateButtonState();
        };
    }

    // Nueva función para actualizar el estado visual del botón
    updateButtonState() {
        if (this._button) {
            const buttonElement = this._button.container;

            if (this._enabled) {
                buttonElement.classList.add('button-pressed'); // Agregar clase "hundido"
            } else {
                buttonElement.classList.remove('button-pressed'); // Quitar clase
            }
        }
    }





    showPushpins(show) {
        if (show) {
            const sensorDataArray = SensorDataClient.getLatestData();

            if (!sensorDataArray || sensorDataArray.length === 0) {
                console.warn("No hay datos de sensores disponibles.");
                return;
            }

            sensorDataArray.forEach(sensorData => {
                const existingPushpin = this._pushpins.find(pin => pin.dbId === sensorData.dbId);
                if (!existingPushpin) {
                    // Crear un nuevo pushpin si no existe
                    this.createPushpin(sensorData.dbId, sensorData.data);
                } else {
                    // Reconfigurar el pushpin existente
                    this.reconfigurePushpin(existingPushpin.pushpin, sensorData.dbId, sensorData.data);
                }
            });

            this.updatePositions();
        } else {
            this.clearPushpins();
        }
    }


    reconfigurePushpin(pushpin, dbId, sensorData) {
        // Eliminar cualquier evento anterior (reemplazamos el nodo por uno clonado)
        const newPushpin = pushpin.cloneNode(true);
        pushpin.parentNode.replaceChild(newPushpin, pushpin);

        // Registrar evento de clic para seleccionar el elemento y mostrar/ocultar el markup
        newPushpin.addEventListener('click', () => {
            this.viewer.select([dbId]); // Seleccionar el elemento
            if (this._activeSensors.has(dbId)) {
                this._activeSensors.delete(dbId);
                this.hideMarkup(dbId);
                newPushpin.style.backgroundColor = 'rgba(0, 123, 255, 0.3)'; // Estado apagado
            } else {
                this._activeSensors.add(dbId);
                this.showMarkup(dbId, sensorData);
                newPushpin.style.backgroundColor = 'rgba(255, 0, 0, 0.5)'; // Estado encendido
            }
        });

        // Registrar eventos de previsualización (mouseover y mouseout)
        newPushpin.addEventListener('mouseover', () => {
            this.showMarkupPreview(dbId);
        });

        newPushpin.addEventListener('mouseout', () => {
            this.hideMarkupPreview(dbId);
        });

        // Actualizar la posición del pushpin
        this.updatePushpinPosition(newPushpin);

        // Actualizar la referencia en la lista de pushpins
        const pushpinIndex = this._pushpins.findIndex(pin => pin.pushpin === pushpin);
        if (pushpinIndex !== -1) {
            this._pushpins[pushpinIndex].pushpin = newPushpin;
        }
    }






    createPushpin(dbId, sensorData) {
        const bbox = this.getModifiedWorldBoundingBox(dbId);
        if (!bbox || bbox.isEmpty()) {
            console.warn(`No se pudo obtener el boundingBox para dbId: ${dbId}`);
            return;
        }

        const position = bbox.getCenter(new THREE.Vector3());

        const pushpin = document.createElement('div');
        pushpin.className = 'sensorSphere';
        pushpin.style.position = 'absolute';
        pushpin.style.pointerEvents = 'auto';
        pushpin.style.zIndex = '10';
        pushpin.style.width = '20px';
        pushpin.style.height = '20px';
        pushpin.style.borderRadius = '50%';
        pushpin.style.border = '2px solid rgba(0, 123, 255, 0.9)';
        pushpin.style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
        pushpin.dataset.dbId = dbId;

        pushpin._worldPosition = position.clone();

        // Registrar eventos de clic y previsualización
        pushpin.addEventListener('click', () => {
            this.viewer.select([dbId]); // Seleccionar el elemento
            if (this._activeSensors.has(dbId)) {
                this._activeSensors.delete(dbId);
                this.hideMarkup(dbId);
                pushpin.style.backgroundColor = 'rgba(0, 123, 255, 0.3)'; // Estado apagado
            } else {
                this._activeSensors.add(dbId);
                this.showMarkup(dbId, sensorData);
                pushpin.style.backgroundColor = 'rgba(255, 0, 0, 0.5)'; // Estado encendido
            }
        });

        pushpin.addEventListener('mouseover', () => {
            this.showMarkupPreview(dbId);
        });

        pushpin.addEventListener('mouseout', () => {
            this.hideMarkupPreview(dbId);
        });

        this.viewer.clientContainer.appendChild(pushpin);
        this._pushpins.push({ pushpin, dbId });

        this.updatePushpinPosition(pushpin);
    }




    showMarkupPreview(dbId) {
        const labelInfo = this._labels.find(labelInfo => labelInfo.dbId === dbId);
        if (labelInfo) {
            const { label } = labelInfo;
            label.style.display = 'block'; // Mostrar el markup temporalmente
            this.updateMarkupPosition(label);
        }
    }

    hideMarkupPreview(dbId) {
        const labelInfo = this._labels.find(labelInfo => labelInfo.dbId === dbId);
        if (labelInfo && !this._activeSensors.has(dbId)) {
            const { label } = labelInfo;
            label.style.display = 'none'; // Ocultar el markup si no está activado
        }
    }





    

    updatePushpinPosition(pushpin) {
        const screenPosition = this.viewer.worldToClient(pushpin._worldPosition);

        pushpin.style.left = `${Math.floor(screenPosition.x - 10)}px`;
        pushpin.style.top = `${Math.floor(screenPosition.y - 10)}px`;
    }


    createMarkup(dbId, sensorData) {
        const bbox = this.getModifiedWorldBoundingBox(dbId);
        if (!bbox || bbox.isEmpty()) {
            console.warn(`No se pudo obtener el boundingBox para dbId: ${dbId}`);
            return;
        }

        const position = bbox.getCenter(new THREE.Vector3());

        const label = document.createElement('div');
        label.className = 'sensorMarkup';
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
        label.style.pointerEvents = 'auto'; // Permitir clics en el Markup
        label.style.zIndex = '10';
        label.style.display = 'none'; // Mantenerlo oculto por defecto

        label.addEventListener('click', () => {
            this.viewer.select([dbId]); // Seleccionar el elemento
            console.log(`Elemento con dbId ${dbId} seleccionado.`);
        });

        this.viewer.clientContainer.appendChild(label);

        this._labels.push({ label, dbId });

        label._worldPosition = position.clone();

        this.updateMarkupPosition(label);
    }




    updateMarkup(dbId, sensorData) {
        const labelInfo = this._labels.find(labelInfo => labelInfo.dbId === dbId);

        if (!labelInfo) {
            // Si no existe, crear el Markup pero mantenerlo oculto
            this.createMarkup(dbId, sensorData);
        } else {
            // Actualizar el contenido del Markup
            const { label } = labelInfo;
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

            // Actualizar posición solo si el Markup está visible
            if (label.style.display === 'block') {
                this.updateMarkupPosition(label);
            }
        }
    }
    

    showMarkup(dbId, sensorData) {
        const labelInfo = this._labels.find(labelInfo => labelInfo.dbId === dbId);

        if (!labelInfo) {
            this.createMarkup(dbId, sensorData);
        } else {
            const { label } = labelInfo;
            label.style.display = 'block'; // Mostrar el Markup
            label.style.opacity = '1'; // Restaurar opacidad completa
            this.updateMarkupPosition(label);
        }
    }

    
    
    updateMarkupPosition(label) {
        const screenPosition = this.viewer.worldToClient(label._worldPosition);

        label.style.left = `${Math.floor(screenPosition.x - label.offsetWidth / 2)}px`;
        label.style.top = `${Math.floor(screenPosition.y - label.offsetHeight - 30)}px`; // Posición un poco arriba del Pushpin
    }



    updatePositions() {
        this._pushpins.forEach(({ pushpin }) => {
            this.updatePushpinPosition(pushpin);
        });

        this._labels.forEach(({ label, dbId }) => {
            this.updateMarkupPosition(label);
        });
    }


    hideMarkup(dbId) {
        const labelInfo = this._labels.find(labelInfo => labelInfo.dbId === dbId);
        if (labelInfo) {
            const { label } = labelInfo;
            label.style.display = 'none'; // Ocultar el Markup
        }
    }



    clearPushpins() {
        this._pushpins.forEach(({ pushpin }) => {
            if (pushpin.parentNode) {
                pushpin.parentNode.removeChild(pushpin);
            }
        });
        this._pushpins = [];
    }

    clearLabels() {
        this._labels.forEach(({ label }) => {
            if (label.parentNode) {
                label.parentNode.removeChild(label);
            }
        });
        this._labels = [];
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

    getClassForValue(type, value) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'maintenance';
        }

        value = parseFloat(value);

        const classesByType = {
            temperature: [
                { max: Infinity, min: 30, className: 'temperatureHigh' },
                { max: 30, min: 27, className: 'temperatureYellow' },
                { max: 27, min: 20, className: 'temperatureGreen' },
                { max: 20, min: 15, className: 'temperatureCyan' },
                { max: 15, min: -Infinity, className: 'temperatureBlueDark' }
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

        if (!classesByType[type]) {
            return 'sensorValue';
        }

        const ranges = classesByType[type];
        for (const range of ranges) {
            if (value >= range.min && value < range.max) {
                return range.className;
            }
        }

        return 'sensorValue';
    }
}
Autodesk.Viewing.theExtensionManager.registerExtension('SensorDataExtension', SensorDataExtension);

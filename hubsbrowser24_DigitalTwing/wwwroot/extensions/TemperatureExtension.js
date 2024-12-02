import { BaseExtension } from './BaseExtension.js';
import { TemperatureData } from './TemperatureData.js';

class TemperatureExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._enabled = false; // Controla si los markups están activos
        this._overlayName = 'temperature-markups'; // Nombre para los overlays
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
            TemperatureData.update(sensorData);

            // Si la extensión está habilitada, actualizar los markups
            if (this._enabled) {
                this.showIcons(true);
            }
        });

        await this.connection.start();

        console.log('TemperatureExtension loaded');
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
        this.viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.updateIcons.bind(this));

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
            'Temperature-button',
            'https://img.icons8.com/small/32/temperature.png',
            'Temperature'
        );

        // Lógica al hacer clic en el botón
        this._button.onClick = () => {
            this._enabled = !this._enabled; // Alterna el estado
            if (this._enabled) {
                this.showIcons(true);
                this.viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.updateIcons.bind(this));
            } else {
                this.showIcons(false);
                this.viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.updateIcons.bind(this));
            }
        };
    }

    showIcons(show) {
        // Limpia los labels previos
        this.clearLabels();

        if (!show) return;

        const temperatureData = TemperatureData.getTemperatureData();
        console.log('Datos de temperatura:', temperatureData);
        const instanceTree = this.viewer.model.getInstanceTree();

        if (!instanceTree) {
            console.error('El árbol de instancias no está disponible.');
            return;
        }

        // Crear los markups para cada dbId
        temperatureData.icons.forEach((icon) => {
            const bbox = this.getModifiedWorldBoundingBox(icon.dbId);
            if (!bbox || bbox.isEmpty()) {
                console.warn(`No se pudo obtener el boundingBox para dbId: ${icon.dbId}`);
                return;
            }

            const position = bbox.getCenter(new THREE.Vector3());

            // Crear un label (markup) en HTML
            const label = document.createElement('div');
            label.className = 'temperatureBorder'; // Clase base para el label
            label.innerHTML = `
                <div class="${this.getTemperatureClass(icon.label)}">
                    ${icon.label}
                </div>
            `;
            label.style.position = 'absolute';
            label.style.pointerEvents = 'auto';
            label.style.zIndex = '10';

            // Agregar el label al contenedor del visor
            const viewerContainer = this.viewer.clientContainer;
            viewerContainer.appendChild(label);

            // Guardar referencia al label para actualizaciones posteriores
            this._labels.push({ label, dbId: icon.dbId });
        });

        // Actualizar las posiciones iniciales
        this.updateIcons();
        console.log('Temperature markups applied');
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

    updateIcons() {
        // Reposicionar los markups al cambiar la cámara
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

    getTemperatureClass(label) {
        const value = parseInt(label.replace(/\D/g, ''), 10); // Extraer el número de la etiqueta

        // Si el valor no es un número válido (NaN), devolver clase 'maintenance'
        if (isNaN(value)) return 'maintenance';

        // Clasificar según el rango de temperatura
        if (value >= 30) return 'temperatureHigh';   // Rojo
        if (value >= 27) return 'temperatureYellow'; // Amarillo cálido
        if (value >= 20) return 'temperatureOk';     // Verde
        if (value >= 15) return 'temperatureBlue';   // Azul
        return 'temperatureLow';                     // Azul oscuro
    }
}


Autodesk.Viewing.theExtensionManager.registerExtension('TemperatureExtension', TemperatureExtension);
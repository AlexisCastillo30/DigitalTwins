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
        console.log('TemperatureExtension loaded');
        return true;
    }

    unload() {
        super.unload();

        // Limpia los markups al descargar la extensión
        this.clearLabels();
        this.viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.updateIcons.bind(this));

        if (this._button) {
            this.removeToolbarButton(this._button);
            this._button = null;
        }

        console.log('TemperatureExtension unloaded');
        return true;
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

        if (!show) return; // Si deshabilitado, salir

        const temperatureData = TemperatureData.getTemperatureData();
        const instanceTree = this.viewer.model.getInstanceTree();
        const fragList = this.viewer.model.getFragmentList();

        if (!instanceTree || !fragList) {
            console.error('El árbol de instancias o la lista de fragmentos no está disponible.');
            return;
        }

        // Crear los markups para cada dbId
        temperatureData.icons.forEach((icon) => {
            this._frags['dbId' + icon.dbId] = []; // Inicializa los fragmentos para el dbId

            instanceTree.enumNodeFragments(icon.dbId, (fragId) => {
                this._frags['dbId' + icon.dbId].push(fragId); // Almacena los fragmentos
            });

            // Obtener el centro del boundingBox
            const bbox = this.getModifiedWorldBoundingBox(icon.dbId);
            if (!bbox || bbox.isEmpty()) {
                console.warn(`No se pudo obtener el boundingBox para dbId: ${icon.dbId}`);
                return;
            }

            const position = bbox.getCenter(new THREE.Vector3());

            // Crear un label (markup) en HTML
            const label = document.createElement('div');
            label.className = `temperatureBorder`; // Clase base para el label
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

        this._frags['dbId' + dbId]?.forEach((fragId) => {
            const fragBBox = new THREE.Box3();
            fragList.getWorldBounds(fragId, fragBBox);
            bbox.union(fragBBox); // Unir bounding boxes de los fragmentos
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

        // Si el valor no es un número válido (NaN), devolver verde (mantenimiento)
        if (isNaN(value)) return 'maintenance';

        // Clasificar según el rango de temperatura
        if (value >= 30) return 'temperatureHigh';   // Rojo
        if (value >= 27) return 'temperatureYellow'; // Amarillo cálido
        if (value >= 20) return 'temperatureOk';     // Azul
        if (value >= 15) return 'temperatureBlue'; // Amarillo frío
        return 'temperatureLow';                   // Rojo (frío extremo)
    } 
}
Autodesk.Viewing.theExtensionManager.registerExtension('TemperatureExtension', TemperatureExtension);

export class SensorHeatmapsPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(viewer, id, title, options) {
        super(viewer.container, id, title, options);

        this.container.style.left = '10px';
        this.container.style.top = '10px';
        this.container.style.width = '300px';
        this.container.style.height = '200px';
        this.container.style.resize = 'none';
        this.container.style.backgroundColor = '#2b2b2b';
        this.container.style.borderRadius = '8px';
        this.container.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
        this.container.style.color = '#eee';

        this.onChannelChanged = null;

        this.initialize();
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);

        const content = document.createElement('div');
        content.style.padding = '10px';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';

        content.innerHTML = `
            <label for="heatmap-channel" style="color: #ccc; font-size: 14px; margin-bottom: 5px;">Channel:</label>
            <select id="heatmap-channel" style="width: 100%; padding: 5px; font-size: 14px; border-radius: 4px; border: 1px solid #444; background-color: #3b3b3b; color: #fff;">
                <option value="temperature">Temperature</option>
                <option value="humidity">Humidity</option>
                <option value="co2">CO2</option>
            </select>
            <canvas id="heatmap-legend" width="280" height="50" style="margin-top: 10px;"></canvas>
        `;

        this.container.appendChild(content);

        this.dropdown = this.container.querySelector('#heatmap-channel');
        this.canvas = this.container.querySelector('#heatmap-legend');

        this.dropdown.addEventListener('change', () => {
            if (this.onChannelChanged) {
                this.onChannelChanged(this.dropdown.value);
            }
        });
    }

    updateLegend(labels, colorStops) {
        const context = this.canvas.getContext('2d');
        context.clearRect(0, 0, 280, 50);
        const gradient = context.createLinearGradient(0, 0, 280, 0);
        colorStops.forEach((color, index) => {
            gradient.addColorStop(index / (colorStops.length - 1), color);
        });
        context.fillStyle = gradient;
        context.fillRect(0, 20, 280, 20);
        context.fillStyle = '#fff';
        context.font = '12px Arial';
        labels.forEach((label, index) => {
            const x = (index / (labels.length - 1)) * 280;
            context.fillText(label, x - context.measureText(label).width / 2, 15);
        });
    }
}

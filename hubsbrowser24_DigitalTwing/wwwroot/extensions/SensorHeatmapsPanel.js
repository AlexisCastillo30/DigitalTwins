export class SensorHeatmapsPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(viewer, id, title, options) {
        super(viewer.container, id, title, options);
        this.container.style.left = '10px';
        this.container.style.top = '10px';
        this.container.style.width = '300px';
        this.container.style.height = '150px';
        this.container.style.resize = 'none';
        this.container.style.backgroundColor = '#333';

        this.onChannelChanged = null;

        this.initialize();
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);

        const content = document.createElement('div');
        content.style.padding = '10px';
        content.innerHTML = `
            <label for="heatmap-channel">Channel:</label>
            <select id="heatmap-channel" style="margin-left: 10px;">
                <option value="temperature">Temperature</option>
                <option value="humidity">Humidity</option>
                <option value="co2">CO2</option>
            </select>
        `;
        this.container.appendChild(content);

        this.dropdown = document.getElementById('heatmap-channel');
        this.dropdown.addEventListener('change', () => {
            if (this.onChannelChanged) {
                this.onChannelChanged(this.dropdown.value);
            }
        });
    }

    updateChannels(channels) {
        this.dropdown.innerHTML = '';
        channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = channel.name;
            this.dropdown.appendChild(option);
        });
    }
}

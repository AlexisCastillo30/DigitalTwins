export class TemperatureData {
    static icons = [];

    static getTemperatureData() {
        return { icons: this.icons };
    }

    static update(sensorData) {
        // Actualizar los datos de temperatura con el nuevo sensorData
        const dbId = sensorData.dbId;
        const temperature = sensorData.data.temperature;
        const label = `${temperature}°C`;

        // Buscar si ya existe un icono para este dbId
        const existingIconIndex = this.icons.findIndex(icon => icon.dbId === dbId);
        if (existingIconIndex !== -1) {
            // Actualizar el icono existente
            this.icons[existingIconIndex].label = label;
        } else {
            // Agregar un nuevo icono
            this.icons.push({
                dbId: dbId,
                label: label,
                css: "fas fa-thermometer-full"
            });
        }
    }
}

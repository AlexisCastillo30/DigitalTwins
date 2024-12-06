export class SensorDataClient {
    static data = [];

    static getSensorData() {
        return { data: this.data };
    }

    static update(sensorData) {
        const dbId = sensorData.dbId;
        const temperature = sensorData.data.temperature;
        const co2 = sensorData.data.co2;
        const humidity = sensorData.data.humidity;

        // Buscar si ya existe un dato para este dbId
        const existingIndex = this.data.findIndex(item => item.dbId === dbId);
        if (existingIndex !== -1) {
            // Actualizar los datos existentes
            this.data[existingIndex] = {
                dbId: dbId,
                temperature: temperature,
                co2: co2,
                humidity: humidity
            };
        } else {
            // Agregar nuevos datos
            this.data.push({
                dbId: dbId,
                temperature: temperature,
                co2: co2,
                humidity: humidity
            });
        }
    }
}

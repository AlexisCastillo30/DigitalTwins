export class SensorDataClient {
    static data = []; // Almacena todos los datos de los sensores

    // Obtener los datos de sensores según un canal específico (temperatura, CO2, humedad)
    static getSensorData(channel) {
        if (!channel) {
            console.warn("Canal no especificado. Retornando todos los datos.");
            return this.data;
        }

        return this.data.map(sensor => ({
            id: sensor.dbId,
            value: sensor.data[channel] || null // Si el canal no existe, retorna null
        }));
    }

    // Obtener datos históricos del sensor
    static getSensorData(sensorId) {
        const sensor = this.data.find(item => item.dbId === sensorId);
        if (!sensor) {
            console.warn(`No se encontraron datos históricos para el sensor con ID: ${sensorId}`);
            return [];
        }

        return sensor.historicalData || []; // Devuelve datos históricos si existen
    }




    // Actualizar o agregar datos de sensores
    static update(sensorData) {
        if (!sensorData || !sensorData.dbId) {
            console.error("Datos de sensor inválidos:", sensorData);
            return;
        }

        const dbId = sensorData.dbId;
        const temperature = sensorData.data?.temperature ?? null;
        const co2 = sensorData.data?.co2 ?? null;
        const humidity = sensorData.data?.humidity ?? null;

        // Buscar si ya existe un dato para este dbId
        const existingSensor = this.data.find(sensor => sensor.dbId === dbId);

        if (existingSensor) {
            // Actualizar los datos existentes
            Object.assign(existingSensor.data, {
                temperature: temperature,
                co2: co2,
                humidity: humidity
            });
            console.log(`Datos actualizados para dbId: ${dbId}`, existingSensor);
        } else {
            // Agregar nuevos datos
            this.data.push({
                dbId: dbId,
                data: {
                    temperature: temperature,
                    co2: co2,
                    humidity: humidity
                }
            });
            console.log(`Nuevo sensor agregado: dbId: ${dbId}`, this.data);
        }
    }

    // Obtener los datos más recientes almacenados
    static getLatestData() {
        return this.data;
    }

    // Depurar los datos almacenados
    static logData() {
        console.log("Datos almacenados en SensorDataClient:", this.data);
    }
}

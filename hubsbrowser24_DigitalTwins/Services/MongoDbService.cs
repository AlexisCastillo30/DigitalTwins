using MongoDB.Bson;
using MongoDB.Driver;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace hubsbrowser24.Services
{
    public class MongoDbService
    {
        private readonly IMongoCollection<BsonDocument> _sensorsCollection;

        public MongoDbService(IConfiguration config)
        {
            var client = new MongoClient(config.GetValue<string>("MongoDB:ConnectionString"));
            var database = client.GetDatabase(config.GetValue<string>("MongoDB:DatabaseName"));
            _sensorsCollection = database.GetCollection<BsonDocument>("Sensors");
        }

        // Método para insertar nuevos datos de sensores
        public async Task InsertSensorDataAsync(BsonDocument sensorData)
        {
            await _sensorsCollection.InsertOneAsync(sensorData);
        }

        // Método para obtener los datos de temperatura desde MongoDB
        public async Task<List<BsonDocument>> GetSensorsDataAsync()
        {
            return await _sensorsCollection.Find(new BsonDocument()).ToListAsync();
        }

        // Método para obtener los datos de temperatura en el formato que necesita el visor
        public async Task<List<object>> GetTemperatureDataAsync()
        {
            var sensorsData = await GetSensorsDataAsync();

            var temperatureData = new List<object>();

            foreach (var sensor in sensorsData)
            {
                // Manejar posibles valores nulos o tipos diferentes
                if (sensor.Contains("temperature") && sensor.Contains("dbId"))
                {
                    var temperature = sensor["temperature"].AsDouble;
                    var dbId = sensor["dbId"].AsInt32;

                    // Generar el objeto con la estructura necesaria para el visor
                    temperatureData.Add(new
                    {
                        dbId = dbId,
                        label = $"{temperature}°C",
                        css = "fas fa-thermometer-full"
                    });
                }
            }

            return temperatureData;
        }
    }
}
using Microsoft.AspNetCore.Mvc;
using hubsbrowser24.Services;
using MongoDB.Bson;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using hubsbrowser24.Hubs;
using hubsbrowser24.Models;


namespace hubsbrowser24.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SensorsController : ControllerBase
    {
        private readonly MongoDbService _mongoDbService;
        private readonly IHubContext<SensorHub> _hubContext;

        public SensorsController(MongoDbService mongoDbService, IHubContext<SensorHub> hubContext)
        {
            _mongoDbService = mongoDbService;
            _hubContext = hubContext;
        }

        // Endpoint para obtener los datos de temperatura
        [HttpGet("temperature")]
        public async Task<IActionResult> GetTemperatureData()
        {
            var data = await _mongoDbService.GetTemperatureDataAsync();
            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> InsertSensorData([FromBody] SensorDataModel sensorData)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Convertir el modelo a BsonDocument
            var document = sensorData.ToBsonDocument();

            await _mongoDbService.InsertSensorDataAsync(document);

            // Notificar a los clientes que hay nuevos datos
            await _hubContext.Clients.All.SendAsync("ReceiveSensorData", sensorData);

            return Ok();
        }
    }
}
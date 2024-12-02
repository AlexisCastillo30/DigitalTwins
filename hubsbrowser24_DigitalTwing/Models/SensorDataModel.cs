using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace hubsbrowser24.Models
{
    public class SensorDataModel
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        [BsonIgnoreIfNull]
        [JsonIgnore]
        public string? Id { get; set; }

        [BsonElement("dbId")]
        public int dbId { get; set; }

        public string title { get; set; }
        public SensorData data { get; set; }
    }

    public class SensorData
    {
        public double latitude { get; set; }
        public double longitude { get; set; }
        public double co2 { get; set; }
        public double humidity { get; set; }
        public int light_level { get; set; }
        public string pir { get; set; }
        public double pressure { get; set; }
        public double temperature { get; set; }
        public int tvoc { get; set; }
        public int battery { get; set; }
        public TcMetadata tcMetadata { get; set; }
    }

    public class TcMetadata
    {
        public Http http { get; set; }
    }

    public class Http
    {
        public string path { get; set; }
    }
}

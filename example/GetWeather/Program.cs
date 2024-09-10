using System.Text.Json;
using Microsoft.Extensions.Logging;
using StepWise.Core;

var loggerFactory = LoggerFactory.Create(builder =>
{
    builder.AddConsole();
});

var getWeather = new Workflow();
var workflowEngine = WorkflowEngine.CreateFromInstance(getWeather, maxConcurrency: 3, loggerFactory.CreateLogger<WorkflowEngine>());

var input = new Dictionary<string, object>
{
    { "cities", new string[] { "Seattle", "Redmond" } }
};

await foreach( (var stepName, var value) in workflowEngine.ExecuteStepAsync(nameof(Workflow.GetWeatherAsync), input))
{
    if (stepName == nameof(Workflow.GetWeatherAsync) && value is Workflow.Weather[] weathers)
    {
        Console.WriteLine("Weather forecast:");
        foreach (var weather in weathers)
        {
            Console.WriteLine($"City: {weather.City}, Date: {weather.Date}, Forecast: {weather.Forecast}");
        }

        break;
    }

    Console.WriteLine($"Step {stepName} is completed");

    var json = JsonSerializer.Serialize(value, new JsonSerializerOptions { WriteIndented = true });

    Console.WriteLine($"""
        Value:
        {json}
        """);
}

public class Workflow
{
    [Step]
    public async Task<DateTime> GetCurrentDateAsync()
    {
        return DateTime.Now;
    }

    [Step]
    [DependOn(nameof(GetCurrentDateAsync))]
    public async Task<Weather[]> GetWeatherAsync(
        string[] cities,
        [FromStep(nameof(GetCurrentDateAsync))] DateTime date)
    {
        return cities.Select(city => new Weather(city, date, "Sunny")).ToArray();
    }

    public class Weather
    {
        public Weather(string city, DateTime date, string forecast)
        {
            City = city;
            Date = date;
            Forecast = forecast;
        }
        public string City { get; }

        public DateTime Date { get; }

        public string Forecast { get; }
    }
}

using System.Text.Json;
using Microsoft.Extensions.Logging;
using StepWise.Core;

var loggerFactory = LoggerFactory.Create(builder =>
{
    builder.AddConsole();
});

var getWeather = new Workflow();
var workflowEngine = StepWiseEngine.CreateFromInstance(getWeather, maxConcurrency: 3, loggerFactory.CreateLogger<StepWiseEngine>());
var input = new Dictionary<string, StepVariable>
{
    { "cities", StepVariable.Create(new string[] { "Seattle", "Redmond" }) }
};

await foreach(var stepResult in workflowEngine.ExecuteAsync(nameof(Workflow.GetWeatherAsync), input))
{
    if (stepResult.StepName == nameof(Workflow.GetWeatherAsync) && stepResult.Result?.As<Workflow.Weather[]>() is Workflow.Weather[] weathers)
    {
        Console.WriteLine("Weather forecast:");
        foreach (var weather in weathers)
        {
            Console.WriteLine($"City: {weather.City}, Date: {weather.Date}, Forecast: {weather.Forecast}");
        }

        break;
    }
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

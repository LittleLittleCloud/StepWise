// Copyright (c) LittleLittleCloud. All rights reserved.
// Program.cs

using System.Text.Json;
using Microsoft.Extensions.Logging;
using StepWise.Core;

var loggerFactory = LoggerFactory.Create(builder =>
{
    builder.AddConsole();
});

var getWeather = new Workflow();
var workflowEngine = StepWiseEngine.CreateFromInstance(getWeather, loggerFactory.CreateLogger<StepWiseEngine>());

StepVariable[] input =
[
    StepVariable.Create("cities", new string[] { "Seattle", "Redmond" })
];

await foreach (var stepRun in workflowEngine.ExecuteAsync(nameof(Workflow.GetWeatherAsync), input))
{
    if (stepRun.Name == nameof(Workflow.GetWeatherAsync) && stepRun.Variable?.As<Workflow.Weather[]>() is Workflow.Weather[] weathers)
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

using Microsoft.Extensions.Logging;
using StepWise.Core;

var loggerFactory = LoggerFactory.Create(builder =>
{
    builder.AddConsole();
});

var workflow = new GetWeatherWorkflow(logger: loggerFactory.CreateLogger<WorkflowEngine>());
var weathers = await workflow.ExecuteGetWeather(["Seattle", "Redmond"]);

foreach (var weather in weathers)
{
    Console.WriteLine($"The weather in {weather.City} on {weather.Date} is {weather.Forecast}.");
}

public partial class GetWeatherWorkflow
{
    [Step]
    public async Task<DateTime> GetCurrentDateAsync()
    {
        return DateTime.Now;
    }

    [Step]
    public async Task<Weather[]> GetWeather(
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

//auto-generated
public partial class GetWeatherWorkflow
{
    private readonly Workflow _workflow;
    private readonly WorkflowEngine _workflowEngine;

    /// <summary>
    /// Allow user to override the default constructor
    /// </summary>
    public GetWeatherWorkflow(ILogger<WorkflowEngine>? logger = null)
    {
        _workflow = Workflow.CreateFromInstance(this);
        _workflowEngine = new WorkflowEngine(_workflow, logger: logger);
    }

    public async Task<Weather[]> ExecuteGetWeather(
        string[]? cities = null,
        DateTime? date = null)
    {
        var parameters = new Dictionary<string, object>();
        if (cities != null)
        {
            parameters[nameof(cities)] = cities;
        }

        if (date != null)
        {
            parameters[nameof(date)] = date;
        }

        return await _workflowEngine.ExecuteStepAsync<Weather[]>(
            nameof(GetWeather),
            parameters);
    }
}

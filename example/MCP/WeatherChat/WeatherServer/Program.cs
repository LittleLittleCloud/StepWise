// Copyright (c) LittleLittleCloud. All rights reserved.
// Program.cs

using System.Text.Json;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ModelContextProtocol;
using OpenAI;
using StepWise.Core;
using StepWise.Core.Extension;

var loggerFactory = LoggerFactory.Create(builder =>
{
    builder.AddConsole().SetMinimumLevel(LogLevel.Trace);
});

var getWeather = new GetWeatherWorkflow();

var workflow = Workflow.CreateFromInstance(getWeather);
var engine = StepWiseEngine.CreateFromInstance(getWeather, loggerFactory.CreateLogger("workflow"));
var builder = Host.CreateEmptyApplicationBuilder(settings: null);

builder.Services
    .AddMcpServer(option =>
    {
        option.Capabilities = new()
        {
            Tools = new ModelContextProtocol.Protocol.Types.ToolsCapability
            {
                ToolCollection = engine.GetMcpServerToolCollection(),
            },
        };
    })
    .WithStdioServerTransport();

var app = builder.Build();

await app.RunAsync();

public class GetWeatherWorkflow
{
    [Step]
    public async Task<string?> GetWeatherAsync(
        string[] cities)
    {
        var date = DateTime.Now.ToString("yyyy-MM-dd");
        var weathers = cities.Select(city => new Weather(city, date, "Sunny")).ToArray();

        return JsonSerializer.Serialize(weathers);
    }

    public class Weather
    {
        public Weather(string city, string date, string forecast)
        {
            City = city;
            Date = date;
            Forecast = forecast;
        }
        public string City { get; }

        public string Date { get; }

        public string Forecast { get; }

        public override string ToString()
        {
            return JsonSerializer.Serialize(this);
        }
    }
}

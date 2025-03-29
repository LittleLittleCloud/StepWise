// Copyright (c) LittleLittleCloud. All rights reserved.
// Program.cs

using System.Text.Json;
using AutoGen.Core;
using AutoGen.OpenAI;
using AutoGen.OpenAI.Extension;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using OpenAI;
using StepWise.Core;
using StepWise.Core.Extension;

var loggerFactory = LoggerFactory.Create(builder =>
{
    builder.AddConsole().SetMinimumLevel(LogLevel.Trace);
});

var getWeather = new GetWeatherWorkflow();

var openAIApiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? throw new ArgumentNullException("OPENAI_API_KEY is not found");
var model = "gpt-4o-mini";
var openAIClient = new OpenAIClient(openAIApiKey);
var chatClient = openAIClient.AsChatClient(model);

chatClient = new ChatClientBuilder(chatClient)
    .UseFunctionInvocation(loggerFactory)
    .UseLogging(loggerFactory)
    .Build();

var workflow = Workflow.CreateFromInstance(getWeather);
var engine = StepWiseEngine.CreateFromInstance(getWeather, loggerFactory.CreateLogger("workflow"));
var tools = engine.GetAIFunctions();

var chatOption = new ChatOptions
{
    Tools = [.. tools],
};

var question = new ChatMessage(ChatRole.User, "Get weather forecast for Seattle and Redmond");

var response = await chatClient.GetResponseAsync(question, chatOption);

Console.WriteLine(response);

public class GetWeatherWorkflow
{
    [Step]
    public async Task<string?> GetCurrentDateAsync()
    {
        Console.WriteLine("What is the current date? Type in the format of yyyy-MM-dd and hit enter.");

        var date = Console.ReadLine();

        return date;
    }

    [Step]
    //[DependOn(nameof(GetCurrentDateAsync))]
    public async Task<string?> GetWeatherAsync(
        string[] cities,
        [FromStep(nameof(GetCurrentDateAsync))] string date)
    {
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

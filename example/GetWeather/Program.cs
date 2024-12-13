// Copyright (c) LittleLittleCloud. All rights reserved.
// Program.cs

using System.Text.Json;
using AutoGen.Core;
using AutoGen.OpenAI;
using AutoGen.OpenAI.Extension;
using Microsoft.Extensions.Logging;
using OpenAI;
using StepWise.Core;
using StepWise.Core.Extension;

var loggerFactory = LoggerFactory.Create(builder =>
{
    builder.AddConsole();
});

var getWeather = new GetWeatherWorkflow();

var openAIApiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? throw new ArgumentNullException("OPENAI_API_KEY is not found");
var model = "gpt-4o-mini";
var openAIClient = new OpenAIClient(openAIApiKey);
var chatClient = openAIClient.GetChatClient(model);
var workflow = Workflow.CreateFromInstance(getWeather);
var stepWiseMiddleware = new StepWiseMiddleware(workflow, loggerFactory.CreateLogger<StepWiseMiddleware>());
var agent = new OpenAIChatAgent(
    chatClient: chatClient,
    name: "assistant")
    .RegisterMessageConnector()
    .RegisterMiddleware(stepWiseMiddleware)
    .RegisterPrintMessage();

var question = new TextMessage(Role.User, "Get weather forecast for Seattle and Redmond");
var chatHistory = new List<IMessage>
{
    question
};
while (true)
{
    var response = await agent.SendAsync(chatHistory: chatHistory);
    if (response is TextMessage textMessage)
    {
        // we get a final answer
        break;
    }

    chatHistory.Add(response);
}

//var workflowEngine = StepWiseEngine.CreateFromInstance(getWeather, loggerFactory.CreateLogger<StepWiseEngine>());

//StepVariable[] input =
//[
//    StepVariable.Create("cities", new string[] { "Seattle", "Redmond" })
//];

//await foreach (var stepRun in workflowEngine.ExecuteAsync(nameof(GetWeatherWorkflow.GetWeatherAsync), input, stopStrategy: null))
//{
//    if (stepRun.Name == nameof(GetWeatherWorkflow.GetWeatherAsync) && stepRun.Variable?.As<GetWeatherWorkflow.Weather[]>() is GetWeatherWorkflow.Weather[] weathers)
//    {
//        Console.WriteLine("Weather forecast:");
//        foreach (var weather in weathers)
//        {
//            Console.WriteLine($"City: {weather.City}, Date: {weather.Date}, Forecast: {weather.Forecast}");
//        }

//        break;
//    }
//}
public class GetWeatherWorkflow
{
    [Step]
    public async Task<string?> GetCurrentDateAsync()
    {
        return DateTime.Now.ToString("yyyy-MM-dd");
    }

    [Step]
    [DependOn(nameof(GetCurrentDateAsync))]
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

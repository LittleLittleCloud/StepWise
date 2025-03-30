﻿// Copyright (c) LittleLittleCloud. All rights reserved.
// Program.cs

using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol.Transport;
using OpenAI;

var builder = Host.CreateEmptyApplicationBuilder(settings: null);

builder.Configuration
    .AddEnvironmentVariables()
    .AddUserSecrets<Program>();

var (command, arguments) = GetCommandAndArguments(args);

await using var mcpClient = await McpClientFactory.CreateAsync(new()
{
    Id = "weather-chat-server",
    Name = "Weather Server",
    TransportType = TransportTypes.StdIo,
    TransportOptions = new()
    {
        ["command"] = command,
        ["arguments"] = arguments,
    }
});

var tools = await mcpClient.ListToolsAsync();
foreach (var tool in tools)
{
    Console.WriteLine($"Connected to server with tools: {tool.Name}");
}

var openAIApiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? throw new ArgumentNullException("OPENAI_API_KEY is not found");
var model = "gpt-4o-mini";
var openAIClient = new OpenAIClient(openAIApiKey);
var chatClient = openAIClient.AsChatClient(model)
    .AsBuilder()
    .UseFunctionInvocation()
    .Build();

var options = new ChatOptions
{
    Tools = [.. tools],
};

Console.ForegroundColor = ConsoleColor.Green;
Console.WriteLine("MCP Client Started!");
Console.ResetColor();

PromptForInput();
while (Console.ReadLine() is string query && !"exit".Equals(query, StringComparison.OrdinalIgnoreCase))
{
    if (string.IsNullOrWhiteSpace(query))
    {
        PromptForInput();
        continue;
    }

    await foreach (var message in chatClient.GetStreamingResponseAsync(query, options))
    {
        Console.Write(message);
    }
    Console.WriteLine();

    PromptForInput();
}

static void PromptForInput()
{
    Console.WriteLine("Enter a command (or 'exit' to quit):");
    Console.ForegroundColor = ConsoleColor.Cyan;
    Console.Write("> ");
    Console.ResetColor();
}

/// <summary>
/// Determines the command (executable) to run and the script/path to pass to it. This allows different
/// languages/runtime environments to be used as the MCP server.
/// </summary>
/// <remarks>
/// This method uses the file extension of the first argument to determine the command, if it's py, it'll run python,
/// if it's js, it'll run node, if it's a directory or a csproj file, it'll run dotnet.
/// 
/// If no arguments are provided, it defaults to running the QuickstartWeatherServer project from the current repo.
/// 
/// This method would only be required if you're creating a generic client, such as we use for the quickstart.
/// </remarks>
static (string command, string arguments) GetCommandAndArguments(string[] args)
{
    return args switch
    {
        [var script] when script.EndsWith(".py") => ("python", script),
        [var script] when script.EndsWith(".js") => ("node", script),
        [var script] when Directory.Exists(script) || (File.Exists(script) && script.EndsWith(".csproj")) => ("dotnet", $"run --project {script} --no-build"),
        _ => ("dotnet", "run --project ../../../../WeatherServer --no-build")
    };
}

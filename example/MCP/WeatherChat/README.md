# MCP - WeatherChat

This example demonstrates how to create a simple weather MCP server and a console-based chat bot that can interact with the weather server to get weather information.

The example consists of two projects
- Client: This is a console application that acts as a chat bot. It interacts with the weather MCP server to retrieve user questions and provides answers based on the weather data.
- WeatherServer: This is the MCP server that provides weather information. It shows how to turn a StepWise workflow into an MCP server that can handle requests from the chat bot.

## Prerequisites
- .NET 8.0 or later installed on your machine.
- OpenAI API Key.

## How to run the example
In order to run the example, make sure you follow the [DEVELOPING GUIDANCE](../../../DEVELOPING.md) to build the solution first, then run the `Client` project. The client project will start the `WeatherServer` automatically.

```bash
dotnet run --project ./Client/Client.csproj
```
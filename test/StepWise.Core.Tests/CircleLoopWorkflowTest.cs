// Copyright (c) LittleLittleCloud. All rights reserved.
// CircleLoopWorkflowTest.cs

using FluentAssertions;
using Meziantou.Extensions.Logging.Xunit;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using OpenAI;
using StepWise.Core.Extension;
using Xunit;
using Xunit.Abstractions;

namespace StepWise.Core.Tests;

public class CircleLoopWorkflowTest
{
    private readonly ILogger _logger;
    private readonly LoggerFactory _loggerFactory;

    public CircleLoopWorkflowTest(ITestOutputHelper testOutputHelper)
    {
        _logger = new XUnitLoggerProvider(testOutputHelper).CreateLogger(nameof(CircleLoopWorkflowTest));
        _loggerFactory = new LoggerFactory();

        _loggerFactory.AddProvider(new XUnitLoggerProvider(testOutputHelper));
    }

    [Step]
    public async Task<int> PlusOne([FromStep(nameof(MinusOne))] int a = 0)
    {
        return a + 1;
    }

    [Step]
    public async Task<int> MinusOne([FromStep(nameof(PlusOne))] int a)
    {
        return a - 1;
    }

    [Fact]
    public async Task CircleLoopWorkflowTestAsync()
    {
        var engine = StepWiseEngine.CreateFromInstance(this, _logger);
        var variables = new List<StepVariable>();

        var stopStrategy = new MaxStepsStopStrategy(1);
        await foreach (var stepRun in engine.ExecuteAsync(maxConcurrency: 1, stopStrategy: stopStrategy))
        {
            if (stepRun.StepRunType == StepRunType.Variable)
            {
                variables.Add(stepRun.Variable!);
            }
        }

        variables.Count().Should().Be(1);
        variables[0].Value.Should().Be(1);

        // continue the workflow with existing variable
        stopStrategy = new MaxStepsStopStrategy(2);
        await foreach (var stepRun in engine.ExecuteAsync(inputs: variables, maxConcurrency: 1, stopStrategy: stopStrategy))
        {
            if (stepRun.StepRunType == StepRunType.Variable)
            {
                variables.Add(stepRun.Variable!);
            }
        }

        variables.Count().Should().Be(3);
        variables[1].Value.Should().Be(0);
        variables[2].Value.Should().Be(1);
    }

    [Fact]
    public async Task AIFunctionWorkflowTestAsync()
    {
        var engine = StepWiseEngine.CreateFromInstance(this, _logger);
        var functions = engine.GetAIFunctions();

        functions.Count().Should().Be(2);

        IChatClient client =
            new OpenAIClient(Environment.GetEnvironmentVariable("OPENAI_API_KEY")!)
            .AsChatClient("gpt-4o-mini");

        client = new ChatClientBuilder(client)
            .UseFunctionInvocation(_loggerFactory)
            .UseLogging(_loggerFactory)
            .Build();

        var chatOption = new ChatOptions
        {
            Tools = [.. functions],
        };

        var chatMessage = new ChatMessage(ChatRole.User, "what's a+1+1+1 when a is 10");
        var response = await client.GetResponseAsync([chatMessage], chatOption);
        response.Should().NotBeNull();
    }
}

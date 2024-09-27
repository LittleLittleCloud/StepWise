// Copyright (c) LittleLittleCloud. All rights reserved.
// CircleLoopWorkflowTest.cs

using FluentAssertions;
using Meziantou.Extensions.Logging.Xunit;
using Microsoft.Extensions.Logging;
using StepWise.Core.Extension;
using Xunit;
using Xunit.Abstractions;

namespace StepWise.Core.Tests;

public class CircleLoopWorkflowTest
{
    private readonly ITestOutputHelper _testOutputHelper;
    private readonly ILogger _logger;

    public CircleLoopWorkflowTest(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
        _logger = new XUnitLoggerProvider(testOutputHelper).CreateLogger(nameof(CircleLoopWorkflowTest));
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
    public async Task CirculeLoopWorkflowTestAsync()
    {
        var engine = StepWiseEngine.CreateFromInstance(this, _logger);
        var variables = new List<StepVariable>();

        var stopStrategy = new MaxStepsStopStrategy(1);
        await foreach (var stepRun in engine.ExecuteAsync(maxConcurrency: 1, stopStrategy: stopStrategy))
        {
            if (stepRun.StepType == StepRunType.Variable)
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
            if (stepRun.StepType == StepRunType.Variable)
            {
                variables.Add(stepRun.Variable!);
            }
        }

        variables.Count().Should().Be(3);
        variables[1].Value.Should().Be(0);
        variables[2].Value.Should().Be(1);
    }
}

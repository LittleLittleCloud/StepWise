// Copyright (c) LittleLittleCloud. All rights reserved.
// PlusOneWorkflowTest.cs

using FluentAssertions;
using Meziantou.Extensions.Logging.Xunit;
using Microsoft.Extensions.Logging;
using StepWise.Core.Extension;
using Xunit;
using Xunit.Abstractions;

namespace StepWise.Core.Tests;

public class PlusOneWorkflowTest
{
    private readonly ITestOutputHelper _testOutputHelper;
    private readonly ILogger _logger;

    public PlusOneWorkflowTest(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
        _logger = new XUnitLoggerProvider(testOutputHelper).CreateLogger(nameof(PlusOneWorkflowTest));
    }

    [Step]
    public async Task<int> PlusOne(int a = 0)
    {
        return a + 1;
    }

    [Fact]
    public async Task PlusOneTest()
    {
        var engine = StepWiseEngine.CreateFromInstance(this, _logger);
        var variables = new List<StepVariable>();

        await foreach (var stepRun in engine.ExecuteAsync(nameof(PlusOne), maxConcurrency: 1, maxSteps: 10))
        {
            if (stepRun.StepRunType == StepRunType.Variable)
            {
                variables.Add(stepRun.Variable!);
            }
        }

        variables.Count().Should().Be(1);
        variables[0].Value.Should().Be(1);

        // continue the workflow with existing variable

        await foreach (var stepRun in engine.ExecuteAsync(nameof(PlusOne), variables, maxConcurrency: 1, maxSteps: 10))
        {
            if (stepRun.StepRunType == StepRunType.Variable)
            {
                variables.Add(stepRun.Variable!);
            }
        }

        variables.Count().Should().Be(1);
    }
}

﻿// Copyright (c) LittleLittleCloud. All rights reserved.
// SelfLoopWorkflowTest.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FluentAssertions;
using Meziantou.Extensions.Logging.Xunit;
using Microsoft.Extensions.Logging;
using Xunit;
using Xunit.Abstractions;
using StepWise.Core.Extension;

namespace StepWise.Core.Tests;

public class SelfLoopWorkflowTest
{
    private readonly ITestOutputHelper _testOutputHelper;
    private readonly ILogger _logger;

    public SelfLoopWorkflowTest(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
        _logger = new XUnitLoggerProvider(testOutputHelper).CreateLogger(nameof(SelfLoopWorkflowTest));
    }

    [Step]
    public async Task<int> Start()
    {
        return 1;
    }

    [Step]
    [DependOn(nameof(Start))]
    public async Task<int?> AddNumberByOne(
        [FromStep(nameof(Start))] int start,
        [FromStep(nameof(AddNumberByOne))] int? current = null,
        [FromStep(nameof(End))] string? end = null)
    {
        if (end == "Done!")
        {
            return null;
        }

        if (current == null)
        {
            return start + 1;
        }

        return current.Value + 1;
    }

    [Step]
    [DependOn(nameof(AddNumberByOne))]
    public async Task<string?> End(
        [FromStep(nameof(AddNumberByOne))] int current)
    {
        if (current == 5)
        {
            return "Done!";
        }

        return null;
    }

    [Fact]
    public async Task ItAddNumberFromOneToFiveTest()
    {
        var workflow = Workflow.CreateFromInstance(this);
        var startStep = workflow.Steps[nameof(Start)];
        var dependStartSteps = workflow.GetAllDependSteps(startStep);
        dependStartSteps.Count().Should().Be(2);
        var engine = new StepWiseEngine(workflow, _logger);

        var stepRun = new List<StepRun>();
        await foreach (var stepRunAndResult in engine.ExecuteAsync(nameof(End), maxSteps: 10))
        {
            if (stepRunAndResult.Result != null)
            {
                stepRun.Add(stepRunAndResult);
            }
        }

        // stepAndResult should contain the following:
        // Start, 1
        // AddNumberByOne, 2
        // AddNumberByOne, 3
        // AddNumberByOne, 4
        // AddNumberByOne, 5
        // End, Done!

        stepRun.Should().HaveCount(6);

        stepRun[0].StepName.Should().Be(nameof(Start));
        stepRun[0].Result!.As<int>().Should().Be(1);

        stepRun[1].StepName.Should().Be(nameof(AddNumberByOne));
        stepRun[1].Result!.As<int>().Should().Be(2);

        stepRun[2].StepName.Should().Be(nameof(AddNumberByOne));
        stepRun[2].Result!.As<int>().Should().Be(3);

        stepRun[3].StepName.Should().Be(nameof(AddNumberByOne));
        stepRun[3].Result!.As<int>().Should().Be(4);

        stepRun[4].StepName.Should().Be(nameof(AddNumberByOne));
        stepRun[4].Result!.As<int>().Should().Be(5);

        stepRun[5].StepName.Should().Be(nameof(End));
        stepRun[5].Result!.As<string>().Should().Be("Done!");
    }
}

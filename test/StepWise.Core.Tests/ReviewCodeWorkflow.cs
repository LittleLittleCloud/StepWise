// Copyright (c) LittleLittleCloud. All rights reserved.
// ReviewCodeWorkflow.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FluentAssertions;
using Meziantou.Extensions.Logging.Xunit;
using Microsoft.Extensions.Logging;
using StepWise.Core.Extension;
using Xunit;
using Xunit.Abstractions;

namespace StepWise.Core.Tests;

public class ReviewCodeWorkflowTest
{
    private readonly ITestOutputHelper _testOutputHelper;
    private readonly ILogger _logger;

    public ReviewCodeWorkflowTest(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
        _logger = new XUnitLoggerProvider(testOutputHelper).CreateLogger(nameof(ReviewCodeWorkflowTest));
    }

    [Step]
    public async Task<string?> WriteCode(
        string task,
        [FromStep(nameof(ReviewCode))]
        string? comment = null)
    {
        if (comment is not null && comment != "approve")
        {
            return "improved code";
        }

        if (comment == "approve")
        {
            return null;
        }

        return "dummy code";
    }

    [Step]
    [DependOn(nameof(WriteCode))]
#pragma warning disable xUnit1013 // Public method should be marked as test
    public async Task ReviewCode([FromStep(nameof(WriteCode))] string code)
#pragma warning restore xUnit1013 // Public method should be marked as test
    {
        return;
    }

    [Step]
    [DependOn(nameof(ReviewCode))]
    public async Task<string?> Done([FromStep(nameof(ReviewCode))] string codeComment)
    {
        if (codeComment != "approve")
        {
            return null;
        }

        return "done";
    }

    public record CodeComment(string code, string comment);

    [Fact]
    public async Task ItReviewCommentAndApproveAsync()
    {
        var engine = StepWiseEngine.CreateFromInstance(this, _logger);
        var task = "dummy task";

        var variables = new List<StepVariable>()
        {
            StepVariable.Create("task", task),
        };

        // phase 1
        // write code
        await foreach (var stepRun in engine.ExecuteAsync(nameof(Done), inputs: variables, stopStrategy: null))
        {
            if (stepRun.StepType == StepRunType.Variable && stepRun.Variable is not null)
            {
                variables.Add(stepRun.Variable);
            }
        }

        variables.Count().Should().Be(2);
        variables.Where(var => var.Name == nameof(WriteCode)).Should().HaveCount(1);

        // phase 2
        // review code
        variables.Add(StepVariable.Create(nameof(ReviewCode), "improve", 2));

        await foreach (var stepRun in engine.ExecuteAsync(nameof(Done), inputs: variables, stopStrategy: null))
        {
            if (stepRun.StepType == StepRunType.Variable && stepRun.Variable is not null)
            {
                variables.Add(stepRun.Variable);
            }
        }

        variables.Count().Should().Be(4);
        variables.Where(var => var.Name == nameof(WriteCode)).Should().HaveCount(2);

        // phase 3
        // approve code
        variables.Add(StepVariable.Create(nameof(ReviewCode), "approve", 5));

        await foreach (var stepRun in engine.ExecuteAsync(nameof(Done), inputs: variables, stopStrategy: null))
        {
            if (stepRun.StepType == StepRunType.Variable && stepRun.Variable is not null)
            {
                variables.Add(stepRun.Variable);
            }
        }

        variables.Count().Should().Be(6);
        variables.Where(var => var.Name == nameof(Done)).Should().HaveCount(1);

        // check each variables
        variables[0].Value.As<string>().Should().Be(task); // task
        variables[1].Value.As<string>().Should().Be("dummy code"); // WriteCode
        variables[2].Value.As<string>().Should().Be("improve"); // ReviewCode
        variables[3].Value.As<string>().Should().Be("improved code"); // WriteCode
        variables[4].Value.As<string>().Should().Be("approve"); // ReviewCode
        variables[5].Value.As<string>().Should().Be("done"); // Done
    }
}

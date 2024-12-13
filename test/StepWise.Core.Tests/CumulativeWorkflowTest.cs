// Copyright (c) LittleLittleCloud. All rights reserved.
// CumulativeWorkflowTest.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using ApprovalTests;
using ApprovalTests.Namers;
using ApprovalTests.Reporters;
using AutoGen.OpenAI.Extension;
using FluentAssertions;
using Meziantou.Extensions.Logging.Xunit;
using Microsoft.Extensions.Logging;
using StepWise.Core.Extension;
using Xunit;
using Xunit.Abstractions;

namespace StepWise.Core.Tests;

/// <summary>
/// cumulative workflow
/// Tasks: [A, B, C, D, E]
/// result for each task: [a, b, c, d, e]
/// Signature for each task:
/// - A()
/// - B(a)
/// - C(a, b)
/// - D(a, b, c)
/// - E(a, b, c, d)
/// </summary>
public class CumulativeWorkflowTest
{
    private readonly ITestOutputHelper _testOutputHelper;
    private readonly ILogger _logger;

    public CumulativeWorkflowTest(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
        _logger = new XUnitLoggerProvider(testOutputHelper).CreateLogger(nameof(SelfLoopWorkflowTest));
    }

    [Step]
    public async Task<string> A()
    {
        return "a";
    }

    [Step]
    [DependOn(nameof(A))]
    public async Task<string> B(
        [FromStep(nameof(A))] string a,
        string? settings = null)
    {
        a.Should().Be("a");

        return "b" + settings ?? string.Empty;
    }

    [Step]
    [DependOn(nameof(B))]
    [DependOn(nameof(A))]
    public async Task<string> C(
        [FromStep(nameof(A))] string a,
        [FromStep(nameof(B))] string b)
    {
        a.Should().Be("a");
        b.Should().Be("b");

        return "c";
    }

    [Step]
    [DependOn(nameof(C))]
    [DependOn(nameof(B))]
    [DependOn(nameof(A))]
    public async Task<string> D(
        [FromStep(nameof(A))] string a,
        [FromStep(nameof(B))] string b,
        [FromStep(nameof(C))] string c)
    {
        a.Should().Be("a");
        b.Should().Be("b");
        c.Should().Be("c");

        return "d";
    }

    [Step]
    [DependOn(nameof(D))]
    [DependOn(nameof(C))]
    [DependOn(nameof(B))]
    [DependOn(nameof(A))]
    public async Task<string> E(
        [FromStep(nameof(A))] string a,
        [FromStep(nameof(B))] string b,
        [FromStep(nameof(C))] string c,
        [FromStep(nameof(D))] string d)
    {
        a.Should().Be("a");
        b.Should().Be("b");
        c.Should().Be("c");
        d.Should().Be("d");

        return "e";
    }

    [Fact]
    public async Task CumulativeWorkflow()
    {
        var workflowEngine = StepWiseEngine.CreateFromInstance(this, _logger);
        var completedSteps = new List<string>();
        await foreach (var stepResult in workflowEngine.ExecuteAsync(stopStrategy: null))
        {
            var stepName = stepResult.Name;
            var value = stepResult.Variable;
            if (stepResult.StepRunType == StepRunType.Completed)
            {
                completedSteps.Add(stepName!);
            }

            if (stepName == nameof(E) && value?.As<string>() is string result)
            {
                result.Should().Be("e");
            }
        }

        completedSteps.Should().Equal([nameof(A), nameof(B), nameof(C), nameof(D), nameof(E)]);
    }

    [Fact]
    public async Task ItShouldReturnMissingInputWhenRunStepEAsync()
    {
        var workflowEngine = StepWiseEngine.CreateFromInstance(this, _logger);
        var e = workflowEngine.Workflow.Steps[nameof(E)];
        var completedSteps = workflowEngine.ExecuteStepsAsync([e]).ToBlockingEnumerable().ToList();

        completedSteps.Count().Should().Be(1);

        // the first steprun would be E()  missing input
        completedSteps[0].Name.Should().Be(nameof(E));
        completedSteps[0].StepRunType.Should().Be(StepRunType.NotReady);
    }

    [Fact]
    public async Task ItShouldCompleteStepCAsync()
    {
        var workflowEngine = StepWiseEngine.CreateFromInstance(this, _logger);
        var inputs = new[]
        {
            StepVariable.Create(nameof(A), "a"),
            StepVariable.Create(nameof(B), "b"),
        };

        var completedSteps = workflowEngine.ExecuteStepAsync(nameof(C), inputs).ToBlockingEnumerable().ToList();

        completedSteps.Count().Should().Be(4);
        completedSteps[0].Name.Should().Be(nameof(C));
        completedSteps[0].StepRunType.Should().Be(StepRunType.Queue);
        completedSteps[1].Name.Should().Be(nameof(C));
        completedSteps[1].StepRunType.Should().Be(StepRunType.Running);
        completedSteps[2].Name.Should().Be(nameof(C));
        completedSteps[2].StepRunType.Should().Be(StepRunType.Completed);
        completedSteps[3].Name.Should().Be(nameof(C));
        completedSteps[3].StepRunType.Should().Be(StepRunType.Variable);
    }

    [Fact]
    public async Task ItShouldExecuteStepCAsync()
    {
        var workflowEngine = StepWiseEngine.CreateFromInstance(this, _logger);

        var completedSteps = workflowEngine.ExecuteStepAsync(nameof(C)).ToBlockingEnumerable().ToList();

        completedSteps.Count().Should().Be(15);
    }

    [Fact]
    public async Task ItShouldCompleteStepAAsync()
    {
        var workflowEngine = StepWiseEngine.CreateFromInstance(this, _logger);
        var completedSteps = workflowEngine.ExecuteStepAsync(nameof(A)).ToBlockingEnumerable().ToList();

        completedSteps.Count().Should().Be(4);

        // the first steprun would be E()  missing input
        completedSteps[0].Name.Should().Be(nameof(A));
        completedSteps[0].StepRunType.Should().Be(StepRunType.Queue);
        completedSteps[1].StepRunType.Should().Be(StepRunType.Running);
        completedSteps[2].StepRunType.Should().Be(StepRunType.Completed);
        completedSteps[3].StepRunType.Should().Be(StepRunType.Variable);
        completedSteps[3].Variable!.As<string>().Should().Be("a");
    }

    [Fact]
    public async Task ItShouldPassSettingsToStepBAsync()
    {
        // when preparing input parameter for C, the generation of b must be newer than a
        var workflowEngine = StepWiseEngine.CreateFromInstance(this, _logger);
        var inputs = new[]
        {
            StepVariable.Create("settings", "SettingForB", generation: 1),
            StepVariable.Create(nameof(A), "a", generation: 0),
        };

        var completedSteps = workflowEngine.ExecuteStepAsync(nameof(B), inputs).ToBlockingEnumerable().ToList();
        var bResult = completedSteps.First(stepRun => stepRun.StepRunType == StepRunType.Variable && stepRun.Name == nameof(B));
        bResult.Variable!.As<string>().Should().Be("bSettingForB");
    }

    [Fact]
    public void TopologicalSortTest()
    {
        var engine = StepWiseEngine.CreateFromInstance(this, _logger);
        var steps = engine.Workflow.TopologicalSort().ToList();
        steps.Select(s => s.Name).Should().BeEquivalentTo([nameof(A), nameof(B), nameof(C), nameof(D), nameof(E)]);
    }

    [Fact]
    public void RequiredStepTest()
    {
        var engine = StepWiseEngine.CreateFromInstance(this, _logger);
        var steps = engine.Workflow.GetAllRequiredSteps(nameof(E)).ToList();

        steps.Select(s => s.Name).Should().BeEquivalentTo([nameof(A), nameof(B), nameof(C), nameof(D)]);
    }
}

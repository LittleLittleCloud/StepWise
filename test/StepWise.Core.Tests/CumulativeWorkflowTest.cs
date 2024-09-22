// Copyright (c) LittleLittleCloud. All rights reserved.
// CumulativeWorkflowTest.cs

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
        await foreach (var stepResult in workflowEngine.ExecuteAsync(nameof(E), stopStrategy: null))
        {
            var stepName = stepResult.Name;
            var value = stepResult.Variable;
            if (stepResult.StepType == StepRunType.Completed)
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
        var completedSteps = workflowEngine.ExecuteStepAsync(nameof(E)).ToBlockingEnumerable().ToList();

        completedSteps.Count().Should().Be(1);

        // the first steprun would be E()  missing input
        completedSteps[0].Name.Should().Be(nameof(E));
        completedSteps[0].StepType.Should().Be(StepRunType.NotReady);
    }

    [Fact]
    public async Task ItShouldReturnMissingInputWhenRunStepCAsync()
    {
        // when preparing input parameter for C, the generation of b must be newer than a
        var workflowEngine = StepWiseEngine.CreateFromInstance(this, _logger);
        var inputs = new[]
        {
            StepVariable.Create(nameof(B), "b", generation: 1),
            StepVariable.Create(nameof(A), "a", generation: 2),
        };

        var completedSteps = workflowEngine.ExecuteStepAsync(nameof(C), inputs).ToBlockingEnumerable().ToList();

        completedSteps.Count().Should().Be(5);
        completedSteps[0].Name.Should().Be(nameof(B));
        completedSteps[0].StepType.Should().Be(StepRunType.Variable);
        completedSteps[1].Name.Should().Be(nameof(A));
        completedSteps[1].StepType.Should().Be(StepRunType.Variable);
        completedSteps[2].Name.Should().Be(nameof(C)); // C[0]
        completedSteps[2].StepType.Should().Be(StepRunType.NotReady);
        completedSteps[3].Name.Should().Be(nameof(C)); // C[2]
        completedSteps[3].StepType.Should().Be(StepRunType.NotReady);
        completedSteps[3].Generation.Should().Be(2);
        completedSteps[4].Name.Should().Be(nameof(C)); // C[3]
        completedSteps[4].StepType.Should().Be(StepRunType.NotReady);
    }

    [Fact]
    public async Task ItShouldCompleteStepCAsync()
    {
        // when preparing input parameter for C, the generation of b must be newer than a
        var workflowEngine = StepWiseEngine.CreateFromInstance(this, _logger);
        var inputs = new[]
        {
            StepVariable.Create(nameof(A), "a", generation: 0),
            StepVariable.Create(nameof(B), "b", generation: 1),
        };

        var completedSteps = workflowEngine.ExecuteStepAsync(nameof(C), inputs).ToBlockingEnumerable().ToList();

        completedSteps.Count().Should().Be(8);
        completedSteps[0].Name.Should().Be(nameof(A)); // A[0]
        completedSteps[0].StepType.Should().Be(StepRunType.Variable);
        completedSteps[1].Name.Should().Be(nameof(B)); // B[1]
        completedSteps[1].StepType.Should().Be(StepRunType.Variable);
        completedSteps[2].Name.Should().Be(nameof(C)); // C[0]
        completedSteps[2].StepType.Should().Be(StepRunType.NotReady);
        completedSteps[3].Name.Should().Be(nameof(C)); // C[1](A[0])
        completedSteps[3].StepType.Should().Be(StepRunType.NotReady);
        completedSteps[3].Generation.Should().Be(1);
        completedSteps[4].Name.Should().Be(nameof(C)); // C[2](A[0], B[1])
        completedSteps[4].StepType.Should().Be(StepRunType.Queue);
        completedSteps[5].Name.Should().Be(nameof(C)); // C[2](A[0], B[1])
        completedSteps[5].StepType.Should().Be(StepRunType.Running);
        completedSteps[6].Name.Should().Be(nameof(C)); // C[2](A[0], B[1])
        completedSteps[6].StepType.Should().Be(StepRunType.Completed);
        completedSteps[7].Name.Should().Be(nameof(C)); // C[2](A[0], B[1])
        completedSteps[7].StepType.Should().Be(StepRunType.Variable);
    }

    [Fact]
    public async Task ItShouldCompleteStepAAsync()
    {
        var workflowEngine = StepWiseEngine.CreateFromInstance(this, _logger);
        var completedSteps = workflowEngine.ExecuteStepAsync(nameof(A)).ToBlockingEnumerable().ToList();

        completedSteps.Count().Should().Be(4);

        // the first steprun would be E()  missing input
        completedSteps[0].Name.Should().Be(nameof(A));
        completedSteps[0].StepType.Should().Be(StepRunType.Queue);
        completedSteps[1].StepType.Should().Be(StepRunType.Running);
        completedSteps[2].StepType.Should().Be(StepRunType.Completed);
        completedSteps[3].StepType.Should().Be(StepRunType.Variable);
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
        var bResult = completedSteps.First(stepRun => stepRun.StepType == StepRunType.Variable && stepRun.Name == nameof(B));
        bResult.Variable!.As<string>().Should().Be("bSettingForB");
    }
}

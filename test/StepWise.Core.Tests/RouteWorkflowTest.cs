// Copyright (c) LittleLittleCloud. All rights reserved.
// RouteWorkflowTest.cs

using FluentAssertions;
using Meziantou.Extensions.Logging.Xunit;
using Microsoft.Extensions.Logging;
using StepWise.Core.Extension;
using Xunit;
using Xunit.Abstractions;

namespace StepWise.Core.Tests;

/// <summary>
/// RouteWorkflowTest
/// The workflow is
/// ```mermaid
/// graph TD
///    Start --> A
///    Start --> B
///    Start --> C
///    A --> End
///    B --> End
///    C --> End
/// </summary>
public class RouteWorkflowTest
{
    private readonly ITestOutputHelper _testOutputHelper;
    private readonly ILogger _logger;

    public RouteWorkflowTest(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
        _logger = new XUnitLoggerProvider(testOutputHelper).CreateLogger(nameof(RouteWorkflowTest));
    }

    [Step]
    public async Task<string> Start()
    {
        return "Start";
    }

    [Step]
    [DependOn(nameof(Start))]
    public async Task<string> A(
        [FromStep(nameof(Start))] string start)
    {
        return "A";
    }

    [Step]
    [DependOn(nameof(Start))]
    public async Task<string> B(
        [FromStep(nameof(Start))] string start)
    {
        return "B";
    }

    [Step]
    [DependOn(nameof(Start))]
    public async Task<string> C()
    {
        return "C";
    }

    [Step]
    [DependOn(nameof(A))]
    [DependOn(nameof(B))]
    [DependOn(nameof(C))]
    public async Task<string> End(
        [FromStep(nameof(A))] string a,
        [FromStep(nameof(C))] string c)
    {
        return "End";
    }

    [Step]
    [DependOn(nameof(A))]
    [DependOn(nameof(B))]
    [DependOn(nameof(C))]
    public async Task<string> CollectResult(
        [FromStep(nameof(A), nameof(B), nameof(C))] string result)
    {
        return result;
    }

    [Fact]
    public async Task ItRunWorkflowTestAsync()
    {
        var engine = StepWiseEngine.CreateFromInstance(this, _logger);
        var results = new List<StepRun>();
        await foreach (var stepRun in engine.ExecuteAsync(maxConcurrency: 1))
        {
            results.Add(stepRun);
        }

        results.Count().Should().Be(24);

        // should get five variables: Start, A, B, C, End
        var variables = results.Where(r => r.StepRunType == StepRunType.Variable).Select(r => r.Variable!).ToList();
        variables.Count().Should().Be(5);
        variables.Should().Contain(v => v.Name == nameof(Start));
        variables.Should().Contain(v => v.Name == nameof(A));
        variables.Should().Contain(v => v.Name == nameof(B));
        variables.Should().Contain(v => v.Name == nameof(C));
        variables.Should().Contain(v => v.Name == nameof(End));

        // The first variable should be Start, and the last variable should be End
        variables.First().Name.Should().Be(nameof(Start));
        variables.Last().Name.Should().Be(nameof(End));
    }

    [Fact]
    public async Task ItRunStepATestAsync()
    {
        var engine = StepWiseEngine.CreateFromInstance(this, _logger);
        var results = new List<StepRun>();
        await foreach (var stepRun in engine.ExecuteStepAsync(nameof(A), maxConcurrency: 1))
        {
            results.Add(stepRun);
        }
        results.Count().Should().Be(9);
        // should get two variables: Start, A
        var variables = results.Where(r => r.StepRunType == StepRunType.Variable).Select(r => r.Variable!).ToList();
        variables.Count().Should().Be(2);
        variables.Should().Contain(v => v.Name == nameof(Start));
        variables.Should().Contain(v => v.Name == nameof(A));
        // The first variable should be Start, and the last variable should be A
        variables.First().Name.Should().Be(nameof(Start));
        variables.Last().Name.Should().Be(nameof(A));
    }

    [Fact]
    public async Task ItRunCollectResultStepTest()
    {
        var engine = StepWiseEngine.CreateFromInstance(this, _logger);
        var results = new List<StepRun>();
        await foreach (var stepRun in engine.ExecuteStepAsync(nameof(CollectResult), maxConcurrency: 1))
        {
            results.Add(stepRun);
        }
        results.Count().Should().Be(1);
        // should get one variable: End
        var variables = results.Where(r => r.StepRunType == StepRunType.Variable).Select(r => r.Variable!).ToList();
        variables.Count().Should().Be(1);
        variables.Should().Contain(v => v.Name == nameof(End));
        // The first variable should be End
        variables.First().Name.Should().Be(nameof(End));
    }
}

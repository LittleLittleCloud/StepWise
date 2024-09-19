// Copyright (c) LittleLittleCloud. All rights reserved.
// PrepareDinnerWorkflowTest.cs

using FluentAssertions;
using StepWise.Core.Extension;
using Xunit;

namespace StepWise.Core.Tests;

/// <summary>
/// This workflow test the parallel execution of steps.
/// </summary>
[Collection("Sequential")]
public class PrepareDinnerWorkflowTest
{
    [Step]
    public async Task<string> ChopVegetables(string[] vegetables)
    {
        await Task.Delay(3000);

        return $"Chopped {string.Join(", ", vegetables)}";
    }

    [Step]
    public async Task<string> BoilWater()
    {
        await Task.Delay(2000);

        return "Boiled water";
    }

    [Step]
    public async Task<string> CookPasta()
    {
        await Task.Delay(5000);

        return "Cooked pasta";
    }

    [Step]
    public async Task<string> CookSauce()
    {
        await Task.Delay(4000);

        return "Cooked sauce";
    }

    [Step]
    [DependOn(nameof(ChopVegetables))]
    [DependOn(nameof(BoilWater))]
    [DependOn(nameof(CookPasta))]
    [DependOn(nameof(CookSauce))]
    public async Task<string> ServeDinner(
        [FromStep(nameof(ChopVegetables))] string[] vegetables,
        [FromStep(nameof(BoilWater))] string water,
        [FromStep(nameof(CookPasta))] string pasta,
        [FromStep(nameof(CookSauce))] string sauce)
    {
        return $"Dinner ready!";
    }

    private static readonly string[] value = ["tomato", "onion", "garlic"];

    [Fact]
    public async Task ItPrepareDinnerConcurrentlyAsync()
    {
        var workflow = Workflow.CreateFromInstance(this);
        var engine = new StepWiseEngine(workflow);

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var result = await engine.ExecuteAsync<string>(nameof(ServeDinner), maxConcurrency: 3, inputs: [StepVariable.Create(nameof(ChopVegetables), value)]);

        stopwatch.Stop();

        // why it's not 6000ms?
        // because the available thread (on ci) might be less than the tasks, so it's not guaranteed that all steps will be executed concurrently.
        stopwatch.ElapsedMilliseconds.Should().BeLessThan(15000);
        result.Should().Be("Dinner ready!");
    }

    [Fact]
    public async Task ItPrepareDinnerStepByStepAsync()
    {
        var workflow = Workflow.CreateFromInstance(this);
        var engine = new StepWiseEngine(workflow);

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var result = await engine.ExecuteAsync<string>(nameof(ServeDinner), [StepVariable.Create(nameof(ChopVegetables), new string[] { "tomato", "onion", "garlic" })]);

        stopwatch.Stop();

        stopwatch.ElapsedMilliseconds.Should().BeLessThan(15000);
        result.Should().Be("Dinner ready!");
    }
}

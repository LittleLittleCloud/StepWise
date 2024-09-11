using FluentAssertions;
using Xunit;
using StepWise.Core.Extension;

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
        var engine = new StepWiseEngine(workflow, maxConcurrency: 10);

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var result = await engine.ExecuteAsync<string>(nameof(ServeDinner), new Dictionary<string, StepVariable>
        {
            [nameof(ChopVegetables)] = StepVariable.Create(value),
        });

        stopwatch.Stop();

        // why it's not 6000ms?
        // because the available thread might be less than the tasks, so it's not guaranteed that all steps will be executed concurrently.
        stopwatch.ElapsedMilliseconds.Should().BeLessThan(15000);
        result.Should().Be("Dinner ready!");
    }

    [Fact]
    public async Task ItPrepareDinnerStepByStepAsync()
    {
        var workflow = Workflow.CreateFromInstance(this);
        var engine = new StepWiseEngine(workflow, maxConcurrency: 1);

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var result = await engine.ExecuteAsync<string>(nameof(ServeDinner), new Dictionary<string, StepVariable>
        {
            [nameof(ChopVegetables)] = StepVariable.Create(new[] { "tomato", "onion", "garlic" }),
        });

        stopwatch.Stop();

        stopwatch.ElapsedMilliseconds.Should().BeLessThan(15000);
        result.Should().Be("Dinner ready!");
    }
}

// Copyright (c) LittleLittleCloud. All rights reserved.
// PrepareDinner.cs

// Create a web host running on 5123 port
using StepWise.Core;

public class PrepareDinner
{
    [Step(description: """
        This example demonstrates how to use stepwise to create a simple dinner preparation workflow.
        - source code: [PrepareDinner.cs](https://github.com/LittleLittleCloud/StepWise/blob/main/example/HelloWorld/PrepareDinner.cs)

        It returns the current time when the workflow starts and then simulates the preparation of dinner.
        """)]
    public async Task<DateTime> Start()
    {
        return DateTime.Now;
    }

    [Step(description: "boil water")]
    [DependOn(nameof(Start))]
    public async Task<string> BoilWater()
    {
        await Task.Delay(2000);

        return "Boiled water in 2 seconds";
    }

    [Step(description: "cut vegetables")]
    [DependOn(nameof(Start))]
    public async Task<string> CutVegetables()
    {
        await Task.Delay(3000);

        return "Cut vegetables in 3 seconds";
    }

    [Step(description: "cook vegetables")]
    [DependOn(nameof(CutVegetables))]
    [DependOn(nameof(BoilWater))]
    public async Task<string> CookVegetables(
        [FromStep(nameof(CutVegetables))] string vegetables,
        [FromStep(nameof(BoilWater))] string water)
    {
        await Task.Delay(4000);

        return $"Cooked vegetables in 4 seconds. {vegetables}, {water}";
    }

    [Step(description: "cook meat")]
    [DependOn(nameof(Start))]
    public async Task<string> CookMeat()
    {
        await Task.Delay(5000);

        return "Cooked meat in 5 seconds";
    }

    [Step(description: """
        Serve dinner.
        This will call all the preparation dinner steps in parallel and return the time taken to prepare the dinner.
        """)]
    [DependOn(nameof(CookVegetables))]
    [DependOn(nameof(CookMeat))]
    public async Task<string> ServeDinner(
        [FromStep(nameof(Start))] DateTime start,
        [FromStep(nameof(CookVegetables))] string vegetables,
        [FromStep(nameof(CookMeat))] string meat)
    {
        var time = DateTime.Now - start;
        return $"Dinner ready in {time.TotalSeconds} seconds";
    }
}


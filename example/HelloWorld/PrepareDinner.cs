// Copyright (c) LittleLittleCloud. All rights reserved.
// PrepareDinner.cs

// Create a web host running on 5123 port
using StepWise.Core;

public class PrepareDinner
{
    [Step(description: """
        This example demonstrates how to use stepwise to create a simple dinner preparation workflow.
        - source code: [PrepareDinner.cs](https://github.com/LittleLittleCloud/StepWise/blob/main/example/HelloWorld/PrepareDinner.cs)
        """)]
    public async Task<string> Start()
    {
        await Task.Delay(1000);
        return "Start";
    }

    [Step]
    public async Task<string> ChopVegetables()
    {
        var vegetables = new[] { "onion", "tomato", "bell pepper" };
        await Task.Delay(3000);

        return $"Chopped {string.Join(", ", vegetables)} in 3 seconds";
    }

    [Step]
    public async Task<string> BoilWater()
    {
        await Task.Delay(2000);

        return "Boiled water in 2 seconds";
    }

    [Step]
    public async Task<string> CookPasta()
    {
        await Task.Delay(5000);

        return "Cooked pasta in 5 seconds";
    }

    [Step]
    public async Task<string> CookSauce()
    {
        await Task.Delay(4000);

        return "Cooked sauce in 4 seconds";
    }

    [Step]
    [DependOn(nameof(ChopVegetables))]
    [DependOn(nameof(BoilWater))]
    [DependOn(nameof(CookPasta))]
    [DependOn(nameof(CookSauce))]
    public async Task<string> ServeDinner(
        [FromStep(nameof(ChopVegetables))] string vegetables,
        [FromStep(nameof(BoilWater))] string water,
        [FromStep(nameof(CookPasta))] string pasta,
        [FromStep(nameof(CookSauce))] string sauce)
    {
        return $"Dinner ready! {string.Join(", ", vegetables)}, {water}, {pasta}, {sauce}";
    }
}


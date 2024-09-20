// Copyright (c) LittleLittleCloud. All rights reserved.
// Loop.cs

// Create a web host running on 5123 port
using StepWise.Core;

public class Loop
{
    [Step]
    public async Task<int> SetCurrentToZero()
    {
        return 0;
    }

    [Step]
    [DependOn(nameof(SetCurrentToZero))]
    public async Task<int> Current(
        [FromStep(nameof(SetCurrentToZero))] int number,
        [FromStep(nameof(AddOneAsync))] int? currentNumber = null)
    {
        return currentNumber ?? number;
    }

    [Step]
    [DependOn(nameof(Current))]
    public async Task<string> BreakWhenReachTen(
        [FromStep(nameof(Current))] int current)
    {
        if (current < 10)
        {
            return "continue";
        }

        return "Loop finished";
    }

    [Step]
    [DependOn(nameof(BreakWhenReachTen))]
    [DependOn(nameof(Current))]
    public async Task<int?> AddOneAsync(
        [FromStep(nameof(Current))] int number,
        [FromStep(nameof(BreakWhenReachTen))] string end)
    {
        if (end == "Loop finished")
        {
            return null;
        }

        return number + 1;
    }

    [Step]
    [DependOn(nameof(AddOneAsync))]
    [DependOn(nameof(BreakWhenReachTen))]
    public async Task<string?> End(
        [FromStep(nameof(BreakWhenReachTen))] string end)
    {
        if (end == "Loop finished")
        {
            return "Loop finished";
        }

        return null;
    }
}


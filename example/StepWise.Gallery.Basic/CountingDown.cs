// Copyright (c) LittleLittleCloud. All rights reserved.
// CountingDown.cs

using StepWise.Core;

public class CountingDown
{
    [Step]
    public async Task<int?> MinusOne(
        [FromStep(nameof(MinusOne))] int previous = 10)
    {
        if (previous == 0)
        {
            return null;
        }

        return previous - 1;
    }

    [Step]
    [DependOn(nameof(MinusOne))]
    public async Task<string> SleepInSeconds(
        [FromStep(nameof(MinusOne))] int number)
    {
        await Task.Delay(1000 * number);

        return $"Slept for {number} seconds";
    }
}

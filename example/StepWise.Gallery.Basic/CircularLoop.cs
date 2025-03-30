// Copyright (c) LittleLittleCloud. All rights reserved.
// CircularLoop.cs

using StepWise.Core;

public class CircularLoop
{
    [Step]
    public async Task<int> PlusOne([FromStep(nameof(MinusTwo))] int a = 0)
    {
        await Task.Delay(1000);
        return a + 1;
    }

    [Step]
    public async Task<int> MinusTwo([FromStep(nameof(PlusOne))] int a)
    {
        await Task.Delay(1000);
        return a - 2;
    }
}

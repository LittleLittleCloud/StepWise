// Copyright (c) LittleLittleCloud. All rights reserved.
// BasicSteps.cs

using StepWise.Core;

namespace Gallery;

public class BasicSteps
{
    [Step]
    public async Task<string> DisplayA([FromStep(nameof(SetA))] string a)
    {
        await Task.Delay(1000);
        var currentDate = DateTime.Now;
        return $"A: {a} at {currentDate}";
    }

    [StepWiseUITextInput(description: "Please set a value for A")]
    public async Task<string?> SetA()
    {
        return null;
    }
}

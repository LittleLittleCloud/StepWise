// Copyright (c) LittleLittleCloud. All rights reserved.
// BasicSteps.cs

using StepWise.Core;

namespace Gallery;

public class BasicSteps
{
    [Step]
    [DependOn(nameof(ConvertAToInteger))]
    public async Task<string> Display([FromStep(nameof(ConvertAToInteger))] int a)
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

    [Step(description: "a step that converts a string to an integer")]
    [DependOn(nameof(SetA))]
    public async Task<int> ConvertAToInteger(
        [FromStep(nameof(SetA))] string a)
    {
        return int.Parse(a);
    }
}

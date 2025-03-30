// Copyright (c) LittleLittleCloud. All rights reserved.
// IfElseBranching.cs

using StepWise.Core;

namespace StepWise.Gallery;

public class IfElseBranching
{
    [Step(description: """
        To Start the workflow, click the start button(▶) in the tool bar.

        This workflow demonstrates a simple if-else branching process.

        You can find the source code in [IfElseBranching.cs](https://github.com/LittleLittleCloud/StepWise/blob/main/example/HelloWorld/IfElseBranching.cs).

        TIPS:
        - You can run multiple steps at once by increasing the Max Step in the tool bar.
        - You can re-run a single step by clicking the rotate button(↻) on the right side of the step.
        - You can re-run the entire workflow by clicking the rotate button(↻) in the tool bar.
        """)]
    public async Task<string> Start()
    {
        await Task.Delay(1000);
        return "Start";
    }

    [StepWiseUINumberInput(description: "Please enter a number between 1 and 100 and click submit")]
    public async Task<double?> GetNumber()
    {
        return null;
    }

    [Step]
    [DependOn(nameof(GetNumber))]
    public async Task<string?> HighNumberProcess(
        [FromStep(nameof(GetNumber))] double number)
    {
        if (number < 50)
        {
            return null;
        }

        await Task.Delay(1000);
        return $"High number process: {number} * 2 = {number * 2}";
    }

    [Step]
    [DependOn(nameof(GetNumber))]
    public async Task<string?> LowNumberProcess(
        [FromStep(nameof(GetNumber))] double? number)
    {
        if (number >= 50)
        {
            return null;
        }

        await Task.Delay(1000);
        return $"Low number process: {number} / 2 = {number / 2.0}";
    }

    [Step]
    [DependOn(nameof(HighNumberProcess))]
    [DependOn(nameof(LowNumberProcess))]
    public async Task<string?> End(
        [FromStep(nameof(HighNumberProcess))] string? highResult = null,
        [FromStep(nameof(LowNumberProcess))] string? lowResult = null)
    {
        if (highResult == null && lowResult == null)
        {
            return null;
        }

        await Task.Delay(1000);
        return highResult ?? lowResult;
    }
}

// Copyright (c) LittleLittleCloud. All rights reserved.
// Sequential.cs

using StepWise.Core;

namespace StepWise.Gallery;

public class Sequential
{
    [Step(description: """
        This is a sequential workflow example. 
        - source code: [Sequential.cs](https://github.com/LittleLittleCloud/StepWise/blob/main/example/HelloWorld/Sequential.cs).
        
        To Start the workflow, click the start button(▶) in the tool bar.

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

    [Step]
    [DependOn(nameof(Start))]
    public async Task<string> Step1(
        [FromStep(nameof(Start))] string start)
    {
        await Task.Delay(1000);
        return $"{start} -> Step1";
    }

    [Step]
    [DependOn(nameof(Step1))]
    public async Task<string> Step2(
        [FromStep(nameof(Step1))] string step1)
    {
        await Task.Delay(1000);
        return $"{step1} -> Step2";
    }

    [Step]
    [DependOn(nameof(Step2))]
    public async Task<string> End(
        [FromStep(nameof(Step2))] string step2)
    {
        await Task.Delay(1000);
        return $"{step2} -> End";
    }
}

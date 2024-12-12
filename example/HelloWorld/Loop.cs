// Copyright (c) LittleLittleCloud. All rights reserved.
// Loop.cs

using StepWise.Core;

public class Loop
{
    [Step(description: """
        This is a loop workflow example.

        - source code: [Loop.cs](https://github.com/LittleLittleCloud/StepWise/blob/main/example/HelloWorld/Loop.cs).
        
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
    public async Task<int?> A(
        [FromStep(nameof(PlusOne))] Status? a = null)
    {
        await Task.Delay(1000);

        if (a?.exit == true)
        {
            return null;
        }

        return a?.A ?? 0;
    }

    [Step]
    [DependOn(nameof(A))]
    public async Task<Status> PlusOne(
        [FromStep(nameof(A))] int a)
    {
        await Task.Delay(1000);

        if (a > 3)
        {
            return new Status(a, true);
        }
        else
        {
            return new Status(a + 1, false);
        }
    }

    [Step(description: "add 1 to a until a > 3")]
    [DependOn(nameof(PlusOne))]
    public async Task<string?> End(
        [FromStep(nameof(PlusOne))] Status status)
    {
        if (status.exit)
        {
            return "End: Exit";
        }
        else
        {
            return null;
        }
    }

    public record Status(int A, bool exit)
    {
        public override string ToString() => $"A: {A}, Exit: {exit}";
    }
}


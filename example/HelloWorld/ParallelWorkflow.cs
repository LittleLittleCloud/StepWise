// Copyright (c) LittleLittleCloud. All rights reserved.
// ParallelWorkflow.cs

using StepWise.Core;

namespace StepWise.Gallery;

public class ParallelWorkflow
{
    [Step(description: """
        To Start the workflow, click the start button(▶) in the tool bar.

        TIPS:
        - The workflow will stop executing when it completes the Max Step count or no more steps can be executed.
        - Increase the Max Parrallel Run in the tool bar to run multiple steps in parallel.
        - Increase the Max Step in the tool bar to run multiple steps at once.
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
    [DependOn(nameof(Start))]
    public async Task<string> Step2(
        [FromStep(nameof(Start))] string start)
    {
        await Task.Delay(1000);
        return $"{start} -> Step2";
    }

    [Step]
    [DependOn(nameof(Step2))]
    [DependOn(nameof(Step1))]
    public async Task<string> End(
        [FromStep(nameof(Step1))] string step1,
        [FromStep(nameof(Step2))] string step2)
    {
        await Task.Delay(1000);
        return $"Both steps are completed";
    }
}

// Copyright (c) LittleLittleCloud. All rights reserved.
// StepWiseEngineExtension.cs

using System.Runtime.CompilerServices;

namespace StepWise.Core.Extension;

public static class StepWiseEngineExtension
{
    /// <summary>
    /// Execute the workflow by publishing a list of inputs to the workflow and trigger the steps that depend on the inputs.
    /// </summary>
    public static async IAsyncEnumerable<StepRun> ExecuteAsync(
        this IStepWiseEngine engine,
        IEnumerable<StepVariable>? inputs = null,
        int? maxConcurrency = 1,
        IStepWiseEngineStopStrategy? stopStrategy = null,
        [EnumeratorCancellation]
        CancellationToken ct = default)
    {
        inputs ??= [];
        stopStrategy ??= new NeverStopStopStrategy();

        var steps = engine.Workflow.TopologicalSort();

        var stepResults = new List<StepRun>();
        await foreach (var stepRun in engine.ExecuteStepsAsync(steps, inputs, maxConcurrency ?? 1, stopStrategy: stopStrategy, ct: ct))
        {
            yield return stepRun;
        }
    }

    /// <summary>
    /// Execute the workflow until the target step is reached or no further steps can be executed.
    /// If the <paramref name="earlyStop"/> is true, the workflow will stop as soon as the target step is reached and completed.
    /// Otherwise, the workflow will continue to execute until no further steps can be executed.
    /// </summary>
    public static async Task<TResult> ExecuteAsync<TResult>(
        this IStepWiseEngine engine,
        string targetStepName,
        IEnumerable<StepVariable>? inputs = null,
        int maxConcurrency = 1,
        bool earlyStop = true,
        int? maxSteps = null,
        CancellationToken ct = default)
    {
        var stopStratgies = new List<IStepWiseEngineStopStrategy>();

        if (earlyStop)
        {
            stopStratgies.Add(new EarlyStopStrategy(targetStepName));
        }

        if (maxSteps.HasValue)
        {
            stopStratgies.Add(new MaxStepsStopStrategy(maxSteps.Value));
        }

        var stopStrategy = stopStratgies.Count > 0 ? new StopStrategyPipeline(stopStratgies.ToArray()) : null;

        maxSteps ??= int.MaxValue;
        await foreach (var stepResult in engine.ExecuteAsync(inputs, maxConcurrency, stopStrategy, ct: ct))
        {
            if (stepResult.Variable != null && stepResult.Name == targetStepName)
            {
                return stepResult.Variable.As<TResult>() ?? throw new Exception($"Step '{targetStepName}' did not return the expected result type.");
            }
        }

        throw new Exception($"Step '{targetStepName}' did not return the expected result type.");
    }

    /// <summary>
    /// Execute the workflow until the target step is completed or no further steps can be executed.
    /// If the <paramref name="earlyStop"/> is true, the workflow will stop as soon as the target step is completed.
    /// Otherwise, the workflow will continue to execute until no further steps can be executed.
    /// </summary>
    public static async IAsyncEnumerable<StepRun> ExecuteAsync(
        this IStepWiseEngine engine,
        string targetStepName,
        IEnumerable<StepVariable>? inputs = null,
        int maxConcurrency = 1,
        bool earlyStop = true,
        int? maxSteps = null,
        [EnumeratorCancellation]
        CancellationToken ct = default)
    {
        var stopStratgies = new List<IStepWiseEngineStopStrategy>();

        if (earlyStop)
        {
            stopStratgies.Add(new EarlyStopStrategy(targetStepName));
        }

        if (maxSteps.HasValue)
        {
            stopStratgies.Add(new MaxStepsStopStrategy(maxSteps.Value));
        }

        var stopStrategy = stopStratgies.Count > 0 ? new StopStrategyPipeline(stopStratgies.ToArray()) : null;

        maxSteps ??= int.MaxValue;

        await foreach (var stepRun in engine.ExecuteAsync(inputs, maxConcurrency, stopStrategy, ct: ct))
        {
            yield return stepRun;
        }
    }

    /// <summary>
    /// Execute the given step and return the result. This API will execute the step and its predecessors steps. However, it will not execute the steps that depend on the target step.
    /// </summary>
    /// <param name="engine"></param>
    /// <param name="targetStepName"></param>
    /// <param name="maxConcurrency"></param>
    /// <param name="inputs"></param>
    /// <param name="ct"></param>
    /// <returns></returns>
    public static async IAsyncEnumerable<StepRun> ExecuteStepAsync(
        this IStepWiseEngine engine,
        string targetStepName,
        IEnumerable<StepVariable>? inputs = null,
        int maxConcurrency = 1,
        [EnumeratorCancellation]
        CancellationToken ct = default)
    {
        if (engine.Workflow.Steps.TryGetValue(targetStepName, out var targetStep))
        {
            var step = targetStep;
            var requiredSteps = engine.Workflow.GetAllRequiredSteps(step.Name);
            var stepInputs = inputs?.ToList() ?? new List<StepVariable>();
            var stopStrategy = new StopStrategyPipeline();
            stopStrategy.AddStrategy(new EarlyStopStrategy(targetStepName));

            await foreach (var stepRun in engine.ExecuteStepsAsync([.. requiredSteps, step], stepInputs, maxConcurrency, stopStrategy, ct))
            {
                yield return stepRun;
            }
        }
        else
        {
            throw new ArgumentException($"Step '{targetStepName}' not found in the workflow.", nameof(targetStepName));
        }
    }
}

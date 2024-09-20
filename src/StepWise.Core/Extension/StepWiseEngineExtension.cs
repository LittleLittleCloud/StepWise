// Copyright (c) LittleLittleCloud. All rights reserved.
// StepWiseEngineExtension.cs

using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text;

namespace StepWise.Core.Extension;

public static class StepWiseEngineExtension
{
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
        await foreach (var stepResult in engine.ExecuteAsync(targetStepName, inputs, maxConcurrency, stopStrategy, ct))
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

        await foreach (var stepRun in engine.ExecuteAsync(targetStepName, inputs, maxConcurrency, stopStrategy, ct))
        {
            yield return stepRun;
        }
    }

    /// <summary>
    /// Execute the given step and return the result. This API will not execute any other steps that this step depends on or depends on this step.
    /// 
    /// If the step is not found, an exception will be thrown.
    /// 
    /// If any required input is missing, the workflow will not be executed and return immediately.
    /// or exit condition is met.
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
            var stepInputs = inputs?.ToList() ?? new List<StepVariable>();
            var stopStrategy = new StopStrategyPipeline();
            //stopStrategy.AddStrategy(new MaxStepsStopStrategy(1));
            stopStrategy.AddStrategy(new EarlyStopStrategy(targetStepName));

            await foreach (var stepRun in engine.ExecuteStepsAsync([step], stepInputs, maxConcurrency, stopStrategy, ct))
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

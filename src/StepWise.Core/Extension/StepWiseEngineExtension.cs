// Copyright (c) LittleLittleCloud. All rights reserved.
// StepWiseEngineExtension.cs

using System;
using System.Collections.Generic;
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
        Dictionary<string, StepVariable>? inputs = null,
        bool earlyStop = true,
        int? maxSteps = null,
        CancellationToken ct = default)
    {
        maxSteps ??= int.MaxValue;
        await foreach (var stepResult in engine.ExecuteAsync(targetStepName, inputs, earlyStop, maxSteps, ct))
        {
            if (stepResult.Result != null && stepResult.StepName == targetStepName)
            {
                return stepResult.Result.As<TResult>() ?? throw new Exception($"Step '{targetStepName}' did not return the expected result type.");
            }
        }

        throw new Exception($"Step '{targetStepName}' did not return the expected result type.");
    }
}

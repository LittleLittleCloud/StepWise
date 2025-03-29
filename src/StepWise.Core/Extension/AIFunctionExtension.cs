// Copyright (c) LittleLittleCloud. All rights reserved.
// AIFunctionExtension.cs

using System.Text.Json;
using Microsoft.Extensions.AI;

namespace StepWise.Core.Extension;

public static class AIFunctionExtension
{
    public static IEnumerable<AIFunction> GetAIFunctions(this Workflow workflow)
    {
        var result = new List<AIFunction>();

        foreach (var step in workflow.Steps.Values)
        {
            var function = AIFunctionFactory.Create(step.StepMethod, step.Name, step.Description);
            var stepAIFunction = new StepAIFunction(engine, step);
            result.Add(function);
        }

        return result;
    }
}

/// <summary>
/// A wrapper to execute AI functions using workflow engine.
/// </summary>
public class StepAIFunction(IStepWiseEngine engine, Step step, JsonElement scheme) : AIFunction
{
    protected override async Task<object?> InvokeCoreAsync(IEnumerable<KeyValuePair<string, object?>> arguments, CancellationToken cancellationToken)
    {
        var variables = new List<StepVariable>();
        foreach (var argument in arguments)
        {
            if (argument.Value is null)
            {
                continue;
            }

            variables.Add(StepVariable.Create(argument.Key, argument.Value));
        }

        var steps = await engine.ExecuteStepAsync(step.Name, variables).ToArrayAsync(cancellationToken);

        return steps.Last(step => step.StepRunType == StepRunType.Variable).Variable?.Value ?? "No result";
    }
}

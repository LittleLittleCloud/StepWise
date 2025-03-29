// Copyright (c) LittleLittleCloud. All rights reserved.
// AIFunctionExtension.cs

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
            result.Add(function);
        }

        return result;
    }
}

/// <summary>
/// A wrapper to execute AI functions using workflow engine.
/// </summary>
public class StepAIFunction(IStepWiseEngine engine, Step step) : AIFunction
{
    protected override Task<object?> InvokeCoreAsync(IEnumerable<KeyValuePair<string, object?>> arguments, CancellationToken cancellationToken)
    {
        var variables = arguments.Select(x => StepVariable.Create(x.Key, x.Value)).ToArray();
        var steps = await engine.ExecuteStepAsync()
    }
}

using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.Extensions.Logging;

namespace StepWise.Core;

public class WorkflowEngine
{
    private readonly Workflow _workflow;
    private readonly ILogger<WorkflowEngine>? _logger = null;

    public WorkflowEngine(Workflow workflow, ILogger<WorkflowEngine>? logger = null)
    {
        _workflow = workflow;
        _logger = logger;
    }

    public async Task<TResult> ExecuteStepAsync<TResult>(string stepName, Dictionary<string, object>? inputs = null)
    {
        inputs ??= new Dictionary<string, object>();
        var step = _workflow.Steps[stepName] ?? throw new Exception($"Step '{stepName}' not found in the workflow.");

        var result = await ExecuteStepAsync(step, inputs);

        if (result is TResult finalResult)
        {
            return finalResult;
        }

        throw new Exception($"Step '{stepName}' did not return the expected result type.");
    }

    // retrieve all the steps that need to be executed in order to reach the target step
    private List<Step> ResolveDependencies(string targetStepName)
    {
        var executionPlan = new List<Step>();
        var visited = new HashSet<string>();
        var visiting = new HashSet<string>();

        void DFS(Step step)
        {
            if (visited.Contains(step.Name))
                return;

            visiting.Add(step.Name);

            foreach (var dependency in step.Dependencies)
            {
                var dependencyStep = _workflow.Steps[dependency] ?? throw new Exception($"Dependency '{dependency}' not found in the workflow.");
                DFS(dependencyStep);
            }

            visiting.Remove(step.Name);
            visited.Add(step.Name);
            executionPlan.Add(step);
        }

        var targetStep = _workflow.Steps[targetStepName] ?? throw new Exception($"Step '{targetStepName}' not found in the workflow.");

        DFS(targetStep);

        return executionPlan;
    }

    //private Dictionary<string, object> ResolveInputs(Step step, Dictionary<string, object> executionResults)
    //{
    //    var inputs = new Dictionary<string, object>();

    //    foreach (var param in step.InputParameters)
    //    {
    //        if (param.SourceStep != null)
    //        {
    //            if (!executionResults.TryGetValue(param.SourceStep, out var value))
    //                throw new InvalidWorkflowException($"Required input '{param.Name}' from step '{param.SourceStep}' not available.");

    //            inputs[param.Name] = value;
    //        }
    //    }

    //    return inputs;
    //}

    private async Task<object> ExecuteStepAsync(Step step, Dictionary<string, object> inputs)
    {
        var stepsToExecute = ResolveDependencies(step.Name);

        // dummy way
        while (true)
        {
            if (await step.ExecuteAsync(inputs) is object finalResult)
            {
                return finalResult;
            }

            foreach (var stepToExecute in stepsToExecute)
            {
                if (await stepToExecute.ExecuteAsync(inputs) is object result)
                {
                    _logger?.LogDebug($"Step '{stepToExecute.Name}' executed successfully.");
                    inputs[stepToExecute.Name] = result;

                    if (stepToExecute == step)
                    {
                        return result;
                    }
                }
            }
        }
    }
}

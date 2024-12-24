// Copyright (c) LittleLittleCloud. All rights reserved.
// StepWiseClient.cs

using Microsoft.Extensions.Logging;
using StepWise.Core;
using StepWise.Core.Extension;

namespace StepWise.WebAPI;

public class StepWiseClient
{
    private readonly ILogger<StepWiseClient>? _logger;
    private readonly List<Workflow> _workflows = new();

    public StepWiseClient(ILogger<StepWiseClient>? logger = null)
    {
        _logger = logger;
    }

    public event EventHandler<(StepRunDTO, Guid)>? StepRunEvent;

    // get workflow
    public Workflow? GetWorkflow(string workflowName)
    {
        return _workflows.Find(w => w.Name == workflowName);
    }

    // add workflow
    public void AddWorkflow(Workflow workflow)
    {
        // throw if workflow already exists
        if (_workflows.Find(w => w.Name == workflow.Name) is not null)
        {
            throw new ArgumentException($"Workflow {workflow.Name} already exists");
        }

        _workflows.Add(workflow);
    }

    public void AddWorkflowFromInstance<T>(T instance, string? name = null)
        where T : notnull
    {
        var workflow = Workflow.CreateFromInstance(instance, name);
        AddWorkflow(workflow);
    }

    public void RemoveWorkflow(string workflowName)
    {
        _workflows.RemoveAll(w => w.Name == workflowName);
    }

    // list workflows
    public IEnumerable<Workflow> ListWorkflow()
    {
        return _workflows;
    }

    // get step
    public Step? GetStep(string workflowName, string stepName)
    {
        if (_workflows.Find(w => w.Name == workflowName) is Workflow workflow)
        {
            if (workflow.Steps.TryGetValue(stepName, out var step))
            {
                return step;
            }
        }

        return null;
    }

    // execute step
    public async IAsyncEnumerable<StepRun> ExecuteStep(
        string workflowName,
        Guid sessionID,
        string? stepName = null,
        int? maxSteps = null,
        int maxParallel = 1,
        StepVariable[]? input = null)
    {
        if (_workflows.Find(w => w.Name == workflowName) is not Workflow workflow)
        {
            yield break;
        }

        var engine = new StepWiseEngine(workflow, logger: _logger);
        input ??= Array.Empty<StepVariable>();

        var stopStragety = new StopStrategyPipeline();

        if (stepName is not null && workflow.Steps.TryGetValue(stepName, out var step))
        {
            var earlyStopStrategy = new EarlyStopStrategy(stepName);
            stopStragety.AddStrategy(earlyStopStrategy);

            this._logger?.LogInformation($"Early stop strategy added for step {stepName}");
        }

        if (maxSteps is not null)
        {
            var maxStepsStopStrategy = new MaxStepsStopStrategy(maxSteps.Value);
            stopStragety.AddStrategy(maxStepsStopStrategy);

            this._logger?.LogInformation($"Max steps stop strategy added for {maxSteps} steps");
        }

        if (stepName is not null)
        {
            await foreach (var stepRun in engine.ExecuteStepAsync(stepName, input, maxParallel))
            {
                yield return stepRun;
                StepRunEvent?.Invoke(this, (StepRunDTO.FromStepRun(stepRun), sessionID));
            }
        }
        else
        {
            await foreach (var stepRunAndResult in engine.ExecuteAsync(inputs: input, maxConcurrency: maxParallel, stopStrategy: stopStragety))
            {
                yield return stepRunAndResult;
                StepRunEvent?.Invoke(this, (StepRunDTO.FromStepRun(stepRunAndResult), sessionID));
            }
        }
    }

    // list steps
    public IEnumerable<Step> ListSteps(string workflowName)
    {
        if (_workflows.Find(w => w.Name == workflowName) is Workflow workflow)
        {
            return workflow.Steps.Values;
        }

        return Array.Empty<Step>();
    }
}

// Copyright (c) LittleLittleCloud. All rights reserved.
// StepWiseControllerV1.cs

using System.Collections.Concurrent;
using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.Logging;
using StepWise.Core;

namespace StepWise.WebAPI;

public class StepWiseClient
{
    private readonly ILogger<StepWiseClient>? _logger;
    private readonly ConcurrentDictionary<string, Workflow> _workflows = new();
    public StepWiseClient(ILogger<StepWiseClient>? logger = null)
    {
        _logger = logger;
    }

    // get workflow
    public Workflow? GetWorkflow(string workflowName)
    {
        if (!_workflows.TryGetValue(workflowName, out var workflow))
        {
            return null;
        }

        return workflow;
    }

    // add workflow
    public void AddWorkflow(Workflow workflow)
    {
        _workflows[workflow.Name] = workflow;
    }

    public void RemoveWorkflow(string workflowName)
    {
        _workflows.TryRemove(workflowName, out _);
    }

    // list workflows
    public IEnumerable<Workflow> ListWorkflow()
    {
        return _workflows.Values;
    }

    // get step
    public Step? GetStep(string workflowName, string stepName)
    {
        if (!_workflows.TryGetValue(workflowName, out var workflow))
        {
            return null;
        }

        if (!workflow.Steps.TryGetValue(stepName, out var step))
        {
            return null;
        }

        return step;
    }

    // execute step
    public async IAsyncEnumerable<StepRun> ExecuteStep(
        string workflowName,
        string? stepName = null,
        int? maxSteps = null,
        int maxParallel = 1)
    {
        if (!_workflows.TryGetValue(workflowName, out var workflow))
        {
            yield break;
        }

        var engine = new StepWiseEngine(workflow, maxParallel, logger: _logger);

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


        await foreach (var stepRunAndResult in engine.ExecuteAsync(stepName, stopStrategy: stopStragety))
        {
            yield return stepRunAndResult;
        }
    }

    // list steps
    public IEnumerable<Step> ListSteps(string workflowName)
    {
        if (!_workflows.TryGetValue(workflowName, out var workflow))
        {
            return Enumerable.Empty<Step>();
        }

        return workflow.Steps.Values;
    }
}

[ApiController]
[Route("api/v1/[controller]/[action]")]
internal class StepWiseControllerV1 : ControllerBase
{
    private readonly ILogger<StepWiseControllerV1>? _logger = null;
    private readonly StepWiseClient _client;

    public StepWiseControllerV1(StepWiseClient client, ILogger<StepWiseControllerV1>? logger = null)
    {
        _client = client;
        _logger = logger;
    }

    [HttpGet]
    public IActionResult Get()
    {
        return Ok("Hello, StepWise!");
    }

    [HttpGet]
    public async Task<ActionResult<string>> Version()
    {
        _logger?.LogInformation("Getting version");

        var assembly = Assembly.GetExecutingAssembly();
        var version = assembly.GetName().Version;

        // return major.minor.patch

        var versionString = $"{version!.Major}.{version.Minor}.{version.Build}";

        return new OkObjectResult(versionString);
    }

    [HttpGet]
    public async Task<ActionResult<StepDTO>> GetStep(string workflowName, string stepName)
    {
        var step = _client.GetStep(workflowName, stepName);

        if (step is null)
        {
            return NotFound($"Step {stepName} not found in workflow {workflowName}");
        }

        return Ok(StepDTO.FromStep(step));
    }

    [HttpGet]
    public async Task<ActionResult<WorkflowDTO>> GetWorkflow(string workflowName)
    {
        var workflow = _client.GetWorkflow(workflowName);
        if (workflow is null)
        {
            return NotFound($"Workflow {workflowName} not found");
        }

        var steps = workflow.Steps.Values.Select(StepDTO.FromStep).ToArray();
        return Ok(WorkflowDTO.FromWorkflow(workflow));
    }

    [HttpGet]
    public async Task<ActionResult<WorkflowDTO[]>> ListWorkflow()
    {
        var workflows = _client.ListWorkflow();

        _logger?.LogInformation($"List workflows: {workflows.Count()}");
        return Ok(workflows.Select(WorkflowDTO.FromWorkflow).ToArray());
    }

    [HttpPost]
    public async IAsyncEnumerable<StepRunDTO> ExecuteStep(
        string workflow,
        string? step = null,
        int? maxSteps = null,
        int maxParallel = 1)
    {
        await foreach (var stepRun in _client.ExecuteStep(workflow, step, maxSteps, maxParallel))
        {
            yield return StepRunDTO.FromStepRun(stepRun);
        }
    }
}


class StepWiseControllerV1Provider : ControllerFeatureProvider
{
    protected override bool IsController(TypeInfo typeInfo)
    {
        return typeof(StepWiseControllerV1).IsAssignableFrom(typeInfo);
    }
}

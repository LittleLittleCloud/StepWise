// Copyright (c) LittleLittleCloud. All rights reserved.
// StepWiseControllerV1.cs

using System.Collections.Concurrent;
using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.Logging;
using StepWise.Core;

namespace StepWise.WebAPI;

[ApiController]
[Route("api/v1/[controller]/[action]")]
internal class StepWiseControllerV1 : ControllerBase
{
    private readonly ILogger<StepWiseControllerV1>? _logger = null;
    private readonly ConcurrentDictionary<string, Workflow> _workflows = new();

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
        if (!_workflows.TryGetValue(workflowName, out var workflow))
        {
            return NotFound($"Workflow {workflowName} not found");
        }

        if (!workflow.Steps.TryGetValue(stepName, out var step))
        {
            return NotFound($"Step {stepName} not found in workflow {workflowName}");
        }

        return Ok(StepDTO.FromStep(step));
    }

    [HttpGet]
    public async Task<ActionResult<WorkflowDTO>> GetWorkflow(string workflowName)
    {
        if (!_workflows.TryGetValue(workflowName, out var workflow))
        {
            return NotFound($"Workflow {workflowName} not found");
        }

        var steps = workflow.Steps.Values.Select(StepDTO.FromStep).ToArray();
        return Ok(WorkflowDTO.FromWorkflow(workflow));
    }

    [HttpGet]
    public async Task<ActionResult<WorkflowDTO[]>> ListWorkflow()
    {
        return Ok(_workflows.Values.Select(WorkflowDTO.FromWorkflow).ToArray());
    }

    [HttpPost]
    public async IAsyncEnumerable<StepRunAndResultDTO> ExecuteStep(string workflow, string step)
    {
        var workflowInstance = _workflows[workflow];
        var stepInstance = workflowInstance.Steps[step];
        var engine = new StepWiseEngine(workflowInstance, logger: _logger);

        await foreach (var stepRunAndResult in engine.ExecuteAsync(step))
        {
            yield return StepRunAndResultDTO.FromStepRunAndResult(stepRunAndResult.StepRun, stepRunAndResult.Result);
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

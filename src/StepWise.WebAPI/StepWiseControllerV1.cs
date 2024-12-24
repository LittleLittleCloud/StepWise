// Copyright (c) LittleLittleCloud. All rights reserved.
// StepWiseControllerV1.cs

using System.Collections.Concurrent;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.Logging;
using StepWise.Core;

namespace StepWise.WebAPI;

public class StepWiseServiceConfiguration
{
    public const string DefaultWorkspace = "stepwise-workspace";

    public const string BlobFolderName = "blob";

    public const string LogFolderName = "logs";

    public const string CheckpointFolderName = "checkpoints";

    [JsonIgnore]
    public int BlobRetentionDays { get; set; } = 30;

    [JsonIgnore]
    public DirectoryInfo Workspace { get; set; } = new DirectoryInfo(Path.Combine(Environment.CurrentDirectory, DefaultWorkspace));

    public bool EnableAuth0Authentication { get; set; } = false;

    public string? Auth0Domain { get; set; } = "";

    public string? Auth0ClientId { get; set; } = "";

    public string? Auth0Audience { get; set; } = "";

    public string? Version { get; set; }
}

[Authorize]
[ApiController]
[Route("api/v1/[controller]/[action]")]
internal class StepWiseControllerV1 : ControllerBase
{
    private readonly ILogger<StepWiseControllerV1>? _logger = null;
    private readonly StepWiseClient _client;
    private readonly IWebHostEnvironment _environment;
    private readonly StepWiseServiceConfiguration _stepWiseServiceConfiguration;
    private static readonly ConcurrentDictionary<string, DateTime> _fileExpirations = new ConcurrentDictionary<string, DateTime>();

    public StepWiseControllerV1(
        StepWiseClient client,
        IWebHostEnvironment environment,
        StepWiseServiceConfiguration configuration,
        ILogger<StepWiseControllerV1>? logger = null)
    {
        _client = client;
        _logger = logger;
        _environment = environment;
        _stepWiseServiceConfiguration = configuration;
        Initialize();
    }

    private void Initialize()
    {
        // create the workspace directory if it does not exist
        if (!_stepWiseServiceConfiguration.Workspace.Exists)
        {
            _stepWiseServiceConfiguration.Workspace.Create();
        }

        if (_stepWiseServiceConfiguration.Version is null)
        {
            var assembly = Assembly.GetExecutingAssembly();
            var version = assembly.GetName().Version;
            var versionString = $"{version!.Major}.{version.Minor}.{version.Build}";

            _stepWiseServiceConfiguration.Version = versionString;
        }
    }

    [HttpGet]
    public IActionResult Get()
    {
        return Ok("Hello, StepWise!");
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

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<StepWiseServiceConfiguration>> GetConfiguration()
    {
        return Ok(_stepWiseServiceConfiguration);
    }

    [HttpPost]
    public async IAsyncEnumerable<StepRunDTO> ExecuteStep(
        string workflow,
        Guid sessionID,
        string? step = null,
        int? maxSteps = null,
        int maxParallel = 1,
        VariableDTO[]? variables = null)
    {
        var blobFolder = this.GetOrCreateBlobFolder();
        variables = variables ?? [];
        if (_client.GetWorkflow(workflow) is not Workflow workflowObject)
        {
            yield break;
        }

        var steps = workflowObject.Steps.Values;
        var stepVariableTypeMap = steps.ToDictionary(s => s.Name, s =>
        {
            var returnType = s.OutputType;
            // return type will always be Task<MyReturnType>
            if (returnType.IsGenericType && returnType.GetGenericTypeDefinition() == typeof(Task<>))
            {
                var actualReturnType = returnType.GenericTypeArguments[0]; // MyReturnType

                return actualReturnType;
            }

            return returnType;
        });

        // for step variable, we record <stepName, variableType>
        var stepParameterTypes = steps.SelectMany(s => s.InputParameters, (s, p) => (p.Type.Name, p.Type)).Distinct();

        // for parameter variable, we record <parameterTypeName, parameterType>
        // because the name of parameter might be duplicated in different steps
        var stepParameterTypeMap = stepParameterTypes.ToDictionary(p => p.Name, p => p.Type);
        var inputs = new List<StepVariable>();

        foreach (var variable in variables)
        {
            // the name of variables can either be one of the step names, which indicates that it's the output of that step
            // or also can be {stepName}.{parameterName}, which indicates that it's the input parameter of that step
            // In the second case, since we didn't record the {stepName}.{parameterName} in the stepParameterTypeMap, we get the specific type from the stepParameterTypeMap
            var stepVariable = stepVariableTypeMap.ContainsKey(variable.Name) ? VariableDTO.FromVariableDTO(variable, stepVariableTypeMap[variable.Name])
                : VariableDTO.FromVariableDTO(variable, stepParameterTypeMap[variable.VariableType]);

            if (stepVariable.Value is StepWiseBlob blob && blob.Url?.Contains("/blob/") == true)
            {
                var mediaType = blob switch
                {
                    StepWiseImage image => image.ContentType,
                    _ => null,
                };

                // load the blob from the file system
                var filePath = Path.Combine(blobFolder, blob.Url.Split("/").Last()); // the file name will be the last part of the URL
                if (System.IO.File.Exists(filePath))
                {
                    var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
                    blob.Blob = BinaryData.FromBytes(fileBytes, mediaType: mediaType);
                }
            }

            inputs.Add(stepVariable);
        }

        await foreach (var stepRun in _client.ExecuteStep(workflow, sessionID, step, maxSteps, maxParallel, [.. inputs]))
        {
            if (stepRun.Variable?.Value is StepWiseBlob blob && blob.Blob is not null && blob.Url is null)
            {
                // save the blob to the file system
                var uniqueFileName = Guid.NewGuid().ToString() + "_" + blob.Name;
                var filePath = Path.Combine(blobFolder, uniqueFileName);
                await System.IO.File.WriteAllBytesAsync(filePath, blob.Blob.ToArray());
                blob.Url = User.Identity?.Name is string userName ? $"/blob/{SanitizeStringToFileName(userName)}/{uniqueFileName}" : $"/blob/{uniqueFileName}";
            }

            var dto = StepRunDTO.FromStepRun(stepRun);

            yield return dto;
            if (HttpContext.RequestAborted.IsCancellationRequested)
            {
                _logger?.LogInformation("Request aborted");
                yield break;
            }
        }
    }

    [AllowAnonymous]
    [HttpGet("/blob/{path}")]
    public IActionResult GetUploads(string path)
    {
        var filePath = Path.Combine(GetOrCreateBlobFolder(), path);
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound();
        }
        return PhysicalFile(filePath, "application/octet-stream");
    }

    [AllowAnonymous]
    [HttpGet("/blob/{userID}/{path}")]
    public IActionResult GetUploads(string userID, string path)
    {
        var filePath = Path.Combine(GetOrCreateUserWorkspace(), userID, StepWiseServiceConfiguration.BlobFolderName, path);
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound();
        }
        return PhysicalFile(filePath, "application/octet-stream");
    }

    // save checkpoint
    [HttpPost]
    public async Task<ActionResult<string>> SaveCheckpointAsync(
        string workflow,
        string checkpointName,
        StepRunDTO[] steps)
    {
        // check if the workflow exists
        if (_client.GetWorkflow(workflow) is not Workflow workflowObject)
        {
            return NotFound($"Workflow {workflow} not found");
        }

        var workspace = this.GetOrCreateUserWorkspace();

        var checkpointFolder = Path.Combine(workspace, StepWiseServiceConfiguration.CheckpointFolderName, workflow);
        if (!Directory.Exists(checkpointFolder))
        {
            Directory.CreateDirectory(checkpointFolder);
        }

        var checkpointPath = Path.Combine(checkpointFolder, checkpointName);
        // check if the checkpoint exists in the workspace
        if (Directory.Exists(checkpointPath))
        {
            return Conflict($"Checkpoint {checkpointName} already exists for workflow {workflow}");
        }

        var json = JsonSerializer.Serialize(steps);
        await System.IO.File.WriteAllTextAsync(checkpointPath, json);

        return Ok(checkpointName);
    }

    // load checkpoint
    [HttpGet]
    public async Task<ActionResult<StepRunDTO[]>> LoadCheckpointAsync(
        string workflow,
        string checkpointName)
    {
        // check if the workflow exists
        if (_client.GetWorkflow(workflow) is not Workflow workflowObject)
        {
            return NotFound($"Workflow {workflow} not found");
        }
        var workspace = this.GetOrCreateUserWorkspace();
        var checkpointFolder = Path.Combine(workspace, StepWiseServiceConfiguration.CheckpointFolderName, workflow);
        if (!Directory.Exists(checkpointFolder))
        {
            return NotFound($"Checkpoint folder for workflow {workflow} not found");
        }
        var checkpointPath = Path.Combine(checkpointFolder, checkpointName);
        if (!System.IO.File.Exists(checkpointPath))
        {
            return NotFound($"Checkpoint {checkpointName} not found for workflow {workflow}");
        }
        var json = await System.IO.File.ReadAllTextAsync(checkpointPath);
        var variables = JsonSerializer.Deserialize<StepRunDTO[]>(json);
        return Ok(variables);
    }

    // delete checkpoint
    [HttpDelete]
    public async Task<ActionResult> DeleteCheckpointAsync(
        string workflow,
        string checkpointName)
    {
        // check if the workflow exists
        if (_client.GetWorkflow(workflow) is not Workflow workflowObject)
        {
            return NotFound($"Workflow {workflow} not found");
        }

        var workspace = this.GetOrCreateUserWorkspace();
        var checkpointFolder = Path.Combine(workspace, StepWiseServiceConfiguration.CheckpointFolderName, workflow);
        if (!Directory.Exists(checkpointFolder))
        {
            return NotFound($"Checkpoint folder for workflow {workflow} not found");
        }
        var checkpointPath = Path.Combine(checkpointFolder, checkpointName);
        if (!System.IO.File.Exists(checkpointPath))
        {
            return NotFound($"Checkpoint {checkpointName} not found for workflow {workflow}");
        }
        System.IO.File.Delete(checkpointPath);
        return Ok();
    }

    // list checkpoints
    [HttpGet]
    public async Task<ActionResult<string[]>> ListCheckpointsAsync(string workflow)
    {
        // check if the workflow exists
        if (_client.GetWorkflow(workflow) is not Workflow workflowObject)
        {
            return NotFound($"Workflow {workflow} not found");
        }
        var workspace = this.GetOrCreateUserWorkspace();
        var checkpointFolder = Path.Combine(workspace, StepWiseServiceConfiguration.CheckpointFolderName, workflow);
        if (!Directory.Exists(checkpointFolder))
        {
            return Ok(Array.Empty<string>());
        }
        var checkpoints = Directory.GetFiles(checkpointFolder).Select(Path.GetFileName).ToArray();
        return Ok(checkpoints);
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task ExecuteStepSse(Guid sessionID)
    {
        _logger?.LogInformation("ExecuteStepSse");
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        _logger?.LogInformation($"SessionID: {sessionID}");

        EventHandler<(StepRunDTO, Guid)> eventHandler = (sender, stepRun) =>
        {
            _logger?.LogInformation($"StepRunEvent: {stepRun.Item1}");
            _logger?.LogInformation($"ssID: {stepRun.Item2}");
            if (stepRun.Item2 != sessionID)
            {
                return;
            }
            var sseEvent = new SSEEvent
            {
                Id = DateTime.Now.Ticks.ToString(),
                Retry = 10,
                Event = nameof(StepRunDTO),
                Data = JsonSerializer.Serialize(stepRun.Item1),
            };

            var sseData = Encoding.UTF8.GetBytes(sseEvent.ToString());
            _logger?.LogInformation($"SSE: {sseEvent}");
            Response.Body.WriteAsync(sseData);
            Response.Body.WriteAsync(Encoding.UTF8.GetBytes("\n\n"));
            Response.Body.FlushAsync();
        };

        _client.StepRunEvent += eventHandler;

        while (!HttpContext.RequestAborted.IsCancellationRequested)
        {
            await Task.Delay(1000);
        }

        _client.StepRunEvent -= eventHandler;
    }

    [HttpPost]
    public async Task<ActionResult<StepWiseImage>> UploadImage(IFormFile image)
    {
        if (image == null || image.Length == 0)
        {
            return BadRequest("No image file provided.");
        }

        var blobFolder = this.GetOrCreateBlobFolder();

        try
        {
            if (!Directory.Exists(blobFolder))
            {
                Directory.CreateDirectory(blobFolder);
            }

            string uniqueFileName = Guid.NewGuid().ToString() + "_" + image.FileName;
            string filePath = Path.Combine(blobFolder, uniqueFileName);

            // Read the incoming byte array
            byte[] fileBytes;
            using (var memoryStream = new MemoryStream())
            {
                await image.CopyToAsync(memoryStream);
                fileBytes = memoryStream.ToArray();
            }

            // Log the first 100 bytes
            _logger?.LogInformation($"First 100 bytes: {BitConverter.ToString(fileBytes.Take(100).ToArray())}");

            // Save the original file
            await System.IO.File.WriteAllBytesAsync(filePath, fileBytes);

            // Set expiration time
            int retentionDays = _stepWiseServiceConfiguration.BlobRetentionDays;
            DateTime expirationDate = DateTime.UtcNow.AddDays(retentionDays);
            _fileExpirations[uniqueFileName] = expirationDate;
            var result = new StepWiseImage
            {
                Url = User.Identity?.Name is string userName ? $"/blob/{SanitizeStringToFileName(userName)}/{uniqueFileName}" : $"/blob/{uniqueFileName}",
                Name = image.FileName,
                ContentType = image.ContentType,
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    private string GetOrCreateUserWorkspace()
    {
        var workspace = User.Identity?.Name switch
        {
            null => _stepWiseServiceConfiguration.Workspace.FullName,
            string userName => Path.Combine(_stepWiseServiceConfiguration.Workspace.FullName, SanitizeStringToFileName(userName)),
        };

        if (!Directory.Exists(workspace))
        {
            Directory.CreateDirectory(workspace);
        }

        return workspace;
    }

    private string SanitizeStringToFileName(string userID)
    {
        // remove invalid characters
        var invalidChars = Path.GetInvalidFileNameChars();
        var sanitized = new string(userID.Select(c => invalidChars.Contains(c) ? '_' : c).ToArray());
        return sanitized;
    }

    private string GetOrCreateBlobFolder()
    {
        var workspace = this.GetOrCreateUserWorkspace();
        var blobFolder = Path.Combine(workspace, StepWiseServiceConfiguration.BlobFolderName);
        if (!Directory.Exists(blobFolder))
        {
            Directory.CreateDirectory(blobFolder);
        }

        return blobFolder;

    }
}

public struct SSEEvent
{
    public string Id { get; set; }
    public int Retry { get; set; }
    public string Event { get; set; }
    public string Data { get; set; }

    public override string ToString()
    {
        return $"id: {Id}\nretry: {Retry}\nevent: {Event}\ndata: {Data}\n\n";
    }
}


class StepWiseControllerV1Provider : ControllerFeatureProvider
{
    protected override bool IsController(TypeInfo typeInfo)
    {
        return typeof(StepWiseControllerV1).IsAssignableFrom(typeInfo);
    }
}


namespace StepWise.Core;

public interface IWorkflowEngine
{
    Task<TResult> ExecuteStepAsync<TResult>(string stepName, Dictionary<string, object>? inputs = null);

    IAsyncEnumerable<(string, object)> ExecuteStepAsync(string targetStep, Dictionary<string, object>? inputs = null);
}

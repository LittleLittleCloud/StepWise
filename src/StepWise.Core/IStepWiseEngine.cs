
namespace StepWise.Core;

public interface IStepWiseEngine
{
    /// <summary>
    /// Execute the workflow until the target step is reached or no further steps can be executed.
    /// If the <paramref name="earlyStop"/> is true, the workflow will stop as soon as the target step is reached and completed.
    /// Otherwise, the workflow will continue to execute until no further steps can be executed.
    IAsyncEnumerable<StepResult> ExecuteAsync(
        string targetStep,
        Dictionary<string, StepVariable>? inputs = null,
        bool earlyStop = true,
        int? maxSteps = null,
        CancellationToken ct = default);
}

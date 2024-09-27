// Copyright (c) LittleLittleCloud. All rights reserved.
// IStepWiseEngine.cs

namespace StepWise.Core;

public interface IStepWiseEngine
{
    /// <summary>
    /// Execute the workflow until the stop strategy is satisfied or no further steps can be executed.
    /// </summary>
    IAsyncEnumerable<StepRun> ExecuteStepsAsync(
        IEnumerable<Step> steps,
        IEnumerable<StepVariable>? inputs = null,
        int maxConcurrency = 1,
        IStepWiseEngineStopStrategy? stopStrategy = null,
        CancellationToken ct = default);

    Workflow Workflow { get; }
}

public interface IStepWiseEngineStopStrategy
{
    string Name { get; }

    bool ShouldStop(IEnumerable<StepRun> stepResult);
}

/// <summary>
/// Stops the workflow when any of the strategies in the pipeline returns true.
/// </summary>
public class StopStrategyPipeline : IStepWiseEngineStopStrategy
{
    private readonly List<IStepWiseEngineStopStrategy> _strategies;

    public StopStrategyPipeline(params IStepWiseEngineStopStrategy[] strategies)
    {
        _strategies = strategies.ToList();
    }

    public string Name => this.ToString();

    public bool ShouldStop(IEnumerable<StepRun> stepResult)
    {
        return _strategies.Any(x => x.ShouldStop(stepResult));
    }

    public override string ToString()
    {
        // [stragegy1]=>[strategy2]=>[strategy3]
        return string.Join("=>", _strategies.Select(x => x.Name));
    }

    public void AddStrategy(IStepWiseEngineStopStrategy strategy)
    {
        _strategies.Add(strategy);
    }
}

/// <summary>
/// Stop strategy that stops the workflow after a certain number of steps are completed or failed.
/// </summary>
public class MaxStepsStopStrategy : IStepWiseEngineStopStrategy
{
    private readonly int _maxSteps;

    public MaxStepsStopStrategy(int maxSteps)
    {
        _maxSteps = maxSteps;
    }

    public string Name => nameof(MaxStepsStopStrategy);

    public bool ShouldStop(IEnumerable<StepRun> stepResult)
    {
        return stepResult.Where(x => x.StepType == StepRunType.Variable || x.StepType == StepRunType.Failed).Count() >= _maxSteps;
    }
}

/// <summary>
/// Early stop strategy that stops the workflow as soon as the target step is reached and returns a result.
/// </summary>
public class EarlyStopStrategy : IStepWiseEngineStopStrategy
{
    private readonly string _targetStep;

    public EarlyStopStrategy(string targetStep)
    {
        _targetStep = targetStep;
    }

    public string Name => nameof(EarlyStopStrategy);

    public bool ShouldStop(IEnumerable<StepRun> stepResult)
    {
        return stepResult.Any(x => x.Name == _targetStep && x.Variable != null);
    }
}

public class DelegateStopStrategy : IStepWiseEngineStopStrategy
{
    private readonly Func<IEnumerable<StepRun>, bool> _shouldStop;

    private DelegateStopStrategy(Func<IEnumerable<StepRun>, bool> shouldStop)
    {
        _shouldStop = shouldStop;
    }

    public string Name => nameof(DelegateStopStrategy);

    public static DelegateStopStrategy Create(Func<IEnumerable<StepRun>, bool> shouldStop)
    {
        return new DelegateStopStrategy(shouldStop);
    }

    public bool ShouldStop(IEnumerable<StepRun> stepResult)
    {
        return _shouldStop(stepResult);
    }
}

/// <summary>
/// Stop strategy that never stops the workflow.
/// </summary>
public class NeverStopStopStrategy : IStepWiseEngineStopStrategy
{
    public string Name => nameof(NeverStopStopStrategy);

    public bool ShouldStop(IEnumerable<StepRun> stepResult)
    {
        return false;
    }
}

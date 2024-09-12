// Copyright (c) LittleLittleCloud. All rights reserved.
// IStepWiseEngine.cs

namespace StepWise.Core;

public interface IStepWiseEngine
{
    /// <summary>
    /// Execute the workflow until the target step is reached or no further steps can be executed.
    /// If the <paramref name="earlyStop"/> is true, the workflow will stop as soon as the target step is reached and completed.
    /// Otherwise, the workflow will continue to execute until no further steps can be executed.
    IAsyncEnumerable<StepRunAndResult> ExecuteAsync(
        string targetStep,
        Dictionary<string, StepVariable>? inputs = null,
        IStepWiseEngineStopStrategy? stopStrategy = null,
        CancellationToken ct = default);
}

public interface IStepWiseEngineStopStrategy
{
    string Name { get; }

    bool ShouldStop(StepRunAndResult[] stepResult);
}

/// <summary>
/// Stops the workflow when any of the strategies in the pipeline returns true.
/// </summary>
public class StopStrategyPipeline : IStepWiseEngineStopStrategy
{
    private readonly IStepWiseEngineStopStrategy[] _strategies;

    public StopStrategyPipeline(params IStepWiseEngineStopStrategy[] strategies)
    {
        _strategies = strategies;
    }

    public string Name => this.ToString();

    public bool ShouldStop(StepRunAndResult[] stepResult)
    {
        return _strategies.Any(x => x.ShouldStop(stepResult));
    }

    public override string ToString()
    {
        // [stragegy1]=>[strategy2]=>[strategy3]
        return string.Join("=>", _strategies.Select(x => x.Name));
    }
}

/// <summary>
/// Stop strategy that stops the workflow after a certain number of steps.
/// </summary>
public class MaxStepsStopStrategy : IStepWiseEngineStopStrategy
{
    private readonly int _maxSteps;

    public MaxStepsStopStrategy(int maxSteps)
    {
        _maxSteps = maxSteps;
    }

    public string Name => nameof(MaxStepsStopStrategy);

    public bool ShouldStop(StepRunAndResult[] stepResult)
    {
        return stepResult.Length >= _maxSteps;
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

    public bool ShouldStop(StepRunAndResult[] stepResult)
    {
        return stepResult.Any(x => x.StepName == _targetStep && x.Result != null);
    }
}

public class DelegateStopStrategy : IStepWiseEngineStopStrategy
{
    private readonly Func<StepRunAndResult[], bool> _shouldStop;

    private DelegateStopStrategy(Func<StepRunAndResult[], bool> shouldStop)
    {
        _shouldStop = shouldStop;
    }

    public string Name => nameof(DelegateStopStrategy);

    public static DelegateStopStrategy Create(Func<StepRunAndResult[], bool> shouldStop)
    {
        return new DelegateStopStrategy(shouldStop);
    }

    public bool ShouldStop(StepRunAndResult[] stepResult)
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

    public bool ShouldStop(StepRunAndResult[] stepResult)
    {
        return false;
    }
}
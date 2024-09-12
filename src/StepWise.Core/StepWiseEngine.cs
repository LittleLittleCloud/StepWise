// Copyright (c) LittleLittleCloud. All rights reserved.
// StepWiseEngine.cs

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text;
using Microsoft.Extensions.Logging;

namespace StepWise.Core;

public class StepWiseEngine : IStepWiseEngine
{
    private readonly Workflow _workflow;
    private readonly ILogger? _logger = null;
    private readonly int _maxConcurrency = 1;

    public StepWiseEngine(Workflow workflow, int maxConcurrency = 1, ILogger? logger = null)
    {
        _workflow = workflow;
        _logger = logger;
        _maxConcurrency = maxConcurrency;
    }

    public static StepWiseEngine CreateFromInstance(object instance, int maxConcurrency = 1, ILogger? logger = null)
    {
        var workflow = Workflow.CreateFromInstance(instance);
        return new StepWiseEngine(workflow, maxConcurrency, logger);
    }

    public async IAsyncEnumerable<StepRunAndResult> ExecuteAsync(
        string targetStep,
        Dictionary<string, StepVariable>? inputs = null,
        IStepWiseEngineStopStrategy? stopStrategy = null,
        [EnumeratorCancellation]
        CancellationToken ct = default)
    {
        inputs ??= new Dictionary<string, StepVariable>();
        stopStrategy ??= new NeverStopStopStrategy();
        this._logger?.LogInformation($"Starting the workflow engine with target step '{targetStep}' and stop strategy '{stopStrategy.Name}'.");

        var step = _workflow.Steps[targetStep] ?? throw new Exception($"Step '{targetStep}' not found in the workflow.");
        var stepResults = new List<StepRunAndResult>();
        await foreach (var stepResult in ExecuteStepAsync(step, inputs, ct))
        {
            yield return stepResult;

            // check early stop
            stepResults.Add(stepResult);
            if (stopStrategy.ShouldStop(stepResults.ToArray()))
            {
                _logger?.LogInformation($"Stop strategy '{stopStrategy.Name}' has been triggered when reaching step '{stepResult}'.");
                break;
            }
        }
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
            {
                return;
            }

            if (visiting.Contains(step.Name))
            {
                throw new Exception($"Circular dependency detected in step '{step.Name}'.");
            }

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

    private async IAsyncEnumerable<StepRunAndResult> ExecuteStepAsync(
        Step step,
        Dictionary<string, StepVariable> inputs,
        [EnumeratorCancellation]
        CancellationToken ct = default)
    {
        int _busyTaskRunners = 0;
        var _context = new ConcurrentDictionary<string, StepVariable>();
        using var _stepsTaskQueue = new BlockingCollection<StepRun>();
        using var _stepResultQueue = new BlockingCollection<StepRunAndResult>();

        // add inputs to context
        foreach (var input in inputs)
        {
            _context[input.Key] = input.Value;
        }

        // produce initial steps
        var steps = this.ResolveDependencies(step.Name);
        var currentContext = _context.ToDictionary(x => x.Key, x => x.Value);
        foreach (var s in steps)
        {
            // continue if step's name already exists in the context
            if (_context.ContainsKey(s.Name))
            {
                continue;
            }

            if (s.IsExecuctionConditionSatisfied(currentContext))
            {
                _logger?.LogInformation($"Adding initial step '{s.Name}' to the task queue.");
                _stepsTaskQueue.Add(StepRun.Create(s, 0, currentContext));
            }
        }

        if (_stepsTaskQueue.Count == 0)
        {
            _logger?.LogInformation($"No steps to execute. Exiting.");
            yield break;
        }

        _logger?.LogInformation($"Starting the workflow engine with max concurrency {_maxConcurrency}.");

        // execute steps
        var executeStepTask = Task.WhenAll(Enumerable.Range(0, _maxConcurrency).Select(i =>
        {
            return Task.Run(async () =>
            {
                foreach (var stepRun in _stepsTaskQueue.GetConsumingEnumerable(ct))
                {
                    try
                    {
                        Interlocked.Increment(ref _busyTaskRunners);
                        await ExecuteSingleStepAsync(i, stepRun, _stepsTaskQueue, _context, _stepResultQueue, ct);
                    }
                    finally
                    {
                        Interlocked.Decrement(ref _busyTaskRunners);
                    }
                }
            });
        }));

        foreach (var stepResult in _stepResultQueue.GetConsumingEnumerable(ct))
        {
            var stepRun = stepResult.StepRun;
            var res = stepResult.Result;
            if (res != null)
            {
                _logger?.LogInformation($"Updating context with the {stepRun}");
                _context[stepRun.Step.Name] = res;

                var dependSteps = _workflow.GetAllDependSteps(stepRun.Step);

                // remove the variables that depend on the current step
                var filteredContext = _context.Where(kv => !dependSteps.Any(x => x.Name == kv.Key)).ToDictionary(x => x.Key, x => x.Value);
                var contextGeneration = Math.Max(stepRun.Generation + 1, filteredContext.Max(kv => kv.Value.Generation) + 1);

                // update task queue with the next steps
                // find all steps that takes the result as input
                var nextSteps = _workflow.Steps.Values.Where(x => x.InputParameters.Any(p => p.SourceStep == stepRun.Step.Name)).ToList();
                var stepsToAdd = new List<StepRun>();
                foreach (var nextStep in nextSteps)
                {
                    var nextStepRun = StepRun.Create(nextStep, contextGeneration, filteredContext);
                    if (nextStep.IsExecuctionConditionSatisfied(filteredContext) is false)
                    {
                        _logger?.LogInformation($"Skipping adding {nextStepRun} because of missing prerequisites.");
                        continue;
                    }

                    // check if the step has already been executed
                    if (_context.TryGetValue(nextStep.Name, out var nextValue) && nextValue.Generation >= contextGeneration)
                    {
                        _logger?.LogInformation($"Skipping {nextStepRun} has already been executed.");
                        continue;
                    }

                    stepsToAdd.Add(nextStepRun);
                }

                if (stepsToAdd.Count > 0)
                {
                    // if contains self-loop (stepsToAdd contains the current step), move that step to the end
                    if (stepsToAdd.Any(x => x.Step.Name == stepRun.Step.Name))
                    {
                        var selfLoopStep = stepsToAdd.First(x => x.Step.Name == stepRun.Step.Name);
                        stepsToAdd.Remove(selfLoopStep);
                        stepsToAdd.Add(selfLoopStep);
                    }

                    foreach (var s in stepsToAdd)
                    {
                        _logger?.LogInformation($"Adding {s} to the task queue.");
                        _stepsTaskQueue.Add(s);
                    }
                }
                else
                {
                    _logger?.LogInformation($"No steps to add to the task queue.");
                }
            }

            if (_stepsTaskQueue.Count == 0 && _stepResultQueue.Count == 0 && _busyTaskRunners == 0)
            {
                _logger?.LogInformation($"The task queue is empty and there is no busy task runner. Exiting.");

                _stepsTaskQueue.CompleteAdding();
                _stepResultQueue.CompleteAdding();
            }

            yield return stepResult;
        }

        _logger?.LogInformation($"Workflow engine has completed.");
        _stepsTaskQueue.CompleteAdding();

        await executeStepTask;
    }

    private async Task ExecuteSingleStepAsync(
        int runnerId,
        StepRun stepRun,
        BlockingCollection<StepRun> _stepsTaskQueue,
        ConcurrentDictionary<string, StepVariable> _context,
        BlockingCollection<StepRunAndResult> _stepResultQueue,
        CancellationToken ct = default)
    {
        await Task.Yield();
        // scenario 1
        // if the step has already been executed, or there is a newer version of the step in the task queue
        // throw exception.
        if (_context.TryGetValue(stepRun.Step.Name, out var value) && value.Generation > stepRun.Generation)
        {
            throw new Exception($"[Runner {runnerId}]: The step {stepRun} has already been executed with a newer version. This should not happen.");
        }
        else
        {
            // scenario 2
            // run the step by calling the step.ExecuteAsync method
            // the step.ExecuteAsync will short-circuit if the dependencies are not met
            _logger?.LogInformation($"[Runner {runnerId}]: Running {stepRun}.");
            try
            {
                var res = await stepRun.ExecuteAsync(ct);
                // if res is null, it means the step is not ready to run, or not producing any result
                // maybe the dependencies are not met, maybe the executor function returns null.
                if (res == null)
                {
                    _logger?.LogInformation($"[Runner {runnerId}]: {stepRun} returns null.");
                    _stepResultQueue.Add(StepRunAndResult.Create(stepRun));
                }
                else
                {
                    _logger?.LogInformation($"[Runner {runnerId}]: updating context with the result of {stepRun}.");
                    _logger?.LogDebug($"[Runner {runnerId}]: {stepRun} result is '{res}'.");
                    var stepVariable = StepVariable.Create(res, stepRun.Generation);
                    _stepResultQueue.Add(StepRunAndResult.Create(stepRun, stepVariable));
                }
            }
            catch (InvalidOperationException ioe) when (ioe.Message.Contains("The collection has been marked as complete with regards to additions"))
            {
                // This means the task queue has been marked as complete
                // This is expected when the task queue is empty and there is no busy task runner

                _logger?.LogInformation($"[Runner {runnerId}]: The task queue has been marked as complete. Exiting.");
                return;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"[Runner {runnerId}]: Error running {stepRun}");

                throw;
            }
        }
    }

}

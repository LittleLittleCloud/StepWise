﻿// Copyright (c) LittleLittleCloud. All rights reserved.
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

    public Workflow Workflow => _workflow;

    public StepWiseEngine(Workflow workflow, ILogger? logger = null)
    {
        _workflow = workflow;
        _logger = logger;
    }

    public static StepWiseEngine CreateFromInstance(object instance, ILogger? logger = null)
    {
        var workflow = Workflow.CreateFromInstance(instance);
        return new StepWiseEngine(workflow, logger);
    }

    public async IAsyncEnumerable<StepRun> ExecuteAsync(
        string? targetStep = null,
        IEnumerable<StepVariable>? inputs = null,
        int maxConcurrency = 1,
        IStepWiseEngineStopStrategy? stopStrategy = null,
        [EnumeratorCancellation]
        CancellationToken ct = default)
    {
        inputs ??= [];
        stopStrategy ??= new NeverStopStopStrategy();
        this._logger?.LogInformation($"Starting the workflow engine with target step '{targetStep}' and stop strategy '{stopStrategy.Name}'.");

        var step = targetStep != null ? _workflow.Steps[targetStep] : null;
        var stepResults = new List<StepRun>();
        await foreach (var stepRun in ExecuteStepAsync(step, inputs, maxConcurrency, ct))
        {
            yield return stepRun;

            // check early stop
            stepResults.Add(stepRun);
            if (stopStrategy.ShouldStop(stepResults.ToArray()))
            {
                _logger?.LogInformation($"Stop strategy '{stopStrategy.Name}' has been triggered when reaching step '{stepRun}'.");
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

    private IAsyncEnumerable<StepRun> ExecuteStepAsync(
        Step? step,
        IEnumerable<StepVariable> inputs,
        int maxConcurrency = 1,
        CancellationToken ct = default)
    {
        var steps = step != null ? this.ResolveDependencies(step.Name) : _workflow.Steps.Values.ToList();

        return ExecuteStepsAsync(steps, inputs, maxConcurrency, ct);
    }

    private async IAsyncEnumerable<StepRun> ExecuteStepsAsync(
        IEnumerable<Step> steps,
        IEnumerable<StepVariable> inputs,
        int maxConcurrency = 1,
        [EnumeratorCancellation]
        CancellationToken ct = default)
    {
        int _busyTaskRunners = 0;
        int generation = 0;
        var _context = new ConcurrentDictionary<string, StepVariable>();
        using var _stepsTaskQueue = new BlockingCollection<StepRun>();
        using var _stepResultQueue = new BlockingCollection<StepRun>();

        // add inputs to context
        foreach (var input in inputs)
        {
            if (_context.TryGetValue(input.Name, out var value) && value.Generation > input.Generation)
            {
                _logger?.LogInformation($"Skipping adding input '{input.Name}' to the context because a newer version already exists.");
                continue;
            }

            _context[input.Name] = input;
        }

        // produce initial steps
        var currentContext = _context.ToDictionary(x => x.Key, x => x.Value);
        generation = currentContext switch
        {
            { Count: > 0 } => currentContext.Values.Max(x => x.Generation) + 1,
            _ => 0
        };
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
                var stepRun = StepRun.Create(s, generation, currentContext);
                _stepsTaskQueue.Add(stepRun);
                _stepResultQueue.Add(stepRun);
                generation++;
            }
            else
            {
                _logger?.LogInformation($"Skipping adding initial step '{s.Name}' to the task queue because the execution condition is not satisfied.");
                var stepRun = StepRun.Create(s, 0, currentContext).ToMissingInput();
                _stepResultQueue.Add(stepRun);
            }
        }

        if (_stepsTaskQueue.Count == 0 && _stepResultQueue.Count == 0)
        {
            _logger?.LogInformation($"No steps to execute. Exiting.");
            yield break;
        }

        _logger?.LogInformation($"Starting the workflow engine with max concurrency {maxConcurrency}.");

        // execute steps
        var executeStepTask = Task.WhenAll(Enumerable.Range(0, maxConcurrency).Select(i =>
        {
            return Task.Run(async () =>
            {
                foreach (var stepRun in _stepsTaskQueue.GetConsumingEnumerable(ct))
                {
                    try
                    {
                        Interlocked.Increment(ref _busyTaskRunners);
                        _logger?.LogInformation($"Runner {i} is executing {stepRun}. busy task runners: {_busyTaskRunners}");
                        await ExecuteSingleStepAsync(i, stepRun, _stepsTaskQueue, _context, _stepResultQueue, ct);
                    }
                    finally
                    {
                        Interlocked.Decrement(ref _busyTaskRunners);
                    }
                }
            });
        }));

        while (true)
        {
            if (_stepResultQueue.TryTake(out var stepRun, 1000, ct))
            {
                yield return stepRun;
                if (stepRun.Status == StepStatus.Completed && stepRun.Result is StepVariable res)
                {
                    // TODO
                    // Add a test to cover this scenario
                    // for example
                    // step1: MinusOne
                    // step2: SleepInSeconds([FromStep(nameof(MinusOne))] int number)
                    // skip if there is a newer version of the result in the context
                    if (_context.TryGetValue(stepRun.Step.Name, out var value) && value.Generation > stepRun.Generation)
                    {
                        _logger?.LogInformation($"Skipping updating context with the result of {stepRun} because a newer version already exists.");
                        continue;
                    }
                    
                    _logger?.LogInformation($"Updating context with the {stepRun}");
                    _context[stepRun.Step.Name] = res;

                    var dependSteps = _workflow.GetAllDependSteps(stepRun.Step);

                    // remove the variables that depend on the current step
                    var filteredContext = _context.Where(kv => !dependSteps.Any(x => x.Name == kv.Key)).ToDictionary(x => x.Key, x => x.Value);

                    // update task queue with the next steps
                    // find all steps that takes the result as input
                    var nextSteps = _workflow.Steps.Values.Where(x => x.InputParameters.Any(p => p.SourceStep == stepRun.Step.Name)).ToList();
                    var stepsToAdd = new List<StepRun>();
                    foreach (var nextStep in nextSteps)
                    {
                        generation += 1;

                        var nextStepRun = StepRun.Create(nextStep, generation, filteredContext);

                        if (nextStep.IsExecuctionConditionSatisfied(filteredContext) is false)
                        {
                            // log filter context
                            foreach (var kv in filteredContext)
                            {
                                _logger?.LogInformation($"Filtered context: {kv.Key}[{kv.Value.Generation}]");
                            }

                            _logger?.LogInformation($"Skipping adding {nextStepRun} because of missing prerequisites.");

                            var missingDependencyRun = nextStepRun.ToMissingInput();
                            _stepResultQueue.Add(missingDependencyRun);
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
                            _stepResultQueue.Add(s);
                        }
                    }
                    else
                    {
                        _logger?.LogInformation($"No steps to add to the task queue.");
                    }
                }
            }
            else if (_stepsTaskQueue.Count == 0 && _stepResultQueue.Count == 0 && _busyTaskRunners == 0)
            {
                _logger?.LogInformation($"The task queue is empty and there is no busy task runner. Exiting.");

                _stepsTaskQueue.CompleteAdding();
                _stepResultQueue.CompleteAdding();

                break;
            }
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
        BlockingCollection<StepRun> _stepRunQueue,
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
            var runningStep = stepRun.ToRunningStatus();
            _logger?.LogInformation($"[Runner {runnerId}]: Running {runningStep}.");

            try
            {
                _stepRunQueue.Add(runningStep);
                var res = await runningStep.ExecuteAsync(ct);
                // if res is null, it means the step is not ready to run, or not producing any result
                // maybe the dependencies are not met, maybe the executor function returns null.
                if (res == null)
                {
                    _logger?.LogInformation($"[Runner {runnerId}]: {runningStep} returns null.");
                    var resultStep = runningStep.ToCompletedStatus();
                    _stepRunQueue.Add(resultStep);
                }
                else
                {
                    _logger?.LogInformation($"[Runner {runnerId}]: updating context with the result of {runningStep}.");
                    _logger?.LogDebug($"[Runner {runnerId}]: {stepRun} result is '{res}'.");
                    var stepVariable = StepVariable.Create(stepRun.StepName, res, stepRun.Generation);
                    var resultStep = runningStep.ToCompletedStatus(stepVariable);

                    _stepRunQueue.Add(resultStep);
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
                _logger?.LogError(ex, $"[Runner {runnerId}]: Error running {runningStep}");
                var failedStep = runningStep.ToFailedStatus(ex);

                _stepRunQueue.Add(failedStep);
            }
        }
    }

    public async IAsyncEnumerable<StepRun> ExecuteStepsAsync(
        IEnumerable<Step> steps,
        IEnumerable<StepVariable>? inputs = null,
        int maxConcurrency = 1,
        IStepWiseEngineStopStrategy? stopStrategy = null,
        [EnumeratorCancellation]
        CancellationToken ct = default)
    {
        inputs ??= [];
        stopStrategy ??= new NeverStopStopStrategy();
        await foreach (var stepRun in ExecuteStepsAsync(steps, inputs, maxConcurrency, ct))
        {
            yield return stepRun;

            if (stopStrategy.ShouldStop([stepRun]))
            {
                _logger?.LogInformation($"Stop strategy '{stopStrategy.Name}' has been triggered when reaching step '{stepRun}'.");
                break;
            }
        }
    }
}

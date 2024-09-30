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

    private async IAsyncEnumerable<StepRun> ExecuteStepsAsync(
        IEnumerable<Step> steps,
        IEnumerable<StepVariable> inputs,
        int maxConcurrency = 1,
        [EnumeratorCancellation]
        CancellationToken ct = default)
    {
        int _busyTaskRunners = 0;
        int generation = 0;
        var context = new ConcurrentDictionary<string, StepVariable>();
        using var _stepsTaskQueue = new BlockingCollection<StepRun>();
        using var _stepResultQueue = new BlockingCollection<StepRun>();

        // add inputs to stepResultQueue as StepRun.Variable
        foreach (var input in inputs)
        {
            var stepRun = StepRun.CreateVariable(input);
            //_stepResultQueue.Add(stepRun);
            context[input.Name] = input;
        }

        generation = context switch
        {
            { Count: > 0 } => context.Values.Max(x => x.Generation),
            _ => generation
        };

        foreach (var s in steps)
        {
            // continue if step's name already exists in the context
            if (context.ContainsKey(s.Name))
            {
                _logger?.LogInformation($"Skipping adding initial step '{s.Name}' to the task queue because it already exists in the context.");
                continue;
            }

            if (s.IsExecuctionConditionSatisfied(context))
            {
                _logger?.LogInformation($"Adding initial step '{s.Name}' to the task queue.");
                var stepRun = StepRun.Create(s, generation, context);
                _stepsTaskQueue.Add(stepRun);
                _stepResultQueue.Add(stepRun);
                generation++;
            }
            else
            {
                _logger?.LogInformation($"Skipping adding initial step '{s.Name}' to the task queue because the execution condition is not satisfied.");
                var stepRun = StepRun.Create(s, 0, context).ToMissingInput();
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
                        await ExecuteSingleStepAsync(i, stepRun, _stepsTaskQueue, context, _stepResultQueue, ct);
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
                _logger?.LogInformation($"[StepRun Queue]: Receive {stepRun} from the result queue.");
                if (stepRun.StepRunType == StepRunType.Variable && stepRun.Variable is StepVariable res)
                {
                    // skip if there is a newer version of the result in the context
                    if (context.TryGetValue(res.Name, out var value) && value.Generation >= res.Generation)
                    {
                        _logger?.LogInformation($"[StepRun Queue]: Skipping updating context with the result of {res} because a newer version already exists.");
                        continue;
                    }
                    _logger?.LogInformation($"[StepRun Queue] Updating context with Variable: {stepRun}");
                    context[res.Name] = res;
                    generation = Math.Max(generation, res.Generation);

                    IEnumerable<Step> dependSteps;
                    if (_workflow.Steps.TryGetValue(res.Name, out var step) is false)
                    {
                        // the variable is not from a step
                        dependSteps = new List<Step>();
                    }
                    else
                    {
                        dependSteps = _workflow.GetAllDependSteps(step);
                    }


                    // remove the variables that depend on the current step
                    var filteredContext = context.Where(kv => !dependSteps.Any(x => x.Name == kv.Key)).ToDictionary(x => x.Key, x => x.Value);

                    // log filter context
                    foreach (var kv in filteredContext)
                    {
                        _logger?.LogInformation($"[StepRun Queue]: Filtered context: {kv.Key}[{kv.Value.Generation}]");
                    }

                    // update task queue with the next steps
                    // find all steps that takes the result as input
                    var nextSteps = _workflow.Steps.Values
                            .Where(x => steps.Any(s => s.Name == x.Name))
                            .Where(x => x.InputParameters.Any(p => p.VariableName == res.Name));

                    var stepsToAdd = new List<StepRun>();
                    foreach (var nextStep in nextSteps)
                    {
                        generation += 1;

                        var nextStepRun = StepRun.Create(nextStep, generation, filteredContext);

                        if (inputs.Any(input => input.Name == nextStepRun.Name! && input.Generation == nextStepRun.Generation))
                        {
                            _logger?.LogInformation($"[StepRun Queue]: Skipping adding {nextStepRun} to the task queue because it already exists in the input.");
                            continue;
                        }

                        if (nextStep.IsExecuctionConditionSatisfied(filteredContext) is false)
                        {
                            _logger?.LogInformation($"[StepRun Queue]: Skipping adding {nextStepRun} because of missing prerequisites.");

                            var missingDependencyRun = nextStepRun.ToMissingInput();
                            yield return missingDependencyRun;
                            continue;
                        }

                        stepsToAdd.Add(nextStepRun);
                    }

                    if (stepsToAdd.Count > 0)
                    {
                        // if contains self-loop (stepsToAdd contains the current step), move that step to the end
                        if (stepsToAdd.Any(x => x.Name == stepRun.Name))
                        {
                            var selfLoopStep = stepsToAdd.First(x => x.Name == stepRun.Name);
                            stepsToAdd.Remove(selfLoopStep);
                            stepsToAdd.Add(selfLoopStep);
                        }

                        foreach (var s in stepsToAdd)
                        {
                            _logger?.LogInformation($"[StepRun Queue]: Adding {s} to the task queue.");
                            _stepsTaskQueue.Add(s);
                            yield return s;
                        }
                    }
                    else
                    {
                        _logger?.LogInformation($"[StepRun Queue]: No steps to add to the task queue.");
                    }
                }
                yield return stepRun;
            }
            else if (_stepsTaskQueue.Count == 0 && _stepResultQueue.Count == 0 && _busyTaskRunners == 0)
            {
                _logger?.LogInformation($"[StepRun Queue]: The task queue is empty and there is no busy task runner. Exiting.");

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
        // if the step is StepWiseTextInput, return quickly
        if (stepRun.Step?.StepType != StepType.Ordinary)
        {
            _logger?.LogInformation($"[Runner {runnerId}]: Skipping {stepRun} because it is a user input.");
            return;
        }

        // if the step has already been executed, or there is a newer version of the step in the task queue
        // this could happen when restoring the workflow engine from a previous state
        // in this case, we can early stop the execution
        if (_context.TryGetValue(stepRun.Name!, out var value) && value.Generation > stepRun.Generation)
        {
            _logger?.LogInformation($"[Runner {runnerId}]: Skipping {stepRun} because a newer version already exists in the context.");
        }
        else
        {
            // run the step by calling the step.ExecuteAsync method
            // the step.ExecuteAsync will short-circuit if the dependencies are not met
            var runningStep = stepRun.ToRunningStatus();
            _logger?.LogInformation($"[Runner {runnerId}]: Running {stepRun}.");

            try
            {
                _stepRunQueue.Add(runningStep);
                var res = await runningStep.ExecuteAsync(ct);
                _logger?.LogInformation($"[Runner {runnerId}]: {runningStep}");
                var completedStep = runningStep.ToCompletedStatus();
                _stepRunQueue.Add(completedStep);
                if (res != null)
                {
                    var stepVariable = StepVariable.Create(stepRun.Name!, res, stepRun.Generation);
                    var variable = StepRun.CreateVariable(stepVariable);
                    _logger?.LogDebug($"[Runner {runnerId}]: Add Variable to queue: {variable}.");

                    _stepRunQueue.Add(variable);
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
        var stepRuns = new List<StepRun>();
        stopStrategy ??= new NeverStopStopStrategy();
        await foreach (var stepRun in ExecuteStepsAsync(steps, inputs, maxConcurrency, ct))
        {
            yield return stepRun;

            stepRuns.Add(stepRun);
            if (stopStrategy.ShouldStop(stepRuns))
            {
                _logger?.LogInformation($"Stop strategy '{stopStrategy.Name}' has been triggered when reaching step '{stepRun}'.");
                break;
            }
        }
    }
}

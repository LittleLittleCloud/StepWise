using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text;
using Microsoft.Extensions.Logging;

namespace StepWise.Core;

public class WorkflowEngine : IWorkflowEngine
{
    private readonly Workflow _workflow;
    private readonly ILogger? _logger = null;
    private readonly int _maxConcurrency = 1;
    private BlockingCollection<(Step, int)> _stepsTaskQueue = new BlockingCollection<(Step, int)>();
    private int _busyTaskRunners = 0;
    private ConcurrentDictionary<string, (object, int)> _context = new ConcurrentDictionary<string, (object, int)>();
    private BlockingCollection<(string, object)> _stepResultQueue = new BlockingCollection<(string, object)>();

    public WorkflowEngine(Workflow workflow, int maxConcurrency = 1, ILogger? logger = null)
    {
        _workflow = workflow;
        _logger = logger;
        _maxConcurrency = maxConcurrency;
    }

    public static WorkflowEngine CreateFromInstance(object instance, int maxConcurrency = 1, ILogger? logger = null)
    {
        var workflow = Workflow.CreateFromInstance(instance);
        return new WorkflowEngine(workflow, maxConcurrency, logger);
    }

    public async Task<TResult> ExecuteStepAsync<TResult>(string stepName, Dictionary<string, object>? inputs = null)
    {
        var context = new Dictionary<string, object>();
        await foreach (var (name, result) in ExecuteStepAsync(stepName, inputs))
        {
            context[name] = result;
        }

        if (context.TryGetValue(stepName, out var finalResult) && finalResult is TResult)
        {
            return (TResult)finalResult;
        }

        throw new Exception($"Step '{stepName}' did not return the expected result type.");
    }

    public IAsyncEnumerable<(string, object)> ExecuteStepAsync(string targetStep, Dictionary<string, object>? inputs = null)
    {
        inputs ??= new Dictionary<string, object>();
        var step = _workflow.Steps[targetStep] ?? throw new Exception($"Step '{targetStep}' not found in the workflow.");

        return ExecuteStepAsync(step, inputs);
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

    private async IAsyncEnumerable<(string, object)> ExecuteStepAsync(
        Step step,
        Dictionary<string, object> inputs,
        [EnumeratorCancellation]
        CancellationToken ct = default)
    {
        _context.Clear();
        _busyTaskRunners = 0;
        _stepsTaskQueue = new BlockingCollection<(Step, int)>();
        _stepResultQueue = new BlockingCollection<(string, object)>();

        // add inputs to context
        foreach (var input in inputs)
        {
            _context[input.Key] = (input.Value, 0);
        }

        // produce initial steps
        var steps = this.ResolveDependencies(step.Name);
        foreach (var s in steps)
        {
            // continue if step's name already exists in the context
            if (_context.ContainsKey(s.Name))
            {
                continue;
            }

            if (s.IsExecuctionConditionSatisfied(_context.ToDictionary(x => x.Key, x => x.Value.Item1)))
            {
                _logger?.LogInformation($"Adding initial step '{s.Name}' to the task queue.");
                _stepsTaskQueue.Add((s, 0));
            }
        }

        if (_stepsTaskQueue.Count == 0)
        {
            _logger?.LogInformation($"No steps to execute. Exiting.");
            yield break;
        }

        _logger?.LogInformation($"Starting the workflow engine with max concurrency {_maxConcurrency}.");

        // execute steps
        var executeStepTask = Task.WhenAll(Enumerable.Range(0, _maxConcurrency).Select(i => ExecuteSingleStepAsync(i, step, ct)));

        foreach (var (name, result) in _stepResultQueue.GetConsumingEnumerable(ct))
        {
            yield return (name, result);
        }


        _logger?.LogInformation($"Workflow engine has completed.");
        _stepsTaskQueue.CompleteAdding();
        await executeStepTask;
    }

    private async Task ExecuteSingleStepAsync(
        int runnerId,
        Step finalStep,
        CancellationToken ct = default)
    {
        foreach (var (step, generation) in _stepsTaskQueue.GetConsumingEnumerable(ct))
        {
            Interlocked.Increment(ref _busyTaskRunners);
            // exit if early stop
            if (_stepResultQueue.IsAddingCompleted || _stepsTaskQueue.IsAddingCompleted)
            {
                _logger?.LogInformation($"[Runner {runnerId}]: Early stopping the runner with step '{step.Name}' and generation `{generation}`.");
                Interlocked.Decrement(ref _busyTaskRunners);
                return;
            }

            // scenario 1
            // if the step has already been executed, or there is a newer version of the step in the task queue
            // skip the step
            if (_context.TryGetValue(step.Name, out var value) && value.Item2 > generation)
            {
                _logger?.LogInformation($"[Runner {runnerId}]: Step '{step.Name}' with generation `{generation}` has already been executed.");

                Interlocked.Decrement(ref _busyTaskRunners);
            }
            else
            {
                // scenario 2
                // run the step by calling the step.ExecuteAsync method
                // the step.ExecuteAsync will short-circuit if the dependencies are not met
                _logger?.LogInformation($"[Runner {runnerId}]: Running step '{step.Name}' with generation `{generation}`.");
                try
                {
                    var res = await step.ExecuteAsync(_context.ToDictionary(x => x.Key, x => x.Value.Item1), ct);
                    // if res is null, it means the step is not ready to run, or not producing any result
                    // maybe the dependencies are not met, maybe the executor function returns null.
                    if (res == null)
                    {
                        _logger?.LogInformation($"[Runner {runnerId}]: Step '{step.Name}' with generation `{generation}` returns null. Skipping.");
                    }
                    else
                    {
                        // update the context with the result
                        // the generation will be {parameter_max_generation} + 1
                        //var contextGeneration = step.InputParameters switch
                        //{
                        //    { Capacity: > 0 } => step.InputParameters.Select(x =>
                        //    {
                        //        var name = x.SourceStep ?? x.Name;
                        //        if (_context.TryGetValue(name, out var value))
                        //        {
                        //            return value.Item2;
                        //        }

                        //        return 0;
                        //    }).Max() + 1,
                        //    _ => 0,
                        //};
                        var contextGeneration = generation + 1;

                        _logger?.LogInformation($"[Runner {runnerId}]: updating context with the result of step '{step.Name}' with generation `{generation}`.");
                        _logger?.LogInformation($"[Runner {runnerId}]: result of step '{step.Name}' with generateion `{generation}` is '{res}'.");
                        _context[step.Name] = (res, generation);
                        _stepResultQueue.Add((step.Name, res));

                        var dependSteps = _workflow.GetAllDependSteps(step);

                        // remove the variables that depend on the current step
                        var filteredContext = _context.Where(kv => !dependSteps.Any(x => x.Name == kv.Key)).ToDictionary(x => x.Key, x => x.Value.Item1);

                        // update task queue with the next steps
                        // find all steps that takes the result as input
                        var nextSteps = _workflow.Steps.Values.Where(x => x.InputParameters.Any(p => p.SourceStep == step.Name)).ToList();

                        foreach (var nextStep in nextSteps)
                        {
                            if (nextStep.IsExecuctionConditionSatisfied(filteredContext) is false)
                            {
                                _logger?.LogInformation($"[Runner {runnerId}]: Skipping step '{nextStep.Name}' with generation `{contextGeneration}` because of missing prerequisites.");
                                continue;
                            }

                            // check if the step has already been executed
                            if (_context.TryGetValue(nextStep.Name, out var nextValue) && nextValue.Item2 >= contextGeneration)
                            {
                                _logger?.LogInformation($"[Runner {runnerId}]: Step '{nextStep.Name}' with generation `{contextGeneration}` has already been executed.");
                                continue;
                            }

                            _logger?.LogInformation($"[Runner {runnerId}]: Adding step '{nextStep.Name}' with generation `{contextGeneration}` to the task queue.");
                            _stepsTaskQueue.Add((nextStep, contextGeneration));
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, $"[Runner {runnerId}]: Error running step '{step.Name}' with generation `{generation}`.");

                    throw;
                }
                finally
                {
                    Interlocked.Decrement(ref _busyTaskRunners);
                }
            }

            // if the final step result is already in the context, stop the execution
            if (_context.ContainsKey(finalStep.Name) && _busyTaskRunners == 0)
            {
                var (finalResult, finalResultGeneration) = _context[finalStep.Name];
                _logger?.LogInformation($"[Runner {runnerId}]: The final step '{finalStep.Name}' with generation `{finalResultGeneration}` has been executed. Early stopping.");
                _stepsTaskQueue.CompleteAdding();
                _stepResultQueue.CompleteAdding();

                return;
            }

            // if the task queue is empty and busy task runners are 0, stop the execution
            if (_stepsTaskQueue.Count == 0 && _busyTaskRunners == 0)
            {
                _logger?.LogInformation($"[Runner {runnerId}]: The task queue is empty and there is only no busy task runner. Setting the task queue as complete.");
                _stepsTaskQueue.CompleteAdding();
                _stepResultQueue.CompleteAdding();

                return;
            }
        }
    }

}

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
    private BlockingCollection<StepRun> _stepsTaskQueue = new BlockingCollection<StepRun>();
    private int _busyTaskRunners = 0;
    private ConcurrentDictionary<string, StepVariable> _context = new ConcurrentDictionary<string, StepVariable>();
    private BlockingCollection<StepResult> _stepResultQueue = new BlockingCollection<StepResult>();

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

    public async Task<TResult> ExecuteStepAsync<TResult>(
        string targetStepName,
        Dictionary<string, StepVariable>? inputs = null,
        bool earlyStop = true,
        int? maxSteps = null,
        CancellationToken ct = default)
    {
        maxSteps ??= int.MaxValue;
        await foreach (var stepResult in ExecuteStepAsync(targetStepName, inputs, earlyStop, maxSteps, ct))
        {
            if (stepResult.Result != null && stepResult.StepName == targetStepName)
            {
                return stepResult.Result.As<TResult>() ?? throw new Exception($"Step '{targetStepName}' did not return the expected result type.");
            }
        }

        throw new Exception($"Step '{targetStepName}' did not return the expected result type.");
    }

    public async IAsyncEnumerable<StepResult> ExecuteStepAsync(
        string targetStep,
        Dictionary<string, StepVariable>? inputs = null,
        bool earlyStop = true,
        int? maxSteps = null,
        [EnumeratorCancellation]
        CancellationToken ct = default)
    {
        inputs ??= new Dictionary<string, StepVariable>();
        var step = _workflow.Steps[targetStep] ?? throw new Exception($"Step '{targetStep}' not found in the workflow.");
        await foreach (var stepResult in ExecuteStepAsync(step, inputs, ct))
        {
            // check early stop
            if (earlyStop && stepResult.StepRun.Step.Name == targetStep)
            {
                yield return stepResult;
                yield break;
            }

            // check max steps
            if (maxSteps != null)
            {
                maxSteps--;
                if (maxSteps <= 0)
                {
                    yield break;
                }
            }

            yield return stepResult;
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

    private async IAsyncEnumerable<StepResult> ExecuteStepAsync(
        Step step,
        Dictionary<string, StepVariable> inputs,
        [EnumeratorCancellation]
        CancellationToken ct = default)
    {
        _context.Clear();
        _busyTaskRunners = 0;
        _stepsTaskQueue = new BlockingCollection<StepRun>();
        _stepResultQueue = new BlockingCollection<StepResult>();

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
        var executeStepTask = Task.WhenAll(Enumerable.Range(0, _maxConcurrency).Select(i => ExecuteSingleStepAsync(i, step, ct)));
        Console.WriteLine("executeStepTask: " + executeStepTask);
        foreach (var stepResult in _stepResultQueue.GetConsumingEnumerable(ct))
        {
            yield return stepResult;
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
        await Task.Yield();
        foreach (var stepRun in _stepsTaskQueue.GetConsumingEnumerable(ct))
        {
            // This is important to save the chance for other tasks to run
            await Task.Yield();

            Interlocked.Increment(ref _busyTaskRunners);
            //// exit if early stop
            //if ((_stepResultQueue.IsAddingCompleted || _stepsTaskQueue.IsAddingCompleted) && earlyStop)
            //{
            //    _logger?.LogInformation($"[Runner {runnerId}]: Early stopping {stepRun}");
            //    Interlocked.Decrement(ref _busyTaskRunners);
            //    return;
            //}

            // scenario 1
            // if the step has already been executed, or there is a newer version of the step in the task queue
            // skip the step
            if (_context.TryGetValue(stepRun.Step.Name, out var value) && value.Generation > stepRun.Generation)
            {
                _logger?.LogInformation($"[Runner {runnerId}]: {stepRun} has already been executed.");

                Interlocked.Decrement(ref _busyTaskRunners);
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
                        _logger?.LogInformation($"[Runner {runnerId}]: {stepRun} returns null. Skipping.");
                    }
                    else
                    {
                        var contextGeneration = stepRun.Generation + 1;

                        _logger?.LogInformation($"[Runner {runnerId}]: updating context with the result of {stepRun}.");
                        _logger?.LogDebug($"[Runner {runnerId}]: {stepRun} result is '{res}'.");
                        _context[stepRun.Step.Name] = StepVariable.Create(res, stepRun.Generation);
                        _stepResultQueue.Add(StepResult.Create(stepRun, res));

                        var dependSteps = _workflow.GetAllDependSteps(stepRun.Step);

                        // remove the variables that depend on the current step
                        var filteredContext = _context.Where(kv => !dependSteps.Any(x => x.Name == kv.Key)).ToDictionary(x => x.Key, x => x.Value);

                        // update task queue with the next steps
                        // find all steps that takes the result as input
                        var nextSteps = _workflow.Steps.Values.Where(x => x.InputParameters.Any(p => p.SourceStep == stepRun.Step.Name)).ToList();

                        foreach (var nextStep in nextSteps)
                        {
                            var nextStepRun = StepRun.Create(nextStep, contextGeneration, filteredContext);
                            if (nextStep.IsExecuctionConditionSatisfied(filteredContext) is false)
                            {
                                _logger?.LogInformation($"[Runner {runnerId}]: Skipping {nextStepRun} because of missing prerequisites.");
                                continue;
                            }

                            // check if the step has already been executed
                            if (_context.TryGetValue(nextStep.Name, out var nextValue) && nextValue.Generation >= contextGeneration)
                            {
                                _logger?.LogInformation($"[Runner {runnerId}]: {nextStepRun} has already been executed.");
                                continue;
                            }

                            _logger?.LogInformation($"[Runner {runnerId}]: Adding {nextStepRun} to the task queue.");
                            _stepsTaskQueue.Add(nextStepRun);
                        }
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
                finally
                {
                    if (_stepsTaskQueue.Count == 0 && _busyTaskRunners == 1)
                    {
                        _logger?.LogInformation($"[Runner {runnerId}]: The task queue is empty and there is only no busy task runner. Setting the task queue as complete.");
                        _stepsTaskQueue.CompleteAdding();
                        _stepResultQueue.CompleteAdding();

                        //return;
                    }
                    Interlocked.Decrement(ref _busyTaskRunners);
                }
            }

            //// if the final step result is already in the context, stop the execution
            //if (_context.ContainsKey(finalStep.Name) && _busyTaskRunners == 0 && earlyStop)
            //{
            //    var finalStepResult = _context[finalStep.Name];
            //    _logger?.LogInformation($"[Runner {runnerId}]: The {finalStep} has been executed. Early stopping.");
            //    _stepsTaskQueue.CompleteAdding();
            //    _stepResultQueue.CompleteAdding();

            //    return;
            //}

            // if the task queue is empty and busy task runners are 0, stop the execution
            
        }
    }

}

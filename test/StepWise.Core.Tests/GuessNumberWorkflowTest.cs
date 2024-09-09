﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FluentAssertions;
using Meziantou.Extensions.Logging.Xunit;
using Microsoft.Extensions.Logging;
using Xunit;
using Xunit.Abstractions;

namespace StepWise.Core.Tests;

/// <summary>
/// This workflow test if and while loops.
/// </summary>
public class GuessNumberWorkflowTest
{
    private readonly ITestOutputHelper _testOutputHelper;
    private readonly ILogger _logger;

    public GuessNumberWorkflowTest(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
        _logger = new XUnitLoggerProvider(testOutputHelper)
            .CreateLogger(nameof(GuessNumberWorkflowTest));
    }

    [Step]
    public async Task<int> InputNumber(int number)
    {
        return number;
    }

    [Step]
    public async Task<int?> GuessNumber(
        [FromStep(nameof(CheckGuess))] string? message = null)
    {
        if (message == "You guessed the number!")
        {
            return null;
        }
        else
        {
            return new Random().Next(1, 10);
        }
    }

    [Step]
    [DependOn(nameof(InputNumber))]
    [DependOn(nameof(GuessNumber))]
    public async Task<string> CheckGuess(
        [FromStep(nameof(InputNumber))] int randomNumber,
        [FromStep(nameof(GuessNumber))] int guess)
    {
        if (randomNumber == guess)
        {
            return "You guessed the number!";
        }
        else
        {
            return "Try again!";
        }
    }

    [Step]
    [DependOn(nameof(CheckGuess))]
    [DependOn(nameof(GuessNumber))]
    public async Task<string?> FinalResult(
        [FromStep(nameof(CheckGuess))] string message,
        [FromStep(nameof(GuessNumber))] int? guess = null)
    {
        if (message == "You guessed the number!" && guess is int)
        {
            return $"The number was {guess}!";
        }
        else
        {
            return null;
        }
    }

    [Fact]
    public async Task ItGuessNumber()
    {
        var workflow = Workflow.CreateFromInstance(this);
        var engine = new WorkflowEngine(workflow, logger: _logger);

        var context = new Dictionary<string, object>()
        {
            [nameof(InputNumber)] = 5,
        };
        await foreach (var (name, result) in engine.ExecuteStepAsync(nameof(FinalResult), context))
        {
            context[name] = result;

            if (name == nameof(FinalResult) && result is string finalResult)
            {
                break;
            }
        }

        context[nameof(FinalResult)].Should().Be("The number was 5!");
    }

    [Fact]
    public async Task ItThrowExceptionWhenNumberIsNotProvided()
    {
        var workflow = Workflow.CreateFromInstance(this);
        var engine = new WorkflowEngine(workflow);

        Func<Task> action = async () => await engine.ExecuteStepAsync<string>(nameof(FinalResult));

        await action.Should().ThrowAsync<Exception>();
    }
}

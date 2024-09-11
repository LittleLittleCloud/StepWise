using FluentAssertions;
using Meziantou.Extensions.Logging.Xunit;
using Microsoft.Extensions.Logging;
using Xunit;
using Xunit.Abstractions;
using StepWise.Core.Extension;

namespace StepWise.Core.Tests;

/// <summary>
/// This workflow test if and while loops.
/// </summary>
[Collection("Sequential")]
public class GuessNumberWorkflowTest
{
    private readonly ITestOutputHelper _testOutputHelper;
    private readonly ILogger _logger;

    public GuessNumberWorkflowTest(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
        _logger = LoggerFactory.Create(builder =>
        {
            builder.AddConsole();
        })
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
        var engine = new StepWiseEngine(workflow, logger: _logger);

        var context = new Dictionary<string, StepVariable>()
        {
            [nameof(InputNumber)] = StepVariable.Create(5)
        };
        await foreach (var stepResult in engine.ExecuteAsync(nameof(FinalResult), context))
        {
            var name = stepResult.StepName;
            var result = stepResult.Result;

            if (result is not null)
            {
                context[name] = result;
            }

            if (name == nameof(FinalResult) && result?.As<string>() is string finalResult)
            {
                break;
            }
        }

        context[nameof(FinalResult)].Value.As<string>().Should().Be("The number was 5!");
    }

    [Fact]
    public async Task ItThrowExceptionWhenNumberIsNotProvided()
    {
        var workflow = Workflow.CreateFromInstance(this);
        var engine = new StepWiseEngine(workflow);

        Func<Task> action = async () => await engine.ExecuteAsync<string>(nameof(FinalResult));

        await action.Should().ThrowAsync<Exception>();
    }
}

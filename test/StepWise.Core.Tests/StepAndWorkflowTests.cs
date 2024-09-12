// Copyright (c) LittleLittleCloud. All rights reserved.
// StepAndWorkflowTests.cs

using System;
using System.Collections.Generic;
using System.Text;
using FluentAssertions;
using Xunit;

namespace StepWise.Core.Tests;

public class StepAndWorkflowTests
{
    [Step]
    public async Task<DateTime> GetCurrentDateAsync()
    {
        return DateTime.Now;
    }

    public DateTime GetDate()
    {
        return DateTime.Now;
    }

    private async Task DoNothing()
    {
        await Task.Delay(0);
    }

    [Step]
    [DependOn(nameof(GetCurrentDateAsync))]
    public async Task<string> GetWeather(
        [FromStep(nameof(GetCurrentDateAsync))] DateTime date,
        string city)
    {
        return $"The weather in {city} on {date} is sunny.";
    }

    [Fact]
    public async Task ItCreateWorkflow()
    {
        var workflow = Workflow.CreateFromInstance(this);

        workflow.Steps.Should().HaveCount(2);
        workflow.Steps.Should().ContainKey(nameof(GetCurrentDateAsync));
        workflow.Steps.Should().ContainKey(nameof(GetWeather));
    }

    [Fact]
    public async Task ItReturnNullWhenParameterIsMissing()
    {
        var step = Step.CreateFromMethod(GetWeather);

        var result = await step.ExecuteAsync(new Dictionary<string, object>
        {
            ["date"] = DateTime.Now,
        });

        result.Should().BeNull();
    }


    [Fact]
    public async Task ItCreateStepFromGetWeather()
    {
        var step = Step.CreateFromMethod(GetWeather);

        step.Name.Should().Be(nameof(GetWeather));
        step.InputParameters.Should().HaveCount(2);
        step.InputParameters[0].Name.Should().Be("date");
        step.InputParameters[0].Type.Should().Be(typeof(DateTime));
        step.InputParameters[0].SourceStep.Should().Be(nameof(GetCurrentDateAsync));
        step.InputParameters[1].Name.Should().Be("city");
        step.InputParameters[1].Type.Should().Be(typeof(string));
        step.InputParameters[1].SourceStep.Should().BeNull();

        step.OutputType.Should().Be(typeof(Task<string>));
        step.Dependencies.Should().Contain(nameof(GetCurrentDateAsync));

        var result = await step.ExecuteAsync(new Dictionary<string, object>
        {
            [nameof(GetCurrentDateAsync)] = DateTime.Now,
            ["city"] = "New York",
        });

        result.Should().BeOfType<string>();
        ((string)result!).Should().StartWith("The weather in New York on");
    }

    [Fact]
    public async Task ItCreateStepFromGetCurrentDateAsync()
    {
        var step = Step.CreateFromMethod(GetCurrentDateAsync);

        step.Name.Should().Be(nameof(GetCurrentDateAsync));
        step.InputParameters.Should().BeEmpty();

        var res = await step.ExecuteAsync();
        res.Should().BeOfType<DateTime>();
    }

    [Fact]
    public async Task ItThrowExceptionWhenCreatingStepFromGetDate()
    {
        // because the return type is not Task<T>
        var act = () => Step.CreateFromMethod(GetDate);

        act.Should().Throw<ArgumentException>().WithMessage("The return type of the step method must be Task<> or Task.");
    }

    [Fact]
    public async Task ItCreatingStepFromDoNothing()
    {
        var step = Step.CreateFromMethod(DoNothing);

        step.Name.Should().Be(nameof(DoNothing));
        step.InputParameters.Should().BeEmpty();
        step.OutputType.Should().Be(typeof(Task));
    }
}

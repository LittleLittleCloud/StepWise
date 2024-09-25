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

    [StepWiseUITextInput]
    public async Task<string?> GetCity(string prompt = "Please enter the city name")
    {
        return null;
    }

    public async Task<bool> IllegalTextInputStep(string prompt = "Please enter the city name")
    {
        return false;
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

        workflow.Steps.Should().HaveCount(3);
        workflow.Steps.Should().ContainKey(nameof(GetCurrentDateAsync));
        workflow.Steps.Should().ContainKey(nameof(GetWeather));
        workflow.Steps.Should().ContainKey(nameof(GetCity));
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
        step.InputParameters[0].ParameterName.Should().Be("date");
        step.InputParameters[0].Type.Should().Be(typeof(DateTime));
        step.InputParameters[0].VariableName.Should().Be(nameof(GetCurrentDateAsync));
        step.InputParameters[1].ParameterName.Should().Be("city");
        step.InputParameters[1].Type.Should().Be(typeof(string));
        step.InputParameters[1].VariableName.Should().Be("city");

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

        // invoke
        var res = await step.ExecuteAsync();
        res.Should().BeNull();
    }

    [Fact]
    public async Task StepWiseTextInputStepMustReturnString()
    {
        var act = () => Step.CreateFromStepWiseUITextInput(IllegalTextInputStep);

        act.Should().Throw<ArgumentException>().WithMessage("The return type of the StepWiseUITextInput method must be Task<string?>.");
    }

    [Fact]
    public async Task ItCreateStepWiseTextInputStepFromGetCity()
    {
        var step = Step.CreateFromStepWiseUITextInput(GetCity);

        step.Name.Should().Be(nameof(GetCity));
        step.OutputType.Should().Be(typeof(Task<string?>));
        step.StepType.Should().Be(StepType.StepWiseUITextInput);
    }
}

// Copyright (c) LittleLittleCloud. All rights reserved.
// StepConfigurationTests.cs

using FluentAssertions;
using Xunit;

namespace StepWise.Core.Tests;

public class StepConfigurationTests
{
    [Step]
    public async Task<string> Start(
        [StepConfiguration] string a,
        [StepConfiguration] int b,
        [StepConfiguration] double c,
        [StepConfiguration] bool d)
    {
        return "Start";
    }

    [Step]
    public async Task<string> IllegalStep1( // because the type of step configuration is not one of [int/float/double, string, bool]
        [StepConfiguration] string[] a)
    {
        return "IllegalStep";
    }

    [Step]
    public async Task<string> IllegalStep2( // because it use FromStep and StepConfiguration at the same time
        [FromStep(nameof(Start))][StepConfiguration] List<string> a)
    {
        return "IllegalStep";
    }

    [Fact]
    public void ItCreateStepFromStart()
    {
        var step = Step.CreateFromMethod(Start);

        step.Should().NotBeNull();
        step.InputParameters.Where(p => p.IsConfigurableFromWebUI).Should().HaveCount(4);
    }

    [Fact]
    public void ItCreateStepFromIllegalStep1()
    {
        Action act = () => Step.CreateFromMethod(IllegalStep1);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ItCreateStepFromIllegalStep2()
    {
        Action act = () => Step.CreateFromMethod(IllegalStep2);
        act.Should().Throw<ArgumentException>();
    }
}

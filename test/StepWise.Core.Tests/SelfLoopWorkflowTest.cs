using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace StepWise.Core.Tests;

public class SelfLoopWorkflowTest
{
    [Step]
    public async Task<int> Start()
    {
        return 1;
    }

    [Step]
    public async Task<int> AddNumberByOne(
        [FromStep(nameof(Start))] int start,
        [FromStep(nameof(AddNumberByOne))] int? current = null)
    {
        if (current == null)
        {
            return start + 1;
        }

        return current.Value + 1;
    }

    [Step]
    public async Task<string?> End(
        [FromStep(nameof(AddNumberByOne))] int current)
    {
        if (current == 5)
        {
            return "Done!";
        }

        return null;
    }

    [Fact]
    public async Task ItAddNumberFromOneToFiveTest()
    {
        var workflow = Workflow.CreateFromType(this);
        var engine = new WorkflowEngine(workflow, maxConcurrency: 10);

        var stepAndResult = new List<(string, object)>();
        await foreach (var (step, result) in engine.ExecuteStepAsync(nameof(End)))
        {
            stepAndResult.Add((step, result));
        }

        // stepAndResult should contain the following:
        // Start, 1
        // AddNumberByOne, 2
        // AddNumberByOne, 3
        // AddNumberByOne, 4
        // AddNumberByOne, 5
        // End, Done!

        stepAndResult.Should().HaveCount(6);

        stepAndResult[0].Item1.Should().Be(nameof(Start));
        stepAndResult[0].Item2.Should().Be(1);

        stepAndResult[1].Item1.Should().Be(nameof(AddNumberByOne));
        stepAndResult[1].Item2.Should().Be(2);

        stepAndResult[2].Item1.Should().Be(nameof(AddNumberByOne));
        stepAndResult[2].Item2.Should().Be(3);

        stepAndResult[3].Item1.Should().Be(nameof(AddNumberByOne));
        stepAndResult[3].Item2.Should().Be(4);

        stepAndResult[4].Item1.Should().Be(nameof(AddNumberByOne));
        stepAndResult[4].Item2.Should().Be(5);

        stepAndResult[5].Item1.Should().Be(nameof(End));
        stepAndResult[5].Item2.Should().Be("Done!");
    }
}

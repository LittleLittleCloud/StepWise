// Copyright (c) LittleLittleCloud. All rights reserved.
// Loop.cs

// Create a web host running on 5123 port
using StepWise.Core;

public class Loop
{
    [Step]
    public async Task<int> GetNumberAsync()
    {
        return 0;
    }

    [Step]
    [DependOn(nameof(GetNumberAsync))]
    public async Task<int> AddOneAsync(
        [FromStep(nameof(GetNumberAsync))] int number,
        [FromStep(nameof(AddOneAsync))] int? currentNumber = null)
    {
        if (currentNumber is null)
        {
            currentNumber = number;
        }

        return currentNumber.Value + 1;
    }

    [Step]
    [DependOn(nameof(AddOneAsync))]
    public async Task<string?> AddToTen([FromStep(nameof(AddOneAsync))] int number)
    {
        if (number < 10)
        {
            return null;
        }

        return "Loop finished";
    }
}


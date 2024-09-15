// Copyright (c) LittleLittleCloud. All rights reserved.
// HelloWorld.cs

// Create a web host running on 5123 port
using StepWise.Core;

public class HelloWorld
{
    [Step]
    public async Task<string> SayHelloAsync()
    {
        return $"Hello";
    }

    [Step]
    [DependOn(nameof(SayHelloAsync))]
    public async Task<string> SayHelloWorldAsync([FromStep(nameof(SayHelloAsync))] string hello)
    {
        return $"{hello} World!";
    }

    [Step]
    [DependOn(nameof(SayHelloWorldAsync))]
    public async Task<string> GetNameAsync(
        [FromStep(nameof(SayHelloWorldAsync))] string helloWorld,
        string name = "LittleLittleCloud")
    {
        return $"{helloWorld}, {name}";
    }
}


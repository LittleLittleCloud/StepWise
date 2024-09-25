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

    [StepWiseUITextInput]
    public async Task<string?> GetName(string prompt = "Please enter your name")
    {
        return null;
    }

    [Step]
    [DependOn(nameof(SayHelloWorldAsync))]
    [DependOn(nameof(GetName))]
    public async Task<string> SaySomething(
        [FromStep(nameof(SayHelloWorldAsync))] string helloWorld,
        [FromStep(nameof(GetName))] string name)
    {
        return $"{helloWorld}, {name}";
    }
}


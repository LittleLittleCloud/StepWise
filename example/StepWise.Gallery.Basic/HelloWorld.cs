// Copyright (c) LittleLittleCloud. All rights reserved.
// HelloWorld.cs

// Create a web host running on 5123 port
using StepWise.Core;

public class HelloWorld
{
    [Step(description: "Simply say hello")]
    public async Task<string> SayHelloAsync()
    {
        return $"Hello";
    }

    [Step(description: "Say hello world")]
    [DependOn(nameof(SayHelloAsync))]
    public async Task<string> SayHelloWorldAsync([FromStep(nameof(SayHelloAsync))] string hello)
    {
        return $"{hello} World!";
    }

    [StepWiseUITextInput(description: "Get User Name")]
    public async Task<string?> GetName()
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


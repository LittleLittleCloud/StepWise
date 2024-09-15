// Copyright (c) LittleLittleCloud. All rights reserved.
// Cumulative.cs

// Create a web host running on 5123 port
using StepWise.Core;

public class Cumulative
{
    [Step]
    public async Task<string> A()
    {
        return "a";
    }

    [Step]
    [DependOn(nameof(A))]
    public async Task<string> B(
        [FromStep(nameof(A))] string a)
    {
        return "b";
    }

    [Step]
    [DependOn(nameof(B))]
    [DependOn(nameof(A))]
    public async Task<string> C(
        [FromStep(nameof(A))] string a,
        [FromStep(nameof(B))] string b)
    {
        return "c";
    }

    [Step]
    [DependOn(nameof(C))]
    [DependOn(nameof(B))]
    [DependOn(nameof(A))]
    public async Task<string> D(
        [FromStep(nameof(A))] string a,
        [FromStep(nameof(B))] string b,
        [FromStep(nameof(C))] string c)
    {
        return "d";
    }

    [Step]
    [DependOn(nameof(D))]
    [DependOn(nameof(C))]
    [DependOn(nameof(B))]
    [DependOn(nameof(A))]
    public async Task<string> E(
        [FromStep(nameof(A))] string a,
        [FromStep(nameof(B))] string b,
        [FromStep(nameof(C))] string c,
        [FromStep(nameof(D))] string d)
    {
        return "e";
    }
}


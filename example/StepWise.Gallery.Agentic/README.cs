// Copyright (c) LittleLittleCloud. All rights reserved.
// README.cs

using StepWise.Core;

namespace StepWise.Gallery.Agentic;

public class README
{
    [Step(description: """
        This gallery includes a series of agentic stepwise workflows.
        """)]
    public async Task<string> README1()
    {
        return "Let's start!";
    }
}

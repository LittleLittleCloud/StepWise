// Copyright (c) LittleLittleCloud. All rights reserved.
// CodeInterpreter.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using StepWise.Core;

public class CodeInterpreter
{
    [StepWiseUITextInput(description: "Please create a task")]
    public async Task<string?> CreateTask()
    {
        return "shut down my PC";
    }

    [Step]
    [DependOn(nameof(CreateTask))]
    public async Task<string?> WriteCode(
        [FromStep(nameof(CreateTask))] string task,
        [FromStep(nameof(ReviseCodePrompt))] string? reviseCodePrompt = null)
    {
        if (reviseCodePrompt == "Approve")
        {
            return null;
        }

        if (reviseCodePrompt != null)
        {
            return "revised code";
        }

        return "This is the code to run";
    }

    [StepWiseUITextInput(description: "Please review the code, approve the code by saying 'Approve', otherwise, provide feedback")]
    [DependOn(nameof(WriteCode))]
    public async Task<string?> ReviewCode(
        [FromStep(nameof(WriteCode))] string code)
    {
        return null;
    }

    [DependOn(nameof(ReviewCode))]
    [DependOn(nameof(WriteCode))]
    [Step]
    public async Task<string?> ReviseCodePrompt(
        [FromStep(nameof(WriteCode))] string code,
        [FromStep(nameof(ReviewCode))] string? review)
    {
        if (review == "Approve")
        {
            return review;
        }
        else
        {
            return $"Code not approved, please revise the code";
        }
    }

    [Step]
    [DependOn(nameof(ReviseCodePrompt))]
    [DependOn(nameof(WriteCode))]
    public async Task<string> RunCode(
        [FromStep(nameof(ReviseCodePrompt))] string reviseCodePrompt,
        [FromStep(nameof(WriteCode))] string code)
    {
        if (reviseCodePrompt == "Approve")
        {
            return "Code ran successfully, running code: " + code;
        }
        else
        {
            return "Code not approved, please revise the code";
        }
    }
}

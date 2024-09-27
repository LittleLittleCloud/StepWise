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
        return null;
    }

    [Step]
    [DependOn(nameof(CreateTask))]
    public async Task<string?> WriteCode(
        [FromStep(nameof(CreateTask))] string task,
        [FromStep(nameof(CodeReview))] CodeComment? codeReview = null)
    {
        if (codeReview?.comment == "Approve")
        {
            return null;
        }

        if (codeReview != null)
        {
            return $"revised code based on feedback: {codeReview.comment}";
        }

        return "This is the code to run";
    }

    [StepWiseUITextInput(description: "Please review the code, approve the code by saying 'Approve', otherwise, provide feedback")]
    [DependOn(nameof(WriteCode))]
    public async Task<string?> CommentOrApprove(
        [FromStep(nameof(WriteCode))] string code)
    {
        return null;
    }

    [DependOn(nameof(CommentOrApprove))]
    [DependOn(nameof(WriteCode))]
    [Step]
    public async Task<CodeComment> CodeReview(
        [FromStep(nameof(WriteCode))] string code,
        [FromStep(nameof(CommentOrApprove))] string review)
    {
        return new CodeComment(code, review);
    }

    [Step]
    [DependOn(nameof(CodeReview))]
    [DependOn(nameof(WriteCode))]
    public async Task<string> RunCode(
        [FromStep(nameof(CodeReview))] CodeComment reviseCodePrompt,
        [FromStep(nameof(WriteCode))] string code)
    {
        if (reviseCodePrompt.comment == "Approve")
        {
            return "Code ran successfully, running code: " + code;
        }
        else
        {
            return "Code not approved, please revise the code";
        }
    }

    public record CodeComment(string code, string comment);
}

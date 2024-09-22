// Copyright (c) LittleLittleCloud. All rights reserved.
// ExecuteStepRequest.cs

namespace StepWise.WebAPI;

public record ExecuteStepRequest(string WorkflowName, string? StepName = null, int? MaxStep = null, int MaxParallel = 1);

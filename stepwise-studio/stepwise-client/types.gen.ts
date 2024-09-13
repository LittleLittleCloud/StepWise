// This file is auto-generated by @hey-api/openapi-ts

export type StepDTO = {
    name?: (string) | null;
    description?: (string) | null;
    dependencies?: Array<(string)> | null;
    variables?: Array<(string)> | null;
};

export type StepRunAndResultDTO = {
    stepRun?: StepRunDTO;
    result?: VariableDTO;
};

export type StepRunDTO = {
    step?: StepDTO;
    variables?: Array<VariableDTO> | null;
    generation?: number;
};

export type VariableDTO = {
    name?: (string) | null;
    type?: (string) | null;
    displayValue?: (string) | null;
    generation?: number;
};

export type WorkflowDTO = {
    name?: (string) | null;
    description?: (string) | null;
    steps?: Array<StepDTO> | null;
};

export type GetApiV1StepWiseControllerV1GetResponse = (unknown);

export type GetApiV1StepWiseControllerV1GetError = unknown;

export type GetApiV1StepWiseControllerV1VersionResponse = (string);

export type GetApiV1StepWiseControllerV1VersionError = unknown;

export type GetApiV1StepWiseControllerV1GetStepData = {
    query?: {
        stepName?: string;
        workflowName?: string;
    };
};

export type GetApiV1StepWiseControllerV1GetStepResponse = (StepDTO);

export type GetApiV1StepWiseControllerV1GetStepError = unknown;

export type GetApiV1StepWiseControllerV1GetWorkflowData = {
    query?: {
        workflowName?: string;
    };
};

export type GetApiV1StepWiseControllerV1GetWorkflowResponse = (WorkflowDTO);

export type GetApiV1StepWiseControllerV1GetWorkflowError = unknown;

export type GetApiV1StepWiseControllerV1ListWorkflowResponse = (Array<WorkflowDTO>);

export type GetApiV1StepWiseControllerV1ListWorkflowError = unknown;

export type PostApiV1StepWiseControllerV1ExecuteStepData = {
    query?: {
        step?: string;
        workflow?: string;
    };
};

export type PostApiV1StepWiseControllerV1ExecuteStepResponse = (Array<StepRunAndResultDTO>);

export type PostApiV1StepWiseControllerV1ExecuteStepError = unknown;
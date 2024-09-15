// This file is auto-generated by @hey-api/openapi-ts

import { createClient, createConfig, type Options } from '@hey-api/client-fetch';
import type { GetApiV1StepWiseControllerV1GetError, GetApiV1StepWiseControllerV1GetResponse, GetApiV1StepWiseControllerV1VersionError, GetApiV1StepWiseControllerV1VersionResponse, GetApiV1StepWiseControllerV1GetStepData, GetApiV1StepWiseControllerV1GetStepError, GetApiV1StepWiseControllerV1GetStepResponse, GetApiV1StepWiseControllerV1GetWorkflowData, GetApiV1StepWiseControllerV1GetWorkflowError, GetApiV1StepWiseControllerV1GetWorkflowResponse, GetApiV1StepWiseControllerV1ListWorkflowError, GetApiV1StepWiseControllerV1ListWorkflowResponse, PostApiV1StepWiseControllerV1ExecuteStepData, PostApiV1StepWiseControllerV1ExecuteStepError, PostApiV1StepWiseControllerV1ExecuteStepResponse } from './types.gen';

export const client = createClient(createConfig());

export const getApiV1StepWiseControllerV1Get = <ThrowOnError extends boolean = false>(options?: Options<unknown, ThrowOnError>) => { return (options?.client ?? client).get<GetApiV1StepWiseControllerV1GetResponse, GetApiV1StepWiseControllerV1GetError, ThrowOnError>({
    ...options,
    url: '/api/v1/StepWiseControllerV1/Get'
}); };

export const getApiV1StepWiseControllerV1Version = <ThrowOnError extends boolean = false>(options?: Options<unknown, ThrowOnError>) => { return (options?.client ?? client).get<GetApiV1StepWiseControllerV1VersionResponse, GetApiV1StepWiseControllerV1VersionError, ThrowOnError>({
    ...options,
    url: '/api/v1/StepWiseControllerV1/Version'
}); };

export const getApiV1StepWiseControllerV1GetStep = <ThrowOnError extends boolean = false>(options?: Options<GetApiV1StepWiseControllerV1GetStepData, ThrowOnError>) => { return (options?.client ?? client).get<GetApiV1StepWiseControllerV1GetStepResponse, GetApiV1StepWiseControllerV1GetStepError, ThrowOnError>({
    ...options,
    url: '/api/v1/StepWiseControllerV1/GetStep'
}); };

export const getApiV1StepWiseControllerV1GetWorkflow = <ThrowOnError extends boolean = false>(options?: Options<GetApiV1StepWiseControllerV1GetWorkflowData, ThrowOnError>) => { return (options?.client ?? client).get<GetApiV1StepWiseControllerV1GetWorkflowResponse, GetApiV1StepWiseControllerV1GetWorkflowError, ThrowOnError>({
    ...options,
    url: '/api/v1/StepWiseControllerV1/GetWorkflow'
}); };

export const getApiV1StepWiseControllerV1ListWorkflow = <ThrowOnError extends boolean = false>(options?: Options<unknown, ThrowOnError>) => { return (options?.client ?? client).get<GetApiV1StepWiseControllerV1ListWorkflowResponse, GetApiV1StepWiseControllerV1ListWorkflowError, ThrowOnError>({
    ...options,
    url: '/api/v1/StepWiseControllerV1/ListWorkflow'
}); };

export const postApiV1StepWiseControllerV1ExecuteStep = <ThrowOnError extends boolean = false>(options?: Options<PostApiV1StepWiseControllerV1ExecuteStepData, ThrowOnError>) => { return (options?.client ?? client).post<PostApiV1StepWiseControllerV1ExecuteStepResponse, PostApiV1StepWiseControllerV1ExecuteStepError, ThrowOnError>({
    ...options,
    url: '/api/v1/StepWiseControllerV1/ExecuteStep'
}); };
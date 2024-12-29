import { StepDTO, StepRunDTO } from "@/stepwise-client";
import { ChatCompletionTool } from "openai/resources/index.mjs";

export function isStepRunCompleted(stepRun: StepRunDTO): boolean {
	return stepRun.status === "Completed" || stepRun.status === "Failed";
}

export type StepNodeStatus =
	| "Running"
	| "Failed"
	| "Queue"
	| "Completed"
	| "NotReady";

export const ToStepNodeStatus = (status: string): StepNodeStatus => {
	switch (status) {
		case "Running":
			return "Running";
		case "Failed":
			return "Failed";
		case "Queue":
			return "Queue";
		case "Completed":
			return "Completed";
		default:
			return "NotReady";
	}
};

export const BuildOpenAIChatToolsFromSteps: (steps: StepDTO[]) => ChatCompletionTool[] = (steps) => {
	return steps.map(
		(step) =>
			({
				function: {
					name: step.name,
					description: step.description,
					parameters: {
						type: "object",
						properties: step.parameters!.reduce(
							(acc: { [key: string]: any }, param) => {

								if (param.name !== param.variable_name)
								{
									// if the name and variable_name are different
									// it means that the source of this parameter should come from another step
									// in that case, we should not include this parameter in the completion tool
									return acc;
								}
								const allowedTypes = [
									"String",
									"Number",
									"Boolean",
									"String[]",
									"Int32",
									"Int64",
									"Float",
									"Double",
								];
								const jsonTypeMap: {
									[key: string]: string;
								} = {
									String: "string",
									Number: "number",
									Boolean: "boolean",
									"String[]": "array",
									Integer: "integer",
									Int32: "integer",
									Int64: "integer",
									Float: "number",
									Double: "number",
								};
								const itemTypeMap: {
									[key: string]: string | undefined;
								} = {
									String: undefined,
									Number: undefined,
									Boolean: undefined,
									"String[]": "string",
									Integer: undefined,
									Int32: undefined,
									Int64: undefined,
									Float: undefined,
									Double: undefined,
								};
								if (
									!allowedTypes.includes(
										param.parameter_type,
									)
								) {
									return acc;
								}
								acc[param.variable_name] = {
									type: jsonTypeMap[
										param.parameter_type
									],
									items: itemTypeMap[
										param.parameter_type
									]
										? {
												type: itemTypeMap[
													param.parameter_type
												],
											}
										: undefined,
								};

								if (param.description !== "" && param.description !== undefined) {
									acc[param.variable_name].description = param.description;
								}
								return acc;
							},
							{},
						),
					},
				},
				type: "function",
			}) as ChatCompletionTool,
	);
}

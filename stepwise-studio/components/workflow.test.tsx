import { createLatestStepRunSnapShotFromWorkflow } from "./workflow";
import {
	StepDTO,
	StepRunDTO,
	VariableDTO,
	WorkflowDTO,
} from "@/stepwise-client";

describe("createLatestStepRunSnapShotFromWorkflow", () => {
	it("should create the latest step run snapshot from workflow", () => {
		const workflow = {
			name: "Test Workflow",
			steps: [
				{
					name: "Step1",
					parameters: [{ variable_name: "var1" }],
				} as StepDTO,
				{
					name: "Step2",
					parameters: [{ variable_name: "var2" }],
				} as StepDTO,
			],
		};

		const completedStepRuns = [
			{
				step: { name: "Step1" } as StepDTO,
				status: "Completed",
				result: { name: "var1", value: "value1" } as VariableDTO,
				generation: 0,
			},
			{
				step: { name: "Step2" } as StepDTO,
				status: "Completed",
				result: { name: "var2", value: "value2" } as VariableDTO,
				generation: 0,
			},
		];

		const expectedSnapshot = [
			{
				step: { name: "Step1" } as StepDTO,
				status: "Completed",
				result: { name: "var1", value: "value1" } as VariableDTO,
				generation: 0,
			},
			{
				step: { name: "Step2" } as StepDTO,
				status: "Completed",
				result: { name: "var2", value: "value2" } as VariableDTO,
				generation: 0,
			},
		];

		const snapshot = createLatestStepRunSnapShotFromWorkflow(
			workflow,
			completedStepRuns,
		);

		expect(snapshot).toEqual(expectedSnapshot);
	});

	it("should handle steps with NotReady status and update variables", () => {
		const workflow = {
			name: "Test Workflow",
			steps: [
				{
					name: "Step1",
					parameters: [{ variable_name: "var1" }],
				} as StepDTO,
				{
					name: "Step2",
					parameters: [{ variable_name: "var2" }],
				} as StepDTO,
			],
		};

		const completedStepRuns = [
			{
				step: { name: "Step1" } as StepDTO,
				status: "NotReady",
				generation: 0,
			},
			{
				step: { name: "Step2" } as StepDTO,
				status: "NotReady",
				generation: 0,
			},
		];

		const expectedSnapshot = [
			{
				step: { name: "Step1" } as StepDTO,
				status: "NotReady",
				variables: [],
				generation: 0,
			},
			{
				step: { name: "Step2" } as StepDTO,
				status: "NotReady",
				variables: [],
				generation: 0,
			},
		];

		const snapshot = createLatestStepRunSnapShotFromWorkflow(
			workflow,
			completedStepRuns,
		);

		expect(snapshot).toEqual(expectedSnapshot);
	});

	it("should handle steps with Completed status and update results", () => {
		const workflow: WorkflowDTO = {
			name: "Test Workflow",
			steps: [
				{
					name: "Step1",
					parameters: [{ variable_name: "var1" }],
				} as StepDTO,
				{
					name: "Step2",
					parameters: [{ variable_name: "var2" }],
				} as StepDTO,
			],
		};

		const completedStepRuns: StepRunDTO[] = [
			{
				step: { name: "Step1" } as StepDTO,
				status: "Completed",
				result: { name: "var1", value: "value1" } as VariableDTO,
				generation: 0,
			},
			{
				step: { name: "Step2" } as StepDTO,
				status: "Completed",
				result: { name: "var2", value: "value2" } as VariableDTO,
				generation: 0,
			},
		];

		const expectedSnapshot: StepRunDTO[] = [
			{
				step: { name: "Step1" } as StepDTO,
				status: "Completed",
				result: { name: "var1", value: "value1" } as VariableDTO,
				generation: 0,
			},
			{
				step: { name: "Step2" } as StepDTO,
				status: "Completed",
				result: { name: "var2", value: "value2" } as VariableDTO,
				generation: 0,
			},
		];

		const snapshot = createLatestStepRunSnapShotFromWorkflow(
			workflow,
			completedStepRuns,
		);

		expect(snapshot).toEqual(expectedSnapshot);
	});
});

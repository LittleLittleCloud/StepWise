import {
	StepDTO,
	StepRunDTO,
	VariableDTO,
	WorkflowDTO,
} from "@/stepwise-client";
import { create } from "zustand";
import { useWorkflow, useWorkflowStore } from "./useWorkflow";
import { WorkflowData } from "@/components/workflow";
import { isStepRunCompleted } from "@/lib/stepRunUtils";

export interface StepRunHistoryState {
	stepRunHistories: { [key: string]: StepRunDTO[] };
	selectedStepRunHistory: StepRunDTO[];
	updateStepRunHistory: (key: string, value: StepRunDTO[]) => void;
	setSelectedStepRunHistory: (value: StepRunDTO[]) => void;
	createLatestStepRunSnapShotFromRunHistory: (
		workflow: WorkflowDTO,
		completedStepRuns: StepRunDTO[],
	) => StepRunDTO[];
	resetStepRunResult: (
		workflow: WorkflowData,
		step: StepDTO,
		completedRunSteps: StepRunDTO[],
		clearDependent?: boolean,
	) => StepRunDTO[];
}

export const useStepRunHistoryStore = create<StepRunHistoryState>(
	(set, get) => ({
		stepRunHistories: {},
		selectedStepRunHistory: [],
		updateStepRunHistory: (key, value) =>
			set({
				stepRunHistories: { ...get().stepRunHistories, [key]: value },
			}),
		setSelectedStepRunHistory: (value) => {
			set((state) => {
				var currentWorkflow =
					useWorkflowStore.getState().selectedWorkflow;
				if (!currentWorkflow) {
					throw new Error("No workflow selected");
				}
				state.updateStepRunHistory(currentWorkflow.name, value);
				return { selectedStepRunHistory: value };
			});
		},
		createLatestStepRunSnapShotFromRunHistory: (
			workflow,
			completedStepRuns,
		) => {
			var stepRuns = completedStepRuns ?? [];
			var variables = stepRuns
				.filter((run) => run.result)
				.map((run) => run.result!);
			var stepRun = stepRuns.filter((run) => run.status !== "Variable");
			// create latest variables, which only keeps the most recent version for variable in variables which have the same name
			var latestVariables = variables.reduce(
				(acc, variable) => {
					acc[variable.name] = variable;
					return acc;
				},
				{} as { [key: string]: VariableDTO },
			);

			var latestRunSteps = stepRun.reduce(
				(acc, run) => {
					acc[run.step?.name ?? ""] = run;
					return acc;
				},
				{} as { [key: string]: StepRunDTO },
			);

			var steps = workflow.steps;

			var stepRuns = steps?.map((step) => {
				var stepRun: StepRunDTO =
					latestRunSteps[step.name] ??
					({
						status: "NotReady",
						step: step,
						generation: 0,
					} as StepRunDTO);

				// if status is not ready, update variables with the latest variables
				if (stepRun.status === "NotReady") {
					stepRun.variables = step.parameters
						?.map((param) => {
							var variable = latestVariables[param.variable_name];
							return variable;
						})
						.filter(
							(variable) => variable !== undefined,
						) as VariableDTO[];
				}

				if (stepRun.status === "Completed") {
					var result = latestVariables[step.name] ?? undefined;
					stepRun.result = result;
				} else {
					stepRun.result = undefined;
				}

				return stepRun;
			});

			return stepRuns;
		},
		resetStepRunResult: (
			workflow,
			step,
			completedRunSteps,
			clearDependent,
		) => {
			clearDependent = clearDependent ?? true;
			// early stop if the step is already cleared
			const thisRunSteps = completedRunSteps.filter(
				(run) =>
					run.step?.name === step.name ||
					run.result?.name === step.name,
			);

			if (
				thisRunSteps.length === 1 &&
				thisRunSteps[0].status === "NotReady"
			) {
				return completedRunSteps;
			}

			completedRunSteps = completedRunSteps.filter(
				(run) =>
					run.step?.name !== step.name &&
					run.result?.name !== step.name,
			);
			let notReadyStepRun: StepRunDTO = {
				...step,
				status: "NotReady",
				step: step,
				generation: 0,
			};

			let clearedRunSteps = [...completedRunSteps, notReadyStepRun];

			// also clear dependent steps
			const dependentSteps = workflow.steps?.filter(
				(s) =>
					s.dependencies?.some((d) => d === step.name) ||
					s.parameters?.some((p) => p.variable_name === step.name),
			);

			// BFS
			if (dependentSteps && clearDependent) {
				for (const dependentStep of dependentSteps) {
					clearedRunSteps = get().resetStepRunResult(
						workflow,
						dependentStep,
						clearedRunSteps,
					);
				}
			}
			return clearedRunSteps;
		},
	}),
);

import { WorkflowData } from "@/components/workflow";
import {
	StepRunDTO,
	StepDTO,
	client,
	postApiV1StepWiseControllerV1ExecuteStep,
	VariableDTO,
} from "@/stepwise-client";
import { toast } from "sonner";
import { useAccessTokenStore } from "./useAccessToken";
import { useStepRunHistoryStore } from "./useStepRunHistory";
import { create } from "zustand/react";
import { v4 as uuidv4 } from "uuid";
import { useWorkflowStore } from "./useWorkflow";
import { useRunSettingsStore } from "./useVersion";

export interface WorkflowEngineState {
	isRunning: boolean;
	executeStep: (
		wstep?: StepDTO,
		stepRunHistory?: StepRunDTO[],
	) => Promise<StepRunDTO[]>;
}

export const useWorkflowEngine = create<WorkflowEngineState>((set, get) => ({
	isRunning: false,
	executeStep: async (step, history) => {
		const stepRunHistoryStoreState = useStepRunHistoryStore.getState();
		const accessToken = useAccessTokenStore.getState().accessToken;
		const workflowStore = useWorkflowStore.getState();
		const runSettingStore = useRunSettingsStore.getState();
		const workflow = workflowStore.selectedWorkflow;
		const maxParallelRun = runSettingStore.maxParallel;
		const maxSteps = runSettingStore.maxSteps;
		if (workflow === undefined) {
			throw new Error("No workflow selected");
		}
		const stepRunHistory =
			history ?? stepRunHistoryStoreState.selectedStepRunHistory;
		try {
			set({ isRunning: true });
			toast("Running workflow", {
				description: "started running workflow",
			});
			// create a random uuid as session id
			const sessionID = uuidv4();
			var existingRunSteps = [...stepRunHistory];
			var es = new EventSource(
				`${client.getConfig().baseUrl}/api/v1/StepWiseControllerV1/ExecuteStepSse?sessionID=${sessionID}`,
			);
			es.addEventListener("StepRunDTO", async (event) => {
				var data = JSON.parse(event.data) as StepRunDTO;
				existingRunSteps.push(data);
				stepRunHistoryStoreState.setSelectedStepRunHistory([
					...existingRunSteps,
				]);

				toast.info("Step run completed", {
					description: `Step run for ${data.step?.name} completed
					with status ${data.status}`,
				});
			});

			es.onopen = (_) => {
				console.log("Connection opened");
			};

			es.onerror = (event) => {
				console.log("Error", event);
			};

			const latestVariablesMap = stepRunHistory
				.filter((run) => run.result)
				.reduce(
					(acc, variable) => {
						acc[variable.result!.name!] = variable.result!;
						return acc;
					},
					{} as { [key: string]: VariableDTO },
				);

			const latestVariables = Object.values(latestVariablesMap);
			var res = await postApiV1StepWiseControllerV1ExecuteStep({
				query: {
					step: step?.name ?? undefined,
					workflow: workflow?.name,
					maxParallel: maxParallelRun,
					maxSteps: maxSteps,
					sessionID: sessionID,
				},
				body: [...latestVariables],
				headers: {
					Authorization: accessToken
						? `Bearer ${accessToken}`
						: undefined,
				},
			});

			es.close();
		} catch (err) {
			console.error("Error executing step: ", err);
			return [];
		} finally {
			set({ isRunning: false });
		}

		if (res.error) {
			console.error("Error executing step: ", res.error);
			return [];
		}

		if (res.data === undefined) {
			console.error("No data returned from executing step");
			return [];
		}

		var updateStepRuns = [...stepRunHistory, ...res.data];
		stepRunHistoryStoreState.setSelectedStepRunHistory(updateStepRuns);

		toast("Workflow run completed", {
			description: "Workflow run completed successfully",
		});

		return (res.data as StepRunDTO[]) ?? [];
	},
}));

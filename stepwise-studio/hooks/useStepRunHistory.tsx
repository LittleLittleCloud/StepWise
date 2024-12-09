import { StepRunDTO } from "@/stepwise-client";
import { create } from "zustand";
import { useWorkflow, useWorkflowStore } from "./useWorkflow";

export interface StepRunHistoryState {
	stepRunHistories: { [key: string]: StepRunDTO[] };
	selectedStepRunHistory: StepRunDTO[];
	updateStepRunHistory: (key: string, value: StepRunDTO[]) => void;
	setSelectedStepRunHistory: (value: StepRunDTO[]) => void;
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
	}),
);

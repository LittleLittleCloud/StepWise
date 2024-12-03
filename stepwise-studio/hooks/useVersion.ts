import { useEffect, useState } from "react";
import {
	getApiV1StepWiseControllerV1GetConfiguration,
	StepWiseServiceConfiguration,
} from "@/stepwise-client";
import { create } from "zustand";

interface StepwiseState {
	configuration: StepWiseServiceConfiguration | null;
	setConfiguration: (config: StepWiseServiceConfiguration) => void;
	clearConfiguration: () => void;
}

const useStepwiseStore = create<StepwiseState>((set) => ({
	configuration: null,
	setConfiguration: (config) => set({ configuration: config }),
	clearConfiguration: () => set({ configuration: null }),
}));

// Custom hook to access the configuration
export const useStepwiseServerConfiguration = () => {
	const configuration = useStepwiseStore((state) => state.configuration);
	const setConfiguration = useStepwiseStore(
		(state) => state.setConfiguration,
	);
	const clearConfiguration = useStepwiseStore(
		(state) => state.clearConfiguration,
	);

	useEffect(() => {
		const fetchConfiguration = async () => {
			try {
				const config =
					await getApiV1StepWiseControllerV1GetConfiguration();
				if (config.data) {
					setConfiguration(config.data);
				} else {
					throw new Error("No configuration data received");
				}
			} catch (error) {
				console.error("Failed to fetch configuration:", error);
				clearConfiguration();
			}
		};

		fetchConfiguration();
	}, [setConfiguration, clearConfiguration]);

	return configuration;
};

export interface RunSettingsState {
	maxParallel: number;
	maxSteps: number;
	setMaxParallel: (maxParallel: number) => void;
	setMaxSteps: (maxSteps: number) => void;
}

export const useRunSettingsStore = create<RunSettingsState>((set) => ({
	maxParallel: 5,
	maxSteps: 10,
	setMaxParallel: (maxParallel: number) => set({ maxParallel }),
	setMaxSteps: (maxSteps: number) => set({ maxSteps }),
}));

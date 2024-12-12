// useCheckpoints.ts
import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
	deleteApiV1StepWiseControllerV1DeleteCheckpoint,
	getApiV1StepWiseControllerV1ListCheckpoints,
	getApiV1StepWiseControllerV1LoadCheckpoint,
	postApiV1StepWiseControllerV1SaveCheckpoint,
} from "@/stepwise-client";
import { toast } from "sonner";
import { Checkpoint } from "@/components/checkpoint-selector";
import { useStepwiseServerConfiguration } from "./useVersion";
import { useWorkflow } from "./useWorkflow";
import { useAccessToken } from "./useAccessToken";
import { useStepRunHistoryStore } from "./useStepRunHistory";

export interface CheckpointStore {}

export function useCheckpoints() {
	const { selectedWorkflow, setSelectedWorkflow, updateWorkflow, workflows } =
		useWorkflow();
	const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
	const {
		setSelectedStepRunHistory,
		updateStepRunHistory,
		selectedStepRunHistory,
	} = useStepRunHistoryStore();
	const [selectedCheckpoint, setSelectedCheckpoint] = useState<
		Checkpoint | undefined
	>(undefined);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const accessToken = useAccessToken();

	const loadCheckpoint = async (checkpoint: Checkpoint) => {
		try {
			const response = await getApiV1StepWiseControllerV1LoadCheckpoint({
				query: {
					workflow: selectedWorkflow?.name,
					checkpointName: checkpoint.name,
				},
				headers: {
					Authorization: accessToken
						? `Bearer ${accessToken}`
						: undefined,
				},
			});
			if (response.data) {
				setSelectedCheckpoint(checkpoint);
				setSelectedWorkflow({
					...selectedWorkflow!,
				});
				setSelectedStepRunHistory(response.data);
			}
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to load checkpoint";
			setError(message);
			toast.error(message);
		}
	};

	const fetchCheckpoints = async () => {
		setLoading(true);
		try {
			const response = await getApiV1StepWiseControllerV1ListCheckpoints({
				query: {
					workflow: selectedWorkflow?.name,
				},
				headers: {
					Authorization: accessToken
						? `Bearer ${accessToken}`
						: undefined,
				},
			});

			if (response.data) {
				setCheckpoints(
					response.data?.map((checkpoint) => ({
						name: checkpoint,
					})) ?? [],
				);
			}
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to fetch checkpoints";
			setError(message);
			toast.error(message);
		} finally {
			setLoading(false);
		}
	};

	const saveCheckpoint = async (checkpoint: Checkpoint) => {
		try {
			console.log("Saving checkpoint", selectedWorkflow);
			var latestWorkflow = workflows.find(
				(workflow) => workflow.name === selectedWorkflow?.name,
			);
			await postApiV1StepWiseControllerV1SaveCheckpoint({
				query: {
					workflow: latestWorkflow!.name,
					checkpointName: checkpoint.name,
				},
				body: selectedStepRunHistory,
				headers: {
					Authorization: accessToken
						? `Bearer ${accessToken}`
						: undefined,
				},
			});
			setCheckpoints([...checkpoints, checkpoint]);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to save checkpoint";
			setError(message);
			toast.error(message);
		}
	};

	const deleteCheckpoint = async (checkpoint: Checkpoint) => {
		try {
			await deleteApiV1StepWiseControllerV1DeleteCheckpoint({
				query: {
					workflow: selectedWorkflow?.name,
					checkpointName: checkpoint.name,
				},
				headers: {
					Authorization: accessToken
						? `Bearer ${accessToken}`
						: undefined,
				},
			});
			await fetchCheckpoints();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to save checkpoint";
			setError(message);
			toast.error(message);
		}
	};

	useEffect(() => {
		if (selectedWorkflow?.name) {
			fetchCheckpoints();
		}
	}, [selectedWorkflow?.name]);

	return {
		checkpoints,
		loading,
		error,
		fetchCheckpoints,
		saveCheckpoint,
		selectedCheckpoint,
		loadCheckpoint,
		deleteCheckpoint,
	};
}

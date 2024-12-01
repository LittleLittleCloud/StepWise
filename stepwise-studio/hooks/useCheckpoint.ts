// useCheckpoints.ts
import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { deleteApiV1StepWiseControllerV1DeleteCheckpoint, getApiV1StepWiseControllerV1ListCheckpoints, getApiV1StepWiseControllerV1LoadCheckpoint, postApiV1StepWiseControllerV1SaveCheckpoint } from "@/stepwise-client";
import { toast } from "sonner";
import { Checkpoint } from "@/components/checkpoint-selector";
import { useStepwiseServerConfiguration } from "./useVersion";
import { useWorkflow } from "./useWorkflow";

export interface CheckpointStore {}

export function useCheckpoints() {
    const {selectedWorkflow, setSelectedWorkflow, updateWorkflow} = useWorkflow();
	const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
    const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | undefined>(undefined);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { getAccessTokenSilently } = useAuth0();
	const configuration = useStepwiseServerConfiguration();

    const loadCheckpoint = async (checkpoint: Checkpoint) => {
        try {
            var token = undefined;
            if (configuration?.enableAuth0Authentication) {
                token = await getAccessTokenSilently();
            }
            const response = await getApiV1StepWiseControllerV1LoadCheckpoint({
                query: {
                    workflow: selectedWorkflow?.name,
                    checkpointName: checkpoint.name,
                },
                headers: {
                    Authorization: token ? `Bearer ${token}` : undefined,
                },
            });
            if (response.data) {
                setSelectedCheckpoint(checkpoint);
                setSelectedWorkflow({
                    ...selectedWorkflow!,
                    stepRuns: response.data,
                });
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
            var token = undefined;
            if (configuration?.enableAuth0Authentication) {
                token = await getAccessTokenSilently();
            }
			const response = await getApiV1StepWiseControllerV1ListCheckpoints({
				query: {
					workflow: selectedWorkflow?.name,
				},
				headers: {
					Authorization: token ? `Bearer ${token}` : undefined,
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
            var token = undefined;
            if (configuration?.enableAuth0Authentication) {
                token = await getAccessTokenSilently();
            }
            // Replace with actual API call
            console.log("Saving checkpoint", selectedWorkflow);
            await postApiV1StepWiseControllerV1SaveCheckpoint({
                query: {
                    workflow: selectedWorkflow!.name,
                    checkpointName: checkpoint.name,
                },
                body: selectedWorkflow?.stepRuns ?? [],
                headers: {
                    Authorization: token ? `Bearer ${token}` : undefined,
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
    }

    const deleteCheckpoint = async (checkpoint: Checkpoint) => {
        try {
            var token = undefined;
            if (configuration?.enableAuth0Authentication) {
                token = await getAccessTokenSilently();
            }
            await deleteApiV1StepWiseControllerV1DeleteCheckpoint({
                query: {
                    workflow: selectedWorkflow?.name,
                    checkpointName: checkpoint.name,
                },
                headers: {
                    Authorization: token ? `Bearer ${token}` : undefined,
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

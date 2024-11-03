import { FC, useState, useEffect } from "react";
import { BookmarkIcon, Loader2, SaveIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	deleteApiV1StepWiseControllerV1DeleteCheckpoint,
	getApiV1StepWiseControllerV1ListCheckpoints,
	GetApiV1StepWiseControllerV1ListCheckpointsData,
	WorkflowDTO,
} from "@/stepwise-client";
import { buttonVariants } from "./ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { WorkflowData } from "./workflow";
import { SelectItemText } from "@radix-ui/react-select";

export interface Checkpoint {
	name: string;
}

export interface CheckpointSelectorProps {
	onCheckpointSelect?: (checkpoint: Checkpoint) => void;
	onSaveCheckpoint?: (checkpoint: Checkpoint) => void;
	workflow?: WorkflowData;
	onDeleteCheckpoint?: (checkpoint: Checkpoint) => void;
}

export const CheckpointSelector: FC<CheckpointSelectorProps> = ({
	onCheckpointSelect,
	workflow,
	onSaveCheckpoint,
	onDeleteCheckpoint,
}) => {
	const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const iconSize = 14;

	const fetchCheckpoints = async (workflow: WorkflowData) => {
		try {
			// Replace with actual API call
			const response = await getApiV1StepWiseControllerV1ListCheckpoints({
				query: {
					workflow: workflow?.name,
				},
			} as GetApiV1StepWiseControllerV1ListCheckpointsData);
			var checkpoints = response.data;
			setCheckpoints(
				checkpoints?.map((checkpoint) => ({ name: checkpoint })) ?? [],
			);
			setError(null);
		} catch (err) {
			setError("Failed to load checkpoints");
		}
	};

	useEffect(() => {
		if (!workflow) {
			return;
		}

		fetchCheckpoints(workflow);
	}, [workflow]);

	return (
		<div className={cn("flex items-center gap-2")}>
			<span>Checkpoint</span>

			{loading ? (
				<Loader2 className="h-5 w-5 animate-spin text-gray-500" />
			) : (
				<Select
					defaultValue={workflow?.selectedCheckpoint}
					onValueChange={(value) => {
						const checkpoint = checkpoints.find(
							(c) => c.name === value,
						);
						if (checkpoint) {
							onCheckpointSelect?.(checkpoint);
						}
					}}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Select checkpoint" />
					</SelectTrigger>
					<SelectContent>
						{checkpoints.map((checkpoint) => (
							<div
								key={checkpoint.name}
								className="flex items-center justify-between p-1"
							>
								<SelectItem value={checkpoint.name}>
                                    {checkpoint.name}
								</SelectItem>
									{deletingId === checkpoint.name ? (
										<Loader2 className="pl-2 h-4 w-4 animate-spin" />
									) : (
										<button
											onClick={async (e) => {
												e.preventDefault(); // Prevent select from closing
												setDeletingId(checkpoint.name);
												try {
													await deleteApiV1StepWiseControllerV1DeleteCheckpoint(
														{
															query: {
																checkpointName:
																	checkpoint.name,
																workflow:
																	workflow?.name,
															},
														},
													);

													setCheckpoints(
														checkpoints.filter(
															(c) =>
																c.name !==
																checkpoint.name,
														),
													);
													await onDeleteCheckpoint?.(
														checkpoint,
													);
												} catch (err) {
													setError(
														"Failed to delete checkpoint",
													);
												} finally {
													setDeletingId(null);
												}
											}}
											className={cn(
												buttonVariants({
													variant: "ghost",
													size: "tinyIcon",
												}),
                                                "z-10 ml-2"
											)}
										>
											<Trash2 className="h-4 w-4 text-destructive" />
										</button>
									)}
                                </div>
						))}
					</SelectContent>
				</Select>
			)}
			<button
				className={cn(
					buttonVariants({
						variant: "ghost",
					}),
				)}
				disabled={isSaving}
				onClick={async () => {
					if (!workflow) {
						return;
					}

					setIsSaving(true);
					try {
						// get the highest number
						var highest = 0;
						checkpoints.forEach((checkpoint) => {
							try {
								var num = parseInt(
									checkpoint.name.split("_")[1].split(".")[0],
								);
								if (num > highest) {
									highest = num;
								}
							} catch (e) {
								// ignore
							}
						});

						// increment the highest number
						highest++;
						var checkpointName = "checkpoint_" + highest + ".json";
						await onSaveCheckpoint?.({ name: checkpointName });
						await fetchCheckpoints(workflow);
					} finally {
						setIsSaving(false);
					}
				}}
			>
				<span>Save</span>
			</button>
			{error && <span className="text-sm text-red-500">{error}</span>}
		</div>
	);
};

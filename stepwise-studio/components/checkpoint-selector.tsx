import { FC, useState, useEffect } from "react";
import { BookmarkIcon, Loader2, SaveIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	deleteApiV1StepWiseControllerV1DeleteCheckpoint,
	getApiV1StepWiseControllerV1ListCheckpoints,
	GetApiV1StepWiseControllerV1ListCheckpointsData,
	WorkflowDTO,
} from "@/stepwise-client";
import { Button, buttonVariants } from "./ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { WorkflowData } from "./workflow";
import { toast } from "sonner";
import { useCheckpoints } from "@/hooks/useCheckpoint";

export interface Checkpoint {
	name: string;
}

export interface CheckpointSelectorProps {}

export const CheckpointSelector: FC<CheckpointSelectorProps> = ({}) => {
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const {
		checkpoints,
		loading,
		error,
		selectedCheckpoint,
		loadCheckpoint,
		saveCheckpoint,
		deleteCheckpoint,
	} = useCheckpoints();

	return (
		<div className="flex items-center justify-between gap-2">
			<div className="flex items-center gap-2">
				<span>Checkpoint</span>

				{loading ? (
					<Loader2 className="h-5 w-5 animate-spin text-gray-500" />
				) : (
					<Select
						onValueChange={async (value) => {
							const checkpoint = checkpoints.find(
								(c) => c.name === value,
							);
							if (checkpoint) {
								await loadCheckpoint(checkpoint);
								toast.info("Load Checkpoint", {
									description: `Checkpoint ${checkpoint.name} has been loaded`,
								});
							}
						}}
						disabled={checkpoints.length === 0}
					>
						<SelectTrigger
							className="w-[180px]"
							disabled={checkpoints.length === 0}
						>
							<SelectValue
								placeholder={
									checkpoints.length === 0
										? "No checkpoints"
										: "Select checkpoint"
								}
							/>
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
													if (
														!confirm(
															"Are you sure you want to delete this checkpoint?",
														)
													) {
														return;
													}
													await deleteCheckpoint(
														checkpoint,
													);

													toast.success(
														"Checkpoint deleted",
														{
															description: `Checkpoint ${checkpoint.name} has been deleted successfully`,
														},
													);
												} catch (err) {
													toast.error("Error", {
														description:
															"Failed to delete checkpoint",
													});
												} finally {
													setDeletingId(null);
												}
											}}
											className={cn(
												buttonVariants({
													variant: "ghost",
													size: "tinyIcon",
												}),
												"z-10 ml-2",
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
			</div>
			<Button
				variant={"ghost"}
				disabled={isSaving}
				onClick={async () => {
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
						await saveCheckpoint({ name: checkpointName });
						toast("Checkpoint saved", {
							description: `Checkpoint has been saved successfully as ${checkpointName}`,
						});
					} catch (err) {
						toast.error("Error", {
							description: "Failed to save checkpoint" + err,
						});
					} finally {
						setIsSaving(false);
					}
				}}
			>
				<span>Save</span>
			</Button>
			{error && <span className="text-sm text-red-500">{error}</span>}
		</div>
	);
};

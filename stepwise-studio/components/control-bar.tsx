// | <autolayout> | <run> | <clean> | <max_parallel>: <input> | <max_steps>: <input> |

// | <autolayout> | <run> | <clean> | <max_parallel>: <input> | <max_steps>: <input> |

// | <autolayout> | <run> | <clean> | <max_parallel>: <input> | <max_steps>: <input> |

import { ChangeEvent, FC, useEffect, useState } from "react";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import {
	GithubIcon,
	icons,
	Layout,
	LayoutGrid,
	Loader2,
	Play,
	RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { Checkpoint, CheckpointSelector } from "./checkpoint-selector";
import { WorkflowDTO } from "@/stepwise-client";

interface ControlBarProps {
	onRunClick: () => void;
	onResetStepRunResultClick: () => void;
	onMaxParallelChange: (value: number) => void;
	maxParallel: number;
	maxSteps: number;
	onAutoLayoutClick: () => void;
	onMaxStepsChange: (value: number) => void;
	isRunning: boolean;
	workflow: WorkflowDTO;
	onCheckpointSelect?: (checkpoint: Checkpoint) => void;
	onSaveCheckpoint?: (checkpoint: Checkpoint) => void;
}

export const ControlBar: FC<ControlBarProps> = (props) => {
	const [maxSteps, setMaxSteps] = useState<number>(props.maxSteps);
	const [isRunning, setIsRunning] = useState<boolean>(props.isRunning);

	useEffect(() => {
		setIsRunning(props.isRunning);
	}, [props.isRunning]);

	const iconSize = 14;

	const onMaxStepsChange = (e: ChangeEvent<HTMLInputElement>) => {
		setMaxSteps(parseInt(e.target.value));
		props.onMaxStepsChange(parseInt(e.target.value));
	};

	return (
		<div className="flex flex-wrap justify-between items-center m-4 px-2 p-1 bg-background shadow-xl rounded-md">
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1">
					<button
						className={cn(
							buttonVariants({
								variant: isRunning ? "disabled" : "ghost",
								size: "tinyIcon",
							}),
						)}
						onClick={() => {
							if (!isRunning) {
								props.onRunClick();
							}
						}}
					>
						{isRunning ? (
							<Loader2 size={iconSize} className="animate-spin" />
						) : (
							<Play size={iconSize} />
						)}
					</button>
					<button
						className={cn(
							buttonVariants({
								variant: "ghost",
								size: "tinyIcon",
							}),
						)}
						onClick={props.onResetStepRunResultClick}
					>
						<RotateCcw size={iconSize} />
					</button>
				</div>
				{/* vertical divider */}
				<div className="h-6 w-0.5 bg-accent/50" />
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<span>Max Parallel Run:</span>
						<input
							type="number"
							value={props.maxParallel}
							onChange={(e) =>
								props.onMaxParallelChange(
									parseInt(e.target.value),
								)
							}
							className="w-12 p-1 text-xxs bg-accent/50 rounded-lg border border-accent"
						/>
					</div>

					<div className="flex items-center gap-2">
						<span>Max Steps:</span>
						<input
							type="number"
							value={maxSteps}
							onChange={onMaxStepsChange}
							className="w-12 p-1 text-xs bg-background rounded-lg border border-accent"
						/>
					</div>
					<CheckpointSelector
						workflow={props.workflow}
						onCheckpointSelect={props.onCheckpointSelect}
						onSaveCheckpoint={props.onSaveCheckpoint}
					/>
				</div>
				<div className="h-6 w-0.5 bg-accent/50" />
				<button
					className={cn(
						buttonVariants({
							variant: "ghost",
							size: "tinyIcon",
						}),
					)}
					onClick={props.onAutoLayoutClick}
				>
					<LayoutGrid size={iconSize} />
				</button>
				<Link
					href={"https://github.com/LittleLittleCloud/StepWise"}
					className={cn(
						buttonVariants({
							variant: "ghost",
							size: "tinyIcon",
						}),
					)}
					target="_blank"
				>
					<GithubIcon size={iconSize} />
				</Link>
			</div>
		</div>
	);
};

// | <autolayout> | <run> | <clean> | <max_parallel>: <input> | <max_steps>: <input> |

// | <autolayout> | <run> | <clean> | <max_parallel>: <input> | <max_steps>: <input> |

// | <autolayout> | <run> | <clean> | <max_parallel>: <input> | <max_steps>: <input> |

import { ChangeEvent, FC, useEffect, useState } from "react";
import { Button, buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import {
	GitCompare,
	GithubIcon,
	icons,
	Layout,
	LayoutGrid,
	Loader2,
	Play,
	RotateCcw,
	Route,
	Slash,
} from "lucide-react";
import Link from "next/link";
import { Checkpoint, CheckpointSelector } from "./checkpoint-selector";
import { EdgeStyle, useWorkflowSettingsStore } from "@/hooks/useVersion";
import { SidebarTrigger } from "./ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWorkflowStore } from "@/hooks/useWorkflow";

interface ControlBarProps {
	onRunClick: () => void;
	onResetStepRunResultClick: () => void;
	onAutoLayoutClick: () => void;
	isRunning: boolean;
}

export const EdgeStyleSwitchButton: FC = () => {
	const edgeStyle = useWorkflowSettingsStore((state) => state.edgeStyle);
	const setEdgeStyle = useWorkflowSettingsStore(
		(state) => state.setEdgeStyle,
	);
	const iconSize = 14;

	const edgeStyleOptions = [
		{
			value: "straight",
			icon: <Slash size={iconSize} />,
			tooltip:
				"The current edge style is straight, click to switch to smooth edge style",
		},
		{
			value: "smoothstep",
			icon: <GitCompare size={iconSize} />,
			tooltip:
				"The current edge style is smoothstep, click to switch to bezier edge style",
		},
		{
			value: "default",
			icon: <Route size={iconSize} />,
			tooltip:
				"The current edge style is default, click to switch to straight edge style",
		},
	];

	return (
		<Button
			variant="ghost"
			size="tinyIcon"
			tooltip={
				edgeStyleOptions.find((option) => option.value === edgeStyle)
					?.tooltip
			}
			onClick={() => {
				const currentIndex = edgeStyleOptions.findIndex(
					(option) => option.value === edgeStyle,
				);
				const nextIndex = (currentIndex + 1) % edgeStyleOptions.length;
				setEdgeStyle(edgeStyleOptions[nextIndex].value as EdgeStyle);
			}}
		>
			{
				edgeStyleOptions.find((option) => option.value === edgeStyle)
					?.icon
			}
		</Button>
	);
};

export const ControlBar: FC<ControlBarProps> = (props) => {
	const [isRunning, setIsRunning] = useState<boolean>(props.isRunning);
	const { maxParallel, maxSteps, setMaxParallel, setMaxSteps } =
		useWorkflowSettingsStore();

	const isMobile = useIsMobile();

	useEffect(() => {
		setIsRunning(props.isRunning);
	}, [props.isRunning]);

	const iconSize = 14;

	const onMaxStepsChange = (e: ChangeEvent<HTMLInputElement>) => {
		setMaxSteps(parseInt(e.target.value));
	};

	return (
		<div className="flex flex-wrap justify-between items-center gap-2 px-2 p-1 bg-background shadow-xl rounded-md">
			<div className="flex items-center gap-1">
				{isMobile && <SidebarTrigger />}
				<Button
					variant={isRunning ? "disabled" : "ghost"}
					size="tinyIcon"
					tooltip="Run all steps"
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
				</Button>
				<Button
					variant={isRunning ? "disabled" : "ghost"}
					size="tinyIcon"
					tooltip="Reset all step run results"
					onClick={props.onResetStepRunResultClick}
				>
					<RotateCcw size={iconSize} />
				</Button>
				<Button
					variant={isRunning ? "disabled" : "ghost"}
					size="tinyIcon"
					onClick={props.onAutoLayoutClick}
					tooltip="Auto layout"
				>
					<LayoutGrid size={iconSize} />
				</Button>
				<EdgeStyleSwitchButton />
				<Button
					variant="link"
					size="tinyIcon"
					tooltip="Github"
					onClick={() => {}}
				>
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
				</Button>
			</div>
			{/* vertical divider */}
			<div className="h-6 w-0.5 bg-accent/50" />
			<div className="flex items-center gap-2">
				<span>Max Parallel Run:</span>
				<input
					type="number"
					value={maxParallel}
					onChange={(e) => setMaxParallel(parseInt(e.target.value))}
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
		</div>
	);
};

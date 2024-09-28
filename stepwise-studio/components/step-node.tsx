import {
	ParameterDTO,
	StepDTO,
	StepRunDTO,
	VariableDTO,
} from "@/stepwise-client";
import React, { use, useCallback, useEffect, useState } from "react";
import {
	Handle,
	Position,
	NodeProps,
	useUpdateNodeInternals,
	NodeResizer,
} from "reactflow";
import { Button, buttonVariants } from "./ui/button";
import { cn, getDisplayType, showAsMarkdown, StepType } from "@/lib/utils";
import {
	AlertCircle,
	AlertOctagon,
	Badge,
	CheckCircle,
	CheckCircle2,
	CircleUserRound,
	Clock,
	FormInputIcon,
	Loader2,
	LoaderCircle,
	Play,
	RotateCcw,
	SquareFunction,
	StickyNote,
	VariableIcon,
} from "lucide-react";
import Divider from "./divider";
import { badgeVariants } from "./ui/badge";
import { Markdown } from "./markdown";
import { ParameterCard } from "./parameter-card";
import { VariableCard } from "./variable-card";

export type StepNodeStatus =
	| "Running"
	| "Failed"
	| "Queue"
	| "Completed"
	| "NotReady";

const ToStepNodeStatus = (status: string): StepNodeStatus => {
	switch (status) {
		case "Running":
			return "Running";
		case "Failed":
			return "Failed";
		case "Queue":
			return "Queue";
		case "Completed":
			return "Completed";
		default:
			return "NotReady";
	}
};

export interface StepNodeProps extends StepRunDTO {
	onRerunClick: (step: StepDTO) => void;
	onClearClick: (step: StepDTO) => void;
	onSubmitOutput: (output: VariableDTO) => void;
	isWorkflowRunning: boolean;
}

const StepNodeStatusIndicator: React.FC<{
	status: StepNodeStatus;
	isWorkflowRunning: boolean;
	stepType: StepType;
}> = ({ status, isWorkflowRunning, stepType }) => {
	const [stepNodeStatus, setStatus] = useState<StepNodeStatus>(
		status ?? "NotReady",
	);
	const [isRunning, setIsRunning] = useState<boolean>(isWorkflowRunning);
	useEffect(() => {
		setStatus(status);
		setIsRunning(isWorkflowRunning);
	}, [status, isWorkflowRunning, stepType]);

	const size = 12;

	const getStatusInfo = (status: StepNodeStatus) => {
		switch (status) {
			case "NotReady":
				return {
					icon: SquareFunction,
					label: status,
				};
			case "Queue":
				if (stepType !== "Ordinary") {
					return {
						icon: LoaderCircle,
						label: status,
						animation: "animate-[spin_3s_linear_infinite]",
					};
				}
				return isRunning
					? {
							icon: Clock,
							label: status,
							animation: "animate-[spin_3s_linear_infinite]",
						}
					: {
							icon: SquareFunction,
							label: status,
						};
			case "Running":
				return isRunning
					? {
							icon: Loader2,
							color: "text-yellow-500",
							label: status,
							animation: "animate-spin",
						}
					: {
							icon: SquareFunction,
							label: status,
						};
			case "Completed":
				return {
					icon: CheckCircle2,
					color: "text-green-500",
					label: status,
				};
			case "Failed":
				return {
					icon: AlertCircle,
					color: "text-destructive",
					label: status,
				};
			default:
				return {
					icon: SquareFunction,
					label: status,
				};
		}
	};

	const {
		icon: Icon,
		color,
		label,
		animation,
	} = getStatusInfo(stepNodeStatus);

	return (
		<div
			className={cn(
				buttonVariants({
					variant: "outline",
					size: "tinyIcon",
				}),
				"w-4 h-4",
			)}
		>
			<Icon
				size={size}
				className={cn(color, animation)}
				aria-label={label}
			/>
		</div>
	);
};

const ConvertStringToStepType = (type: string): StepType => {
	switch (type) {
		case "Ordinary":
			return "Ordinary";
		case "StepWiseUITextInput":
			return "StepWiseUITextInput";
		default:
			return "Ordinary";
	}
};

const StepNode: React.FC<NodeProps<StepNodeProps>> = (prop) => {
	const [step, setStep] = useState<StepDTO>(prop.data.step!);
	const stepNodeRef = React.useRef<HTMLDivElement>(null);
	const titleRef = React.useRef<HTMLDivElement>(null);
	const updateNodeInternals = useUpdateNodeInternals();
	const [sourceHandleTopOffset, setSourceHandleTopOffset] =
		useState<number>(0);
	const [status, setStatus] = useState<StepNodeStatus>(
		ToStepNodeStatus(prop.data.status ?? "NotReady"),
	);
	const [isSelected, setIsSelected] = useState<boolean>(
		prop.selected ?? false,
	);
	const [parameters, setParameters] = useState<ParameterDTO[]>(
		prop.data.step?.parameters ?? [],
	);
	const [variables, setVariables] = useState<VariableDTO[]>([]);
	const parameterRefMap = React.useRef<Map<string, HTMLDivElement>>(
		new Map(),
	);
	const [targetHandleTopOffsets, setTargetHandleTopOffsets] = useState<
		Map<string, number>
	>(new Map());
	const [output, setOutput] = useState<VariableDTO | undefined>(undefined);
	const [stepType, setStepType] = useState<StepType | undefined>(
		ConvertStringToStepType(prop.data.step?.step_type ?? "Ordinary"),
	);
	const [inputText, setInputText] = useState<string>("");
	const [isWorkflowRunning, setIsWorkflowRunning] = useState<boolean>(
		prop.data.isWorkflowRunning,
	);

	useEffect(() => {
		if (!stepNodeRef.current) return;
		setStep(prop.data.step!);
		setStatus(ToStepNodeStatus(prop.data.status ?? "NotReady"));
		setIsSelected(prop.selected ?? false);
		setParameters(prop.data.step?.parameters ?? []);
		setOutput(prop.data.result ?? undefined);
		setTargetHandleTopOffsets(
			prop.data.step?.parameters?.reduce((acc, param) => {
				acc.set(param.variable_name!, 0);
				return acc;
			}, new Map<string, number>()) ?? new Map<string, number>(),
		);

		// set resize observer
		const resizeObserver = new ResizeObserver((entries) => {
			resizeCallback();
		});

		resizeObserver.observe(stepNodeRef.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, []);

	useEffect(() => {
		setVariables(prop.data.variables ?? []);
	}, [prop.data.variables]);

	useEffect(() => {
		setOutput(prop.data.result ?? undefined);
	}, [prop.data.result]);

	useEffect(() => {
		setIsSelected(prop.selected ?? false);
	}, [prop.selected]);

	useEffect(() => {
		setStatus(ToStepNodeStatus(prop.data.status ?? "NotReady"));
	}, [prop.data.status]);

	useEffect(() => {
		setIsWorkflowRunning(prop.data.isWorkflowRunning);
	}, [prop.data.isWorkflowRunning]);

	useEffect(() => {
		if (prop.data.step?.step_type === "StepWiseUITextInput") {
			setStepType("StepWiseUITextInput");
		} else {
			setStepType("Ordinary");
		}
	}, [prop.data.step?.step_type]);

	useEffect(() => {
		updateNodeInternals(prop.id);
	}, [step, sourceHandleTopOffset, targetHandleTopOffsets, status]);

	useEffect(() => {
		if (titleRef.current) {
			setSourceHandleTopOffset(
				titleRef.current.offsetTop + titleRef.current.offsetHeight / 2,
			);
		}
	}, [titleRef.current]);

	var resizeCallback = useCallback(() => {
		const offsets = Array.from(parameterRefMap.current.values()).map(
			(el) => el.offsetTop + 11,
		);
		var newOffsetMap = new Map<string, number>();
		offsets.forEach((offset, index) => {
			newOffsetMap.set(
				Array.from(parameterRefMap.current.keys())[index],
				offset,
			);
		});

		setTargetHandleTopOffsets(newOffsetMap);
	}, [parameterRefMap]);

	useEffect(() => {
		if (parameterRefMap.current && parameterRefMap.current.size > 0) {
			resizeCallback();
		}
	}, [parameterRefMap.current]);

	return (
		<div
			className={cn(
				"border-2 max-w-96 rounded-md shadow-md p-1 bg-background/50 group min-w-32",
				isSelected ? "border-primary/40" : "border-transparent",
			)}
			ref={stepNodeRef}
		>
			{/* settings bar */}
			{/* appear when hover */}
			<div className="invisible flex group-hover:visible absolute -top-5 right-0 bg-background/50 rounded gap-1 m-0 p-1">
				<Button
					variant={"outline"}
					size={"xxsIcon"}
					className="m-0 p-0"
					onClick={() => {
						prop.data.onRerunClick(step);
					}}
				>
					<Play />
				</Button>

				<Button
					variant={"outline"}
					size={"xxsIcon"}
					className="m-0 p-0"
					onClick={() => prop.data.onClearClick(step)}
				>
					<RotateCcw />
				</Button>
			</div>

			{step.name && (
				<div className="flex flex-col">
					<div className="flex gap-1 items-center">
						<div ref={titleRef}>
							<StepNodeStatusIndicator
								status={status}
								isWorkflowRunning={isWorkflowRunning}
								stepType={stepType ?? "Ordinary"}
							/>
						</div>
						<h2 className="text-xs font-semibold text-nowrap pr-5">
							{step.name}
						</h2>
						<Handle
							type="source"
							position={Position.Right}
							// id = name-variable
							id={`${step.name}`}
							className="w-2 h-2 border-none bg-green-500"
							style={{ top: sourceHandleTopOffset, right: 5 }}
						/>
					</div>
					{step.description && (
						<h6 className="text-xs text-primary/50 pl-5">
							{step.description}
						</h6>
					)}
				</div>
			)}

			{/* parameters */}
			{parameters && parameters.length > 0 && (
				<div>
					<div className="flex gap-1 items-center">
						<Button
							variant={"outline"}
							size={"xxsIcon"}
							className="w-4 h-4 m-0 p-0"
						>
							<VariableIcon size={12} />
						</Button>
						<h3 className="text-xs font-semibold">Parameter</h3>
					</div>
					<div className="flex flex-col gap-1">
						{parameters.map((param, index) => (
							<div
								key={index}
								ref={(el) =>
									el &&
									parameterRefMap.current.set(
										param.variable_name!,
										el,
									)
								}
							>
								<ParameterCard
									{...param}
									variable={variables.find(
										(v) => v.name === param.variable_name,
									)}
								/>
								<Handle
									key={index}
									type="target"
									position={Position.Left}
									// id = name-dep
									id={`${step.name}-${param.variable_name}`}
									className="w-2 h-2 border-none bg-blue-500"
									style={{
										top: targetHandleTopOffsets.get(
											param.variable_name!,
										),
										left: 10,
									}}
								/>
							</div>
						))}
					</div>
				</div>
			)}

			{/* output */}
			{output && (
				<div>
					<div className="flex gap-1 items-center">
						<Button
							variant={"outline"}
							size={"xxsIcon"}
							className="w-4 h-4 m-0 p-0"
						>
							<VariableIcon size={12} />
						</Button>
						<h3 className="text-xs font-semibold">Output</h3>
						{output.type && (
							<div
								className={cn(
									badgeVariants({
										variant: "green",
										size: "tiny",
									}),
									"text-xs px-1 border-none",
								)}
							>
								{getDisplayType(output.type)}
							</div>
						)}
					</div>
					{output && <VariableCard variable={output} />}
				</div>
			)}

			{stepType === "StepWiseUITextInput" && status === "Queue" && (
				<div className="flex flex-col gap-2 pt-2">
					<div className="flex gap-1 items-center">
						<Button
							variant={"outline"}
							size={"xxsIcon"}
							className="w-4 h-4 m-0 p-0"
						>
							<FormInputIcon size={12} />
						</Button>
						<h3 className="text-xs font-semibold">Input</h3>
					</div>
					<textarea
						onDrag={(e) => e.stopPropagation()}
						className="border border-gray-300 rounded p-1 text-xs focus:border-accent/50 nodrag"
						placeholder="Enter text"
						value={inputText}
						onChange={(e) => setInputText(e.target.value)}
					/>
					<Button
						variant={"outline"}
						size={"tiny"}
						className="w-full hover:bg-accent/50"
						onClick={() => {
							if (output?.displayValue === inputText) return;
							var variable = {
								name: step.name,
								type: "String",
								displayValue: inputText,
								value: inputText,
								generation: prop.data.generation,
							} as VariableDTO;
							prop.data.onClearClick(step);
							prop.data.onSubmitOutput(variable);
						}}
					>
						Submit
					</Button>
				</div>
			)}
		</div>
	);
};

export default StepNode;

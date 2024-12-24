import {
	ExceptionDTO,
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
	NodeResizeControl,
	useReactFlow,
} from "reactflow";
import { Button, buttonVariants } from "./ui/button";
import {
	cn,
	ConvertStringToStepType,
	getDisplayType,
	showAsMarkdown,
	StepType,
} from "@/lib/utils";
import {
	AlertCircle,
	AlertOctagon,
	Badge,
	Brackets,
	CheckCircle,
	CheckCircle2,
	CircleUserRound,
	Clock,
	FileText,
	FormInputIcon,
	Loader2,
	LoaderCircle,
	MoveDiagonal2,
	Play,
	RotateCcw,
	Slash,
	SquareFunction,
	StickyNote,
	VariableIcon,
} from "lucide-react";
import Divider from "./divider";
import { badgeVariants } from "./ui/badge";
import { Markdown } from "./markdown";
import { ParameterCard } from "./parameter-card";
import { VariableCard } from "./variable-card";
import "react-resizable/css/styles.css";
import { ResizableDiv } from "./ui/resizableDiv";
import { on } from "events";
import { Switch } from "./ui/switch";
import ImageUpload from "./image-upload";
import { StepNodeStatus, ToStepNodeStatus } from "@/lib/stepRunUtils";
import { useWorkflowStore } from "@/hooks/useWorkflow";
import { useStepRunHistoryStore } from "@/hooks/useStepRunHistory";
import { useWorkflowEngine } from "@/hooks/useWorkflowEngine";
import { SidebarSeparator } from "./ui/sidebar";
import { Separator } from "./ui/separator";

export interface StepNodeProps extends StepRunDTO {}

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

	const size = 16;

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
				"flex h-full items-center justify-center",
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

const StepNode: React.FC<NodeProps<StepNodeProps>> = (prop) => {
	const resetStepRunResult = useStepRunHistoryStore(
		(state) => state.resetStepRunResult,
	);
	const currentStepRunHistory = useStepRunHistoryStore(
		(state) => state.selectedStepRunHistory,
	);
	const setSelectedStepRunHistory = useStepRunHistoryStore(
		(state) => state.setSelectedStepRunHistory,
	);
	const [step, setStep] = useState<StepDTO>(prop.data.step!);
	const executeStep = useWorkflowEngine((state) => state.executeStep);
	const isWorkflowRunning = useWorkflowEngine((state) => state.isRunning);
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
	const [inputNumber, setInputNumber] = useState<number | undefined>(
		undefined,
	);
	const [description, setDescription] = useState<string | undefined>(
		prop.data.step?.description ?? undefined,
	);
	const [inputSwitch, setInputSwitch] = useState<boolean>(false);

	const [collapseDescription, setCollapseDescription] =
		useState<boolean>(true);

	const [exceptionDTO, setExceptionDTO] = useState<ExceptionDTO | undefined>(
		prop.data.exception,
	);
	const shouldWaitForInput = (
		status: StepNodeStatus,
		stepType?: StepType,
	) => {
		return status === "Queue" && stepType !== "Ordinary";
	};

	const selectedWorkflow = useWorkflowStore(
		(state) => state.selectedWorkflow,
	);
	const setSelectedWorkflow = useWorkflowStore(
		(state) => state.setSelectedWorkflow,
	);
	const iconSize = 16;

	const [maxWidth, setMaxWidth] = useState<
		"max-w-64" | "max-w-96" | "max-w-lg" | "max-w-3xl"
	>("max-w-64");

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
		setExceptionDTO(prop.data.exception);
		// set resize observer
		const resizeObserver = new ResizeObserver((entries) => {
			resizeCallback();
		});

		resizeObserver.observe(stepNodeRef.current);

		// update max width
		const stepNodeID = `${selectedWorkflow?.name}-${step.name}`;
		const size = selectedWorkflow?.stepSizes[stepNodeID];
		if (size) {
			if (size.width > 512) {
				setMaxWidth("max-w-3xl");
			} else if (size.width > 384) {
				setMaxWidth("max-w-lg");
			} else if (size.width > 256) {
				setMaxWidth("max-w-96");
			} else {
				setMaxWidth("max-w-64");
			}
		}

		return () => {
			resizeObserver.disconnect();
		};
	}, []);

	useEffect(() => {
		setVariables(prop.data.variables ?? []);
	}, [prop.data.variables]);

	useEffect(() => {
		setExceptionDTO(prop.data.exception);
	}, [prop.data.exception]);

	useEffect(() => {
		setOutput(prop.data.result ?? undefined);
	}, [prop.data.result]);

	useEffect(() => {
		setDescription(prop.data.step?.description ?? undefined);
	}, [prop.data.step?.description]);

	useEffect(() => {
		setIsSelected(prop.selected ?? false);
	}, [prop.selected]);

	useEffect(() => {
		setStatus(ToStepNodeStatus(prop.data.status ?? "NotReady"));
	}, [prop.data.status]);

	useEffect(() => {
		setStepType(
			ConvertStringToStepType(prop.data.step?.step_type ?? "Ordinary"),
		);
	}, [prop.data.step?.step_type]);

	useEffect(() => {
		updateNodeInternals(prop.id);
		onResize(
			stepNodeRef.current?.offsetHeight!,
			stepNodeRef.current?.offsetWidth!,
		);
	}, [
		step,
		sourceHandleTopOffset,
		targetHandleTopOffsets,
		status,
		stepNodeRef.current,
		stepNodeRef.current?.offsetWidth,
		stepNodeRef.current?.offsetHeight,
	]);

	useEffect(() => {
		if (titleRef.current) {
			setSourceHandleTopOffset(
				titleRef.current.offsetTop + titleRef.current.offsetHeight / 2,
			);
		}
	}, [titleRef.current]);

	var resizeCallback = useCallback(() => {
		const offsets = Array.from(parameterRefMap.current.values()).map(
			(el) => el.offsetTop + 16,
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

	const onClearClick = async (step: StepDTO) => {
		if (!selectedWorkflow) return;

		var updatedRunSteps = resetStepRunResult(
			selectedWorkflow,
			step,
			currentStepRunHistory,
		);
		setSelectedStepRunHistory(updatedRunSteps);
	};

	const onRerunClick = async (step: StepDTO) => {
		if (!selectedWorkflow) return;
		executeStep(step, undefined, undefined, 1);
	};

	const onResize = async (height: number, width: number) => {
		if (!selectedWorkflow) return selectedWorkflow;

		const stepNodeID = `${selectedWorkflow.name}-${step.name}`;
		setSelectedWorkflow({
			...selectedWorkflow,
			stepSizes: {
				...selectedWorkflow.stepSizes,
				[stepNodeID]: height && width ? { height, width } : undefined,
			},
		});
	};

	const onSubmitOutput = async (output: VariableDTO) => {
		var completedStepRun = {
			...prop.data,
			status: "Completed",
		} as StepRunDTO;
		var variable = {
			status: "Variable",
			result: output,
			generation: output.generation,
		} as StepRunDTO;
		var completedRun = [
			...currentStepRunHistory,
			completedStepRun,
			variable,
		];

		setSelectedStepRunHistory(completedRun);
	};

	const onCancelInput = async () => {
		var notReadyStepRun = {
			...prop.data,
			status: "NotReady",
		} as StepRunDTO;

		setSelectedStepRunHistory([...currentStepRunHistory, notReadyStepRun]);
	};

	return (
		<div
			className={cn(
				"border-2 rounded-md shadow-md p-1 bg-sidebar group",
				isSelected ? "border-primary" : "border-transparent",
				maxWidth,
				shouldWaitForInput(status, stepType) ? "border-primary" : "",
			)}
			ref={stepNodeRef}
		>
			{
				<NodeResizeControl
					style={{
						background: "transparent",
						border: "none",
					}}
					onResize={(event, param) => {
						if (param.width > 512) {
							setMaxWidth("max-w-3xl");
						} else if (param.width > 384) {
							setMaxWidth("max-w-lg");
						} else if (param.width > 256) {
							setMaxWidth("max-w-96");
						} else {
							setMaxWidth("max-w-64");
						}
					}}
					onResizeEnd={(event, param) => {
						onResize(
							stepNodeRef.current!.offsetHeight,
							param.width,
						);
					}}
					minWidth={128}
					maxWidth={768}
				>
					<Slash
						style={{
							position: "absolute",
							bottom: 3,
							right: 3,
						}}
						size={6}
					/>
				</NodeResizeControl>
			}
			{/* settings bar */}
			{/* appear when hover */}
			<div className="invisible flex group-hover:visible absolute -top-7 right-0 bg-background/50 rounded gap-1 m-0 p-1">
				<Button
					tooltip="Run this step and all steps before it"
					variant={"outline"}
					size={"tinyIcon"}
					className="m-0 p-0"
					onClick={() => onRerunClick(step)}
				>
					<Play />
				</Button>
				<Button
					tooltip="Clear this step"
					variant={"outline"}
					size={"tinyIcon"}
					className="m-0 p-0"
					onClick={() => onClearClick(step)}
				>
					<RotateCcw />
				</Button>
			</div>

			{step.name && selectedWorkflow && (
				<div className="flex flex-col rounded-md w-full hover:bg-accent">
					<div
						className="flex items-center gap-1"
						onClick={() =>
							setCollapseDescription(!collapseDescription)
						}
					>
						<div ref={titleRef} className="items-center">
							<StepNodeStatusIndicator
								status={status}
								isWorkflowRunning={isWorkflowRunning}
								stepType={stepType ?? "Ordinary"}
							/>
						</div>
						<h1 className="font-semibold text-nowrap pr-5 grow truncate">
							{step.name}
						</h1>
						<Handle
							type="source"
							position={Position.Right}
							id={`${selectedWorkflow.name}-${step.name}`}
							className="w-2 h-2 border-none bg-green-500"
							style={{
								top: sourceHandleTopOffset,
								right: 5,
							}}
						/>
					</div>
					{description && !collapseDescription && (
						<span className="bg-background rounded-md truncate px-2">
							{description}
						</span>
					)}
					{description && collapseDescription && (
						<div
							className={cn(
								"flex rounded-md m-1 bg-background items-center nodrag nopan cursor-text",
							)}
							style={{ userSelect: "text" }}
						>
							<Markdown className="w-full overflow-x-auto">
								{description}
							</Markdown>
						</div>
					)}
				</div>
			)}

			{/* parameters */}
			{selectedWorkflow && parameters && parameters.length > 0 && (
				<div className="w-full">
					<div className="flex gap-1 items-center">
						<Button
							variant={"outline"}
							size={"tinyIcon"}
							className="m-0 p-0"
						>
							<Brackets size={iconSize} />
						</Button>
						<h1 className="font-semibold">Parameter</h1>
					</div>
					<div className="flex flex-col gap-1">
						{parameters.map((param, index) => (
							<div
								className="pl-4 rounded-md hover:bg-accent"
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
									id={`${selectedWorkflow!.name}-${step.name}-${param.variable_name}`}
									className="w-2 h-2 border-none bg-blue-500"
									style={{
										top: targetHandleTopOffsets.get(
											param.variable_name!,
										),
										left: 13,
									}}
								/>
							</div>
						))}
					</div>
				</div>
			)}
			{output && <Separator />}
			{output && (
				<div className="flex flex-col items-center mt-1 rounded-md hover:bg-accent">
					<ParameterCard
						name="Result"
						parameter_type={getDisplayType(output.type)}
						variable_name={output.name}
						variable={output}
						is_configurable_from_web_ui={false}
						step_name={step.name}
					/>
				</div>
			)}

			{/* error */}
			{exceptionDTO && <div className="border border-destructive m-1" />}
			{exceptionDTO && (
				<div className="flex flex-col items-center mt-1 bg-destructive/60 rounded-md hover:bg-destructive/40">
					<ParameterCard
						name="Error"
						parameter_type=""
						variable_name="error"
						variable={{
							name: "error",
							type: "error",
							displayValue:
								exceptionDTO.message +
								"\n" +
								exceptionDTO.stackTrace,
							value: exceptionDTO,
							generation: 0,
						}}
						is_configurable_from_web_ui={false}
						step_name={step.name}
					/>
				</div>
			)}

			{/* Process Text Input */}
			{stepType === "StepWiseUITextInput" && status === "Queue" && (
				<div className="flex flex-col gap-2 pt-2">
					<div className="flex gap-1 items-center">
						<Button
							variant={"outline"}
							size={"tinyIcon"}
							className="m-0 p-0"
						>
							<FormInputIcon size={iconSize} />
						</Button>
						<p className="font-semibold">Input</p>
					</div>
					<textarea
						onDrag={(e) => e.stopPropagation()}
						className="border border-gray-300 rounded p-1 focus:border-accent/50 nodrag"
						placeholder="Enter text"
						value={inputText}
						onChange={(e) => setInputText(e.target.value)}
					/>
					<div className="flex gap-2 justify-end">
						<Button
							variant={"outline"}
							size={"tiny"}
							className="bg-accent hover:bg-accent/50 text-base"
							onClick={() => {
								if (output?.displayValue === inputText) return;
								var variable = {
									name: step.name,
									type: "String",
									displayValue: inputText,
									value: inputText,
									generation: prop.data.generation,
								} as VariableDTO;
								onClearClick(step);
								onSubmitOutput(variable);
							}}
						>
							Submit
						</Button>
						<Button
							variant={"destructive"}
							size={"tiny"}
							className="text-base"
							onClick={() => {
								onCancelInput();
							}}
						>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{/* Process Number Input */}
			{stepType === "StepWiseUINumberInput" && status === "Queue" && (
				<div className="flex flex-col gap-2 pt-2">
					<div className="flex gap-1 items-center">
						<Button
							variant={"outline"}
							size={"tinyIcon"}
							className="m-0 p-0"
						>
							<FormInputIcon size={iconSize} />
						</Button>
						<h3 className="font-semibold">Input</h3>
					</div>

					<input
						type="number"
						className="border border-gray-300 rounded p-1 focus:border-accent/50 nodrag"
						placeholder="Enter number"
						value={inputNumber ?? ""}
						onChange={(e) => setInputNumber(Number(e.target.value))}
					/>

					<div className="flex gap-2 justify-end">
						<Button
							variant={"outline"}
							size={"tiny"}
							className="bg-accent hover:bg-accent/50 text-base"
							onClick={() => {
								if (
									output?.displayValue ===
									inputNumber?.toString()
								)
									return;
								var variable = {
									name: step.name,
									type: "Double",
									displayValue: inputNumber?.toString(),
									value: inputNumber,
									generation: prop.data.generation,
								} as VariableDTO;
								onClearClick(step);
								onSubmitOutput(variable);
							}}
						>
							Submit
						</Button>
						<Button
							variant={"destructive"}
							size={"tiny"}
							className="text-base"
							onClick={() => {
								onCancelInput();
							}}
						>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{/* Process Switch Input */}
			{stepType === "StepWiseUISwitchInput" && status === "Queue" && (
				<div className="flex flex-col gap-2 pt-2">
					<div className="flex gap-1 items-center">
						<Button
							variant={"outline"}
							size={"tinyIcon"}
							className="m-0 p-0"
						>
							<FormInputIcon size={iconSize} />
						</Button>
						<h3 className="font-semibold grow">Input</h3>

						<Switch
							checked={inputSwitch}
							onCheckedChange={(e) =>
								setInputSwitch(!inputSwitch)
							}
						/>
					</div>
					<div className="flex gap-2 justify-end">
						<Button
							variant={"outline"}
							size={"tiny"}
							className="bg-accent hover:bg-accent/50 text-base"
							onClick={() => {
								if (
									output?.displayValue ===
									inputSwitch.toString()
								)
									return;

								var variable = {
									name: step.name,
									type: "Boolean",
									displayValue: inputSwitch.toString(),
									value: inputSwitch,
									generation: prop.data.generation,
								} as VariableDTO;

								onClearClick(step);
								onSubmitOutput(variable);
							}}
						>
							Submit
						</Button>
						<Button
							variant={"destructive"}
							size={"tiny"}
							className="text-base"
							onClick={() => {
								onCancelInput();
							}}
						>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{/* Process Image Input */}
			{stepType === "StepWiseUIImageInput" && status === "Queue" && (
				<ImageUpload
					onCanceled={() => {
						onCancelInput();
					}}
					onUpload={async (file) => {
						var variable = {
							name: step.name,
							type: "StepWiseImage",
							displayValue: file.name,
							value: file,
							generation: prop.data.generation,
						} as VariableDTO;

						onClearClick(step);
						onSubmitOutput(variable);
					}}
				/>
			)}
		</div>
	);
};

export { StepNode };

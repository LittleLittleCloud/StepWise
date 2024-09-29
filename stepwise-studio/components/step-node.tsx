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
} from "reactflow";
import { Button, buttonVariants } from "./ui/button";
import { cn, getDisplayType, showAsMarkdown, StepType } from "@/lib/utils";
import {
	AlertCircle,
	AlertOctagon,
	Badge,
	Brackets,
	CheckCircle,
	CheckCircle2,
	CircleUserRound,
	Clock,
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
	onCancelInput: () => void;
	onResize: (height: number, width: number) => void;
	isWorkflowRunning: boolean;
	width?: number;
	height?: number;
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
	const [width, setWidth] = useState<number | undefined>(prop.data.width);
	const [height, setHeight] = useState<number | undefined>(prop.data.height);

	const [exceptionDTO, setExceptionDTO] = useState<ExceptionDTO | undefined>(
		prop.data.exception,
	);
	const shouldWaitForInput = (
		status: StepNodeStatus,
		stepType?: StepType,
	) => {
		return status === "Queue" && stepType === "StepWiseUITextInput";
	};

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
		setWidth(prop.data.width);
		setHeight(prop.data.height);
		setExceptionDTO(prop.data.exception);
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
		setExceptionDTO(prop.data.exception);
	}, [prop.data.exception]);

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
		if (prop.data.width && prop.data.height) {
			setWidth(prop.data.width);
			setHeight(prop.data.height);
		}
	}, [prop.data.width, prop.data.height]);

	useEffect(() => {
		updateNodeInternals(prop.id);
	}, [
		step,
		sourceHandleTopOffset,
		targetHandleTopOffsets,
		status,
		height,
		width,
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

	useEffect(() => {
		if (stepNodeRef.current) {
			if (
				height !== stepNodeRef.current.offsetHeight ||
				width !== stepNodeRef.current.offsetWidth
			) {
				prop.data.onResize(
					stepNodeRef.current.offsetHeight ?? height,
					width ?? stepNodeRef.current.offsetWidth,
				);
			}
		}
	}, [
		stepNodeRef.current,
		stepNodeRef.current?.offsetHeight,
		stepNodeRef.current?.offsetWidth,
		width,
		height,
	]);

	return (
		<div
			className={cn(
				"border-2 rounded-md shadow-md p-1 bg-background/50 group",
				// set weight and height
				isSelected ? "border-primary/40" : "border-transparent",
				width ?? "max-w-48",
				shouldWaitForInput(status, stepType)
					? "border-primary p-2"
					: "",
			)}
			ref={stepNodeRef}
		>
			{/* resize control */}
			{height && width && stepNodeRef.current && (
				<NodeResizeControl
					style={{
						background: "transparent",
						border: "none",
					}}
					onResize={(event, param) => {
						setWidth(param.width);
						setHeight(param.height);
					}}
					onResizeEnd={(event, param) => {
						setHeight(stepNodeRef.current!.offsetHeight);
						setWidth(stepNodeRef.current!.offsetWidth);
					}}
					minWidth={128}
					minHeight={height}
					maxHeight={height}
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
			)}
			{/* settings bar */}
			{/* appear when hover */}
			<div className="invisible flex group-hover:visible absolute -top-5 right-0 bg-background/50 rounded gap-1 m-0 p-1">
				{/* <Button
					variant={"outline"}
					size={"xxsIcon"}
					className="m-0 p-0"
					onClick={() => {
						prop.data.onRerunClick(step);
					}}
				>
					<Play />
				</Button> */}
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
						<h2 className="text-xs font-semibold text-nowrap pr-5 truncate">
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
						<h6 className="text-xs text-primary/80">
							{step.description}
						</h6>
					)}
				</div>
			)}

			{/* parameters */}
			{parameters && parameters.length > 0 && (
				<div className="w-full">
					<div className="flex gap-1 items-center">
						<Button
							variant={"outline"}
							size={"xxsIcon"}
							className="w-4 h-4 m-0 p-0"
						>
							<Brackets size={12} />
						</Button>
						<h3 className="text-xs font-semibold">Parameter</h3>
					</div>
					<div className="flex flex-col gap-1">
						{parameters.map((param, index) => (
							<div
								className="pl-4 bg-accent rounded-md hover:bg-accent/50"
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
			{output && <div className="border border-md m-1" />}
			{output && (
				<div className="flex flex-col items-center mt-1 bg-accent rounded-md hover:bg-accent/50">
					<ParameterCard
						name="Result"
						parameter_type={getDisplayType(output.type)}
						variable_name={output.name}
						variable={output}
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
							type: "",
							displayValue: exceptionDTO.message + "\n" + exceptionDTO.stackTrace,
							value: exceptionDTO,
							generation: 0,
						}}
					/>
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
					<div className="flex gap-2 justify-end">
						<Button
							variant={"outline"}
							size={"tiny"}
							className="bg-accent hover:bg-accent/50"
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
						<Button
							variant={"destructive"}
							size={"tiny"}
							onClick={() => {
								prop.data.onCancelInput();
							}}
						>
							Cancel
						</Button>
					</div>
				</div>
			)}
		</div>
	);
};

const ResizableStepNode = React.forwardRef<
	HTMLDivElement,
	NodeProps<StepNodeProps>
>((props, ref) => {
	const [width, setWidth] = useState<number | undefined>(props.data.width);
	const [height, setHeight] = useState<number | undefined>(props.data.height);

	useEffect(() => {
		if (props.data.width && props.data.height) {
			console.log(
				"Setting width and height: ",
				props.data.width,
				props.data.height,
			);
			setWidth(props.data.width);
			setHeight(props.data.height);
		}
	}, [props.data.width, props.data.height]);

	return height && width ? (
		<div
			ref={ref}
			style={{
				width: `${width}px`,
				height: `${height}px`,
			}}
		>
			<StepNode {...props} />
		</div>
	) : (
		<StepNode {...props} />
	);
});

export { StepNode };

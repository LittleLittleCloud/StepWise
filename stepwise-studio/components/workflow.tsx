import {
	client,
	getApiV1StepWiseControllerV1LoadCheckpoint,
	postApiV1StepWiseControllerV1ExecuteStep,
	postApiV1StepWiseControllerV1SaveCheckpoint,
	PostApiV1StepWiseControllerV1SaveCheckpointData,
	StepDTO,
	StepRunDTO,
	VariableDTO,
	WorkflowDTO,
} from "@/stepwise-client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
	Background,
	Controls,
	Edge,
	Connection,
	Node,
	useNodesState,
	useEdgesState,
	addEdge,
	MiniMap,
	BackgroundVariant,
	Position,
	useReactFlow,
	ReactFlowProvider,
	MarkerType,
	NodeChange,
	useOnViewportChange,
	Viewport,
} from "reactflow";
import "reactflow/dist/style.css";
import { StepNode, StepNodeProps } from "./step-node";
import dagre from "dagre";
import { Button } from "./ui/button";
import { LayoutGrid } from "lucide-react";
import { useTheme } from "next-themes";
import { ControlBar } from "./control-bar";
import { getLayoutedElements } from "@/lib/utils";
import StepRunSidebar, { StepRunSidebarProps } from "./step-run-sidebar";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "./ui/resizable";
import { toast } from "sonner";
import { useWorkflow } from "@/hooks/useWorkflow";
import { useAccessToken } from "@/hooks/useAccessToken";
import { v4 as uuidv4 } from "uuid";
import { useRunSettingsStore } from "@/hooks/useVersion";
import { useStepRunHistoryStore } from "@/hooks/useStepRunHistory";

export type WorkflowLayout = {
	stepPositions: { [key: string]: { x: number; y: number } };
	stepSizes: { [key: string]: { width: number; height: number } | undefined };
	viewPort: Viewport;
};
export type WorkflowData = WorkflowDTO & WorkflowLayout & StepRunSidebarProps;

export interface WorkflowProps {}

export function createLatestStepRunSnapShotFromWorkflow(
	workflow: WorkflowDTO,
	completedStepRuns: StepRunDTO[],
): StepRunDTO[] {
	var stepRuns = completedStepRuns ?? [];
	var variables = stepRuns
		.filter((run) => run.result)
		.map((run) => run.result!);
	var stepRun = stepRuns.filter((run) => run.status !== "Variable");
	// create latest variables, which only keeps the most recent version for variable in variables which have the same name
	var latestVariables = variables.reduce(
		(acc, variable) => {
			acc[variable.name] = variable;
			return acc;
		},
		{} as { [key: string]: VariableDTO },
	);

	var latestRunSteps = stepRun.reduce(
		(acc, run) => {
			acc[run.step?.name ?? ""] = run;
			return acc;
		},
		{} as { [key: string]: StepRunDTO },
	);

	var steps = workflow.steps;

	var stepRuns = steps?.map((step) => {
		var stepRun: StepRunDTO =
			latestRunSteps[step.name] ??
			({ status: "NotReady", step: step, generation: 0 } as StepRunDTO);

		// if status is not ready, update variables with the latest variables
		if (stepRun.status === "NotReady") {
			stepRun.variables = step.parameters
				?.map((param) => {
					var variable = latestVariables[param.variable_name];
					return variable;
				})
				.filter((variable) => variable !== undefined) as VariableDTO[];
		}

		if (stepRun.status === "Completed") {
			var result = latestVariables[step.name] ?? undefined;
			stepRun.result = result;
		} else {
			stepRun.result = undefined;
		}

		return stepRun;
	});

	return stepRuns;
}

export function isStepRunCompleted(stepRun: StepRunDTO): boolean {
	return stepRun.status === "Completed" || stepRun.status === "Failed";
}

export function clearStepRunResult(
	workflow: WorkflowData,
	step: StepDTO,
	completedRunSteps: StepRunDTO[],
): StepRunDTO[] {
	var latestSnapshot = createLatestStepRunSnapShotFromWorkflow(
		workflow,
		completedRunSteps,
	);

	// if in the latest snapshot, the step is not completed, then return the latest snapshot
	if (
		!latestSnapshot.find(
			(run) => run.step?.name === step.name && isStepRunCompleted(run),
		)
	) {
		return completedRunSteps;
	}

	// otherwise, mark the step and all its dependent steps as not ready
	// dependent steps are the steps that directly takes the result of the step as input
	var dependentSteps = workflow.steps?.filter(
		(s) =>
			s.parameters?.find((param) => param.variable_name === step.name) !==
			undefined,
	);
	var stepsToMarkAsNotReady = [step, ...(dependentSteps ?? [])];
	completedRunSteps = completedRunSteps.filter(
		(run) => run.result?.name !== step.name,
	);
	var updatedRunSteps = completedRunSteps.map((run) => {
		if (
			stepsToMarkAsNotReady.find((step) => step.name === run.step?.name)
		) {
			var param = run.step?.parameters?.find(
				(param) => param.variable_name === step.name,
			)!;
			return {
				...run,
				status: "NotReady",
				result: undefined,
				exception: undefined,
				variables: {
					...run.variables,
					[param?.name]: undefined,
				},
			} as StepRunDTO;
		}
		return run;
	});

	console.log("Updated run steps: ", updatedRunSteps);
	return updatedRunSteps;
}

const WorkflowInner: React.FC<WorkflowProps> = (props) => {
	const [nodes, setNodes, onNodesChange] = useNodesState<StepNodeProps>([]);
	const [edges, setEdges, _] = useEdgesState([]);
	const { selectedWorkflow, updateWorkflow, setSelectedWorkflow } =
		useWorkflow();
	const accessToken = useAccessToken();
	const { fitView, getViewport, setViewport } = useReactFlow();
	const { maxSteps, maxParallel } = useRunSettingsStore();
	const { theme } = useTheme();
	const {
		selectedStepRunHistory,
		setSelectedStepRunHistory,
		updateStepRunHistory,
	} = useStepRunHistoryStore();
	const [isRunning, setIsRunning] = useState<boolean>(false);

	const nodeTypes = useMemo(
		() => ({
			stepNode: StepNode,
		}),
		[],
	);

	const createGraphFromWorkflow = (
		workflow: WorkflowData,
		stepRunHistory: StepRunDTO[],
		isWorkflowRunning: boolean,
	) => {
		var completedRunSteps = stepRunHistory ?? [];
		completedRunSteps = createLatestStepRunSnapShotFromWorkflow(
			workflow,
			completedRunSteps,
		);
		var nodes = completedRunSteps?.map((stepRun) => {
			if (!stepRun.step) {
				throw new Error("Step run does not have step information");
			}

			var step = stepRun.step;
			var position = workflow.stepPositions[step.name];
			var size = workflow.stepSizes[step.name];
			return {
				id: step.name,
				type: "stepNode",
				position: position,
				...(size ?? { width: 200, height: 100 }), // if size is not defined, use default size
				style: {
					width: size?.width ?? "auto",
					height: size?.height ?? "auto",
				},
				data: {
					...size,
					...stepRun,
					isWorkflowRunning: isWorkflowRunning,
					onClearClick: (step: StepDTO) => {
						if (!selectedWorkflow) return;
						var updatedRunSteps = clearStepRunResult(
							selectedWorkflow,
							step,
							completedRunSteps,
						);

						setSelectedStepRunHistory(updatedRunSteps);
					},
					onRerunClick: (step: StepDTO) => {
						var stepRuns = clearStepRunResult(
							workflow,
							step,
							completedRunSteps,
						);
						var updatedWorkflow = {
							...workflow,
							stepRuns: stepRuns,
						} as WorkflowData;
						onStepNodeRunClick(
							updatedWorkflow,
							stepRunHistory,
							step,
							maxParallel,
							maxSteps,
						);
					},
					onSubmitOutput: (output: VariableDTO) => {
						var completedStepRun = {
							...stepRun,
							status: "Completed",
						} as StepRunDTO;
						var variable = {
							status: "Variable",
							result: output,
							generation: output.generation,
						} as StepRunDTO;
						var completedRun = [
							...completedRunSteps,
							completedStepRun,
							variable,
						];

						setSelectedStepRunHistory(completedRun);
					},
					onCancelInput: () => {
						var stepRuns = stepRunHistory.map((run) => {
							if (run.step?.name === step.name) {
								return {
									...run,
									status: "NotReady",
									result: undefined,
								} as StepRunDTO;
							}
							return run;
						});
						var updatedWorkflow = {
							...workflow,
							stepRuns: stepRuns,
						} as WorkflowData;
						setSelectedWorkflow(updatedWorkflow);
					},
					onResize: (height, width) => {
						if (!selectedWorkflow) return selectedWorkflow;
						setSelectedWorkflow({
							...selectedWorkflow,
							stepSizes: {
								...selectedWorkflow.stepSizes,
								[step.name]:
									height && width
										? { height, width }
										: undefined,
							},
						});
					},
				},
			} as Node<StepNodeProps>;
		});

		var edges =
			workflow.steps?.reduce((edges, step) => {
				var variableEdges =
					step.parameters?.map((param) => {
						var dependencies = step.dependencies ?? [];
						var isStepDependency =
							dependencies.findIndex(
								(d) => d === param.variable_name,
							) !== -1;
						return {
							id: `${step.name}-${param.variable_name}`,
							source: param.variable_name,
							target: step.name,
							sourceHandle: param.variable_name,
							targetHandle: step.name + "-" + param.variable_name,
							style: { stroke: "#555" },
							type: "smoothstep",
							animated: !isStepDependency,
						} as Edge;
					}) ?? [];

				return edges.concat([...variableEdges]);
			}, [] as Edge[]) ?? [];

		return { nodes, edges };
	};

	useOnViewportChange({
		onChange: (viewport) => {
			console.log("Viewport changed: ", viewport);
			if (selectedWorkflow === undefined) return;

			// compare the current viewport with the stored viewport
			// if they are the same, do not update the workflow
			var storedViewport = selectedWorkflow.viewPort;
			if (
				storedViewport?.zoom === viewport.zoom &&
				storedViewport?.x === viewport.x &&
				storedViewport?.y === viewport.y
			)
				return;

			setSelectedWorkflow({
				...selectedWorkflow,
				viewPort: viewport,
			});
		},
	});

	useEffect(() => {
		if (!selectedWorkflow) return;
		var graph = createGraphFromWorkflow(
			selectedWorkflow,
			selectedStepRunHistory,
			isRunning,
		);
		setNodes(graph.nodes);
		setEdges(graph.edges);

		if (selectedWorkflow.viewPort) {
			setViewport(selectedWorkflow.viewPort);
		}
	}, [selectedWorkflow, isRunning, fitView, selectedStepRunHistory]);

	const onStepNodeRunClick = async (
		workflow: WorkflowData,
		stepRunHistory: StepRunDTO[],
		step?: StepDTO,
		maxParallelRun?: number,
		maxSteps?: number,
	) => {
		if (!workflow.name) return;
		try {
			setIsRunning(true);
			toast("Running workflow", {
				description: "started running workflow",
			});
			// create a random uuid as session id
			const sessionID = uuidv4();
			var existingRunSteps = [...stepRunHistory];
			var es = new EventSource(
				`${client.getConfig().baseUrl}/api/v1/StepWiseControllerV1/ExecuteStepSse?sessionID=${sessionID}`,
			);
			es.addEventListener("StepRunDTO", async (event) => {
				var data = JSON.parse(event.data) as StepRunDTO;
				existingRunSteps.push(data);
				var latestSnapshot = createLatestStepRunSnapShotFromWorkflow(
					workflow,
					existingRunSteps,
				);
				setSelectedStepRunHistory(latestSnapshot);

				toast.info("Step run completed", {
					description: `Step run for ${data.step?.name} completed
					with status ${data.status}`,
				});
			});

			es.onopen = (_) => {
				console.log("Connection opened");
			};

			es.onerror = (event) => {
				console.log("Error", event);
			};

			var graph = createGraphFromWorkflow(
				workflow,
				stepRunHistory,
				false,
			);
			var variables = graph.nodes
				.filter((node) => node.data.result !== undefined)
				.map((node) => node.data.result!);
			var res = await postApiV1StepWiseControllerV1ExecuteStep({
				query: {
					step: step?.name ?? undefined,
					workflow: workflow?.name,
					maxParallel: maxParallelRun,
					maxSteps: maxSteps,
					sessionID: sessionID,
				},
				body: [...variables],
				headers: {
					Authorization: accessToken
						? `Bearer ${accessToken}`
						: undefined,
				},
			});

			es.close();
		} catch (err) {
			console.error("Error executing step: ", err);
			return;
		} finally {
			setIsRunning(false);
		}

		if (res.error) {
			console.error("Error executing step: ", res.error);
			return;
		}

		if (res.data === undefined) {
			console.error("No data returned from executing step");
			return;
		}

		var updateStepRuns = [...stepRunHistory, ...res.data];
		var latestSnapshot = createLatestStepRunSnapShotFromWorkflow(
			workflow,
			updateStepRuns,
		);

		setSelectedStepRunHistory(latestSnapshot);
		toast("Workflow run completed", {
			description: "Workflow run completed successfully",
		});
	};

	const onNodesChangeRestricted = useCallback(
		(changes: NodeChange[]) => {
			// Only allow position changes (dragging)
			const allowedChanges = changes.filter(
				(change) =>
					change.type === "position" ||
					change.type === "select" ||
					change.type === "reset" ||
					change.type === "dimensions",
			);
			for (const change of allowedChanges) {
				if (change.type === "position" && change.position) {
					// update the position of the node in workflow
					const node = nodes.find((n) => n.id === change.id);
					if (node) {
						const newPosition = change.position;
						const stepName = node.data.step?.name;
						if (stepName && selectedWorkflow) {
							var updatedWorkflow = {
								...selectedWorkflow,
								stepPositions: {
									...selectedWorkflow.stepPositions,
									[stepName]: newPosition,
								},
							} as WorkflowData;
							setSelectedWorkflow(updatedWorkflow);
						}
					}
				}
			}

			onNodesChange(allowedChanges);
		},
		[onNodesChange, nodes, isRunning, selectedWorkflow],
	);

	const onLayout = useCallback(() => {
		const { nodes: layoutedNodes, edges: layoutedEdges } =
			getLayoutedElements(nodes, edges);
		setNodes([...layoutedNodes]);
		setEdges([...layoutedEdges]);
		window.requestAnimationFrame(() => {
			fitView();
		});
		var stepPositions = layoutedNodes.reduce(
			(acc, node) => {
				acc[node.id] = {
					x: node.position.x,
					y: node.position.y,
				};
				return acc;
			},
			{} as { [key: string]: { x: number; y: number } },
		);
		if (!selectedWorkflow) return;
		setSelectedWorkflow({
			...selectedWorkflow,
			stepPositions: stepPositions,
		});
	}, [nodes, edges, setNodes, setEdges, fitView]);

	return (
		<div className="w-full h-full bg-accent/10 items-center justify-center flex">
			<ResizablePanelGroup
				direction="horizontal"
				className="w-full h-screen flex"
			>
				<ResizablePanel>
					<div className="flex flex-col items-center h-screen">
						<div className="flex items-center m-2 gap-5">
							<ControlBar
								isRunning={isRunning}
								onResetStepRunResultClick={() => {
									setSelectedStepRunHistory([]);
									toast("Reset workflow", {
										description:
											"All step runs have been reset",
									});
								}}
								onAutoLayoutClick={onLayout}
								onRunClick={() => {
									onStepNodeRunClick(
										selectedWorkflow!,
										selectedStepRunHistory,
										undefined,
										maxParallel,
										maxSteps,
									);
								}}
							/>
						</div>
						<ReactFlow
							nodes={nodes}
							edges={edges}
							onNodesChange={onNodesChangeRestricted}
							nodeTypes={nodeTypes}
							fitView
						>
							<Controls />
							<MiniMap
								style={{
									background:
										theme === "dark" ? "#333" : "#fff",
								}}
								zoomable
								pannable
							/>
						</ReactFlow>
					</div>
				</ResizablePanel>
				<ResizableHandle withHandle={true} />
				<ResizablePanel defaultSize={20} minSize={20}>
					<StepRunSidebar />
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
};

const Workflow: React.FC<WorkflowProps> = (props) => {
	return (
		<ReactFlowProvider>
			<WorkflowInner {...props} />
		</ReactFlowProvider>
	);
};

export default Workflow;

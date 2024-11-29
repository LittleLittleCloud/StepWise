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
import { useWorkflowStore } from "@/hooks/useWorkflow";

export type WorkflowLayout = {
	stepPositions: { [key: string]: { x: number; y: number } };
	stepSizes: { [key: string]: { width: number; height: number } | undefined };
	viewPort: Viewport;
};
export type WorkflowData = WorkflowDTO &
	WorkflowLayout &
	StepRunSidebarProps & {
		maxParallelRun?: number;
		maxSteps?: number;
		selectedCheckpoint?: string;
	};

export interface WorkflowProps {
	setMaxParallelRun?: (maxParallelRun: number) => void;
	setMaxStep?: (maxStep: number) => void;
}

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
	const selectedWorkflow = useWorkflowStore(
		(state) => state.selectedWorkflow,
	);
	const onWorkflowChange = useWorkflowStore((state) => state.updateWorkflow);
	const [maxStep, setMaxStep] = useState<number>(
		selectedWorkflow?.maxSteps ?? 5,
	);
	const [maxParallelRun, setMaxParallelRun] = useState<number>(
		selectedWorkflow?.maxParallelRun ?? 3,
	);
	const { fitView, getViewport, setViewport } = useReactFlow();
	useOnViewportChange({
		onEnd: (viewport) => {
			setWorkflow((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					transform: [viewport.x, viewport.y],
					zoom: viewport.zoom,
				};
			});
		},
	});
	const { theme } = useTheme();
	const [workflow, setWorkflow] = useState<WorkflowData | undefined>(
		undefined,
	);
	const [completedRunSteps, setCompletedRunSteps] = useState<StepRunDTO[]>(
		() => selectedWorkflow?.stepRuns ?? [],
	);
	const [isRunning, setIsRunning] = useState<boolean>(false);

	useEffect(() => {
		if (!selectedWorkflow) return;
		var latestSnapshot = createLatestStepRunSnapShotFromWorkflow(
			selectedWorkflow,
			selectedWorkflow.stepRuns ?? [],
		);
		setWorkflow({ ...selectedWorkflow, stepRuns: latestSnapshot });
		if (selectedWorkflow.viewPort) {
			setViewport(selectedWorkflow.viewPort);
		}
		setIsRunning(false);
	}, [selectedWorkflow]);

	const nodeTypes = useMemo(
		() => ({
			stepNode: StepNode,
		}),
		[],
	);

	useEffect(() => {
		if (workflow?.maxParallelRun) {
			setMaxParallelRun(workflow.maxParallelRun);
		}
	}, [workflow?.maxParallelRun]);

	useEffect(() => {
		if (selectedWorkflow?.maxSteps) {
			setMaxStep(selectedWorkflow.maxSteps);
		}
	}, [selectedWorkflow?.maxSteps]);

	const createGraphFromWorkflow = (
		workflow: WorkflowData,
		isWorkflowRunning: boolean,
	) => {
		var completedRunSteps = workflow.stepRuns ?? [];
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
						setWorkflow((prev) => {
							if (!prev) return prev;
							var updatedRunSteps = clearStepRunResult(
								prev,
								step,
								completedRunSteps,
							);

							return { ...prev, stepRuns: updatedRunSteps };
						});
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
							step,
							workflow.maxParallelRun,
							workflow.maxSteps,
						);
					},
					onSubmitOutput: (output: VariableDTO) => {
						setWorkflow((prev) => {
							if (!prev) return prev;

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

							return { ...prev, stepRuns: completedRun };
						});
					},
					onCancelInput: () => {
						var stepRuns = workflow.stepRuns.map((run) => {
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
						console.log("Updated workflow: ", updatedWorkflow);
						setWorkflow(updatedWorkflow);
					},
					onResize: (height, width) => {
						setWorkflow((prev) => {
							if (!prev) return prev;
							return {
								...prev,
								stepSizes: {
									...prev.stepSizes,
									[step.name]:
										height && width
											? { height, width }
											: undefined,
								},
							};
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
			setWorkflow((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					viewPort: viewport,
				};
			});
		},
		onEnd: (viewport) => {
			console.log("Viewport changed: ", viewport);
			setWorkflow((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					viewPort: viewport,
				};
			});
		},
	});

	useEffect(() => {
		if (!workflow) return;
		setCompletedRunSteps(workflow.stepRuns ?? []);
		var graph = createGraphFromWorkflow(workflow, isRunning);
		setNodes(graph.nodes);
		setEdges(graph.edges);
		onWorkflowChange?.(workflow);
	}, [workflow, fitView, maxParallelRun, maxStep, isRunning]);

	const onStepNodeRunClick = async (
		workflow: WorkflowData,
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
			var existingRunSteps = [...workflow.stepRuns];
			var es = new EventSource(
				`${client.getConfig().baseUrl}/api/v1/StepWiseControllerV1/ExecuteStepSse`,
			);
			es.addEventListener("StepRunDTO", async (event) => {
				var data = JSON.parse(event.data) as StepRunDTO;
				existingRunSteps.push(data);
				var latestSnapshot = createLatestStepRunSnapShotFromWorkflow(
					workflow,
					existingRunSteps,
				);
				setWorkflow((prev) => {
					if (!prev) return prev;
					return { ...prev, stepRuns: latestSnapshot };
				});
			});

			es.onopen = (_) => {
				console.log("Connection opened");
			};

			es.onerror = (event) => {
				console.log("Error", event);
			};

			var graph = createGraphFromWorkflow(workflow, false);
			var variables = graph.nodes
				.filter((node) => node.data.result !== undefined)
				.map((node) => node.data.result!);
			var res = await postApiV1StepWiseControllerV1ExecuteStep({
				query: {
					step: step?.name ?? undefined,
					workflow: workflow?.name,
					maxParallel: maxParallelRun,
					maxSteps: maxSteps,
				},
				body: [...variables],
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

		var updateStepRuns = [...workflow.stepRuns, ...res.data];
		var latestSnapshot = createLatestStepRunSnapShotFromWorkflow(
			workflow,
			updateStepRuns,
		);
		setWorkflow((prev) => {
			if (!prev) return prev;
			return { ...prev, stepRuns: latestSnapshot };
		});

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
						if (stepName && workflow) {
							var updatedWorkflow = {
								...workflow,
								stepPositions: {
									...workflow.stepPositions,
									[stepName]: newPosition,
								},
							} as WorkflowData;
							setWorkflow(updatedWorkflow);
						}
					}
				}
			}

			onNodesChange(allowedChanges);
		},
		[onNodesChange, nodes, isRunning, workflow],
	);

	const onLayout = useCallback(() => {
		const { nodes: layoutedNodes, edges: layoutedEdges } =
			getLayoutedElements(nodes, edges);
		setNodes([...layoutedNodes]);
		setEdges([...layoutedEdges]);
		window.requestAnimationFrame(() => {
			fitView();
		});

		setWorkflow((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				stepPositions: layoutedNodes.reduce(
					(acc, node) => {
						acc[node.id] = {
							x: node.position.x,
							y: node.position.y,
						};
						return acc;
					},
					{} as { [key: string]: { x: number; y: number } },
				),
			};
		});
	}, [nodes, edges, setNodes, setEdges, fitView, getViewport]);

	const onMaxStepsChange = (maxSteps: number) => {
		setMaxStep(maxSteps);
		props.setMaxStep?.(maxSteps);
	};

	const onMaxParallelChange = (maxParallelRun: number) => {
		setMaxParallelRun(maxParallelRun);
		props.setMaxParallelRun?.(maxParallelRun);
	};

	return (
		<div className="w-full h-full bg-accent/10 items-center justify-center flex">
			<ResizablePanelGroup
				direction="horizontal"
				className="w-full h-screen flex"
			>
				<ResizablePanel>
					<div className="flex flex-col items-center gap-8 h-screen">
						<div className="z-10 absolute top-0">
							<ControlBar
								isRunning={isRunning}
								maxParallel={maxParallelRun}
								workflow={workflow!}
								maxSteps={maxStep}
								onMaxParallelChange={onMaxParallelChange}
								onMaxStepsChange={onMaxStepsChange}
								onResetStepRunResultClick={() => {
									setCompletedRunSteps([]);
									var updatedWorkflow = {
										...workflow,
										stepRuns: [],
									} as WorkflowData;
									setWorkflow(updatedWorkflow);
									toast("Reset workflow", {
										description:
											"All step runs have been reset",
									});
								}}
								onAutoLayoutClick={onLayout}
								onRunClick={() => {
									onStepNodeRunClick(
										workflow!,
										undefined,
										maxParallelRun,
										maxStep,
									);
								}}
								onSaveCheckpoint={async (checkpoint) => {
									// yyyy-MM-dd-HH-mm-ss
									console.log(
										"Saving checkpoint: ",
										checkpoint.name,
									);

									var res =
										await postApiV1StepWiseControllerV1SaveCheckpoint(
											{
												query: {
													checkpointName:
														checkpoint.name,
													workflow: workflow?.name,
												},
												body: completedRunSteps,
											} as PostApiV1StepWiseControllerV1SaveCheckpointData,
										);

									if (res.error) {
										throw new Error(
											"Failed to save checkpoint: " +
												res.error,
										);
									}
								}}
								onCheckpointSelect={async (checkpoint) => {
									console.log(
										"Selecting checkpoint: ",
										checkpoint,
									);
									if (workflow === undefined) return;
									var response =
										await getApiV1StepWiseControllerV1LoadCheckpoint(
											{
												query: {
													checkpointName:
														checkpoint.name,
													workflow: workflow?.name,
												},
											},
										);

									if (response.error) {
										console.error(
											"Failed to load checkpoint: ",
											response.error,
										);
										return;
									}

									if (response.data === undefined) {
										console.error(
											"No data returned from loading checkpoint",
										);
										return;
									}

									setWorkflow({
										...workflow,
										stepRuns: response.data,
										selectedCheckpoint: checkpoint.name,
									});
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
							{/* <Background color="#aaa" gap={16} variant={BackgroundVariant.Lines} /> */}
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
					<StepRunSidebar stepRuns={completedRunSteps} />
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

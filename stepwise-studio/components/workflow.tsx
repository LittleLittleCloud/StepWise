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
import { Toaster } from "./ui/sonner";

export type WorkflowLayout = {
	stepPositions: { [key: string]: { x: number; y: number } };
	stepSizes: { [key: string]: { width: number; height: number } | undefined };
	viewPort: Viewport;
};
export type WorkflowData = WorkflowDTO & WorkflowLayout & StepRunSidebarProps;

export interface WorkflowProps {}

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
		createLatestStepRunSnapShotFromRunHistory,
		resetStepRunResult,
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
		var completedRunSteps = createLatestStepRunSnapShotFromRunHistory(
			workflow,
			stepRunHistory,
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
						var updatedRunSteps = resetStepRunResult(
							selectedWorkflow,
							step,
							stepRunHistory,
						);
						setSelectedStepRunHistory(updatedRunSteps);
					},
					onRerunClick: (step: StepDTO) => {
						throw new Error("Not implemented yet");
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
							...stepRunHistory,
							completedStepRun,
							variable,
						];

						setSelectedStepRunHistory(completedRun);
					},
					onCancelInput: () => {
						console.log("Cancel input");
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
		console.log("Setting nodes and edges", graph);
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
				setSelectedStepRunHistory([...existingRunSteps]);

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

		setSelectedStepRunHistory(updateStepRuns);
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
				<ResizablePanel defaultSize={30} minSize={30}>
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

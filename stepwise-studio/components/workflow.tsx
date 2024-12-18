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
import { useTheme } from "next-themes";
import { ControlBar } from "./control-bar";
import { getLayoutedElements } from "@/lib/utils";
import StepRunSidebar, { StepRunSidebarProps } from "./step-run-sidebar";
import { toast } from "sonner";
import { useWorkflow } from "@/hooks/useWorkflow";
import { useAccessToken, useAccessTokenStore } from "@/hooks/useAccessToken";
import { v4 as uuidv4 } from "uuid";
import { useRunSettingsStore } from "@/hooks/useVersion";
import { useStepRunHistoryStore } from "@/hooks/useStepRunHistory";
import { useWorkflowEngine } from "@/hooks/useWorkflowEngine";

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
	const { fitView, getViewport, setViewport } = useReactFlow();
	const { maxSteps, maxParallel } = useRunSettingsStore();
	const { theme } = useTheme();
	const {
		selectedStepRunHistory,
		setSelectedStepRunHistory,
		createLatestStepRunSnapShotFromRunHistory,
		resetStepRunResult,
	} = useStepRunHistoryStore();
	const isRunning = useWorkflowEngine((state) => state.isRunning);
	const executeStep = useWorkflowEngine((state) => state.executeStep);
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
			const stepNodeID = `${workflow.name}-${step.name}`;
			var position = workflow.stepPositions[stepNodeID];
			var size = workflow.stepSizes[stepNodeID];
			return {
				id: `${workflow.name}-${step.name}`,
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
						if (!selectedWorkflow) return;
						executeStep(step, undefined, undefined, 1);
					},
					onSubmitOutput: async (output: VariableDTO) => {
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
						var notReadyStepRun = {
							...stepRun,
							status: "NotReady",
						} as StepRunDTO;

						setSelectedStepRunHistory([
							...stepRunHistory,
							notReadyStepRun,
						]);
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
							id: `${workflow.name}-${step.name}-${param.variable_name}`,
							target: `${workflow.name}-${step.name}`,
							source: `${workflow.name}-${param.variable_name}`,
							sourceHandle: `${workflow.name}-${param.variable_name}`,
							targetHandle: `${workflow.name}-${step.name}-${param.variable_name}`,
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
		console.log("Workflow updated", selectedWorkflow);
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
						const stepNodeID = `${selectedWorkflow?.name}-${stepName}`;
						if (stepName && selectedWorkflow) {
							var updatedWorkflow = {
								...selectedWorkflow,
								stepPositions: {
									...selectedWorkflow.stepPositions,
									[stepNodeID]: newPosition,
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
		if (!selectedWorkflow) return;
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
		setSelectedWorkflow({
			...selectedWorkflow,
			stepPositions: stepPositions,
		});
	}, [nodes, edges, setNodes, setEdges, fitView]);

	return (
		<div className="flex flex-col items-center h-screen">
			<div className="flex items-center m-2 gap-5">
				<ControlBar
					isRunning={isRunning}
					onResetStepRunResultClick={() => {
						setSelectedStepRunHistory([]);
						toast("Reset workflow", {
							description: "All step runs have been reset",
						});
					}}
					onAutoLayoutClick={onLayout}
					onRunClick={() => {
						executeStep();
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
						background: theme === "dark" ? "#333" : "#fff",
					}}
					zoomable
					pannable
				/>
			</ReactFlow>
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

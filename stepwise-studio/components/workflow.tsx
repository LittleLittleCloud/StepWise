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
	layoutInitialized: boolean;
};
export type WorkflowData = WorkflowDTO & WorkflowLayout & StepRunSidebarProps;

export interface WorkflowProps {}

const WorkflowInner: React.FC<WorkflowProps> = (props) => {
	const [nodes, setNodes, onNodesChange] = useNodesState<StepNodeProps>([]);
	const [edges, setEdges, _] = useEdgesState([]);
	const { selectedWorkflow, updateWorkflow, setSelectedWorkflow } =
		useWorkflow();
	const { fitView, getViewport, setViewport } = useReactFlow();
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
				id: stepNodeID,
				type: "stepNode",
				position: position,
				style: {
					width: size?.width ?? "auto",
					height: size?.height ?? "auto",
				},
				data: stepRun,
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

		var graph = createGraphFromWorkflow(
			selectedWorkflow,
			selectedStepRunHistory,
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
			layoutInitialized: true,
			stepPositions: stepPositions,
			viewPort: getViewport(),
		});
	}, [selectedWorkflow, nodes, edges, fitView]);

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

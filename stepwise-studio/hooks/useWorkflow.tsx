import { WorkflowData } from "@/components/workflow";
import { getLayoutedElements } from "@/lib/utils";
import {
	getApiV1StepWiseControllerV1ListWorkflow,
	StepDTO,
	StepRunDTO,
} from "@/stepwise-client";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { Edge, Node } from "reactflow";
import { create } from "zustand";
import { useAccessToken } from "./useAccessToken";
import { toast } from "sonner";

export interface WorkflowsState{
	workflows: WorkflowData[];
	fetchWorkflows: (token: string | undefined) => Promise<WorkflowData[]>;
	updateWorkflow: (workflow: WorkflowData) => void;
}

interface WorkflowState {
	selectedWorkflow: WorkflowData | undefined;
	setSelectedWorkflow: (
		workflow:
			| WorkflowData
			| ((prev: WorkflowData | undefined) => WorkflowData),
	) => void;
}

export const useWorkflowsStore = create<WorkflowsState>((set, get) => ({
	workflows: [],
	updateWorkflow: (workflow) => {
		set((state) => {
			const workflows = state.workflows.map((w) => {
				if (w.name === workflow.name) {
					return workflow;
				}
				return w;
			});
			return { workflows };
		});
	},
	fetchWorkflows: async (token) => {
		return getApiV1StepWiseControllerV1ListWorkflow({
			headers: {
				Authorization: token ? `Bearer ${token}` : undefined,
			},
		})
			.then((res) => {
				var workflows: WorkflowData[] = [];

				for (const workflow of res.data ?? []) {
					var nodes = workflow.steps?.map((step: StepDTO) => ({
						id: `${workflow.name}-${step.name}`,
						width: 256,
						height: 128,
						position: { x: 0, y: 0 },
					})) as Node[];

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
										animated: !isStepDependency,
									} as Edge;
								}) ?? [];

							return edges.concat([...variableEdges]);
						}, [] as Edge[]) ?? [];
					var layout = getLayoutedElements(nodes, edges);

					workflows.push({
						...workflow,
						stepSizes: layout.nodes.reduce(
							(acc, node) => {
								acc[node.id] = undefined;
								return acc;
							},
							{} as {
								[key: string]:
									| {
											width: number;
											height: number;
									  }
									| undefined;
							},
						),
						stepPositions: layout.nodes.reduce(
							(acc, node) => {
								acc[node.id] = {
									x: node.position.x,
									y: node.position.y,
								};
								return acc;
							},
							{} as { [key: string]: { x: number; y: number } },
						),
						layoutInitialized: false,
					} as WorkflowData);
				}
				var maps = new Map<string, StepRunDTO[]>();
				res.data?.forEach((workflow) => {
					if (workflow.name === null || workflow.name === undefined) {
						return;
					}
					maps.set(workflow.name, []);
				});
				set({
					workflows: workflows,
				});

				return workflows;
			})
			.catch((err) => {
				toast.error("Error getting workflows: " + JSON.stringify(err));
				return [];
			});
	},
}));

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
	selectedWorkflow: undefined,
	setSelectedWorkflow: (workflow) =>
		set((state) => {
			var selectedWorkflow =
				typeof workflow === "function"
					? workflow(get().selectedWorkflow)
					: workflow;

			useWorkflowsStore.getState().updateWorkflow(selectedWorkflow);
			return { selectedWorkflow };
		}),
	
}));

export const useWorkflow = () => {
	const workflows = useWorkflowsStore((state) => state.workflows);
	const selectedWorkflow = useWorkflowStore(
		(state) => state.selectedWorkflow,
	);
	const setSelectedWorkflow = useWorkflowStore(
		(state) => state.setSelectedWorkflow,
	);
	const updateWorkflow = useWorkflowsStore((state) => state.updateWorkflow);
	const fetchWorkflows = useWorkflowsStore((state) => state.fetchWorkflows);
	const accessToken = useAccessToken();

	useEffect(() => {
		const fetchData = async () => {
			var workflows = await fetchWorkflows(accessToken);
			if (workflows.length > 0)
			{
				setSelectedWorkflow(workflows[0]);
			}
		};

		fetchData();
	}, [accessToken]);

	return {
		workflows,
		selectedWorkflow,
		setSelectedWorkflow,
		updateWorkflow,
	};
};

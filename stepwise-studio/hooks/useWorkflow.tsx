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
import { useStepwiseServerConfiguration } from "./useVersion";
import { useAccessToken } from "./useAccessToken";

interface WorkflowState {
	workflows: WorkflowData[];
	selectedWorkflow: WorkflowData | undefined;
	updateWorkflow: (workflow: WorkflowData) => void;
	setWorkflows: (workflows: WorkflowData[]) => void;
	setSelectedWorkflow: (
		workflow:
			| WorkflowData
			| ((prev: WorkflowData | undefined) => WorkflowData),
	) => void;
	fetchWorkflows: (token: string | undefined) => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
	workflows: [],
	selectedWorkflow: undefined,
	setWorkflows: (workflows) => set({ workflows }),
	setSelectedWorkflow: (workflow) =>
		set((state) => {
			var selectedWorkflow =
				typeof workflow === "function"
					? workflow(get().selectedWorkflow)
					: workflow;

			state.updateWorkflow(selectedWorkflow);
			return { selectedWorkflow };
		}),
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
		console.log("Fetching workflows");
		getApiV1StepWiseControllerV1ListWorkflow({
			headers: {
				Authorization: token ? `Bearer ${token}` : undefined,
			},
		})
			.then((res) => {
				var workflows: WorkflowData[] = [];

				for (const workflow of res.data ?? []) {
					var nodes = workflow.steps?.map((step: StepDTO) => ({
						id: step.name,
						width: 200,
						height: 200,
						position: { x: 0, y: 0 },
					})) as Node[];

					var edges =
						workflow.steps?.reduce((edges, step) => {
							return edges.concat(
								step.dependencies?.map((dep) => {
									return {
										id: `${step.name}-${dep}`,
										source: dep,
										target: step.name,
										sourceHandle: dep,
										targetHandle: step.name + "-" + dep,
										style: { stroke: "#555" },
										animated: true,
									} as Edge;
								}) ?? [],
							);
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
					selectedWorkflow: get().selectedWorkflow ?? workflows[0],
					workflows: workflows,
				});
			})
			.catch((err) => {
				console.error("Error getting workflows: ", err);
			});
	},
}));

export const useWorkflow = () => {
	const workflows = useWorkflowStore((state) => state.workflows);
	const selectedWorkflow = useWorkflowStore(
		(state) => state.selectedWorkflow,
	);
	const setSelectedWorkflow = useWorkflowStore(
		(state) => state.setSelectedWorkflow,
	);
	const updateWorkflow = useWorkflowStore((state) => state.updateWorkflow);
	const setWorkflows = useWorkflowStore((state) => state.setWorkflows);
	const fetchWorkflows = useWorkflowStore((state) => state.fetchWorkflows);
	const accessToken = useAccessToken();

	useEffect(() => {
		const fetchData = async () => {
			await fetchWorkflows(accessToken);
			setWorkflows(workflows);
		};

		fetchData();
	}, [accessToken]);

	return {
		workflows,
		selectedWorkflow,
		setSelectedWorkflow,
		updateWorkflow,
		setWorkflows,
	};
};

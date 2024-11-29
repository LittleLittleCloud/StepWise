import { WorkflowData } from "@/components/workflow";
import { getLayoutedElements } from "@/lib/utils";
import {
	getApiV1StepWiseControllerV1ListWorkflow,
	StepDTO,
	StepRunDTO,
} from "@/stepwise-client";
import { Edge, Node } from "reactflow";
import { create } from "zustand";

export interface WorkflowState {
	workflows: WorkflowData[];
	selectedWorkflow: WorkflowData | undefined;
	updateWorkflow: (workflow: WorkflowData) => void;
	setWorkflows: (workflows: WorkflowData[]) => void;
	setSelectedWorkflow: (workflow: WorkflowData | undefined) => void;
	fetchWorkflows: () => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
	workflows: [],
	selectedWorkflow: undefined,
	setWorkflows: (workflows) => set({ workflows }),
	setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),
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
	fetchWorkflows: async () => {
		console.log("Fetching workflows");
		getApiV1StepWiseControllerV1ListWorkflow()
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
						stepRuns: [] as StepRunDTO[],
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
					selectedWorkflow: workflows[0] ?? undefined,
					workflows: workflows,
				});
			})
			.catch((err) => {
				console.error("Error getting workflows: ", err);
			});
	},
}));

import { client, postApiV1StepWiseControllerV1ExecuteStep, StepDTO, StepRunDTO, VariableDTO, WorkflowDTO } from '@/stepwise-client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    NodeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import StepNode, { StepNodeProps } from './step-node';
import dagre from 'dagre';
import { Button } from './ui/button';
import { LayoutGrid } from 'lucide-react';
import { useTheme } from 'next-themes';
import { ControlBar } from './control-bar';
import { getLayoutedElements } from '@/lib/utils';
import StepRunSidebar, { StepRunSidebarProps } from './step-run-sidebar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './ui/resizable';

export type WorkflowLayout = {
    stepPositions: { [key: string]: { x: number; y: number } };
    stepSizes: { [key: string]: { width: number; height: number } };
};
export type WorkflowData = WorkflowDTO & WorkflowLayout & StepRunSidebarProps & {
    maxParallelRun?: number;
    maxSteps?: number;
};

export interface WorkflowProps {
    dto: WorkflowData | undefined;
    onWorkflowChange?: (workflow: WorkflowData) => void;
    setMaxParallelRun?: (maxParallelRun: number) => void;
    setMaxStep?: (maxStep: number) => void;
}



const WorkflowInner: React.FC<WorkflowProps> = (props) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<StepNodeProps>([]);
    const [edges, setEdges, _] = useEdgesState([]);
    const [maxStep, setMaxStep] = useState<number>(props.dto?.maxSteps ?? 1);
    const [maxParallelRun, setMaxParallelRun] = useState<number>(props.dto?.maxParallelRun ?? 10);
    const { fitView } = useReactFlow();
    const { theme } = useTheme();
    const [workflow, setWorkflow] = useState<WorkflowData | undefined>(undefined);
    const [completedRunSteps, setCompletedRunSteps] = useState<StepRunDTO[]>(() => props.dto?.stepRuns ?? []);

    useEffect(() => {
        if (!props.dto) return;
        setWorkflow(props.dto);
        var graph = createGraphFromWorkflow(props.dto!);
        console.log("Graph: ", graph);
        setNodes(graph.nodes);
        setEdges(graph.edges);
        setCompletedRunSteps(props.dto?.stepRuns ?? []);
    }, [props.dto]);

    const nodeTypes = useMemo(() => ({
        stepNode: StepNode,
    }), []);

    useEffect(() => {
        if (workflow?.maxParallelRun) {
            setMaxParallelRun(workflow.maxParallelRun);
        }
    }, [workflow?.maxParallelRun]);

    useEffect(() => {
        if (props.dto?.maxSteps) {
            setMaxStep(props.dto.maxSteps);
        }
    }, [props.dto?.maxSteps]);

    const createGraphFromWorkflow = (workflow: WorkflowData) => {
        var completedRunSteps = workflow.stepRuns ?? [];
        var variables = completedRunSteps.filter((run) => run.status === 'Variable').map((run) => run.result!);
        var stepRun = completedRunSteps.filter((run) => run.status !== 'Variable');

        // create latest variables, which only keeps the most recent version for variable in variables which have the same name
        var latestVariables = variables.reduce((acc, variable) => {
            acc[variable.name] = variable;
            return acc;
        }, {} as { [key: string]: VariableDTO });

        var latestRunSteps = stepRun.reduce((acc, run) => {
            acc[run.step?.name ?? ''] = run;
            return acc;
        }, {} as { [key: string]: StepRunDTO });

        var steps = workflow.steps;

        var nodes = steps?.map((step) => {
            var position = workflow.stepPositions[step.name];
            var size = workflow.stepSizes[step.name];
            var stepRun: StepRunDTO = latestRunSteps[step.name] ?? { status: "NotReady", step: step, generation: 0 } as StepRunDTO;

            // if status is not ready, update variables with the latest variables
            if (stepRun.status === 'NotReady') {
                stepRun.variables = step.parameters?.map((param) => {
                    var variable = latestVariables[param.variable_name];
                    return variable;
                }).filter((variable) => variable !== undefined) as VariableDTO[];
            }

            return {
                id: step.name,
                type: 'stepNode',
                position: position,
                ...size,
                data: {
                    ...stepRun,
                    result: stepRun.status === 'Completed' ? latestVariables[step.name] : undefined,
                    onRunClick: (step: StepDTO) => onStepNodeRunClick(workflow, completedRunSteps, step, workflow.maxParallelRun, workflow.maxSteps),
                    onSubmitOutput: (output: VariableDTO) => {
                        var variable = {
                            status: 'Variable',
                            result: output,
                            generation: stepRun.generation + 1,
                        } as StepRunDTO;
                        var completedRun = [...completedRunSteps, variable];
                        setCompletedRunSteps((prev) => [...prev, variable]);

                        var updatedWorkflow = { ...workflow, stepRuns: completedRun } as WorkflowData;
                        setWorkflow(updatedWorkflow);

                        var updatedNodes = createGraphFromWorkflow(updatedWorkflow).nodes;
                        setNodes(updatedNodes);
                    },
                },
            } as Node<StepNodeProps>;
        });

        var edges = workflow.steps?.reduce((edges, step) => {
            return edges.concat(step.dependencies?.map((dep) => {
                return {
                    id: `${step.name}-${dep}`,
                    source: dep,
                    target: step.name,
                    sourceHandle: dep,
                    targetHandle: step.name + '-' + dep,
                    style: { stroke: '#555' },
                    animated: true,
                } as Edge;
            }) ?? []);
        }, [] as Edge[]) ?? [];

        return { nodes, edges };
    }

    useEffect(() => {
        if (!workflow) return;
        props.onWorkflowChange?.(workflow);
    }, [workflow, fitView, maxParallelRun, maxStep]);

    const onStepNodeRunClick = async (
        workflow: WorkflowData,
        completedRunSteps: StepRunDTO[],
        step?: StepDTO,
        maxParallelRun?: number,
        maxSteps?: number,
    ) => {
        console.log("Run step: ", step);
        if (!workflow.name) return;
        try {
            setCompletedRunSteps(completedRunSteps);
            var clonedRunSteps = [...completedRunSteps];
            var es = new EventSource(`${client.getConfig().baseUrl}/api/v1/StepWiseControllerV1/ExecuteStepSse`);
            es.addEventListener("StepRunDTO", async (event) => {
                var data = JSON.parse(event.data) as StepRunDTO;
                console.log("Received step run data: ", data);
                clonedRunSteps.push(data);
                workflow.stepRuns = clonedRunSteps;
                setCompletedRunSteps(clonedRunSteps);
                setWorkflow(workflow);
                var graph = createGraphFromWorkflow(workflow);
                setNodes(graph.nodes);
            });

            es.onopen = (_) => {
                console.log("Connection opened");
            }

            es.onerror = (event) => {
                console.log("Error", event);
            }
            
            var variables = completedRunSteps.filter((run) => run.status === 'Variable').map((run) => run.result!);
            var res = await postApiV1StepWiseControllerV1ExecuteStep(
                {
                    query: {
                        step: step?.name ?? undefined,
                        workflow: workflow?.name,
                        maxParallel: maxParallelRun,
                        maxSteps: maxSteps,
                    },
                    body: [...variables],
                }
            )

            es.close();
        }
        catch (err) {
            console.error("Error executing step: ", err);
            return;
        }

        if (res.error) {
            console.error("Error executing step: ", res.error);
            return;
        }

        if (res.data === undefined) {
            console.error("No data returned from executing step");
            return;
        }
        var updateStepRuns = [...completedRunSteps, ...res.data];

        // for every step in the workflow
        // if the last status is running or queue, set it to not ready
        for (const step of workflow.steps ?? []) {
            var lastStep = updateStepRuns.findLast((run) => run.step?.name === step.name);
            if (!lastStep) {
                continue;
            }

            var lastStatus = lastStep.status;
            if (lastStatus === 'Running' || lastStatus === 'Queue') {
                updateStepRuns.push({
                    status: 'NotReady',
                    step: step,
                    generation: lastStep.generation + 1,
                } as StepRunDTO);
            }
        }

        setCompletedRunSteps(updateStepRuns);
        var updatedWorkfow = { ...workflow, stepRuns: updateStepRuns };
        setWorkflow(updatedWorkfow);

        var graph = createGraphFromWorkflow(updatedWorkfow);
        setNodes(graph.nodes);
    }

    const onNodesChangeRestricted = useCallback((changes: NodeChange[]) => {
        // Only allow position changes (dragging)
        const allowedChanges = changes.filter(
            change => change.type === 'position' || change.type === 'select' || change.type === 'reset' || change.type === 'dimensions'
        );
        for (const change of allowedChanges) {
            if (change.type === 'position' && change.position) {
                // update the position of the node in workflow
                const node = nodes.find(n => n.id === change.id);
                if (node) {
                    const newPosition = change.position;
                    const stepName = node.data.step?.name;
                    if (stepName && workflow) {
                        var updatedWorkflow = { ...workflow, stepPositions: { ...workflow.stepPositions, [stepName]: newPosition } } as WorkflowData;
                        setWorkflow(updatedWorkflow);

                        var updatedNodes = createGraphFromWorkflow(updatedWorkflow).nodes;
                        setNodes(updatedNodes);
                    }
                }
            }
        }

        onNodesChange(allowedChanges);
    }, [onNodesChange, nodes]);

    const onLayout = useCallback(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            nodes,
            edges
        );
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
        window.requestAnimationFrame(() => {
            fitView();
        });

        setWorkflow(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                stepPositions: layoutedNodes.reduce((acc, node) => {
                    acc[node.id] = { x: node.position.x, y: node.position.y };
                    return acc;
                }, {} as { [key: string]: { x: number; y: number } }),
            };
        });
    }, [nodes, edges, setNodes, setEdges, fitView]);

    const onMaxStepsChange = (maxSteps: number) => {
        setMaxStep(maxSteps);
        props.setMaxStep?.(maxSteps);
    };

    const onMaxParallelChange = (maxParallelRun: number) => {
        setMaxParallelRun(maxParallelRun);
        props.setMaxParallelRun?.(maxParallelRun);
    };

    const minimapStyle = {
        height: 60,
        width: 100,
        background: theme === 'light' ? '#777' : '#111',
    };

    return (
        <div
            className='w-full h-full bg-accent/10 items-center justify-center flex'
        >

            <ResizablePanelGroup
                direction='horizontal'
                className='w-full h-screen flex'
            >
                <ResizablePanel>
                    <div className="flex flex-col items-center gap-8 h-screen">
                        <div className="z-10 absolute top-0">
                            <ControlBar
                                maxParallel={maxParallelRun}
                                maxSteps={maxStep}
                                onMaxParallelChange={onMaxParallelChange}
                                onMaxStepsChange={onMaxStepsChange}
                                onResetStepRunResultClick={() => {
                                    setCompletedRunSteps([]);
                                    var updatedWorkflow = { ...workflow, stepRuns: [] } as WorkflowData;
                                    setWorkflow(updatedWorkflow);
                                    var updatedNodes = createGraphFromWorkflow(updatedWorkflow).nodes;
                                    setNodes(updatedNodes);
                                }}
                                onAutoLayoutClick={onLayout}
                                onRunClick={() => {
                                    var stepRunsToKeep : StepRunDTO[] = []
                                    for (const stepRun of completedRunSteps.reverse())
                                    {
                                        if (stepRun.status === 'Variable' && stepRunsToKeep.findIndex(x => x.result?.name === stepRun.result?.name && x.status === 'Variable') === -1)
                                        {
                                            stepRunsToKeep.push(stepRun);
                                        }
                                        else if (stepRun.status === 'Completed' && stepRunsToKeep.findIndex(x => x.step?.name === stepRun.step?.name && x.status === 'Completed') === -1)
                                        {
                                            stepRunsToKeep.push(stepRun);
                                        }
                                    }

                                    stepRunsToKeep.reverse();
                                    onStepNodeRunClick(workflow!, stepRunsToKeep, undefined, maxParallelRun, maxStep);
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
                            <MiniMap style={minimapStyle} zoomable pannable />

                        </ReactFlow>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle={true} />
                <ResizablePanel
                    defaultSize={20}
                    minSize={20}
                >
                    <StepRunSidebar
                        stepRuns={completedRunSteps}
                    />
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
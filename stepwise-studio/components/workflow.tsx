import { client, postApiV1StepWiseControllerV1ExecuteStep, StepDTO, StepRunDTO, WorkflowDTO } from '@/stepwise-client';
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
    const [workflow, setWorkflow] = useState<WorkflowData | undefined>(() => props.dto);
    const [completedRunSteps, setCompletedRunSteps] = useState<StepRunDTO[]>(() => props.dto?.stepRuns ?? []);

    useEffect(() => {
        setWorkflow(props.dto);
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

    useEffect(() => {
        // when stepRun changes, update the status of the step node
        // using the last stepRun status
        var updatedNodes = nodes.map(node => {
            var latestCompletedRun = completedRunSteps.findLast((run) => run.step?.name === node.id);
            var lastStatus = latestCompletedRun?.status ?? 'NotReady';
            return {
                ...node,
                data: {
                    ...node.data,
                    status: lastStatus,
                },
            } as Node<StepNodeProps>;
        });
        setNodes(updatedNodes);
    }, [completedRunSteps]);

    useEffect(() => {
        if (!workflow) return;
        var newNodes = workflow.steps?.map((step) => {
            var stepPosition = workflow.stepPositions[step.name!];
            var stepSize = workflow.stepSizes[step.name!];
            var existingNode = nodes.find(n => n.id === step.name);
            console.log("Existing node: ", existingNode);
            return {
                ...existingNode,
                ...stepSize,
                id: step.name,
                type: 'stepNode',
                position: stepPosition,
                data: {
                    status: existingNode?.data.status ?? 'NotReady',
                    data: step,
                    onRunClick: (step: StepDTO) => onStepNodeRunClick(workflow, step, maxParallelRun, maxStep),
                    // status: lastStatus ?? 'NotReady',
                } as StepNodeProps,
            };
        }) as Node<StepNodeProps>[];

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

        setNodes(newNodes);
        setEdges(edges);

        props.onWorkflowChange?.(workflow);
    }, [workflow, fitView, maxParallelRun, maxStep]);

    const onStepNodeRunClick = async (workflow: WorkflowDTO, step?: StepDTO, maxParallelRun?: number, maxSteps?: number) => {
        console.log("Run step: ", step);
        if (!workflow.name) return;
        try {
            var es = new EventSource(`${client.getConfig().baseUrl}/api/v1/StepWiseControllerV1/ExecuteStepSse`);
            es.addEventListener("StepRunDTO", async (event) => {
                var data = JSON.parse(event.data) as StepRunDTO;
                console.log("Received step run data: ", data);
                setCompletedRunSteps(prev => [...prev, data]);
            });

            es.onopen = (_) => {
                console.log("Connection opened");
            }

            es.onerror = (event) => {
                console.log("Error", event);
            }

            var res = await postApiV1StepWiseControllerV1ExecuteStep(
                {
                    query: {
                        step: step?.name ?? undefined,
                        workflow: workflow?.name,
                        maxParallel: maxParallelRun,
                        maxSteps: maxSteps,
                    }
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
        setCompletedRunSteps(updateStepRuns);

        var updatedWorkfow = {
            ...workflow,
            stepRuns: updateStepRuns,
        } as WorkflowData;
        setWorkflow(updatedWorkfow);

        setNodes((prev) => {
            return prev.map(node => {
                var status = node.data.status;
                if (node.data.status === 'Running' || node.data.status === 'Queue') {
                    status = 'NotReady';
                }

                return {
                    ...node,
                    data: {
                        ...node.data,
                        status: status,
                    },
                }
            })
        });
    }

    const onNodesChangeRestricted = useCallback((changes: NodeChange[]) => {
        // Only allow position changes (dragging)
        const allowedChanges = changes.filter(
            change => change.type === 'position' || change.type === 'select' || change.type === 'reset' || change.type === 'dimensions'
        );
        console.log('Allowed changes:', allowedChanges);
        for (const change of allowedChanges) {
            if (change.type === 'position' && change.position) {
                // update the position of the node in workflow
                const node = nodes.find(n => n.id === change.id);
                if (node) {
                    const newPosition = change.position;
                    const stepName = node.data.data.name;
                    if (stepName) {
                        setWorkflow(prev => {
                            if (!prev) return prev;
                            return {
                                ...prev,
                                stepPositions: {
                                    ...prev.stepPositions,
                                    [stepName]: newPosition,
                                },
                            };
                        });
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
                                onResetStepRunResultClick={() => setCompletedRunSteps([])}
                                onAutoLayoutClick={onLayout}
                                onRunClick={() => {
                                    onStepNodeRunClick(workflow!, undefined, maxParallelRun, maxStep);
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
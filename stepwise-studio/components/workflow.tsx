import { StepDTO, WorkflowDTO } from '@/stepwise-client';
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

export type WorkflowLayout = {
    stepPositions: { [key: string]: { x: number; y: number } };
    stepSizes: { [key: string]: { width: number; height: number } };
};
export type WorkflowData = WorkflowDTO & WorkflowLayout & {
    maxParallelRun?: number;
    maxSteps?: number;
};

export interface WorkflowProps {
    dto: WorkflowData | undefined;
    onStepNodeRunClick?: (step?: StepDTO, maxParallelRun?: number, maxSteps?: number) => void;
    onResetStepRunResult?: (workflow: WorkflowData) => void;
    onWorkflowChange?: (workflow: WorkflowData) => void;
    setMaxParallelRun?: (maxParallelRun: number) => void;
    setMaxStep?: (maxStep: number) => void;
}

const WorkflowInner: React.FC<WorkflowProps> = (props) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, _] = useEdgesState([]);
    const [maxStep, setMaxStep] = useState<number>(props.dto?.maxSteps ?? 1);
    const [maxParallelRun, setMaxParallelRun] = useState<number>(props.dto?.maxParallelRun ?? 10);
    const { fitView } = useReactFlow();
    const { theme } = useTheme();
    const [workflow, setWorkflow] = useState<WorkflowData | undefined>(() => props.dto);

    useEffect(() => {
        setWorkflow(props.dto);
    }, [props.dto]);

    const nodeTypes = useMemo(() => ({
        stepNode: StepNode,
    }), []);

    const onStepNodeRunClick = (step?: StepDTO) => {
        props.onStepNodeRunClick?.(step, maxParallelRun, maxStep);
    }

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
        if (!workflow) return;
        var newNodes = workflow.steps?.map((step) => {
            var stepPosition = workflow.stepPositions[step.name!];
            var stepSize = workflow.stepSizes[step.name!];
            var existingNode = nodes.find(n => n.id === step.name);
            return {
                ...existingNode,
                ...stepSize,
                id: step.name,
                type: 'stepNode',
                position: stepPosition,
                data: {
                    data: step,
                    onRunClick: (step: StepDTO) => onStepNodeRunClick(step),
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
    }, [workflow, fitView]);


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
            <div className="z-10 absolute top-0">
                <ControlBar
                    maxParallel={maxParallelRun}
                    maxSteps={maxStep}
                    onMaxParallelChange={onMaxParallelChange}
                    onMaxStepsChange={onMaxStepsChange}
                    onResetStepRunResultClick={() => props.onResetStepRunResult?.(props.dto!)}
                    onAutoLayoutClick={onLayout}
                    onRunClick={() => onStepNodeRunClick(undefined)}
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
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



const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction });

    var maxNodeWidth = nodes.reduce((max, node) => Math.max(max, node.width ?? 0), 100);
    var maxNodeHeight = nodes.reduce((max, node) => Math.max(max, node.height ?? 0), 200);

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: node.width, height: maxNodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = Position.Left;
        node.sourcePosition = Position.Right;
        node.position = {
            x: nodeWithPosition.x - maxNodeWidth / 2,
            y: nodeWithPosition.y - maxNodeHeight / 2,
        };
    });

    const layoutedEdges = edges.map((edge) => {
        const points = dagreGraph.edge(edge.source, edge.target).points;
        return {
            ...edge,
            // Use the points from Dagre to define the edge path
            sourcePosition: points[0] ? getPosition(points[0]) : 'bottom',
            targetPosition: points[points.length - 1] ? getPosition(points[points.length - 1]) : 'top',
        };
    });

    return { nodes, edges: layoutedEdges };
};

function getPosition(point: { x: number, y: number }) {
    // This is a simplified example. You might need more complex logic depending on your graph structure.
    if (point.y === 0) return 'top';
    if (point.y === 1) return 'bottom';
    if (point.x === 0) return 'left';
    return 'right';
}

export interface WorkflowProps {
    dto: WorkflowDTO | undefined;
    onStepNodeRunClick?: (step: StepDTO) => void;
}

const WorkflowInner: React.FC<WorkflowProps> = (props) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, _] = useEdgesState([]);
    const { fitView } = useReactFlow();
    const { theme } = useTheme();

    const nodeTypes = useMemo(() => ({
        stepNode: StepNode,
    }), []);

    const onStepNodeRunClick = (step: StepDTO) => {
        props.onStepNodeRunClick?.(step);
    }

    useEffect(() => {
        if (!props.dto) return;

        var nodes = props.dto?.steps?.map((step) => {
            return {
                id: step.name,
                type: 'stepNode',
                position: { x: 250, y: 5 },
                width: 200,
                height: 200,
                data: {
                    data: step,
                    onRunClick: onStepNodeRunClick,
                } as StepNodeProps,
            };
        }) as Node<StepNodeProps>[];

        var edges = props.dto?.steps?.reduce((edges, step) => {
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

        // call layouting to calculate the initial position of the nodes
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            nodes,
            edges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [props.dto]);


    const onNodesChangeRestricted = useCallback((changes: NodeChange[]) => {
        // Only allow position changes (dragging)
        const allowedChanges = changes.filter(
            change => change.type === 'position' || change.type === 'select' || change.type === 'reset' || change.type === 'dimensions'
        );
        onNodesChange(allowedChanges);
    }, [onNodesChange]);

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
    }, [nodes, edges, setNodes, setEdges, fitView]);

    const minimapStyle = {
        height: 60,
        width: 100,
        background: theme === 'light' ? '#777' : '#111',
    };

    return (
        <div
            className='w-full h-full bg-accent/10'
        >
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
                <div className="absolute left-2 top-2 z-10">
                    <Button
                        variant={"default"}
                        onClick={onLayout}
                        className="flex items-center gap-2 shadow-sm">
                        <LayoutGrid className="h-4 w-4" />
                        Layout
                    </Button>
                </div>
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
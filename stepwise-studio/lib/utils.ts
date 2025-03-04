import { clsx, type ClassValue } from "clsx";
import dagre from "dagre";
import { Edge, Node, Position } from "reactflow";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const getLayoutedElements = (
	nodes: Node[],
	edges: Edge[],
	direction = "LR",
) => {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));
	dagreGraph.setGraph({ rankdir: direction });

	// throw error if any node is missing width or height
	nodes.forEach((node) => {
		if (!node.width || !node.height) {
			throw new Error(
				"Each node must have a width and a height. Node: " + node.id,
			);
		}
	});

	nodes.forEach((node) => {
		dagreGraph.setNode(node.id, { width: node.width, height: node.height });
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
			x: nodeWithPosition.x - node.width! / 2,
			y: nodeWithPosition.y - node.height! / 2,
		};
	});

	const layoutedEdges = edges.map((edge) => {
		const points = dagreGraph.edge(edge.source, edge.target).points;
		return {
			...edge,
			// Use the points from Dagre to define the edge path
			sourcePosition: points[0] ? getPosition(points[0]) : "bottom",
			targetPosition: points[points.length - 1]
				? getPosition(points[points.length - 1])
				: "top",
		};
	});

	return { nodes, edges: layoutedEdges };
};

export function getPosition(point: { x: number; y: number }) {
	// This is a simplified example. You might need more complex logic depending on your graph structure.
	if (point.y === 0) return "top";
	if (point.y === 1) return "bottom";
	if (point.x === 0) return "left";
	return "right";
}

export function getDisplayType(type: string) {
	switch (type) {
		case "String":
			return "str";
		case "Int32":
		case "Float32":
			return "number";
		case "Boolean":
			return "bool";
		default:
			return type;
	}
}

export function showAsMarkdown(
	type: "str" | "number" | "bool" | "object" | "error" | string,
) {
	return ["str", "number", "bool", "object", "error"].includes(type);
}

export type StepType =
	| "Ordinary"
	| "StepWiseUITextInput"
	| "StepWiseUINumberInput"
	| "StepWiseUISwitchInput"
	| "StepWiseUIImageInput";

const stepTypeMap: Record<string, StepType> = {
	Ordinary: "Ordinary",
	StepWiseUITextInput: "StepWiseUITextInput",
	StepWiseUINumberInput: "StepWiseUINumberInput",
	StepWiseUISwitchInput: "StepWiseUISwitchInput",
	StepWiseUIImageInput: "StepWiseUIImageInput",
};

export const ConvertStringToStepType = (type: string): StepType => {
	return stepTypeMap[type] || "Ordinary";
};

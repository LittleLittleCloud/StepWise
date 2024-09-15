import Image from "next/image";
import localFont from "next/font/local";
import Sidebar from "@/components/sidebar";
import { StepDTO, StepRunAndResultDTO, WorkflowDTO } from "@/stepwise-client";
import ReactFlow, { 
  Background, 
  Controls, 
  Edge,
  Connection,
  Node,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import Workflow from "@/components/workflow";
import StepRunSidebar from "@/components/step-run-sidebar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const workflows : WorkflowDTO[] = [
  { name: "Workflow 1" },
  { name: "Workflow 2" },
  { name: "Workflow 3" },
];

const initialNodes: Node<StepDTO>[] = [
  {
    id: '1',
    type: 'stepNode',
    position: { x: 250, y: 5 },
    data: {
      name: 'A()',
      description: 'First step of the workflow',
      variables: ['a'],
    },
  },
  {
    id: '2',
    type: 'stepNode',
    position: { x: 100, y: 150 },
    data: {
      name: 'B(a)',
      description: 'Second step of the workflow',
      dependencies: ['a'],
      variables: ['b'],
    },
  },
  {
    id: '3',
    type: 'stepNode',
    position: { x: 400, y: 150 },
    data: {
      name: 'C(a, b)',
      description: 'Final step of the workflow',
      dependencies: ['a', 'b'],
      variables: ['c'],
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e2-3', source: '2', target: '3' },
];

const dummyWorkflow: WorkflowDTO = {
  name: "Test Workflow",
  steps: [
    {
      name: "A",
      description: "First step of the workflow",
    },
    {
      name: "B",
      description: "Second step of the workflow",
      dependencies: ["A"],
      variables: ["A"],
    },
    {
      name: "C",
      description: "Final step of the workflow",
      dependencies: ["A", "B"],
      variables: ["A", "B"],
    },
  ],
}

const dummyCompletedStepRuns: StepRunAndResultDTO[] = [
  {
    stepRun: {
      step: {
        name: "A",
        description: "First step of the workflow",
      },
      variables: [
        {
          name: "A",
          type: "number",
          displayValue: "1",
        },
      ],
      generation: 0,
    },
    result: {
      name: "A",
      type: "number",
      displayValue: "1",
      generation: 0,
    },
  },
  {
    stepRun: {
      step: {
        name: "B",
        description: "Second step of the workflow",
        dependencies: ["A"],
        variables: ["A"],
      },
      variables: [
        {
          name: "A",
          type: "number",
          displayValue: "1",
        },
        {
          name: "B",
          type: "number",
          displayValue: "2",
        },
      ],
      generation: 1,
    },
    result: {
      name: "B",
      type: "number",
      displayValue: "2",
      generation: 1,
    },
  },
  {
    stepRun: {
      step: {
        name: "C",
        description: "Final step of the workflow",
        dependencies: ["A", "B"],
        variables: ["A", "B"],
      },
      variables: [
        {
          name: "A",
          type: "number",
          displayValue: "1",
        },
        {
          name: "B",
          type: "number",
          displayValue: "2",
        },
        {
          name: "C",
          type: "number",
          displayValue: "3",
        },
      ],
      generation: 2,
    },
    result: {
      name: "C",
      type: "number",
      displayValue: "3",
      generation: 2,
    },
  },
];

export default function Home() {
  return (
    <div
      className={`w-full flex bg-accent gap-5 min-h-screen ${geistSans} ${geistMono}`}
    >
        <Sidebar
          user="Test"
          workflows={workflows}/>
        <div className="flex flex-col items-center gap-8 w-full h-screen">
          <Workflow dto={dummyWorkflow} />
        </div>
        <StepRunSidebar stepRuns={dummyCompletedStepRuns} />
    </div>
  );
}

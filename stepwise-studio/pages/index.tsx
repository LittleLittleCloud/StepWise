import Image from "next/image";
import localFont from "next/font/local";
import Sidebar from "@/components/sidebar";
import { StepDTO, WorkflowDTO } from "@/stepwise-client";
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

export default function Home() {
  return (
    <div
      className={`bg-foreground w-full flex min-h-screen text-background ${geistSans} ${geistMono}`}
    >
        <Sidebar
          user="Test"
          workflows={workflows}/>
        <div className="flex flex-col items-center gap-8 w-full h-screen">
          <Workflow dto={dummyWorkflow} />
        </div>
    </div>
  );
}

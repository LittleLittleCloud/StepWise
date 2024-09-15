import Image from "next/image";
import localFont from "next/font/local";
import Sidebar from "@/components/sidebar";
import { client, getApiV1StepWiseControllerV1ListWorkflow, getApiV1StepWiseControllerV1Version, postApiV1StepWiseControllerV1ExecuteStep, StepDTO, StepRunAndResultDTO, WorkflowDTO } from "@/stepwise-client";
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
import { use, useEffect, useState } from "react";

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

const dummyWorkflows: WorkflowDTO[] = [
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

// if env is development, use the local server
if (process.env.NODE_ENV === 'development') {
  const originalConfig = client.getConfig();
  client.setConfig({
    ...originalConfig,
    baseUrl: 'http://localhost:5123',
  });
}


export default function Home() {
  const [completedStepRuns, setCompletedStepRuns] = useState<StepRunAndResultDTO[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDTO | undefined>(undefined);
  const [workflows, setWorkflows] = useState<WorkflowDTO[]>([]);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    getApiV1StepWiseControllerV1ListWorkflow()
      .then((res) => {
        console.log("Got workflows: ", res.data);
        setWorkflows([...res.data ?? []]);
        setSelectedWorkflow(res.data?.[0] ?? undefined);
      })
      .catch((err) => {
        console.error("Error getting workflows: ", err);
      });
    getApiV1StepWiseControllerV1Version().then((res) => {
      setVersion(res.data ?? "Unknown");
    });
  }, []);


  const StepNodeRunClick = async (step: StepDTO) => {
    console.log("Run step: ", step);

    if (step.name === null || selectedWorkflow?.name === null) {
      console.error("Step name or workflow name is undefined");
      return;
    }

    try {
      var res = await postApiV1StepWiseControllerV1ExecuteStep(
        {
          query: {
            step: step.name,
            workflow: selectedWorkflow?.name,
          }
        }
      )
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

    setCompletedStepRuns((prev) => [...prev, ...res.data ?? []]);
  }

  const selectedWorkflowHandler = (workflow: WorkflowDTO) => {
    setSelectedWorkflow(workflow);
  }


  return (
    <div
      className={`w-full flex bg-accent gap-5 min-h-screen ${geistSans} ${geistMono}`}
    >
      <Sidebar
        user="Test"
        version={version ?? "Unknown"}
        workflows={workflows}
        onWorkflowSelect={selectedWorkflowHandler} />
      <div className="flex flex-col items-center gap-8 w-full h-screen">
        <Workflow
          dto={selectedWorkflow}
          onStepNodeRunClick={StepNodeRunClick}
        />
      </div>
      <StepRunSidebar stepRuns={completedStepRuns} />
    </div>
  );
}

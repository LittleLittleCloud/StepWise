import Image from "next/image";
import localFont from "next/font/local";
import Sidebar from "@/components/sidebar";
import { client, getApiV1StepWiseControllerV1ListWorkflow, getApiV1StepWiseControllerV1Version, postApiV1StepWiseControllerV1ExecuteStep, StepDTO, StepRunDTO, WorkflowDTO } from "@/stepwise-client";
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
import Workflow, { WorkflowData } from "@/components/workflow";
import StepRunSidebar from "@/components/step-run-sidebar";
import { use, useEffect, useState } from "react";
import { getLayoutedElements } from "@/lib/utils";

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


// if env is development, use the local server
if (process.env.NODE_ENV === 'development') {
  const originalConfig = client.getConfig();
  client.setConfig({
    ...originalConfig,
    baseUrl: 'http://localhost:5123',
  });
}


export default function Home() {
  const [completedStepRuns, setCompletedStepRuns] = useState<Map<string, StepRunDTO[]>>(new Map());
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowData | undefined>(undefined);
  const [selectedCompletedStepRuns, setSelectedCompletedStepRuns] = useState<StepRunDTO[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    getApiV1StepWiseControllerV1ListWorkflow()
      .then((res) => {
        console.log("Got workflows: ", res.data);

        var workflows: WorkflowData[] = [];

        for (const workflow of res.data ?? []) {
          var nodes = workflow.steps?.map((step: StepDTO) => ({
            id: step.name,
            width: 200,
            height: 200,
            position: { x: 0, y: 0 },
          })) as Node[];

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
          var layout= getLayoutedElements(nodes, edges);

          workflows.push({
            ...workflow,
            stepSizes: layout.nodes.reduce((acc, node) => {
              acc[node.id] = { width: 200, height: 200 };
              return acc;
            }, {} as { [key: string]: { width: number; height: number } }),
            stepPositions: layout.nodes.reduce((acc, node) => {
              acc[node.id] = { x: node.position.x, y: node.position.y };
              return acc;
            }, {} as { [key: string]: { x: number; y: number } }),
          } as WorkflowData);
        }
        setWorkflows(workflows);
        var maps = new Map<string, StepRunDTO[]>();
        res.data?.forEach((workflow) => {
          if (workflow.name === null || workflow.name === undefined) {
            return;
          }
          maps.set(workflow.name, []);
        });

        setCompletedStepRuns(maps);
        setSelectedWorkflow(workflows[0] ?? undefined);
        setSelectedCompletedStepRuns([]);
      })
      .catch((err) => {
        console.error("Error getting workflows: ", err);
      });
    getApiV1StepWiseControllerV1Version().then((res) => {
      setVersion(res.data ?? "Unknown");
    });
  }, []);


  const StepNodeRunClick = async (step?: StepDTO, maxParallelRun?: number, maxSteps?: number) => {
    console.log("Run step: ", step);

    if (selectedWorkflow?.name === null) {
      console.error("workflow name is undefined");
      return;
    }

    try {
      var res = await postApiV1StepWiseControllerV1ExecuteStep(
        {
          query: {
            step: step?.name ?? undefined,
            workflow: selectedWorkflow?.name,
            maxParallel: maxParallelRun,
            maxSteps: maxSteps,
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

    setCompletedStepRuns((prev) => {
      var newMap = new Map(prev);
      var stepRuns = newMap.get(selectedWorkflow?.name!) ?? [];
      var newData = res.data ?? [];
      newData.forEach((data) => {
        stepRuns.push(data);
      });
      newMap.set(selectedWorkflow?.name!, stepRuns);
      return newMap;
    });
  }

  useEffect(() => {
    console.log("Selected workflow: ", selectedWorkflow);
    // update workflow
    setWorkflows((prev) => {
      const newWorkflows = [...prev];
      const index = newWorkflows.findIndex((workflow) => workflow.name === selectedWorkflow?.name);
      if (index !== -1) {
        newWorkflows[index] = selectedWorkflow!;
      }
      return newWorkflows;
    });
      
    setSelectedCompletedStepRuns(completedStepRuns.get(selectedWorkflow?.name!) ?? []);
    setSelectedWorkflow(selectedWorkflow);
  }, [completedStepRuns, selectedWorkflow]);

  const selectedWorkflowHandler = (workflow: WorkflowData) => {
    setSelectedWorkflow(workflow);
  }

  const onResetStepRunResult = (workflow: WorkflowData) => {
    setCompletedStepRuns((prev) => {
      var newMap = new Map(prev);
      newMap.set(workflow.name!, []);
      return newMap;
    });
  }


  return (
    <div
      className={`w-full flex bg-accent gap-5 min-h-screen ${geistSans} ${geistMono}`}
    >
      <Sidebar
        user="Test"
        version={version ?? "Unknown"}
        workflows={workflows}
        selectedWorkflow={selectedWorkflow}
        onWorkflowSelect={selectedWorkflowHandler} />
      <div className="flex flex-col items-center gap-8 w-full h-screen">
        <Workflow
          dto={selectedWorkflow}
          onStepNodeRunClick={StepNodeRunClick}
          onResetStepRunResult={onResetStepRunResult}
          onWorkflowChange={(workflowData) => setSelectedWorkflow(workflowData)}
        />
      </div>
      <StepRunSidebar stepRuns={selectedCompletedStepRuns} />
    </div>
  );
}

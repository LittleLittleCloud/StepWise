import Image from "next/image";
import localFont from "next/font/local";
import Sidebar from "@/components/sidebar";
import {
  client,
  getApiV1StepWiseControllerV1ListWorkflow,
  getApiV1StepWiseControllerV1Version,
  postApiV1StepWiseControllerV1ExecuteStep,
  StepDTO,
  StepRunDTO,
  WorkflowDTO,
} from "@/stepwise-client";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Connection,
  Node,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import Workflow, { WorkflowData } from "@/components/workflow";
import StepRunSidebar from "@/components/step-run-sidebar";
import { use, useEffect, useState } from "react";
import { getLayoutedElements } from "@/lib/utils";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

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
if (process.env.NODE_ENV === "development") {
  const originalConfig = client.getConfig();
  client.setConfig({
    ...originalConfig,
    baseUrl: "http://localhost:5123",
  });
}

export default function Home() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<
    WorkflowData | undefined
  >(undefined);
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
                acc[node.id] = { width: 200, height: 200 };
                return acc;
              },
              {} as { [key: string]: { width: number; height: number } },
            ),
            stepPositions: layout.nodes.reduce(
              (acc, node) => {
                acc[node.id] = { x: node.position.x, y: node.position.y };
                return acc;
              },
              {} as { [key: string]: { x: number; y: number } },
            ),
            stepRuns: [] as StepRunDTO[],
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

        setSelectedWorkflow(workflows[0] ?? undefined);
      })
      .catch((err) => {
        console.error("Error getting workflows: ", err);
      });
    getApiV1StepWiseControllerV1Version().then((res) => {
      setVersion(res.data ?? "Unknown");
    });
  }, []);

  useEffect(() => {
    console.log("Selected workflow: ", selectedWorkflow);
    // update workflow
    setWorkflows((prev) => {
      const newWorkflows = [...prev];
      const index = newWorkflows.findIndex(
        (workflow) => workflow.name === selectedWorkflow?.name,
      );
      if (index !== -1) {
        newWorkflows[index] = selectedWorkflow!;
      }
      return newWorkflows;
    });
  }, [selectedWorkflow]);

  const selectedWorkflowHandler = (workflow: WorkflowData) => {
    setSelectedWorkflow((prev) => {
      return workflows.find((w) => w.name === workflow.name);
    });
  };

  return (
    <div
      className={`w-full flex bg-accent gap-5 min-h-screen ${geistSans} ${geistMono}`}
    >
      <Sidebar
        user="Test"
        version={version ?? "Unknown"}
        workflows={workflows}
        selectedWorkflow={selectedWorkflow}
        onWorkflowSelect={selectedWorkflowHandler}
      />
      <Workflow
        dto={selectedWorkflow}
        onWorkflowChange={(workflowData) =>
          setWorkflows((prev) => {
            const newWorkflows = [...prev];
            const index = newWorkflows.findIndex(
              (workflow) => workflow.name === workflowData.name,
            );
            if (index !== -1) {
              newWorkflows[index] = workflowData;
            }
            return newWorkflows;
          })
        }
      />
    </div>
  );
}

import { WorkflowData } from "@/components/workflow";
import AGENTIC_WORKFLOW from "./agentic-gallery-workflows.test.json";
import { useWorkflowsStore } from "@/hooks/useWorkflow";
import { WorkflowDTO } from "@/stepwise-client";
import { BuildOpenAIChatToolsFromSteps } from "@/lib/stepRunUtils";
import DOCUMENT_WRITER_OAI_CHAT_TOOLS from "./document-writer-oai-chat-tools.test.json";

describe("test agentic gallery workflows", () => {
    beforeEach(() => {
        const data: WorkflowDTO[] = AGENTIC_WORKFLOW;
        useWorkflowsStore.getState().setWorkflowDTOs(data);
    });

    it("should contain 5 workflows", () => {
        expect(useWorkflowsStore.getState().workflows.length).toBe(5);

        // check the name
        const names = ['README', 'GetWeatherWorkflow', 'CoT', 'DocumentWriter', 'ProfanityDetector'];
        useWorkflowsStore.getState().workflows.forEach((workflow, index) => {
            expect(workflow.name).toBe(names[index]);
        });
    });

    it("should build oai chat tools from DocumentWriter workflow", () => {
        const documentWriterWorkflow = useWorkflowsStore.getState().workflows.find((workflow) => workflow.name === "DocumentWriter")!;
        const tools = BuildOpenAIChatToolsFromSteps(documentWriterWorkflow.steps);

        expect(tools.length).toBe(9);

        // write the file to test.json

        const fs = require('fs');
        const path = require('path');
        const filePath = path.resolve(__dirname, 'document-writer-oai-chat-tools.test.1.json');
        fs.writeFileSync(filePath, JSON.stringify(tools, null, 2));

        // compare the tools with the saved tools
        const savedTools = DOCUMENT_WRITER_OAI_CHAT_TOOLS;
        expect(tools).toEqual(savedTools);
    });
});

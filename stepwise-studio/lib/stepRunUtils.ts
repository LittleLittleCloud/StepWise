import { StepRunDTO } from "@/stepwise-client";

export function isStepRunCompleted(stepRun: StepRunDTO): boolean {
	return stepRun.status === "Completed" || stepRun.status === "Failed";
}

import { StepRunDTO } from "@/stepwise-client";

export function isStepRunCompleted(stepRun: StepRunDTO): boolean {
	return stepRun.status === "Completed" || stepRun.status === "Failed";
}

export type StepNodeStatus =
	| "Running"
	| "Failed"
	| "Queue"
	| "Completed"
	| "NotReady";

export const ToStepNodeStatus = (status: string): StepNodeStatus => {
	switch (status) {
		case "Running":
			return "Running";
		case "Failed":
			return "Failed";
		case "Queue":
			return "Queue";
		case "Completed":
			return "Completed";
		default:
			return "NotReady";
	}
};

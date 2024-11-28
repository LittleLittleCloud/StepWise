import { useEffect, useState } from "react";
import { getApiV1StepWiseControllerV1Version } from "@/stepwise-client";
import { useStepwiseClient } from "./useStepwiseClient";

export function useVersion() {
	const [version, setVersion] = useState<string | null>(null);
    const stepwiseClient = useStepwiseClient();

	useEffect(() => {
		getApiV1StepWiseControllerV1Version().then((res) => {
			setVersion(res.data ?? "Unknown");
		});
	}, []);

	return version;
}

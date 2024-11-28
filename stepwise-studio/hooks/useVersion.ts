import { useEffect, useState } from "react";
import {
	getApiV1StepWiseControllerV1GetConfiguration,
	getApiV1StepWiseControllerV1Version,
	StepWiseServiceConfiguration,
} from "@/stepwise-client";
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

export function useStepwiseServerConfiguration() {
	const [serverConfiguration, setServerConfiguration] =
		useState<StepWiseServiceConfiguration | null>(null);
	useEffect(() => {
		getApiV1StepWiseControllerV1GetConfiguration().then((res) => {
			setServerConfiguration(res.data ?? null);
			console.log("Server configuration: ", res.data);
		});
	}, []);

	return serverConfiguration;
}

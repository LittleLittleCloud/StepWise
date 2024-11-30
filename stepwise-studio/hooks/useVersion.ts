import { useEffect, useState } from "react";
import {
	getApiV1StepWiseControllerV1GetConfiguration,
	getApiV1StepWiseControllerV1Version,
	StepWiseServiceConfiguration,
} from "@/stepwise-client";
import { useStepwiseClient } from "./useStepwiseClient";
import { useAuth0 } from "@auth0/auth0-react";

export function useVersion() {
	const [version, setVersion] = useState<string | null>(null);
	const { getAccessTokenSilently, getAccessTokenWithPopup } = useAuth0();

	useEffect(() => {
		// Create async function inside useEffect
		const fetchVersion = async () => {
		  try {
			const accessToken = await getAccessTokenSilently();
			console.log('Access token:', accessToken);
			const response = await getApiV1StepWiseControllerV1Version({
			  headers: {
				Authorization: `Bearer ${accessToken}`,
			  },
			});
			setVersion(response.data ?? "Unknown");
		  } catch (error) {
			setVersion("Error");
		  }
		};

		// Call the async function
		fetchVersion();
	  }, [getAccessTokenSilently]); // Add dependency

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

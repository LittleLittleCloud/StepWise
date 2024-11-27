import { useEffect, useState } from "react";
import { getApiV1StepWiseControllerV1Version } from "@/stepwise-client";

export function useVersion() {
	const [version, setVersion] = useState<string | null>(null);

	useEffect(() => {
		getApiV1StepWiseControllerV1Version().then((res) => {
			setVersion(res.data ?? "Unknown");
		});
	}, []);

	return version;
}

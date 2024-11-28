import { client } from "@/stepwise-client";
import { useEffect, useState } from "react";

export function createClient() {
	if (process.env.NODE_ENV === "development") {
		const originalConfig = client.getConfig();
		client.setConfig({
			...originalConfig,
			baseUrl: "http://localhost:5123",
		});
	}

	return client;
}

export function useStepwiseClient() {
	const [client, setClient] = useState(() => createClient());

    useEffect(() => {
        setClient(createClient());
    }, []);

	return client;
}

import { useEffect, useState } from "react";
import { useStepwiseServerConfiguration } from "./useVersion";
import { useAuth0 } from "@auth0/auth0-react";

export const useAccessToken = () => {
    const [accessToken, setAccessToken] = useState<string | undefined>(undefined);

    const configuration = useStepwiseServerConfiguration();

    const { getAccessTokenSilently } = useAuth0();

	useEffect(() => {
		const fetchData = async () => {
			var token = undefined;
			if (configuration?.enableAuth0Authentication) {
				token = await getAccessTokenSilently();
			}

            setAccessToken(token);
		};

		fetchData();
	}, []);

    return accessToken;
}
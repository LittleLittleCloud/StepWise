import { useEffect, useState } from "react";
import { useStepwiseServerConfiguration } from "./useVersion";
import { useAuth0 } from "@auth0/auth0-react";
import { create } from "zustand";

export interface AccessTokenState {
	accessToken?: string;
	setAccessToken: (accessToken?: string) => void;
}

export const useAccessTokenStore = create<AccessTokenState>((set) => ({
	accessToken: undefined,
	setAccessToken: (accessToken) => set({ accessToken }),
}));

export const useAccessToken = () => {
	const accessToken = useAccessTokenStore((state) => state.accessToken);
	const setAccessToken = useAccessTokenStore((state) => state.setAccessToken);
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
};

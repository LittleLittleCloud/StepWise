import { create } from "zustand";
import { getBaseUrl } from "./useStepwiseClient";

export interface AccountState {
	username: string;
	email: string;
	profilePicture: string;
	isLoggedIn: boolean;
}

const useAccount = create<AccountState>((set) => ({
	username: "",
	email: "",
	profilePicture: "",
	isLoggedIn: false,
}));

export default useAccount;

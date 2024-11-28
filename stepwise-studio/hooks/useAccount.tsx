import { create } from 'zustand';

export interface AccountState {
  username: string;
  email: string;
  isLoggedIn: boolean;
  login: (username: string, email: string) => void;
  logout: () => void;
}

const useAccount = create<AccountState>((set) => ({
  username: 'John',
  email: 'g22@gmail.com',
  isLoggedIn: false,
  login: (username, email) => set({ username, email, isLoggedIn: true }),
  logout: () => set({ username: '', email: '', isLoggedIn: false }),
}));

export default useAccount;
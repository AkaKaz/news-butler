import { onAuthStateChanged, signInWithPopup, signOut,
  GoogleAuthProvider, type User } from "firebase/auth";
import { auth } from "./firebase";

const provider = new GoogleAuthProvider();

function createAuthStore() {
  let user = $state<User | null>(null);
  let loading = $state(true);

  onAuthStateChanged(auth, (u) => {
    user = u;
    loading = false;
  });

  return {
    get user() { return user; },
    get loading() { return loading; },
    login: () => signInWithPopup(auth, provider),
    logout: () => signOut(auth),
  };
}

export const authStore = createAuthStore();

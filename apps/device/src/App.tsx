import { useState } from "react";
import { Player } from "./Player";
import { SetupScreen } from "./components/SetupScreen";
import {
  type Credentials,
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from "./lib/config";

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(
    loadCredentials,
  );
  // Setelah "Change connection settings", formulir terisi nilai sebelumnya agar tinggal diperbaiki
  const [previous, setPrevious] = useState<Credentials | null>(null);

  if (!credentials) {
    return (
      <SetupScreen
        initial={previous}
        onSubmit={(next) => {
          saveCredentials(next);
          setCredentials(next);
        }}
      />
    );
  }

  return (
    <Player
      credentials={credentials}
      onReconfigure={() => {
        clearCredentials();
        setPrevious(credentials);
        setCredentials(null);
      }}
    />
  );
}

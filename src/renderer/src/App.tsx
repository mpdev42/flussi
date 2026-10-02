import { useState } from 'react';

function App() {
  const [reponse, setReponse] = useState<string | null>(null);

  // Smoke-test de la chaîne IPC : le main doit répondre « pong »
  async function testerPing() {
    setReponse(await window.api.ping());
  }

  return (
    <main className="flex min-h-screen flex-col items-start gap-4 p-8">
      <h1 className="text-2xl font-semibold">Hello Flussi</h1>
      <button
        type="button"
        onClick={testerPing}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Tester la chaîne IPC
      </button>
      {reponse && (
        <p className="text-muted-foreground">Réponse du main : {reponse}</p>
      )}
    </main>
  );
}

export default App;

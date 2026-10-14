/** Écran provisoire : les fonctions de Flussi arrivent avec les prochaines versions. */
export function Accueil() {
  return (
    <div className="flex w-full flex-col gap-8 px-10 py-8">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold text-navy-700">Accueil</h1>
        <p className="text-xs text-neutral-600">
          Les fonctions de Flussi (récupération du fichier, contrôle, dépôt, rejets, journal)
          arrivent avec les prochaines versions.
        </p>
      </div>
    </div>
  );
}

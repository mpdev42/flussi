/** Écran d'accueil : ce qui est disponible, et ce qui arrive avec les prochaines versions. */
export function Accueil() {
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-8 px-10 py-8">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-heading text-navy-700">Accueil</h1>
        <p className="text-xs text-neutral-600">
          Vous pouvez ouvrir et contrôler un fichier AC056 (VEOS ou rejet) depuis l&apos;écran «
          Fichier AC056 », et consulter l&apos;historique des sessions dans le « Journal ». Le
          lancement de l&apos;export VEOS, la récupération du fichier sur le FTP IGA et le dépôt
          chez MSP arrivent avec les prochaines versions.
        </p>
      </div>
    </div>
  );
}

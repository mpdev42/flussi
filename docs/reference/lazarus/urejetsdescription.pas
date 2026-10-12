unit uRejetsDescription;

{$mode ObjFPC}{$H+}

interface

uses
  uTypes;

var
  a_rejet_description: array of t_rejet_description;

procedure charger_rejets_description;
procedure charger_rejets_explications;
function get_description(ps_erreur: String): String;

implementation

uses SysUtils, fMain, uConstantes;

var
  i_indice_erreur: Integer;

// Procédures et fonctions privées

procedure ajouter_rejet_description(ps_code, ps_recherche_1, ps_recherche_2, ps_recherche_3: String; prdmr_recherche_1, prdmr_recherche_2, prdmr_recherche_3: TRejetDescriptionModeRecherche);
begin

  SetLength(a_rejet_description, Length(a_rejet_description) + 1);

  with a_rejet_description[High(a_rejet_description)] do
  begin

    s_code           := ps_code;
    s_recherche_1    := ps_recherche_1;
    s_recherche_2    := ps_recherche_2;
    s_recherche_3    := ps_recherche_3;
    rdmr_recherche_1 := prdmr_recherche_1;
    rdmr_recherche_2 := prdmr_recherche_2;
    rdmr_recherche_3 := prdmr_recherche_3;

  end;

end;

function get_erreur_indice(ps_code: String): Integer;
var
  i_erreur: Integer;
  i_result: Integer;
begin

  // Initialisation des variables
  i_result := -1;

  // Rechercher l'erreur depuis son code
  for i_erreur := 0 to High(a_rejet_description) do
  begin

    if a_rejet_description[i_erreur].s_code = ps_code then
    begin

      i_result := i_erreur;
      Break;

    end;

  end;

  // Retourner le résultat
  Result := i_result;

end;

procedure ajouter_rejet_explication(ps_ligne: String);
begin

  if ps_ligne = '' then Exit;

  // Récupérer l'indice de l'erreur
  if ps_ligne.StartsWith('[') then
  begin

    i_indice_erreur := get_erreur_indice(Copy(ps_ligne, 2, 6));

    if i_indice_erreur = -1 then frmMain.AjouterJournal('Chargerment rejet explication : erreur ' + ps_ligne + ' inconnue', JOURNAL_STYLE_ERREUR)
    else i_indice_erreur := i_indice_erreur + 1000; // Pour ne prendre en compte la 2e ligne de l'erreur dans le fichier texte

    Exit;

  end;

  // Compléter la description de l'erreur
  if i_indice_erreur <> -1 then
  begin

    if i_indice_erreur >= 1000 then i_indice_erreur := i_indice_erreur - 1000
    else a_rejet_description[i_indice_erreur].s_explications := a_rejet_description[i_indice_erreur].s_explications + ps_ligne + chr(10) + chr(13);

  end;

end;

function get_explication(ps_code: String): String;
var
  i_erreur: Integer;
  s_result: String;
begin

  // Initialisation des variables
  i_erreur := get_erreur_indice(ps_code);
  s_result := '';

  if i_erreur <> -1 then s_result := a_rejet_description[i_erreur].s_explications;

  // Retourner le résultat
  Result := s_result;

end;

function is_recherche_description_trouve(ps_erreur, ps_recherche: String; prm_recherche: TRejetDescriptionModeRecherche): Boolean;
var
  b_result: Boolean;
  i_longueur_erreur: Integer;
  i_longueur_recherche: Integer;
begin

  // Initialisation des variables
  b_result := False;

  // Effectuer la recherche
  case prm_recherche of

    REJET_ALL: b_result := (ps_erreur = ps_recherche);

    REJET_END:
      begin
        i_longueur_erreur    := Length(ps_erreur);
        i_longueur_recherche := Length(ps_recherche);
        b_result := (Copy(ps_erreur, i_longueur_erreur - i_longueur_recherche + 1, i_longueur_recherche) = ps_recherche);

      end;

    REJET_IN: b_result := (Pos(ps_recherche, ps_erreur) > 0);

    REJET_START: b_result := (Copy(ps_erreur, 1, Length(ps_recherche)) = ps_recherche);

  end;

  // Retourner le résultat
  Result := b_result;

end;

// Procédures et fonctions publiques
procedure charger_rejets_description;
begin

  ajouter_rejet_description(
    'ERR001',
    'Acte de gestion  Modification d assure non traversable pour l''assuré de rang',
    '',
    '',
    REJET_START,
    REJET_NONE,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR002',
    'Acte de gestion  Radiation d assure non traversable pour l''assuré de rang',
    '',
    '',
    REJET_START,
    REJET_NONE,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR003',
    'Acte de gestion  Reactivation d assure non traversable pour l''assuré de rang',
    '',
    '',
    REJET_START,
    REJET_NONE,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR004',
    'Contrat',
    'échec de la réactivation du contrat, pas d''opération de résiliation trouvée. Valeur du code retour du SAD de recherche d''une opération CI0042A',
    '',
    REJET_START,
    REJET_IN,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR005',
    'Dans le cadre d''une souscription, le contrat',
    'existe déjà (CI9101M)',
    '',
    REJET_START,
    REJET_END,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR006',
    'Département tarifaire',
    'invalide',
    '',
    REJET_START,
    REJET_END,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR007',
    'Evenement rejeté, pour le contrat',
    'il existe des doublons pour la personne de rang dans l''evenement',
    '',
    REJET_START,
    REJET_IN,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR008',
    'Existence dans le contrat',
    'd''un  jumeau qui a les mêmes rang naissance/date de naissance/numéro RO :',
    'que la personne de rang dans l''événement',
    REJET_START,
    REJET_IN,
    REJET_IN);

  ajouter_rejet_description(
    'ERR009',
    'Incohérence du centre de paiement',
    '',
    '',
    REJET_START,
    REJET_NONE,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR010',
    'La garantie',
    'de l''assuré de rang',
    'ne peut etre radiée car elle n''est pas valide pour le contrat',
    REJET_START,
    REJET_IN,
    REJET_IN);

  ajouter_rejet_description(
    'ERR011',
    'L''acte de gestion ACMA en date d''effet',
    'n''est pas autorisé (traversabilité) pour le contrat',
    '',
    REJET_START,
    REJET_IN,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR012',
    'L''adresse présente pour le role PERSONNE PRINCIPALE est incorrecte pour la personne de rang dans l''evenement',
    '',
    '',
    REJET_START,
    REJET_NONE,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR013',
    'L''assuré de rang',
    'existe déjà pour l''adjonction d''assuré',
    '',
    REJET_START,
    REJET_END,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR014',
    'L''assuré de rang',
    'pour le contrat',
    'existe deja à une date d''effet différente',
    REJET_START,
    REJET_IN,
    REJET_IN);

  ajouter_rejet_description(
    'ERR015',
    'Le contrat',
    'n''existe pas, ou bien n''est pas valide a la date d''effet de l''opération',
    '',
    REJET_START,
    REJET_IN,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR016',
    'Le début d''exercice madelin est obligatoire pour le contrat',
    '',
    '',
    REJET_START,
    REJET_NONE,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR017',
    'Le nom présent pour le role',
    'de la personne de rang',
    '',
    REJET_START,
    REJET_IN,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR018',
    'Le rib présent pour le role PERSONNE PRINCIPALE est incorrect pour la personne de rang dans l''evenement',
    '',
    '',
    REJET_START,
    REJET_NONE,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR019',
    'Les données RO de la personne de rang dans l''evenement',
    '',
    '',
    REJET_START,
    REJET_NONE,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR020',
    'Mode de règlement = prélèvement ou versement et RIB DEST PREST CONTRAT absent pour le contrat',
    '',
    '',
    REJET_START,
    REJET_NONE,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR021',
    'Pas d''enregistrement de fin d''évènement',
    '',
    '',
    REJET_ALL,
    REJET_NONE,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR022',
    'Pour l''assuré',
    'du contrat',
    'radiation de garantie impossible, un assuré doit avoir au moins une garantie valide a la date d''effet de l''operation',
    REJET_START,
    REJET_IN,
    REJET_END);

  ajouter_rejet_description(
    'ERR023',
    'Pour le contrat',
    'et l''assuré de rang',
    'on ne peut re-souscrire a la meme garantie',
    REJET_START,
    REJET_IN,
    REJET_IN);

  ajouter_rejet_description(
    'ERR024',
    'Probleme lors de la création ou mise à jour des caractéristiques physiques de la personne de rang evt',
    '',
    '',
    REJET_START,
    REJET_NONE,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR025',
    'Rang de naissance RO identique pour même date de naissance / numéro RO',
    '',
    '',
    REJET_ALL,
    REJET_NONE,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR026',
    'Role ASSURE (ENTITE 400) absent dans l''evenement souscription du contrat 00 de la personne de rang evt',
    '',
    '',
    REJET_START,
    REJET_NONE,
    REJET_NONE);

  ajouter_rejet_description(
    'ERR027',
    'La garantie',
    'de l''assuré de rang',
    'ne peut etre radiée car elle n''existe pas pour le contrat',
    REJET_START,
    REJET_IN,
    REJET_IN);

end;

procedure charger_rejets_explications;
var
  s_ligne: String;
  s_nom_fichier: String;
  tf_rejets_explications: TextFile;
begin

  // Initialisation des variables
  s_nom_fichier := GetCurrentDir + '\' + C_S_FIC_REJETS_EXPLICATIONS;

  // Le fichier existe-t-il ?
  if not FileExists(s_nom_fichier) then
  begin

    frmMain.AjouterJournal('Le fichier ' + s_nom_fichier + ' n''existe pas.', JOURNAL_STYLE_ERREUR);
    Exit;

  end;

  AssignFile(tf_rejets_explications, s_nom_fichier);

  try

    try

      Reset(tf_rejets_explications);

      repeat

        ReadLn(tf_rejets_explications, s_ligne);
        ajouter_rejet_explication(s_ligne);

      until EOF(tf_rejets_explications);

    except
      on e: EInOutError do frmMain.AjouterJournal('Une exception a été levée : ' + e.ClassName + ' / ' + e.Message, JOURNAL_STYLE_ERREUR);
    end;

  finally

    CloseFile(tf_rejets_explications);

  end;

end;

function get_description(ps_erreur: String): String;
var
  b_recherche_1_trouve: Boolean;
  b_recherche_2_trouve: Boolean;
  b_recherche_3_trouve: Boolean;
  i_description: Integer;
  s_code_description: String;
  s_result: String;
begin

  // Initialisation des variables
  s_code_description := 'Erreur inconnue. Contactez le service informatique.';
  s_result           := '';

  // Rechercher le code de description correspondant à l'erreur
  if ps_erreur <> '' then

    for i_description := 0 to High(a_rejet_description) do
    begin

      with a_rejet_description[i_description] do
      begin

        // Initialisation de la recherche
        b_recherche_1_trouve := False;
        b_recherche_2_trouve := False;
        b_recherche_3_trouve := False;

        // Recherche 1
        b_recherche_1_trouve := is_recherche_description_trouve(ps_erreur, s_recherche_1, rdmr_recherche_1);

        // Recherche 2
        if s_recherche_2 = '' then b_recherche_2_trouve := True
        else b_recherche_2_trouve := is_recherche_description_trouve(ps_erreur, s_recherche_2, rdmr_recherche_2);

        // Recherche 3
        if s_recherche_3 = '' then b_recherche_3_trouve := True
        else b_recherche_3_trouve := is_recherche_description_trouve(ps_erreur, s_recherche_3, rdmr_recherche_3);

        // Description trouvée
        if b_recherche_1_trouve and b_recherche_2_trouve and b_recherche_3_trouve then
        begin

          //s_code_description := s_code + ' : ' + s_recherche_1 + ' XXX ' + s_recherche_2 + ' XXX ' + s_recherche_3;
          s_code_description := s_code;
          Break;

        end;

      end;

    end;

  // Récupérer l'explication depuis le code trouvé
  if s_code_description <> '' then
  begin

    s_result := get_explication(s_code_description);

  end;

  // Retourner le résultat
  Result := s_result;

end;

end.


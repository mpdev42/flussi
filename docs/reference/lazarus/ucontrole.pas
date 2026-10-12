unit uControle;

{$mode ObjFPC}{$H+}

interface

uses
  uTypes;

var
  i_nb_controle_erreurs: Integer;

procedure ControlerEvenement(var pe100: t_entite_100; pdm: TDonneeModifiable = E_NONE);

implementation

uses Controls, fMain, uConstantes, SysUtils;

type
  t_chart_set = set of Char;

procedure ajouter_controle_erreur(ps_dossier, ps_evenement: String; var pace: t_a_controle_erreur; pwcmp: TWinControl; ps_erreur: String);
var
  i_indice: Integer;
begin

  SetLength(pace, Length(pace) + 1);
  i_indice := High(pace);

  with pace[i_indice] do
  begin

    wcmp     := pwcmp;
    s_erreur := ps_erreur;
    frmMain.AjouterJournal('Dossier/Evènement ' + ps_dossier + '/' + ps_evenement + ' : ' + ps_erreur, JOURNAL_STYLE_ERREUR);

  end;

  i_nb_controle_erreurs := i_nb_controle_erreurs + 1;

end;

function is_texte_valide(ps: String; pcs_valides: t_chart_set): Boolean;
var
  b_result: Boolean;
  i_car: Integer;
begin

  b_result := True;

  for i_car := 1 to Length(ps) do
      if not (ps[i_car] in pcs_valides) then
      begin

        b_result := False;
        Break;

      end;

  Result := b_result;

end;

procedure ControlerEvenement(var pe100: t_entite_100; pdm: TDonneeModifiable = E_NONE);
var
  i_indice: Integer;
  i_indice_2: Integer;
begin

  with pe100 do
  begin

    // Journal
    if pdm = E_NONE then frmMain.AjouterJournal('Contrôle des données du dossier/évènement ' + s_num_dossier_n + '/' + s_num_evt_n, JOURNAL_STYLE_AUCUN);

    // Entité 115
    with e115 do

      if s_num_dossier_n <> '' then
      begin

        SetLength(ace, 0);

        if not is_texte_valide(s_nom, C_S_LISTE_1) and (pdm in [E115_NOM, E_NONE]) then
          ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt115Nom, 'Entité 115 : caractère non autorisé dans le nom');

        if not is_texte_valide(s_prenom_1, C_S_LISTE_1) and (pdm in [E115_PRENOM, E_NONE]) then
          ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt115Prenom, 'Entité 115 : caractère non autorisé dans le prénom');

        if not is_texte_valide(s_num_insee, C_S_LISTE_3) and (pdm in [E115_INSEE, E_NONE]) then
          ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt115Insee, 'Entité 115 : caractère non autorisé dans le numéro INSEE');

      end;

    // Entité 120
    with e120 do

      if s_num_dossier_n <> '' then
      begin

        SetLength(ace, 0);

        if not is_texte_valide(s_complement_geographique, C_S_LISTE_1) and (pdm in [E120_COMPLEMENT_GEO, E_NONE]) then
          ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt120ComplementGeo, 'Entité 120 : caractère non autorisé dans le complément géographique');

        if not is_texte_valide(s_numero_voie, C_S_LISTE_1) and (pdm in [E120_NUMERO_VOIE, E_NONE]) then
          ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt120NumeroVoie, 'Entité 120 : caractère non autorisé dans le numéro de voie');

        if not is_texte_valide(s_libelle_voie, C_S_LISTE_1) and (pdm in [E120_LIBELLE_VOIE, E_NONE]) then
          ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt120LibelleVoie, 'Entité 120 : caractère non autorisé dans le libellé de la voie');

        if not is_texte_valide(s_lieu_dit, C_S_LISTE_1) and (pdm in [E120_LIEU_DIT, E_NONE]) then
          ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt120LieuDit, 'Entité 120 : caractère non autorisé dans le lieu-dit');

        if not is_texte_valide(s_code_postal_localite, C_S_NUMERIQUE) and (pdm in [E120_CODE_POSTAL, E_NONE]) then
          ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt120CodePostal, 'Entité 120 : caractère non autorisé dans le code postal');

        if (Length(s_code_postal_localite) <> 5) and (pdm in [E120_CODE_POSTAL, E_NONE]) then
          ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt120CodePostal, 'Entité 120 : le code postal doit être composé de 5 chiffres');

        if not is_texte_valide(s_libelle_localite, C_S_LISTE_1) and (pdm in [E120_LIBELLE_LOCALITE, E_NONE]) then
          ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt120LibelleLocalite, 'Entité 120 : caractère non autorisé dans le libellé de la localité');

      end;

    // Entité 125
    if Length(a_e125) > 0 then

      for i_indice := 0 to High(a_e125) do

        with a_e125[i_indice] do
        begin

          SetLength(ace, 0);

          if not is_texte_valide(s_valeur_coordonnee_communication, C_S_LISTE_2) and (pdm in [E125_VALEUR, E_NONE]) then
            ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt125Valeur, 'Entité 125 : caractère non autorisé dans la valeur');

        end;

    // Entité 400 et sous-entités
    if Length(a_e400) > 0 then

      for i_indice := 0 to High(a_e400) do

        with a_e400[i_indice] do
        begin

          // Entité 400
          SetLength(ace, 0);

          if ((s_type_assure = 'ASSPRI') or (s_type_assure = 'CONJOI')) and (StrToInt(s_rang_n) >= 21) and (pdm in [E400_RANG_BENEFICIAIRE, E_NONE]) then
             ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt400RangBeneficiaire, 'Entité 400 : rang de bénéficiaire incohérent');

          if (s_type_assure = 'ENFANT') and (StrToInt(s_rang_n) >= 40) and (pdm in [E400_RANG_BENEFICIAIRE, E_NONE]) then
             ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt400RangBeneficiaire, 'Entité 400 : rang de bénéficiaire incohérent');

          if ((s_type_assure = 'ASSPRI') or (s_type_assure = 'CONJOI')) and (pdm in [E400_RANG_PERSONNE, E_NONE])  and (StrToInt(s_rang_personne_n) >= 21) then
             ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt400RangPersonne, 'Entité 400 : rang de personne incohérent');

          if (s_type_assure = 'ENFANT') and (StrToInt(s_rang_personne_n) >= 40) and (pdm in [E400_RANG_PERSONNE, E_NONE]) then
             ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt400RangPersonne, 'Entité 400 : rang de personne incohérent');

          // Entité 405
          if e405.s_num_dossier_n <> '' then

            with e405 do
            begin

              SetLength(ace, 0);

              if ((s_type_assure = 'ASSPRI') or (s_type_assure = 'CONJOI')) and (StrToInt(s_rang_n) >= 21) and (pdm in [E405_RANG_BENEFICIAIRE, E_NONE]) then
                 ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt405RangBeneficiaire, 'Entité 405 : rang de bénéficiaire incohérent');

              if (s_type_assure = 'ENFANT') and (StrToInt(s_rang_n) >= 40) and (pdm in [E405_RANG_BENEFICIAIRE, E_NONE]) then
                 ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt405RangBeneficiaire, 'Entité 405 : rang de bénéficiaire incohérent');

              if not is_texte_valide(s_nom, C_S_LISTE_1) and (pdm in [E405_NOM, E_NONE]) then
                ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt405Nom, 'Entité 405 : caractère non autorisé dans le nom');

              if not is_texte_valide(s_prenom_1, C_S_LISTE_1) and (pdm in [E405_PRENOM, E_NONE]) then
                ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt405Prenom, 'Entité 405 : caractère non autorisé dans le prénom');

              if not is_texte_valide(s_num_insee, C_S_LISTE_3) and (pdm in [E405_INSEE, E_NONE]) then
                ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt405NumeroInsee, 'Entité 405 : caractère non autorisé dans le numéro INSEE');

              if not is_texte_valide(s_nom_jeune_fille, C_S_LISTE_1) and (pdm in [E405_NOM_JEUNE_FILLE, E_NONE]) then
                ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt405NomJeuneFille, 'Entité 405 : caractère non autorisé dans le nom de jeune fille');

            end;

          // Entité 410
          if e410.s_num_dossier_n <> '' then

             with e410 do
             begin

               SetLength(ace, 0);

               if ((s_type_assure = 'ASSPRI') or (s_type_assure = 'CONJOI')) and (StrToInt(s_rang_n) >= 21) and (pdm in [E410_RANG_BENEFICIAIRE, E_NONE]) then
                  ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt410RangBeneficiaire, 'Entité 410 : rang de bénéficiaire incohérent');

               if (s_type_assure = 'ENFANT') and (StrToInt(s_rang_n) >= 40) and (pdm in [E410_RANG_BENEFICIAIRE, E_NONE]) then
                  ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt410RangBeneficiaire, 'Entité 410 : rang de bénéficiaire incohérent');

             end;

          // Entité 485
          if Length(a_e485) > 0 then

            for i_indice_2 := 0 to High(a_e485) do

              with a_e485[i_indice_2] do
              begin

                SetLength(ace, 0);

                if ((s_type_assure = 'ASSPRI') or (s_type_assure = 'CONJOI')) and (StrToInt(s_rang_n) >= 21) and (pdm in [E485_RANG_BENEFICIAIRE, E_NONE]) then
                   ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt485RangBeneficiaire, 'Entité 485 : rang de bénéficiaire incohérent');

                if (s_type_assure = 'ENFANT') and (StrToInt(s_rang_n) >= 40) and (pdm in [E485_RANG_BENEFICIAIRE, E_NONE]) then
                   ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt485RangBeneficiaire, 'Entité 485 : rang de bénéficiaire incohérent');

                if not (s_code = 'COEFCO') then
                  ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt485Code, 'Entité 485 : le code doit être égal à COEFCO');

                if not (s_valeur = 'COUPLE') then
                  ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt485Valeur, 'Entité 485 : la valeur doit être égale à COUPLE');

              end;

          // Entité 490
          if Length(a_e490) > 0 then

            for i_indice_2 := 0 to High(a_e490) do

              with a_e490[i_indice_2] do
              begin

                SetLength(ace, 0);

                if ((s_type_assure = 'ASSPRI') or (s_type_assure = 'CONJOI')) and (StrToInt(s_rang_n) >= 21) and (pdm in [E490_RANG_BENEFICIAIRE, E_NONE]) then
                   ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt490RangBeneficiaire, 'Entité 490 : rang de bénéficiaire incohérent');

                if (s_type_assure = 'ENFANT') and (StrToInt(s_rang_n) >= 40) and (pdm in [E490_RANG_BENEFICIAIRE, E_NONE]) then
                   ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt490RangBeneficiaire, 'Entité 490 : rang de bénéficiaire incohérent');

                if not ((s_code = 'COEFCO') or (Trim(s_code) = 'REDAN')) then
                  ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt490Code, 'Entité 490 : le code doit être égal à COEFCO ou REDAN');

                if not (s_valeur = 'NON') then
                  ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt490Valeur, 'Entité 490 : la valeur doit être égale à NON');

              end;

          // Entité 700
          if Length(a_e700) > 0 then

            for i_indice_2 := 0 to High(a_e700) do

              with a_e700[i_indice_2] do
              begin

                SetLength(ace, 0);

                if ((s_type_assure = 'ASSPRI') or (s_type_assure = 'CONJOI')) and (StrToInt(s_rang_n) >= 21) and (pdm in [E700_RANG_BENEFICIAIRE, E_NONE]) then
                   ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt700RangBeneficiaire, 'Entité 700 : rang de bénéficiaire incohérent');

                if (s_type_assure = 'ENFANT') and (StrToInt(s_rang_n) >= 40) and (pdm in [E700_RANG_BENEFICIAIRE, E_NONE]) then
                   ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt700RangBeneficiaire, 'Entité 700 : rang de bénéficiaire incohérent');

              end;

          // Entité 800
          if e800.s_num_dossier_n <> '' then

             with e800 do
             begin

               SetLength(ace, 0);

               if ((s_type_assure = 'ASSPRI') or (s_type_assure = 'CONJOI')) and (StrToInt(s_rang_n) >= 21) and (pdm in [E800_RANG_BENEFICIAIRE, E_NONE]) then
                  ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt800RangBeneficiaire, 'Entité 800 : rang de bénéficiaire incohérent');

               if (s_type_assure = 'ENFANT') and (StrToInt(s_rang_n) >= 40) and (pdm in [E800_RANG_BENEFICIAIRE, E_NONE]) then
                  ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt800RangBeneficiaire, 'Entité 800 : rang de bénéficiaire incohérent');

               if ((s_type_assure = 'ASSPRI') or (s_type_assure = 'CONJOI')) and (pdm in [E800_RANG_PERSONNE, E_NONE])  and (StrToInt(s_rang_personne_n) >= 21) then
                  ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt800RangPersonne, 'Entité 800 : rang de personne incohérent');

               if (s_type_assure = 'ENFANT') and (StrToInt(s_rang_personne_n) >= 40) and (pdm in [E800_RANG_PERSONNE, E_NONE]) then
                  ajouter_controle_erreur(s_num_dossier_n, s_num_evt_n, ace, frmMain.edt800RangPersonne, 'Entité 800 : rang de personne incohérent');

             end;

        end;

  end;

end;

end.


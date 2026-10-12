unit uAc056;

{$mode ObjFPC}{$H+}

interface

uses
  uTypes;

var
  ac056: t_ac056;
  b_entite000_creee: Boolean;
  b_entite400_creee: Boolean;

procedure AjouterEntite(ps_ligne: String);
function GetEntite100Ligne(pe100: t_entite_100): String;
function GetEntite110Ligne(pe110: t_entite_110): String;
function GetEntite115Ligne(pe115: t_entite_115): String;
function GetEntite120Ligne(pe120: t_entite_120): String;
function GetEntite125Ligne(pe125: t_entite_125): String;
function GetEntite130Ligne(pe130: t_entite_130): String;
function GetEntite135Ligne(pe135: t_entite_135): String;
function GetEntite155Ligne(pe155: t_entite_155): String;
function GetEntite180Ligne(pe180: t_entite_180): String;
function GetEntite400Ligne(pe400: t_entite_400): String;
function GetEntite405Ligne(pe405: t_entite_405): String;
function GetEntite410Ligne(pe410: t_entite_410): String;
function GetEntite411Ligne(pe411: t_entite_411): String;
function GetEntite485Ligne(pe485: t_entite_485): String;
function GetEntite490Ligne(pe490: t_entite_490): String;
function GetEntite700Ligne(pe700: t_entite_700): String;
function GetEntite800Ligne(pe800: t_entite_800): String;
function GetEvenement(ps_dossier, ps_evenement: String): t_entite_100;
procedure ModifierDonnee(ps_dossier, ps_evenement: String; pi_ligne_beneficiaire: Integer; pi_ligne: Integer; pdm: TDonneeModifiable; s_valeur: String);

implementation

uses Dialogs, StrUtils, SysUtils, fMain, uControle;

var
  i_dossier: Integer;
  i_dossier_evt: Integer;
  i_dossier_evt_assure: Integer;
  i_dossier_evt_assure_critere: Integer;
  i_dossier_evt_assure_garantie: Integer;
  i_dossier_evt_assure_valeur_souscription: Integer;
  i_dossier_evt_coordonnee: Integer;

// Procédures et fonctions privées

function GetErreur(ps_ligne: String): String;
begin

  Result := Copy(ps_ligne, 719, Length(ps_ligne) - 718);

end;

procedure AjouterEntite000(ps_ligne: String);
begin

  // Nouveau fichier
  SetLength(ac056.a_e001, 0);
  ac056.e999.s_ligne := '';
  i_dossier := -1;
  frmMain.FNbEvenements := 0;

  // Stocker la ligne
  ac056.e000.s_ligne := ps_ligne;

end;

procedure AjouterEntite001(ps_ligne: String);
begin

  // Nouveau dossier
  i_dossier := i_dossier + 1;
  SetLength(ac056.a_e001, i_dossier + 1);
  //SetLength(ac056.e001[i_dossier].a_e100, 0);
  i_dossier_evt := -1;

  // Stocker les informations
  with ac056.a_e001[i_dossier] do
  begin

    s_ligne := ps_ligne;
    s_num_dossier_n := Copy(ps_ligne, 10, 8);

  end;

end;

procedure AjouterEntite100(ps_ligne: String);
var
  s_ligne_001: String;
begin

  // Le fichier de rejet ne contient pas les entités 000 et 001 qui doivent être créées ici.
  if frmMain.FFichierRejet then
  begin

    if not b_entite000_creee then
    begin

         AjouterEntite000('REJET');
         b_entite000_creee := True;

    end;

    s_ligne_001 := Copy(ps_ligne, 1, 17) + '0000000100000000';
    AjouterEntite001(s_ligne_001);

  end;

  b_entite400_creee := False;

  // Nouvel évènement dans le dossier
  i_dossier_evt := i_dossier_evt + 1;
  SetLength(ac056.a_e001[i_dossier].a_e100, i_dossier_evt + 1);
  i_dossier_evt_assure := -1;
  i_dossier_evt_coordonnee := -1;
  frmMain.FNbEvenements := frmMain.FNbEvenements + 1;

  // Stocker les informations
  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt] do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_code_evt_n := Copy(ps_ligne, 26, 3);
    s_code_site_n := Copy(ps_ligne, 29, 2);
    s_type_contrat := Trim(Copy(ps_ligne, 31, 1));
    s_num_propo := Copy(ps_ligne, 32, 15);
    s_num_contrat_indiv := Trim(Copy(ps_ligne, 47, 15));
    s_num_contrat_collectif := Trim(Copy(ps_ligne, 62, 15));
    s_code_groupe_assures := Trim(Copy(ps_ligne, 77, 6));
    s_code_entite_rattachement := Trim(Copy(ps_ligne, 83, 9));
    s_date_effet_acte_d := Trim(Copy(ps_ligne, 92, 8));
    s_date_effet_cotisation_d := Trim(Copy(ps_ligne, 100, 8));
    s_date_vente_d := Trim(Copy(ps_ligne, 108, 8));
    s_date_demande_d := Trim(Copy(ps_ligne, 116, 8));
    s_code_offre := Trim(Copy(ps_ligne, 124, 10));
    s_code_reseau := Trim(Copy(ps_ligne, 134, 9));
    s_code_producteur := Copy(ps_ligne, 143, 9);
    s_code_agence := Copy(ps_ligne, 152, 9);
    s_num_externe_contrat := Copy(ps_ligne, 161, 15);
    s_ech_princ_n := Trim(Copy(ps_ligne, 176, 4));
    s_groupe_gestion := Trim(Copy(ps_ligne, 180, 9));
    s_centre_gestion := Trim(Copy(ps_ligne, 189, 9));
    s_code_contexte := Trim(Copy(ps_ligne, 198, 4));
    s_systeme_origine := Copy(ps_ligne, 202, 5);
    s_utilisateur := Copy(ps_ligne, 207, 8);
    s_idt_systeme_origine_n := Copy(ps_ligne, 215, 8);
    s_num_ope_resil_origine_n := Copy(ps_ligne, 223, 5);
    s_idfsys_contrat_n := Copy(ps_ligne, 228, 8);
    s_idfsys_objet_pivot_n := Copy(ps_ligne, 236, 8);
    s_code_evt_annule := Copy(ps_ligne, 244, 3);
    s_idfsys_propo_base_grc_n := Copy(ps_ligne, 247, 8);
    s_idfsys_propo_base_contrat_n := Copy(ps_ligne, 255, 8);
    s_num_ope_propo_n := Copy(ps_ligne, 263, 5);
    s_idfsys_devis_n := Copy(ps_ligne, 268, 8);
    s_idfsys_groupe_gestion_n := Copy(ps_ligne, 276, 8);
    s_idfsys_centre_gestion_n := Copy(ps_ligne, 284, 8);
    s_idfsys_offre_n := Copy(ps_ligne, 292, 8);
    s_idfsys_reseau_n := Copy(ps_ligne, 300, 8);
    s_idfsys_producteur_n := Copy(ps_ligne, 308, 8);
    s_idfsys_agence_n := Copy(ps_ligne, 316, 8);
    s_code_acte_gestion := Copy(ps_ligne, 324, 4);
    s_indic_abrogation_frais_n := Copy(ps_ligne, 328, 1);
    s_code_ope_ciale := Copy(ps_ligne, 329, 6);
    s_idfsys_ope_ciale_n := Copy(ps_ligne, 335, 8);
    s_motif_mise_instance := Copy(ps_ligne, 343, 5);
    s_indic_mise_instance := Copy(ps_ligne, 348, 1);
    s_idfsys_contrat_collectif_n := Copy(ps_ligne, 349, 8);
    s_idfsys_evt_dsn_n := Copy(ps_ligne, 357, 8);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite110(ps_ligne: String);
begin

  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].e110 do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_date_effet_d := Trim(Copy(ps_ligne, 26, 8));
    s_date_effet_der_resil_d := Copy(ps_ligne, 34, 8);
    s_ancien_contrat_d := Copy(ps_ligne, 42, 8);
    s_origine_contrat := Copy(ps_ligne, 50, 2);
    s_indic_cmu_n := Copy(ps_ligne, 52, 1);
    s_monnaie_gestion := Copy(ps_ligne, 53, 3);
    s_indic_abrogation_n := Copy(ps_ligne, 56, 1);
    s_date_debut_surveillance_d := Copy(ps_ligne, 57, 8);
    s_motif := Copy(ps_ligne, 65, 5);
    s_indic_asso_frais_n := Copy(ps_ligne, 70, 1);
    s_type_association := Copy(ps_ligne, 71, 6);
    s_indic_loi_madelin_n := Copy(ps_ligne, 77, 1);
    s_debut_exercice_loi_mad_n := Copy(ps_ligne, 78, 4);
    s_indic_quittance_confiee_n := Copy(ps_ligne, 82, 1);
    s_type_quittance_confiee := Copy(ps_ligne, 83, 1);
    s_indic_temporaire_n := Copy(ps_ligne, 84, 1);
    s_duree_n := Copy(ps_ligne, 85, 4);
    s_indic_nanti_n := Copy(ps_ligne, 89, 1);
    s_indic_note_couverture_n := Copy(ps_ligne, 90, 1);
    s_indic_reserves_medic_n := Copy(ps_ligne, 91, 1);
    s_indic_reserves_autres_n := Copy(ps_ligne, 92, 1);
    s_motif_resil := Copy(ps_ligne, 93, 5);
    s_modalite_resil := Copy(ps_ligne, 98, 5);
    s_societe_concurrente := Copy(ps_ligne, 103, 9);
    s_indic_presence_donnees := Copy(ps_ligne, 112, 1);
    s_mecanisme_1 := Copy(ps_ligne, 113, 1);
    s_mecanisme_2 := Copy(ps_ligne, 114, 1);
    s_date_ancien_dispositif_d := Copy(ps_ligne, 115, 8);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite115(ps_ligne: String);
begin

  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].e115 do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_rang_personne_n := Copy(ps_ligne, 26, 2);
    s_ref_externe := Copy(ps_ligne, 28, 20);
    s_code_civilite := Trim(Copy(ps_ligne, 48, 6));
    s_code_titre := Copy(ps_ligne, 54, 6);
    s_nom := Trim(Copy(ps_ligne, 60, 50));
    s_prenom_1 := Trim(Copy(ps_ligne, 110, 20));
    s_prenom_2 := Copy(ps_ligne, 130, 20);
    s_prenom_3 := Copy(ps_ligne, 150, 20);
    s_prenom_4 := Copy(ps_ligne, 170, 20);
    s_num_insee := Trim(Copy(ps_ligne, 190, 13));
    s_idfsys_pers_princ_n := Copy(ps_ligne, 203, 8);
    s_facette_pers_princ_n := Copy(ps_ligne, 211, 1);
    s_idfsys_nom_pers_princ_n := Copy(ps_ligne, 212, 8);
    s_type_lien_nom_pers_princ := Copy(ps_ligne, 220, 1);
    s_nom_jeune_fille := Copy(ps_ligne, 221, 50);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite120(ps_ligne: String);
begin

  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].e120 do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_point_remise_courrier := Copy(ps_ligne, 26, 50);
    s_complement_geographique := Trim(Copy(ps_ligne, 76, 50));
    s_numero_voie := Trim(Copy(ps_ligne, 126, 9));
    s_code_btq := Trim(Copy(ps_ligne, 135, 2));
    s_code_nature_voie := Trim(Copy(ps_ligne, 137, 5));
    s_libelle_voie := Trim(Copy(ps_ligne, 142, 50));
    s_mention_particuliere_distribution := Copy(ps_ligne, 192, 50);
    s_lieu_dit := Trim(Copy(ps_ligne, 242, 50));
    s_code_postal_localite := Trim(Copy(ps_ligne, 292, 10));
    s_libelle_localite := Trim(Copy(ps_ligne, 302, 50));
    s_code_cedex_n := Copy(ps_ligne, 352, 5);
    s_nom_bureau_cedex := Copy(ps_ligne, 357, 26);
    s_code_departement := Trim(Copy(ps_ligne, 383, 3));
    s_code_pays := Trim(Copy(ps_ligne, 386, 3));
    s_code_type_adresse := Trim(Copy(ps_ligne, 389, 4));
    s_nb_retours_npai_n := Copy(ps_ligne, 393, 2);
    s_adresse_liste_robinson_n := Copy(ps_ligne, 395, 1);
    s_interdiction_envoi_pub_n := Copy(ps_ligne, 396, 1);
    s_idfsys_relation_pers_princ_n := Copy(ps_ligne, 397, 8);
    s_idfsys_adresse_pers_princ_n := Copy(ps_ligne, 405, 8);
    s_type_lien_adresse_pers_princ := Copy(ps_ligne, 413, 1);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;
end;

procedure AjouterEntite125(ps_ligne: String);
begin

  // Nouveau bénéficiaire dans l'évènement
  i_dossier_evt_coordonnee := i_dossier_evt_coordonnee + 1;
  SetLength(ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e125, i_dossier_evt_coordonnee + 1);

  // Stocker les informations
  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e125[i_dossier_evt_coordonnee] do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_code_type_coordonnee := Trim(Copy(ps_ligne, 26, 4));
    s_code_nature_communication := Trim(Copy(ps_ligne, 30, 4));
    s_valeur_coordonnee_communication := Trim(Copy(ps_ligne, 34, 50));
    s_idfsys_pers_princ_n := Copy(ps_ligne, 84, 8);
    s_idfsys_comm_pers_princ_n := Copy(ps_ligne, 92, 8);
    s_type_lien_adresse_pers_princ := Copy(ps_ligne, 100, 1);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite130(ps_ligne: String);
begin

  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].e130 do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_code_banque := Trim(Copy(ps_ligne, 26, 10));
    s_code_guichet := Trim(Copy(ps_ligne, 36, 10));
    s_numero_compte := Trim(Copy(ps_ligne, 46, 20));
    s_cle_controle := Trim(Copy(ps_ligne, 66, 2));
    s_cle_iban := Copy(ps_ligne, 68, 4);
    s_titulaire_compte := Trim(Copy(ps_ligne, 72, 50));
    s_code_pays := Trim(Copy(ps_ligne, 122, 3));
    s_code_devise := Trim(Copy(ps_ligne, 125, 3));
    s_date_fin_effet_d := Copy(ps_ligne, 128, 8);
    s_code_pays_iso2 := Copy(ps_ligne, 136, 2);
    s_code_bic := Copy(ps_ligne, 138, 14);
    s_code_iban := Copy(ps_ligne, 152, 30);
    s_indic_init_rib := Copy(ps_ligne, 182, 1);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite135(ps_ligne: String);
begin

  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].e135 do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_rang_personne_n := Copy(ps_ligne, 26, 2);
    s_ref_externe := Copy(ps_ligne, 28, 20);
    s_num_pers_souscriptrice_n := Copy(ps_ligne, 48, 8);
    s_idfsys_pers_souscr_n := Copy(ps_ligne, 56, 8);
    s_facette_pers_souscr_n := Copy(ps_ligne, 64, 1);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite155(ps_ligne: String);
begin

  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].e155 do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_rang_personne_n := Copy(ps_ligne, 26, 2);
    s_ref_externe := Copy(ps_ligne, 28, 20);
    s_code_part := Copy(ps_ligne, 48, 3);
    s_qualite_payeur := Copy(ps_ligne, 51, 1);
    s_monnaie := Copy(ps_ligne, 52, 3);
    s_mode := Copy(ps_ligne, 55, 2);
    s_frequence_reglement := Copy(ps_ligne, 57, 2);
    s_frequence_avis_echeance := Copy(ps_ligne, 59, 2);
    s_type_terme := Copy(ps_ligne, 61, 2);
    s_echancier := Copy(ps_ligne, 63, 2);
    s_debut_prelevement_d := Trim(Copy(ps_ligne, 65, 8));
    s_fin_prelevement_d := Copy(ps_ligne, 73, 8);
    s_motif_fin_prelevement := Copy(ps_ligne, 81, 2);
    s_attention_de := Copy(ps_ligne, 83, 30);
    s_type_payeur := Copy(ps_ligne, 113, 1);
    s_idfsys_pers_souscr_n := Copy(ps_ligne, 114, 8);
    s_idfsys_relation_pers_souscr_n := Copy(ps_ligne, 122, 8);
    s_facette_pers_souscr_n := Copy(ps_ligne, 130, 1);
    s_e_service := Copy(ps_ligne, 131, 1);
    s_report_donprc := Copy(ps_ligne, 132, 1);
    s_indic_presence_donnees_mandat := Copy(ps_ligne, 133, 1);
    s_date_signature_mandat_d := Copy(ps_ligne, 134, 8);
    s_motif_cloture_mandant := Copy(ps_ligne, 142, 5);
    s_date_annulation_mandat_d := Copy(ps_ligne, 147, 8);
    s_reference_unique_mandat := Copy(ps_ligne, 155, 35);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite180(ps_ligne: String);
begin

  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].e180 do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_rang_personne_n := Copy(ps_ligne, 26, 2);
    s_ref_externe := Copy(ps_ligne, 28, 20);
    s_mode_paiement := Trim(Copy(ps_ligne, 48, 2));
    s_monnaie_paiement := Copy(ps_ligne, 50, 5);
    s_attention_de := Copy(ps_ligne, 55, 30);
    s_idfsys_pers_dest_presta_n := Copy(ps_ligne, 85, 8);
    s_idfsys_relation_pers_dest_presta_n := Copy(ps_ligne, 93, 8);
    s_facette_pers_dest_presta_n := Copy(ps_ligne, 101, 1);
    s_indic_alerte_rbt := Copy(ps_ligne, 102, 1);
    s_report_donprc := Copy(ps_ligne, 103, 1);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite400(ps_ligne: String);
begin

  // Nouveau bénéficiaire dans l'évènement
  i_dossier_evt_assure := i_dossier_evt_assure + 1;
  SetLength(ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e400, i_dossier_evt_assure + 1);
  i_dossier_evt_assure_critere := -1;
  i_dossier_evt_assure_garantie := -1;
  i_dossier_evt_assure_valeur_souscription := -1;

  b_entite400_creee := True;

  // Stocker les informations
  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e400[i_dossier_evt_assure] do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_rang_personne_n := Copy(ps_ligne, 26, 2);
    s_ref_externe := Copy(ps_ligne, 28, 20);
    s_date_anciennete_d := Copy(ps_ligne, 48, 8);
    s_type_assure := Trim(Copy(ps_ligne, 56, 6));
    s_indic_cmu_n := Copy(ps_ligne, 62, 1);
    s_indic_reserve_medicale_n := Copy(ps_ligne, 63, 1);
    s_indic_reserve_autre_n := Copy(ps_ligne, 64, 1);
    s_indic_teletransmission_n := Copy(ps_ligne, 65, 1);
    s_date_debut_teletransmission_d := Copy(ps_ligne, 66, 8);
    s_date_fin_teletransmission_d := Copy(ps_ligne, 74, 8);
    s_indic_surveillance_viager_n := Copy(ps_ligne, 82, 1);
    s_indic_gestion_cetip_n := Copy(ps_ligne, 83, 1);
    s_date_debut_cetip_d := Copy(ps_ligne, 84, 8);
    s_date_fin_cetip_d := Copy(ps_ligne, 92, 8);
    s_code_pays := Trim(Copy(ps_ligne, 100, 3));
    s_code_departement := Trim(Copy(ps_ligne, 103, 3));
    s_classe_risque := Copy(ps_ligne, 106, 2);
    s_situation_famille := Trim(Copy(ps_ligne, 108, 2));
    s_code_sexe := Trim(Copy(ps_ligne, 110, 1));
    s_date_naissance_d := Trim(Copy(ps_ligne, 111, 8));
    s_categorie_socio_prof := Copy(ps_ligne, 119, 4);
    s_categorie_sociale := Trim(Copy(ps_ligne, 123, 12));
    s_secteur_professionnel := Copy(ps_ligne, 135, 5);
    s_salaire_reference_n := Copy(ps_ligne, 140, 16);
    s_code_insee := Trim(Copy(ps_ligne, 156, 13));
    s_cle_insee := Trim(Copy(ps_ligne, 169, 2));
    s_num_pers_n := Copy(ps_ligne, 171, 8);
    s_num_relation_n := Copy(ps_ligne, 179, 8);
    s_facette_pers_phys_morale_n := Copy(ps_ligne, 187, 1);
    s_date_debut_activite_d := Copy(ps_ligne, 188, 8);
    s_date_fin_activite_d := Copy(ps_ligne, 196, 8);
    s_filiere := Copy(ps_ligne, 204, 2);
    s_profession := Copy(ps_ligne, 206, 5);
    s_categorie_college := Copy(ps_ligne, 211, 2);
    s_position_statutaire := Copy(ps_ligne, 213, 2);
    s_code_usine := Copy(ps_ligne, 215, 10);
    s_code_atelier := Copy(ps_ligne, 225, 10);
    s_montant_prime_annuelle_n := Copy(ps_ligne, 235, 16);
    s_matricule := Copy(ps_ligne, 251, 15);
    s_code_fonction := Copy(ps_ligne, 266, 5);
    s_code_tranche_revenu_annuel := Copy(ps_ligne, 271, 2);
    s_code_exploitant := Copy(ps_ligne, 273, 2);
    s_code_etablissement := Copy(ps_ligne, 275, 20);
    s_coefficient_grade := Copy(ps_ligne, 295, 5);
    s_type_conges := Copy(ps_ligne, 300, 2);
    s_type_contrat_travail := Copy(ps_ligne, 302, 2);
    s_zone_reservee_mnh := Copy(ps_ligne, 304, 10);
    s_indic_presence_critere_libre := Copy(ps_ligne, 314, 1);
    s_critere_libre_1 := Copy(ps_ligne, 315, 6);
    s_critere_libre_2 := Copy(ps_ligne, 321, 6);
    s_critere_libre_3 := Copy(ps_ligne, 327, 6);
    s_critere_libre_4 := Copy(ps_ligne, 333, 6);
    s_critere_libre_5 := Copy(ps_ligne, 339, 6);
    s_motif_resiliation := Copy(ps_ligne, 345, 5);
    s_modalite_resiliation := Copy(ps_ligne, 350, 5);
    s_societe_concurrente := Copy(ps_ligne, 355, 9);
    s_motif_non_teletransmission := Copy(ps_ligne, 364, 2);
    s_numero_ancien_contrat := Copy(ps_ligne, 366, 15);
    s_ancien_rang_assure := Copy(ps_ligne, 381, 2);
    s_indic_report_prestations_n := Copy(ps_ligne, 383, 1);
    s_num_pers_assuree_n := Copy(ps_ligne, 384, 8);
    s_code_exploitant_dix_carac := Copy(ps_ligne, 392, 10);
    s_unite_mesure_quotite_travail := Copy(ps_ligne, 402, 2);
    s_quotite_travail_ref_entreprise_n := Copy(ps_ligne, 404, 8);
    s_quotite_travail_contrat_travail_n := Copy(ps_ligne, 412, 8);
    s_modalite_exercice_contrat_travail := Copy(ps_ligne, 420, 2);
    s_regime_alsace_moselle := Copy(ps_ligne, 422, 2);
    s_code_convention_collective := Copy(ps_ligne, 424, 4);
    s_code_ro_risque_maladie := Copy(ps_ligne, 428, 3);
    s_siret_lieu_travail := Copy(ps_ligne, 431, 14);
    s_num_brevet_livraison_pension := Copy(ps_ligne, 445, 9);
    s_service_gestionnaire := Copy(ps_ligne, 454, 4);
    s_departement_gestion := Copy(ps_ligne, 458, 3);
    s_num_liaison := Copy(ps_ligne, 461, 15);
    s_code_ministere := Copy(ps_ligne, 476, 3);
    s_tresorerie_centre_paye := Copy(ps_ligne, 479, 3);
    s_departement_centre_paye := Copy(ps_ligne, 482, 3);
    s_identifiant_defense := Copy(ps_ligne, 485, 10);
    s_code_departement_affectation := Copy(ps_ligne, 495, 3);
    s_code_poste := Copy(ps_ligne, 498, 4);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite405(ps_ligne: String);
begin

  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e400[i_dossier_evt_assure].e405 do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_code_civilite := Trim(Copy(ps_ligne, 26, 6));
    s_code_titre := Copy(ps_ligne, 32, 6);
    s_nom := Trim(Copy(ps_ligne, 38, 50));
    s_prenom_1 := Trim(Copy(ps_ligne, 88, 20));
    s_prenom_2 := Copy(ps_ligne, 108, 20);
    s_prenom_3 := Copy(ps_ligne, 128, 20);
    s_prenom_4 := Copy(ps_ligne, 148, 20);
    s_num_insee := Trim(Copy(ps_ligne, 168, 13));
    s_nom_jeune_fille := Trim(Copy(ps_ligne, 181, 50));
    s_idfsys_pers_princ_n := Copy(ps_ligne, 231, 8);
    s_idfsys_nom_pers_princ_n := Copy(ps_ligne, 239, 8);
    s_type_lien := Copy(ps_ligne, 247, 1);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite410(ps_ligne: String);
begin

  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e400[i_dossier_evt_assure].e410 do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_date_naissance_d := Trim(Copy(ps_ligne, 26, 8));
    s_type_date := Copy(ps_ligne, 34, 2);
    s_type_assure_ro := Copy(ps_ligne, 36, 1);
    s_ayant_droit_n := Copy(ps_ligne, 37, 2);
    s_date_debut_rattachement_d := Copy(ps_ligne, 39, 8);
    s_date_fin_rattachement_d := Copy(ps_ligne, 47, 8);
    s_rang_naissance_n := Trim(Copy(ps_ligne, 55, 2));
    s_numero_ro := Trim(Copy(ps_ligne, 57, 13));
    s_cle_ro := Trim(Copy(ps_ligne, 70, 2));
    s_code_grand_regime := Trim(Copy(ps_ligne, 72, 2));
    s_code_caisse_ro := Trim(Copy(ps_ligne, 74, 3));
    s_code_centre_paiement := Trim(Copy(ps_ligne, 77, 4));
    s_date_debut_droit_ro_d := Copy(ps_ligne, 81, 8);
    s_date_fin_droit_ro_d := Copy(ps_ligne, 89, 8);
    s_motif_fin_droit_ro := Copy(ps_ligne, 97, 2);
    s_date_fin_droit_prestations_d := Copy(ps_ligne, 99, 8);
    s_motif_fin_droit_prestations := Copy(ps_ligne, 107, 3);
    s_date_fin_droit_vitale_d := Copy(ps_ligne, 110, 8);
    s_date_dern_maj_vitale_d := Copy(ps_ligne, 118, 8);
    s_code_dep_code_grand_regime := Copy(ps_ligne, 126, 3);
    s_regime_principal := Copy(ps_ligne, 129, 3);
    s_date_debut_affiliation_regime_princ_d := Copy(ps_ligne, 132, 8);
    s_regime_secondaire := Copy(ps_ligne, 140, 3);
    s_date_debut_affiliation_regime_secon_d := Copy(ps_ligne, 143, 8);
    s_date_prem_immat_regime_d := Copy(ps_ligne, 151, 8);
    s_code_grand_regime_prec := Copy(ps_ligne, 159, 2);
    s_code_caisse_ro_prec := Copy(ps_ligne, 161, 3);
    s_code_centre_paiement_prec := Copy(ps_ligne, 164, 4);
    s_code_dep_code_grand_regime_prec := Copy(ps_ligne, 168, 3);
    s_code_regime_affiliation_prec := Copy(ps_ligne, 171, 3);
    s_num_contrat_ro_gestion_affiliation := Copy(ps_ligne, 174, 15);
    s_rang_ro_n := Copy(ps_ligne, 189, 2);
    s_code_etablissement_frequente := Copy(ps_ligne, 191, 10);
    s_code_grand_regime_parents := Copy(ps_ligne, 201, 2);
    s_code_caisse_ro_parents := Copy(ps_ligne, 203, 2);
    s_code_centre_paiement_parents := Copy(ps_ligne, 205, 4);
    s_code_petit_regime_parents := Copy(ps_ligne, 209, 3);
    s_nationalite := Copy(ps_ligne, 212, 3);
    s_indic_pris_compte_sec_rattachement := Copy(ps_ligne, 215, 1);
    s_ayant_droit_sec_rattachement_n := Copy(ps_ligne, 216, 2);
    s_date_debut_sec_rattachement_d := Copy(ps_ligne, 218, 8);
    s_date_fin_sec_rattachement_d := Copy(ps_ligne, 226, 8);
    s_numero_ro_sec_rattachement := Copy(ps_ligne, 234, 13);
    s_cle_numero_ro_sec_rattachement := Copy(ps_ligne, 247, 2);
    s_code_grand_regime_sec_rattachement := Copy(ps_ligne, 249, 2);
    s_code_caisse_ro_sec_rattachement := Copy(ps_ligne, 251, 3);
    s_code_centre_paiement_sec_rattachement := Copy(ps_ligne, 254, 4);
    s_date_debut_droits_sec_rattachement_d := Copy(ps_ligne, 258, 8);
    s_date_fin_droits_sec_rattachement_d := Copy(ps_ligne, 266, 8);
    s_motif_fin_droits_sec_rattachement := Copy(ps_ligne, 274, 2);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite411(ps_ligne: String);
begin

  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e400[i_dossier_evt_assure].e411 do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_indic_action_attestation := Trim(Copy(ps_ligne, 26, 1));
    s_type_attestation_acs := Copy(ps_ligne, 27, 5);
    s_date_debut_attestation_acs_d := Trim(Copy(ps_ligne, 32, 8));
    s_date_fin_attestation_acs_d := Trim(Copy(ps_ligne, 40, 8));
    s_montant_aide_accordee_n := Copy(ps_ligne, 48, 16);

  end;

end;

procedure AjouterEntite485(ps_ligne: String);
begin

  // Nouveau critère sur l'assuré
  i_dossier_evt_assure_critere := i_dossier_evt_assure_critere + 1;
  SetLength(ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e400[i_dossier_evt_assure].a_e485, i_dossier_evt_assure_critere + 1);

  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e400[i_dossier_evt_assure].a_e485[i_dossier_evt_assure_critere] do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_code := Trim(Copy(ps_ligne, 26, 6));
    s_valeur := Trim(Copy(ps_ligne, 32, 10));

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite490(ps_ligne: String);
begin

  // Nouveau critère sur l'assuré
  i_dossier_evt_assure_valeur_souscription := i_dossier_evt_assure_valeur_souscription + 1;
  SetLength(ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e400[i_dossier_evt_assure].a_e490, i_dossier_evt_assure_valeur_souscription + 1);

  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e400[i_dossier_evt_assure].a_e490[i_dossier_evt_assure_valeur_souscription] do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_code := Trim(Copy(ps_ligne, 26, 6));
    s_valeur := Trim(Copy(ps_ligne, 32, 20));

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite700(ps_ligne: String);
var
  s_ligne_400: String;
begin

  // Le fichier de rejet peut ne pas contenir l'entité 400 de l'entité 700 correspondante et qui doit donc être créée ici.
  if frmMain.FFichierRejet then
  begin

    if not b_entite400_creee then
    begin

         //s_ligne_400 := 'LIGNE DE REJET 400 REELLE RETIREE (DONNEE PERSONNELLE)';

         with ac056.a_e001[i_dossier].a_e100[i_dossier_evt] do
         begin

           s_ligne_400 := s_num_emetteur + s_num_dossier_n + s_num_evt_n + Copy(ps_ligne, 21, 2) + '400' + Copy(ps_ligne, 21, 2) + StringOfChar(' ', 28) + 'XXXXXX' +
                          '                00                ' + e120.s_code_pays + e120.s_code_departement + '   X X19000101' + StringOfChar(' ', 21) +
                          StringOfChar('0', 16) + StringOfChar('X', 16) + StringOfChar('0', 17) + StringOfChar(' ', 47) + StringOfChar('0', 16) +
                          StringOfChar(' ', 132) + '000000000            0000000000000000' + StringOfChar(' ', 281) + '000910970 ESACIE70';

         end;

         AjouterEntite400(s_ligne_400);

    end;

  end;

  // Nouvelle garantie sur l'assuré
  i_dossier_evt_assure_garantie := i_dossier_evt_assure_garantie + 1;
  SetLength(ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e400[i_dossier_evt_assure].a_e700, i_dossier_evt_assure_garantie + 1);

  // Stocker les informations
  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e400[i_dossier_evt_assure].a_e700[i_dossier_evt_assure_garantie] do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_indic_action_garantie := Copy(ps_ligne, 26, 1);
    s_code_assureur := Trim(Copy(ps_ligne, 27, 9));
    s_code_produit := Trim(Copy(ps_ligne, 36, 10));
    s_code_garantie := Trim(Copy(ps_ligne, 46, 10));
    s_code_condition_vente := Trim(Copy(ps_ligne, 56, 6));
    s_code_version_tarifaire := Copy(ps_ligne, 62, 10);
    s_anciennete_garantie_souscr_d := Copy(ps_ligne, 72, 8);
    s_fin_enfant_a_charge_d := Copy(ps_ligne, 80, 8);
    s_reserves_medicale_n := Copy(ps_ligne, 88, 1);
    s_reserves_autres_n := Copy(ps_ligne, 89, 1);
    s_date_naissance_derogee_d := Copy(ps_ligne, 90, 8);
    s_num_externe := Copy(ps_ligne, 98, 15);
    s_sexe_deroge := Copy(ps_ligne, 113, 1);
    s_type_assure_deroge := Copy(ps_ligne, 114, 6);
    s_csp_deroge := Copy(ps_ligne, 120, 4);
    s_categorie_sociale_deroge := Copy(ps_ligne, 124, 12);
    s_coef_migration_n := Copy(ps_ligne, 136, 14);
    s_code_assureur_garantie_remp := Copy(ps_ligne, 150, 9);
    s_code_garantie_remp := Copy(ps_ligne, 159, 10);
    s_appliquer_stage_cv_n := Copy(ps_ligne, 169, 1);
    s_date_fin_stage_1_d := Copy(ps_ligne, 170, 8);
    s_code_stage_1 := Copy(ps_ligne, 178, 6);
    s_date_fin_stage_2_d := Copy(ps_ligne, 184, 8);
    s_code_stage_2 := Copy(ps_ligne, 192, 6);
    s_date_fin_stage_3_d := Copy(ps_ligne, 198, 8);
    s_code_stage_3 := Copy(ps_ligne, 206, 6);
    s_date_fin_stage_4_d := Copy(ps_ligne, 212, 8);
    s_code_stage_4 := Copy(ps_ligne, 220, 6);
    s_date_fin_stage_5_d := Copy(ps_ligne, 226, 8);
    s_code_stage_5 := Copy(ps_ligne, 234, 6);
    s_type_garantie_assemblee_n := Trim(Copy(ps_ligne, 240, 1));
    s_num_produit_groupe_assures_n := Copy(ps_ligne, 241, 5);
    s_num_garantie_groupe_assures_n := Copy(ps_ligne, 246, 5);
    s_zone_banalisee := Copy(ps_ligne, 251, 16);
    s_zone_reservee_mnh := Copy(ps_ligne, 267, 16);
    s_idfsys_periode_condition_vente_n := Copy(ps_ligne, 283, 8);
    s_idfsys_version_tarifaire_n := Copy(ps_ligne, 291, 8);
    s_code_operation_commerciale := Copy(ps_ligne, 299, 6);
    s_idfsys_operation_commerciale_n := Copy(ps_ligne, 305, 8);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite800(ps_ligne: String);
begin

  with ac056.a_e001[i_dossier].a_e100[i_dossier_evt].a_e400[i_dossier_evt_assure].e800 do
  begin

    s_num_emetteur := Copy(ps_ligne, 1, 9);
    s_num_dossier_n := Copy(ps_ligne, 10, 8);
    s_num_evt_n := Copy(ps_ligne, 18, 3);
    s_rang_n := Copy(ps_ligne, 21, 2);
    s_num_entite_n := Copy(ps_ligne, 23, 3);
    s_rang_personne_n := Trim(Copy(ps_ligne, 26, 2));
    s_indic_action_ref_externe := Copy(ps_ligne, 28, 1);
    s_facette_ref_externe_n := Copy(ps_ligne, 29, 1);
    s_code_systeme_externe := Copy(ps_ligne, 30, 10);
    s_ref_externe := Trim(Copy(ps_ligne, 40, 30));
    s_mot_cle_1 := Copy(ps_ligne, 70, 30);
    s_valeur_2 := Copy(ps_ligne, 100, 30);
    s_mot_cle_2 := Copy(ps_ligne, 130, 30);
    s_valeur_3 := Copy(ps_ligne, 160, 30);
    s_mot_cle_3 := Copy(ps_ligne, 190, 30);
    s_valeur_4 := Copy(ps_ligne, 220, 30);
    s_mot_cle_4 := Copy(ps_ligne, 250, 30);
    s_valeur_5 := Copy(ps_ligne, 280, 30);
    s_mot_cle_5 := Copy(ps_ligne, 310, 30);

    if frmMain.FFichierRejet then s_erreur := GetErreur(ps_ligne);

  end;

end;

procedure AjouterEntite990(ps_ligne: String);
begin

  ac056.a_e001[i_dossier].a_e100[i_dossier_evt].e990.s_ligne := ps_ligne;

end;

procedure AjouterEntite995(ps_ligne: String);
begin

  ac056.a_e001[i_dossier].e995.s_ligne := ps_ligne;

end;

procedure AjouterEntite999(ps_ligne: String);
begin

  ac056.e999.s_ligne := ps_ligne;

end;

// Procédures et fonctions publiques

procedure AjouterEntite(ps_ligne: String);
var
  s_entite: String;
begin

  // Déterminer l'entité
  s_entite := Copy(ps_ligne, 23, 3);

  // Appeler la procédure de chargement de l'entité
  try

    case s_entite of

      '000': if not frmMain.FFichierRejet then AjouterEntite000(ps_ligne);
      '001': if not frmMain.FFichierRejet then AjouterEntite001(ps_ligne);
      '100': AjouterEntite100(ps_ligne);
      '110': AjouterEntite110(ps_ligne);
      '115': AjouterEntite115(ps_ligne);
      '120': AjouterEntite120(ps_ligne);
      '125': AjouterEntite125(ps_ligne);
      '130': AjouterEntite130(ps_ligne);
      '135': AjouterEntite135(ps_ligne);
      '155': AjouterEntite155(ps_ligne);
      '180': AjouterEntite180(ps_ligne);
      '400': AjouterEntite400(ps_ligne);
      '405': AjouterEntite405(ps_ligne);
      '410': AjouterEntite410(ps_ligne);
      '411': AjouterEntite411(ps_ligne);
      '485': AjouterEntite485(ps_ligne);
      '490': AjouterEntite490(ps_ligne);
      '700': AjouterEntite700(ps_ligne);
      '800': AjouterEntite800(ps_ligne);
      '990': AjouterEntite990(ps_ligne);
      '995': AjouterEntite995(ps_ligne);
      '999': if not frmMain.FFichierRejet then AjouterEntite999(ps_ligne);
      else ShowMessage('Entité ' + s_entite + ' inconnue');

    end;

  except

    frmMain.AjouterJournal('Exception levée à la ligne ' + IntToStr(frmMain.FLigneAc056Lue) + ' : ' + ps_ligne, JOURNAL_STYLE_ERREUR);

  end;
end;

function GetEntite100Ligne(pe100: t_entite_100): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  with pe100 do
  begin

    s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
    s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
    s_result := s_result + AddCharR('0', s_num_evt_n, 3);
    s_result := s_result + AddCharR('0', s_rang_n, 2);
    s_result := s_result + AddCharR('0', s_num_entite_n, 3);
    s_result := s_result + AddCharR('0', s_code_evt_n, 3);
    s_result := s_result + AddCharR('0', s_code_site_n, 2);
    s_result := s_result + AddCharR(' ', s_type_contrat, 1);
    s_result := s_result + AddCharR(' ', s_num_propo, 15);
    s_result := s_result + AddCharR(' ', s_num_contrat_indiv, 15);
    s_result := s_result + AddCharR(' ', s_num_contrat_collectif, 15);
    s_result := s_result + AddCharR(' ', s_code_groupe_assures, 6);
    s_result := s_result + AddCharR(' ', s_code_entite_rattachement, 9);
    s_result := s_result + AddCharR(' ', s_date_effet_acte_d, 8);
    s_result := s_result + AddCharR(' ', s_date_effet_cotisation_d, 8);
    s_result := s_result + AddCharR(' ', s_date_vente_d, 8);
    s_result := s_result + AddCharR(' ', s_date_demande_d, 8);
    s_result := s_result + AddCharR(' ', s_code_offre, 10);
    s_result := s_result + AddCharR(' ', s_code_reseau, 9);
    s_result := s_result + AddCharR(' ', s_code_producteur, 9);
    s_result := s_result + AddCharR(' ', s_code_agence, 9);
    s_result := s_result + AddCharR(' ', s_num_externe_contrat, 15);
    s_result := s_result + AddCharR('0', s_ech_princ_n, 4);
    s_result := s_result + AddCharR(' ', s_groupe_gestion, 9);
    s_result := s_result + AddCharR(' ', s_centre_gestion, 9);
    s_result := s_result + AddCharR(' ', s_code_contexte, 4);
    s_result := s_result + AddCharR(' ', s_systeme_origine, 5);
    s_result := s_result + AddCharR(' ', s_utilisateur, 8);
    s_result := s_result + AddCharR('0', s_idt_systeme_origine_n, 8);
    s_result := s_result + AddCharR('0', s_num_ope_resil_origine_n, 5);
    s_result := s_result + AddCharR('0', s_idfsys_contrat_n, 8);
    s_result := s_result + AddCharR('0', s_idfsys_objet_pivot_n, 8);
    s_result := s_result + AddCharR(' ', s_code_evt_annule, 3);
    s_result := s_result + AddCharR('0', s_idfsys_propo_base_grc_n, 8);
    s_result := s_result + AddCharR('0', s_idfsys_propo_base_contrat_n, 8);
    s_result := s_result + AddCharR('0', s_num_ope_propo_n, 5);
    s_result := s_result + AddCharR('0', s_idfsys_devis_n, 8);
    s_result := s_result + AddCharR('0', s_idfsys_groupe_gestion_n, 8);
    s_result := s_result + AddCharR('0', s_idfsys_centre_gestion_n, 8);
    s_result := s_result + AddCharR('0', s_idfsys_offre_n, 8);
    s_result := s_result + AddCharR('0', s_idfsys_reseau_n, 8);
    s_result := s_result + AddCharR('0', s_idfsys_producteur_n, 8);
    s_result := s_result + AddCharR('0', s_idfsys_agence_n, 8);
    s_result := s_result + AddCharR(' ', s_code_acte_gestion, 4);
    s_result := s_result + AddCharR('0', s_indic_abrogation_frais_n, 1);
    s_result := s_result + AddCharR(' ', s_code_ope_ciale, 6);
    s_result := s_result + AddCharR('0', s_idfsys_ope_ciale_n, 8);
    s_result := s_result + AddCharR(' ', s_motif_mise_instance, 5);
    s_result := s_result + AddCharR(' ', s_indic_mise_instance, 1);
    s_result := s_result + AddCharR('0', s_idfsys_contrat_collectif_n, 8);
    s_result := s_result + AddCharR('0', s_idfsys_evt_dsn_n, 8);

  end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite110Ligne(pe110: t_entite_110): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  if pe110.s_num_dossier_n <> '' then

    with pe110 do
    begin

      s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
      s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
      s_result := s_result + AddCharR('0', s_num_evt_n, 3);
      s_result := s_result + AddCharR('0', s_rang_n, 2);
      s_result := s_result + AddCharR('0', s_num_entite_n, 3);
      s_result := s_result + AddCharR(' ', s_date_effet_d, 8);
      s_result := s_result + AddCharR(' ', s_date_effet_der_resil_d, 8);
      s_result := s_result + AddCharR(' ', s_ancien_contrat_d, 8);
      s_result := s_result + AddCharR(' ', s_origine_contrat, 2);
      s_result := s_result + AddCharR('0', s_indic_cmu_n, 1);
      s_result := s_result + AddCharR(' ', s_monnaie_gestion, 1);
      s_result := s_result + AddCharR('0', s_indic_abrogation_n, 1);
      s_result := s_result + AddCharR(' ', s_date_debut_surveillance_d, 8);
      s_result := s_result + AddCharR(' ', s_motif, 5);
      s_result := s_result + AddCharR('0', s_indic_asso_frais_n, 1);
      s_result := s_result + AddCharR(' ', s_type_association, 6);
      s_result := s_result + AddCharR('0', s_indic_loi_madelin_n, 1);
      s_result := s_result + AddCharR('0', s_debut_exercice_loi_mad_n, 4);
      s_result := s_result + AddCharR('0', s_indic_quittance_confiee_n, 1);
      s_result := s_result + AddCharR(' ', s_type_quittance_confiee, 1);
      s_result := s_result + AddCharR('0', s_indic_temporaire_n, 1);
      s_result := s_result + AddCharR('0', s_duree_n, 4);
      s_result := s_result + AddCharR('0', s_indic_nanti_n, 1);
      s_result := s_result + AddCharR('0', s_indic_note_couverture_n, 1);
      s_result := s_result + AddCharR('0', s_indic_reserves_medic_n, 1);
      s_result := s_result + AddCharR('0', s_indic_reserves_autres_n, 1);
      s_result := s_result + AddCharR(' ', s_motif_resil, 5);
      s_result := s_result + AddCharR(' ', s_modalite_resil, 5);
      s_result := s_result + AddCharR(' ', s_societe_concurrente, 9);
      s_result := s_result + AddCharR(' ', s_indic_presence_donnees, 1);
      s_result := s_result + AddCharR(' ', s_mecanisme_1, 1);
      s_result := s_result + AddCharR(' ', s_mecanisme_2, 1);
      s_result := s_result + AddCharR(' ', s_date_ancien_dispositif_d, 8);

    end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite115Ligne(pe115: t_entite_115): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  if pe115.s_num_dossier_n <> '' then

    with pe115 do
    begin

      s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
      s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
      s_result := s_result + AddCharR('0', s_num_evt_n, 3);
      s_result := s_result + AddCharR('0', s_rang_n, 2);
      s_result := s_result + AddCharR('0', s_num_entite_n, 3);
      s_result := s_result + AddCharR('0', s_rang_personne_n, 2);
      s_result := s_result + AddCharR(' ', s_ref_externe, 20);
      s_result := s_result + AddCharR(' ', s_code_civilite, 6);
      s_result := s_result + AddCharR(' ', s_code_titre, 6);
      s_result := s_result + AddCharR(' ', s_nom , 50);
      s_result := s_result + AddCharR(' ', s_prenom_1, 20);
      s_result := s_result + AddCharR(' ', s_prenom_2, 20);
      s_result := s_result + AddCharR(' ', s_prenom_3, 20);
      s_result := s_result + AddCharR(' ', s_prenom_4, 20);
      s_result := s_result + AddCharR(' ', s_num_insee, 13);
      s_result := s_result + AddCharR('0', s_idfsys_pers_princ_n, 8);
      s_result := s_result + AddCharR('0', s_facette_pers_princ_n, 1);
      s_result := s_result + AddCharR('0', s_idfsys_nom_pers_princ_n, 8);
      s_result := s_result + AddCharR(' ', s_type_lien_nom_pers_princ, 1);
      s_result := s_result + AddCharR(' ', s_nom_jeune_fille, 50);

    end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite120Ligne(pe120: t_entite_120): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  if pe120.s_num_dossier_n <> '' then

    with pe120 do
    begin

      s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
      s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
      s_result := s_result + AddCharR('0', s_num_evt_n, 3);
      s_result := s_result + AddCharR('0', s_rang_n, 2);
      s_result := s_result + AddCharR('0', s_num_entite_n, 3);
      s_result := s_result + AddCharR(' ', s_point_remise_courrier, 50);
      s_result := s_result + AddCharR(' ', s_complement_geographique, 50);
      s_result := s_result + AddCharR(' ', s_numero_voie, 9);
      s_result := s_result + AddCharR(' ', s_code_btq, 2);
      s_result := s_result + AddCharR(' ', s_code_nature_voie, 5);
      s_result := s_result + AddCharR(' ', s_libelle_voie, 50);
      s_result := s_result + AddCharR(' ', s_mention_particuliere_distribution, 50);
      s_result := s_result + AddCharR(' ', s_lieu_dit, 50);
      s_result := s_result + AddCharR(' ', s_code_postal_localite, 10);
      s_result := s_result + AddCharR(' ', s_libelle_localite, 50);
      s_result := s_result + AddCharR('0', s_code_cedex_n, 5);
      s_result := s_result + AddCharR(' ', s_nom_bureau_cedex, 26);
      s_result := s_result + AddCharR(' ', s_code_departement, 3);
      s_result := s_result + AddCharR(' ', s_code_pays, 3);
      s_result := s_result + AddCharR(' ', s_code_type_adresse, 4);
      s_result := s_result + AddCharR('0', s_nb_retours_npai_n, 2);
      s_result := s_result + AddCharR('0', s_adresse_liste_robinson_n, 1);
      s_result := s_result + AddCharR('0', s_interdiction_envoi_pub_n, 1);
      s_result := s_result + AddCharR('0', s_idfsys_relation_pers_princ_n, 8);
      s_result := s_result + AddCharR('0', s_idfsys_adresse_pers_princ_n, 8);
      s_result := s_result + AddCharR(' ', s_type_lien_adresse_pers_princ, 1);

    end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite125Ligne(pe125: t_entite_125): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  with pe125 do
  begin

    s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
    s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
    s_result := s_result + AddCharR('0', s_num_evt_n, 3);
    s_result := s_result + AddCharR('0', s_rang_n, 2);
    s_result := s_result + AddCharR('0', s_num_entite_n, 3);
    s_result := s_result + AddCharR(' ', s_code_type_coordonnee, 4);
    s_result := s_result + AddCharR(' ', s_code_nature_communication, 4);
    s_result := s_result + AddCharR(' ', s_valeur_coordonnee_communication, 50);
    s_result := s_result + AddCharR('0', s_idfsys_pers_princ_n, 8);
    s_result := s_result + AddCharR('0', s_idfsys_comm_pers_princ_n, 8);
    s_result := s_result + AddCharR(' ', s_type_lien_adresse_pers_princ, 1);

  end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite130Ligne(pe130: t_entite_130): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  if pe130.s_num_dossier_n <> '' then

    with pe130 do
    begin

      s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
      s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
      s_result := s_result + AddCharR('0', s_num_evt_n, 3);
      s_result := s_result + AddCharR('0', s_rang_n, 2);
      s_result := s_result + AddCharR('0', s_num_entite_n, 3);
      s_result := s_result + AddCharR(' ', s_code_banque, 10);
      s_result := s_result + AddCharR(' ', s_code_guichet, 10);
      s_result := s_result + AddCharR(' ', s_numero_compte, 20);
      s_result := s_result + AddCharR(' ', s_cle_controle, 2);
      s_result := s_result + AddCharR(' ', s_cle_iban, 4);
      s_result := s_result + AddCharR(' ', s_titulaire_compte, 50);
      s_result := s_result + AddCharR(' ', s_code_pays, 3);
      s_result := s_result + AddCharR(' ', s_code_devise, 3);
      s_result := s_result + AddCharR(' ', s_date_fin_effet_d, 8);
      s_result := s_result + AddCharR(' ', s_code_pays_iso2, 2);
      s_result := s_result + AddCharR(' ', s_code_bic, 14);
      s_result := s_result + AddCharR(' ', s_code_iban, 30);
      s_result := s_result + AddCharR(' ', s_indic_init_rib, 1);

    end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite135Ligne(pe135: t_entite_135): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  if pe135.s_num_dossier_n <> '' then

    with pe135 do
    begin

      s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
      s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
      s_result := s_result + AddCharR('0', s_num_evt_n, 2);
      s_result := s_result + AddCharR('0', s_rang_n, 2);
      s_result := s_result + AddCharR('0', s_num_entite_n, 3);
      s_result := s_result + AddCharR('0', s_rang_personne_n, 2);
      s_result := s_result + AddCharR(' ', s_ref_externe, 20);
      s_result := s_result + AddCharR('0', s_num_pers_souscriptrice_n, 8);
      s_result := s_result + AddCharR('0', s_idfsys_pers_souscr_n, 8);
      s_result := s_result + AddCharR('0', s_facette_pers_souscr_n, 1);

    end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite155Ligne(pe155: t_entite_155): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  if pe155.s_num_dossier_n <> '' then

    with pe155 do
    begin

      s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
      s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
      s_result := s_result + AddCharR('0', s_num_evt_n, 3);
      s_result := s_result + AddCharR('0', s_rang_n, 2);
      s_result := s_result + AddCharR('0', s_num_entite_n, 3);
      s_result := s_result + AddCharR('0', s_rang_personne_n, 2);
      s_result := s_result + AddCharR(' ', s_ref_externe, 20);
      s_result := s_result + AddCharR(' ', s_code_part, 3);
      s_result := s_result + AddCharR(' ', s_qualite_payeur, 1);
      s_result := s_result + AddCharR(' ', s_monnaie, 3);
      s_result := s_result + AddCharR(' ', s_mode, 2);
      s_result := s_result + AddCharR(' ', s_frequence_reglement, 2);
      s_result := s_result + AddCharR(' ', s_frequence_avis_echeance, 2);
      s_result := s_result + AddCharR(' ', s_type_terme,2);
      s_result := s_result + AddCharR(' ', s_echancier, 2);
      s_result := s_result + AddCharR(' ', s_debut_prelevement_d, 8);
      s_result := s_result + AddCharR(' ', s_fin_prelevement_d, 8);
      s_result := s_result + AddCharR(' ', s_motif_fin_prelevement, 2);
      s_result := s_result + AddCharR(' ', s_attention_de, 30);
      s_result := s_result + AddCharR(' ', s_type_payeur, 1);
      s_result := s_result + AddCharR('0', s_idfsys_pers_souscr_n, 8);
      s_result := s_result + AddCharR('0', s_idfsys_relation_pers_souscr_n, 8);
      s_result := s_result + AddCharR('0', s_facette_pers_souscr_n, 1);
      s_result := s_result + AddCharR(' ', s_e_service, 1);
      s_result := s_result + AddCharR(' ', s_report_donprc, 1);
      s_result := s_result + AddCharR(' ', s_indic_presence_donnees_mandat, 1);
      s_result := s_result + AddCharR(' ', s_date_signature_mandat_d, 8);
      s_result := s_result + AddCharR(' ', s_motif_cloture_mandant, 5);
      s_result := s_result + AddCharR(' ', s_date_annulation_mandat_d, 8);
      s_result := s_result + AddCharR(' ', s_reference_unique_mandat, 35);

    end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite180Ligne(pe180: t_entite_180): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  if pe180.s_num_dossier_n <> '' then

    with pe180 do
    begin

      s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
      s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
      s_result := s_result + AddCharR('0', s_num_evt_n, 3);
      s_result := s_result + AddCharR('0', s_rang_n, 2);
      s_result := s_result + AddCharR('0', s_num_entite_n, 3);
      s_result := s_result + AddCharR('0', s_rang_personne_n, 2);
      s_result := s_result + AddCharR(' ', s_ref_externe, 20);
      s_result := s_result + AddCharR(' ', s_mode_paiement, 2);
      s_result := s_result + AddCharR(' ', s_monnaie_paiement, 5);
      s_result := s_result + AddCharR(' ', s_attention_de, 30);
      s_result := s_result + AddCharR('0', s_idfsys_pers_dest_presta_n, 8);
      s_result := s_result + AddCharR('0', s_idfsys_relation_pers_dest_presta_n, 8);
      s_result := s_result + AddCharR('0', s_facette_pers_dest_presta_n, 1);
      s_result := s_result + AddCharR(' ', s_indic_alerte_rbt, 1);
      s_result := s_result + AddCharR(' ', s_report_donprc, 1);

    end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite400Ligne(pe400: t_entite_400): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  with pe400 do
  begin

    s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
    s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
    s_result := s_result + AddCharR('0', s_num_evt_n, 3);
    s_result := s_result + AddCharR('0', s_rang_n, 2);
    s_result := s_result + AddCharR('0', s_num_entite_n, 3);
    s_result := s_result + AddCharR('0', s_rang_personne_n, 2);
    s_result := s_result + AddCharR(' ', s_ref_externe, 20);
    s_result := s_result + AddCharR(' ', s_date_anciennete_d, 8);
    s_result := s_result + AddCharR(' ', s_type_assure, 6);
    s_result := s_result + AddCharR('0', s_indic_cmu_n, 1);
    s_result := s_result + AddCharR('0', s_indic_reserve_medicale_n, 1);
    s_result := s_result + AddCharR('0', s_indic_reserve_autre_n, 1);
    s_result := s_result + AddCharR('0', s_indic_teletransmission_n, 1);
    s_result := s_result + AddCharR(' ', s_date_debut_teletransmission_d, 8);
    s_result := s_result + AddCharR(' ', s_date_fin_teletransmission_d, 8);
    s_result := s_result + AddCharR('0', s_indic_surveillance_viager_n, 1);
    s_result := s_result + AddCharR('0', s_indic_gestion_cetip_n, 1);
    s_result := s_result + AddCharR(' ', s_date_debut_cetip_d, 8);
    s_result := s_result + AddCharR(' ', s_date_fin_cetip_d, 8);
    s_result := s_result + AddCharR(' ', s_code_pays, 3);
    s_result := s_result + AddCharR(' ', s_code_departement, 3);
    s_result := s_result + AddCharR(' ', s_classe_risque, 2);
    s_result := s_result + AddCharR(' ', s_situation_famille, 2);
    s_result := s_result + AddCharR(' ', s_code_sexe, 1);
    s_result := s_result + AddCharR(' ', s_date_naissance_d, 8);
    s_result := s_result + AddCharR(' ', s_categorie_socio_prof, 4);
    s_result := s_result + AddCharR(' ', s_categorie_sociale, 12);
    s_result := s_result + AddCharR(' ', s_secteur_professionnel, 5);
    s_result := s_result + AddCharR('0', s_salaire_reference_n, 16);
    s_result := s_result + AddCharR(' ', s_code_insee, 13);
    s_result := s_result + AddCharR(' ', s_cle_insee, 2);
    s_result := s_result + AddCharR('0', s_num_pers_n, 8);
    s_result := s_result + AddCharR('0', s_num_relation_n, 8);
    s_result := s_result + AddCharR('0', s_facette_pers_phys_morale_n, 1);
    s_result := s_result + AddCharR(' ', s_date_debut_activite_d, 8);
    s_result := s_result + AddCharR(' ', s_date_fin_activite_d, 8);
    s_result := s_result + AddCharR(' ', s_filiere, 2);
    s_result := s_result + AddCharR(' ', s_profession, 5);
    s_result := s_result + AddCharR(' ', s_categorie_college, 2);
    s_result := s_result + AddCharR(' ', s_position_statutaire, 2);
    s_result := s_result + AddCharR(' ', s_code_usine, 10);
    s_result := s_result + AddCharR(' ', s_code_atelier, 10);
    s_result := s_result + AddCharR('0', s_montant_prime_annuelle_n, 16);
    s_result := s_result + AddCharR(' ', s_matricule, 15);
    s_result := s_result + AddCharR(' ', s_code_fonction, 5);
    s_result := s_result + AddCharR(' ', s_code_tranche_revenu_annuel, 2);
    s_result := s_result + AddCharR(' ', s_code_exploitant, 2);
    s_result := s_result + AddCharR(' ', s_code_etablissement, 20);
    s_result := s_result + AddCharR(' ', s_coefficient_grade, 5);
    s_result := s_result + AddCharR(' ', s_type_conges, 2);
    s_result := s_result + AddCharR(' ', s_type_contrat_travail, 2);
    s_result := s_result + AddCharR(' ', s_zone_reservee_mnh, 10);
    s_result := s_result + AddCharR(' ', s_indic_presence_critere_libre, 1);
    s_result := s_result + AddCharR(' ', s_critere_libre_1, 6);
    s_result := s_result + AddCharR(' ', s_critere_libre_2, 6);
    s_result := s_result + AddCharR(' ', s_critere_libre_3, 6);
    s_result := s_result + AddCharR(' ', s_critere_libre_4, 6);
    s_result := s_result + AddCharR(' ', s_critere_libre_5, 6);
    s_result := s_result + AddCharR(' ', s_motif_resiliation, 5);
    s_result := s_result + AddCharR(' ', s_modalite_resiliation, 5);
    s_result := s_result + AddCharR(' ', s_societe_concurrente, 9);
    s_result := s_result + AddCharR(' ', s_motif_non_teletransmission, 2);
    s_result := s_result + AddCharR(' ', s_numero_ancien_contrat, 15);
    s_result := s_result + AddCharR(' ', s_ancien_rang_assure, 2);
    s_result := s_result + AddCharR('0', s_indic_report_prestations_n, 1);
    s_result := s_result + AddCharR('0', s_num_pers_assuree_n, 8);
    s_result := s_result + AddCharR(' ', s_code_exploitant_dix_carac, 10);
    s_result := s_result + AddCharR(' ', s_unite_mesure_quotite_travail, 2);
    s_result := s_result + AddCharR('0', s_quotite_travail_ref_entreprise_n, 8);
    s_result := s_result + AddCharR('0', s_quotite_travail_contrat_travail_n, 8);
    s_result := s_result + AddCharR(' ', s_modalite_exercice_contrat_travail, 2);
    s_result := s_result + AddCharR(' ', s_regime_alsace_moselle, 2);
    s_result := s_result + AddCharR(' ', s_code_convention_collective, 4);
    s_result := s_result + AddCharR(' ', s_code_ro_risque_maladie, 3);
    s_result := s_result + AddCharR(' ', s_siret_lieu_travail, 14);
    s_result := s_result + AddCharR(' ', s_num_brevet_livraison_pension, 9);
    s_result := s_result + AddCharR(' ', s_service_gestionnaire, 4);
    s_result := s_result + AddCharR(' ', s_departement_gestion, 3);
    s_result := s_result + AddCharR(' ', s_num_liaison, 15);
    s_result := s_result + AddCharR(' ', s_code_ministere, 3);
    s_result := s_result + AddCharR(' ', s_tresorerie_centre_paye, 3);
    s_result := s_result + AddCharR(' ', s_departement_centre_paye, 3);
    s_result := s_result + AddCharR(' ', s_identifiant_defense, 10);
    s_result := s_result + AddCharR(' ', s_code_departement_affectation, 3);
    s_result := s_result + AddCharR(' ', s_code_poste, 4);

  end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite405Ligne(pe405: t_entite_405): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  if pe405.s_num_dossier_n <> '' then

    with pe405 do
    begin

      s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
      s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
      s_result := s_result + AddCharR('0', s_num_evt_n, 3);
      s_result := s_result + AddCharR('0', s_rang_n, 2);
      s_result := s_result + AddCharR('0', s_num_entite_n, 3);
      s_result := s_result + AddCharR(' ', s_code_civilite, 6);
      s_result := s_result + AddCharR(' ', s_code_titre, 6);
      s_result := s_result + AddCharR(' ', s_nom, 50);
      s_result := s_result + AddCharR(' ', s_prenom_1, 20);
      s_result := s_result + AddCharR(' ', s_prenom_2, 20);
      s_result := s_result + AddCharR(' ', s_prenom_3, 20);
      s_result := s_result + AddCharR(' ', s_prenom_4, 20);
      s_result := s_result + AddCharR(' ', s_num_insee, 13);
      s_result := s_result + AddCharR(' ', s_nom_jeune_fille, 50);
      s_result := s_result + AddCharR('0', s_idfsys_pers_princ_n, 8);
      s_result := s_result + AddCharR('0', s_idfsys_nom_pers_princ_n, 8);
      s_result := s_result + AddCharR(' ', s_type_lien, 1);

    end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite410Ligne(pe410: t_entite_410): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  if pe410.s_num_dossier_n <> '' then

    with pe410 do
    begin

      s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
      s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
      s_result := s_result + AddCharR('0', s_num_evt_n, 3);
      s_result := s_result + AddCharR('0', s_rang_n, 2);
      s_result := s_result + AddCharR('0', s_num_entite_n, 3);
      s_result := s_result + AddCharR(' ', s_date_naissance_d, 8);
      s_result := s_result + AddCharR(' ', s_type_date, 2);
      s_result := s_result + AddCharR(' ', s_type_assure_ro, 1);
      s_result := s_result + AddCharR('0', s_ayant_droit_n, 2);
      s_result := s_result + AddCharR(' ', s_date_debut_rattachement_d, 8);
      s_result := s_result + AddCharR(' ', s_date_fin_rattachement_d, 8);
      s_result := s_result + AddCharR('0', s_rang_naissance_n, 2);
      s_result := s_result + AddCharR(' ', s_numero_ro, 13);
      s_result := s_result + AddCharR(' ', s_cle_ro, 2);
      s_result := s_result + AddCharR(' ', s_code_grand_regime, 2);
      s_result := s_result + AddCharR(' ', s_code_caisse_ro, 3);
      s_result := s_result + AddCharR(' ', s_code_centre_paiement, 4);
      s_result := s_result + AddCharR(' ', s_date_debut_droit_ro_d, 8);
      s_result := s_result + AddCharR(' ', s_date_fin_droit_ro_d, 8);
      s_result := s_result + AddCharR(' ', s_motif_fin_droit_ro, 2);
      s_result := s_result + AddCharR(' ', s_date_fin_droit_prestations_d, 8);
      s_result := s_result + AddCharR(' ', s_motif_fin_droit_prestations, 3);
      s_result := s_result + AddCharR(' ', s_date_fin_droit_vitale_d, 8);
      s_result := s_result + AddCharR(' ', s_date_dern_maj_vitale_d, 8);
      s_result := s_result + AddCharR(' ', s_code_dep_code_grand_regime, 3);
      s_result := s_result + AddCharR(' ', s_regime_principal, 3);
      s_result := s_result + AddCharR(' ', s_date_debut_affiliation_regime_princ_d, 8);
      s_result := s_result + AddCharR(' ', s_regime_secondaire, 3);
      s_result := s_result + AddCharR(' ', s_date_debut_affiliation_regime_secon_d, 8);
      s_result := s_result + AddCharR(' ', s_date_prem_immat_regime_d, 8);
      s_result := s_result + AddCharR(' ', s_code_grand_regime_prec, 2);
      s_result := s_result + AddCharR(' ', s_code_caisse_ro_prec, 3);
      s_result := s_result + AddCharR(' ', s_code_centre_paiement_prec, 4);
      s_result := s_result + AddCharR(' ', s_code_dep_code_grand_regime_prec, 3);
      s_result := s_result + AddCharR(' ', s_code_regime_affiliation_prec, 3);
      s_result := s_result + AddCharR(' ', s_num_contrat_ro_gestion_affiliation, 15);
      s_result := s_result + AddCharR('0', s_rang_ro_n, 2);
      s_result := s_result + AddCharR(' ', s_code_etablissement_frequente, 10);
      s_result := s_result + AddCharR(' ', s_code_grand_regime_parents, 2);
      s_result := s_result + AddCharR(' ', s_code_caisse_ro_parents, 2);
      s_result := s_result + AddCharR(' ', s_code_centre_paiement_parents, 4);
      s_result := s_result + AddCharR(' ', s_code_petit_regime_parents, 3);
      s_result := s_result + AddCharR(' ', s_nationalite, 3);
      s_result := s_result + AddCharR(' ', s_indic_pris_compte_sec_rattachement, 1);
      s_result := s_result + AddCharR('0', s_ayant_droit_sec_rattachement_n, 2);
      s_result := s_result + AddCharR(' ', s_date_debut_sec_rattachement_d, 8);
      s_result := s_result + AddCharR(' ', s_date_fin_sec_rattachement_d, 8);
      s_result := s_result + AddCharR(' ', s_numero_ro_sec_rattachement, 13);
      s_result := s_result + AddCharR(' ', s_cle_numero_ro_sec_rattachement, 2);
      s_result := s_result + AddCharR(' ', s_code_grand_regime_sec_rattachement, 2);
      s_result := s_result + AddCharR(' ', s_code_caisse_ro_sec_rattachement, 3);
      s_result := s_result + AddCharR(' ', s_code_centre_paiement_sec_rattachement, 4);
      s_result := s_result + AddCharR(' ', s_date_debut_droits_sec_rattachement_d, 8);
      s_result := s_result + AddCharR(' ', s_date_fin_droits_sec_rattachement_d, 8);
      s_result := s_result + AddCharR(' ', s_motif_fin_droits_sec_rattachement, 2);

    end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite411Ligne(pe411: t_entite_411): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  if pe411.s_num_dossier_n <> '' then

    with pe411 do
    begin

      s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
      s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
      s_result := s_result + AddCharR('0', s_num_evt_n, 3);
      s_result := s_result + AddCharR('0', s_rang_n, 2);
      s_result := s_result + AddCharR('0', s_num_entite_n, 3);
      s_result := s_result + AddCharR(' ', s_indic_action_attestation, 1);
      s_result := s_result + AddCharR(' ', s_type_attestation_acs, 5);
      s_result := s_result + AddCharR(' ', s_date_debut_attestation_acs_d, 8);
      s_result := s_result + AddCharR(' ', s_date_fin_attestation_acs_d, 8);
      s_result := s_result + AddCharR('0', s_montant_aide_accordee_n, 16);

    end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite485Ligne(pe485: t_entite_485): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  if pe485.s_num_dossier_n <> '' then

    with pe485 do
    begin
      s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
      s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
      s_result := s_result + AddCharR('0', s_num_evt_n, 3);
      s_result := s_result + AddCharR('0', s_rang_n, 2);
      s_result := s_result + AddCharR('0', s_num_entite_n, 3);
      s_result := s_result + AddCharR(' ', s_code, 6);
      s_result := s_result + AddCharR(' ', s_valeur, 10);
    end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite490Ligne(pe490: t_entite_490): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  if pe490.s_num_dossier_n <> '' then

    with pe490 do
    begin
      s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
      s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
      s_result := s_result + AddCharR('0', s_num_evt_n, 3);
      s_result := s_result + AddCharR('0', s_rang_n, 2);
      s_result := s_result + AddCharR('0', s_num_entite_n, 3);
      s_result := s_result + AddCharR(' ', s_code, 6);
      s_result := s_result + AddCharR(' ', s_valeur, 20);
    end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite700Ligne(pe700: t_entite_700): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  with pe700 do
  begin

    s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
    s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
    s_result := s_result + AddCharR('0', s_num_evt_n, 3);
    s_result := s_result + AddCharR('0', s_rang_n, 2);
    s_result := s_result + AddCharR('0', s_num_entite_n, 3);
    s_result := s_result + AddCharR(' ', s_indic_action_garantie, 1);
    s_result := s_result + AddCharR(' ', s_code_assureur, 9);
    s_result := s_result + AddCharR(' ', s_code_produit, 10);
    s_result := s_result + AddCharR(' ', s_code_garantie, 10);
    s_result := s_result + AddCharR(' ', s_code_condition_vente, 6);
    s_result := s_result + AddCharR(' ', s_code_version_tarifaire, 10);
    s_result := s_result + AddCharR(' ', s_anciennete_garantie_souscr_d, 8);
    s_result := s_result + AddCharR(' ', s_fin_enfant_a_charge_d, 8);
    s_result := s_result + AddCharR('0', s_reserves_medicale_n, 1);
    s_result := s_result + AddCharR('0', s_reserves_autres_n, 1);
    s_result := s_result + AddCharR(' ', s_date_naissance_derogee_d, 8);
    s_result := s_result + AddCharR(' ', s_num_externe, 15);
    s_result := s_result + AddCharR(' ', s_sexe_deroge, 1);
    s_result := s_result + AddCharR(' ', s_type_assure_deroge, 6);
    s_result := s_result + AddCharR(' ', s_csp_deroge, 4);
    s_result := s_result + AddCharR(' ', s_categorie_sociale_deroge, 12);
    s_result := s_result + AddCharR('0', s_coef_migration_n, 14);
    s_result := s_result + AddCharR(' ', s_code_assureur_garantie_remp, 9);
    s_result := s_result + AddCharR(' ', s_code_garantie_remp, 10);
    s_result := s_result + AddCharR('0', s_appliquer_stage_cv_n, 1);
    s_result := s_result + AddCharR(' ', s_date_fin_stage_1_d, 8);
    s_result := s_result + AddCharR(' ', s_code_stage_1, 6);
    s_result := s_result + AddCharR(' ', s_date_fin_stage_2_d, 8);
    s_result := s_result + AddCharR(' ', s_code_stage_2, 6);
    s_result := s_result + AddCharR(' ', s_date_fin_stage_3_d, 8);
    s_result := s_result + AddCharR(' ', s_code_stage_3, 6);
    s_result := s_result + AddCharR(' ', s_date_fin_stage_4_d, 8);
    s_result := s_result + AddCharR(' ', s_code_stage_4, 6);
    s_result := s_result + AddCharR(' ', s_date_fin_stage_5_d, 8);
    s_result := s_result + AddCharR(' ', s_code_stage_5, 6);
    s_result := s_result + AddCharR('0', s_type_garantie_assemblee_n, 1);
    s_result := s_result + AddCharR('0', s_num_produit_groupe_assures_n, 5);
    s_result := s_result + AddCharR('0', s_num_garantie_groupe_assures_n, 5);
    s_result := s_result + AddCharR(' ', s_zone_banalisee, 16);
    s_result := s_result + AddCharR(' ', s_zone_reservee_mnh, 16);
    s_result := s_result + AddCharR('0', s_idfsys_periode_condition_vente_n, 8);
    s_result := s_result + AddCharR('0', s_idfsys_version_tarifaire_n, 8);
    s_result := s_result + AddCharR(' ', s_code_operation_commerciale, 6);
    s_result := s_result + AddCharR('0', s_idfsys_operation_commerciale_n, 8);

  end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEntite800Ligne(pe800: t_entite_800): String;
var
  s_result: String;
begin

  // Initialisation des variables
  s_result := '';

  if pe800.s_num_dossier_n <> '' then

    with pe800 do
    begin

      s_result := s_result + AddCharR(' ', s_num_emetteur, 9);
      s_result := s_result + AddCharR('0', s_num_dossier_n, 8);
      s_result := s_result + AddCharR('0', s_num_evt_n, 3);
      s_result := s_result + AddCharR('0', s_rang_n, 2);
      s_result := s_result + AddCharR('0', s_num_entite_n, 3);
      s_result := s_result + AddCharR('0', s_rang_personne_n, 2);
      s_result := s_result + AddCharR(' ', s_indic_action_ref_externe, 1);
      s_result := s_result + AddCharR('0', s_facette_ref_externe_n, 1);
      s_result := s_result + AddCharR(' ', s_code_systeme_externe, 10);
      s_result := s_result + AddCharR(' ', s_ref_externe, 30);
      s_result := s_result + AddCharR(' ', s_mot_cle_1, 30);
      s_result := s_result + AddCharR(' ', s_valeur_2, 30);
      s_result := s_result + AddCharR(' ', s_mot_cle_2, 30);
      s_result := s_result + AddCharR(' ', s_valeur_3, 30);
      s_result := s_result + AddCharR(' ', s_mot_cle_3, 30);
      s_result := s_result + AddCharR(' ', s_valeur_4, 30);
      s_result := s_result + AddCharR(' ', s_mot_cle_4, 30);
      s_result := s_result + AddCharR(' ', s_valeur_5, 30);
      s_result := s_result + AddCharR(' ', s_mot_cle_5, 30);

    end;

  // Retourner le résultat
  Result := s_result;

end;

function GetEvenement(ps_dossier, ps_evenement: String): t_entite_100;
var
   b_trouve: Boolean;
   e100: t_entite_100;
   i_dossier_idx: Integer;
   i_dossier_evt_idx: Integer;
begin

  // Initialisation des variables
  b_trouve := False;

  // Rechercher l'évènement
  i_dossier_idx := 0;

  while (i_dossier_idx <= High(ac056.a_e001)) and (not b_trouve) do
  begin

    with ac056.a_e001[i_dossier_idx] do
    begin

      if s_num_dossier_n = ps_dossier then
      begin

        // Pour chaque évènement du dossier
        i_dossier_evt_idx := 0;

        while (i_dossier_evt_idx <= High(a_e100)) and (not b_trouve) do
        begin

          with a_e100[i_dossier_evt_idx] do
          begin

            if s_num_evt_n = ps_evenement then
            begin

              e100 := a_e100[i_dossier_evt_idx];
              b_trouve := True;

            end;

          end;

          // Evènement suivant
          i_dossier_evt_idx := i_dossier_evt_idx + 1;

        end;

      end;

    end;

    // Dossier suivant
    i_dossier_idx := i_dossier_idx + 1;

  end;

  // Retourner le résultat
  Result := e100;

end;

procedure ModifierDonnee(ps_dossier, ps_evenement: String; pi_ligne_beneficiaire: Integer; pi_ligne: Integer; pdm: TDonneeModifiable; s_valeur: String);
var
   i_dossier_idx: Integer;
   i_dossier_evt_idx: Integer;
   i_ligne, i_ligne_beneficiaire: Integer;
begin

  // Initialisation des variables
  i_ligne := pi_ligne - 1;
  i_ligne_beneficiaire := pi_ligne_beneficiaire - 1;

  for i_dossier_idx := 0 to High(ac056.a_e001) do
  begin

    with ac056.a_e001[i_dossier_idx] do
    begin

      if s_num_dossier_n = ps_dossier then

        for i_dossier_evt_idx := 0 to High(a_e100) do
        begin

          with a_e100[i_dossier_evt_idx] do
          begin

            if s_num_evt_n = ps_evenement then
            begin

              case pdm of

                E115_NOM              : e115.s_nom                                                     := s_valeur;
                E115_PRENOM           : e115.s_prenom_1                                                := s_valeur;
                E115_INSEE            : e115.s_num_insee                                               := s_valeur;
                E120_COMPLEMENT_GEO   : e120.s_complement_geographique                                 := s_valeur;
                E120_NUMERO_VOIE      : e120.s_numero_voie                                             := s_valeur;
                E120_LIBELLE_VOIE     : e120.s_libelle_voie                                            := s_valeur;
                E120_LIEU_DIT         : e120.s_lieu_dit                                                := s_valeur;
                E120_CODE_POSTAL      : e120.s_code_postal_localite                                    := s_valeur;
                E120_LIBELLE_LOCALITE : e120.s_libelle_localite                                        := s_valeur;
                E125_VALEUR           : a_e125[i_ligne_beneficiaire].s_valeur_coordonnee_communication := s_valeur;
                E400_RANG_BENEFICIAIRE: a_e400[i_ligne_beneficiaire].s_rang_n                          := s_valeur;
                E400_RANG_PERSONNE    : a_e400[i_ligne_beneficiaire].s_rang_personne_n                 := s_valeur;
                E405_RANG_BENEFICIAIRE: a_e400[i_ligne_beneficiaire].e405.s_rang_n                     := s_valeur;
                E405_NOM              : a_e400[i_ligne_beneficiaire].e405.s_nom                        := s_valeur;
                E405_PRENOM           : a_e400[i_ligne_beneficiaire].e405.s_prenom_1                   := s_valeur;
                E405_INSEE            : a_e400[i_ligne_beneficiaire].e405.s_num_insee                  := s_valeur;
                E405_NOM_JEUNE_FILLE  : a_e400[i_ligne_beneficiaire].e405.s_nom_jeune_fille            := s_valeur;
                E410_RANG_BENEFICIAIRE: a_e400[i_ligne_beneficiaire].e410.s_rang_n                     := s_valeur;
                E485_RANG_BENEFICIAIRE: a_e400[i_ligne_beneficiaire].a_e485[i_ligne].s_rang_n          := s_valeur;
                E490_RANG_BENEFICIAIRE: a_e400[i_ligne_beneficiaire].a_e490[i_ligne].s_rang_n          := s_valeur;
                E700_RANG_BENEFICIAIRE: a_e400[i_ligne_beneficiaire].a_e700[i_ligne].s_rang_n          := s_valeur;
                E800_RANG_BENEFICIAIRE: a_e400[i_ligne_beneficiaire].e800.s_rang_n                     := s_valeur;
                E800_RANG_PERSONNE    : a_e400[i_ligne_beneficiaire].e800.s_rang_personne_n            := s_valeur;

              end;

              ControlerEvenement(a_e100[i_dossier_evt_idx], pdm);

            end;

          end;

        end;

    end;

  end;

end;

end.


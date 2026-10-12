unit uTypes;

{$mode ObjFPC}{$H+}

interface

uses
  Classes, Controls, SysUtils;

type

  TEntite = (E000, E001, E100, E110, E115, E120, E125, E130, E135, E155, E180, E400, E405, E410, E411, E485, E490, E700, E800, E990, E995, E999);
  t_set_entite = set of TEntite;

  TDonneeModifiable = (
                       E115_NOM, E115_PRENOM, E115_INSEE,
                       E120_COMPLEMENT_GEO, E120_NUMERO_VOIE, E120_LIBELLE_VOIE, E120_LIEU_DIT, E120_CODE_POSTAL, E120_LIBELLE_LOCALITE,
                       E125_VALEUR,
                       E400_RANG_BENEFICIAIRE, E400_RANG_PERSONNE,
                       E405_RANG_BENEFICIAIRE, E405_NOM, E405_PRENOM, E405_INSEE, E405_NOM_JEUNE_FILLE,
                       E410_RANG_BENEFICIAIRE,
                       E485_RANG_BENEFICIAIRE,
                       E490_RANG_BENEFICIAIRE,
                       E700_RANG_BENEFICIAIRE,
                       E800_RANG_BENEFICIAIRE, E800_RANG_PERSONNE,
                       E_NONE
                      );

  t_controle_erreur = record
    wcmp: TWinControl;
    s_erreur: String;
  end;

  t_a_controle_erreur = array of t_controle_erreur;

  t_entite_000 = record
    s_ligne: String;
  end;

  t_entite_990 = record
    s_ligne: String;
  end;

  t_entite_110 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_date_effet_d: String;
    s_date_effet_der_resil_d: String;
    s_ancien_contrat_d: String;
    s_origine_contrat: String;
    s_indic_cmu_n: String;
    s_monnaie_gestion: String;
    s_indic_abrogation_n: String;
    s_date_debut_surveillance_d: String;
    s_motif: String;
    s_indic_asso_frais_n: String;
    s_type_association: String;
    s_indic_loi_madelin_n: String;
    s_debut_exercice_loi_mad_n: String;
    s_indic_quittance_confiee_n: String;
    s_type_quittance_confiee: String;
    s_indic_temporaire_n: String;
    s_duree_n: String;
    s_indic_nanti_n: String;
    s_indic_note_couverture_n: String;
    s_indic_reserves_medic_n: String;
    s_indic_reserves_autres_n: String;
    s_motif_resil: String;
    s_modalite_resil: String;
    s_societe_concurrente: String;
    s_indic_presence_donnees: String;
    s_mecanisme_1: String;
    s_mecanisme_2: String;
    s_date_ancien_dispositif_d: String;
    s_erreur: String;
  end;

  t_entite_115 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_rang_personne_n: String;
    s_ref_externe: String;
    s_code_civilite: String;
    s_code_titre: String;
    s_nom: String;
    s_prenom_1: String;
    s_prenom_2: String;
    s_prenom_3: String;
    s_prenom_4: String;
    s_num_insee: String;
    s_idfsys_pers_princ_n: String;
    s_facette_pers_princ_n: String;
    s_idfsys_nom_pers_princ_n: String;
    s_type_lien_nom_pers_princ: String;
    s_nom_jeune_fille: String;
    s_erreur: String;
    ace: array of t_controle_erreur;
  end;

  t_entite_120 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_point_remise_courrier: String;
    s_complement_geographique: String;
    s_numero_voie: String;
    s_code_btq: String;
    s_code_nature_voie: String;
    s_libelle_voie: String;
    s_mention_particuliere_distribution: String;
    s_lieu_dit: String;
    s_code_postal_localite: String;
    s_libelle_localite: String;
    s_code_cedex_n: String;
    s_nom_bureau_cedex: String;
    s_code_departement: String;
    s_code_pays: String;
    s_code_type_adresse: String;
    s_nb_retours_npai_n: String;
    s_adresse_liste_robinson_n: String;
    s_interdiction_envoi_pub_n: String;
    s_idfsys_relation_pers_princ_n: String;
    s_idfsys_adresse_pers_princ_n: String;
    s_type_lien_adresse_pers_princ: String;
    s_erreur: String;
    ace: array of t_controle_erreur;
  end;

  t_entite_125 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_code_type_coordonnee: String;
    s_code_nature_communication: String;
    s_valeur_coordonnee_communication: String;
    s_idfsys_pers_princ_n: String;
    s_idfsys_comm_pers_princ_n: String;
    s_type_lien_adresse_pers_princ: String;
    s_erreur: String;
    ace: array of t_controle_erreur;
  end;

  t_entite_130 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_code_banque: String;
    s_code_guichet: String;
    s_numero_compte: String;
    s_cle_controle: String;
    s_cle_iban: String;
    s_titulaire_compte: String;
    s_code_pays: String;
    s_code_devise: String;
    s_date_fin_effet_d: String;
    s_code_pays_iso2: String;
    s_code_bic: String;
    s_code_iban: String;
    s_indic_init_rib: String;
    s_erreur: String;
  end;

  t_entite_135 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_rang_personne_n: String;
    s_ref_externe: String;
    s_num_pers_souscriptrice_n: String;
    s_idfsys_pers_souscr_n: String;
    s_facette_pers_souscr_n: String;
    s_erreur: String;
  end;

  t_entite_155 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_rang_personne_n: String;
    s_ref_externe: String;
    s_code_part: String;
    s_qualite_payeur: String;
    s_monnaie: String;
    s_mode: String;
    s_frequence_reglement: String;
    s_frequence_avis_echeance: String;
    s_type_terme: String;
    s_echancier: String;
    s_debut_prelevement_d: String;
    s_fin_prelevement_d: String;
    s_motif_fin_prelevement: String;
    s_attention_de: String;
    s_type_payeur: String;
    s_idfsys_pers_souscr_n: String;
    s_idfsys_relation_pers_souscr_n: String;
    s_facette_pers_souscr_n: String;
    s_e_service: String;
    s_report_donprc: String;
    s_indic_presence_donnees_mandat: String;
    s_date_signature_mandat_d: String;
    s_motif_cloture_mandant: String;
    s_date_annulation_mandat_d: String;
    s_reference_unique_mandat: String;
    s_erreur: String;
  end;

  t_entite_180 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_rang_personne_n: String;
    s_ref_externe: String;
    s_mode_paiement: String;
    s_monnaie_paiement: String;
    s_attention_de: String;
    s_idfsys_pers_dest_presta_n: String;
    s_idfsys_relation_pers_dest_presta_n: String;
    s_facette_pers_dest_presta_n: String;
    s_indic_alerte_rbt: String;
    s_report_donprc: String;
    s_erreur: String;
  end;

  t_entite_405 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_code_civilite: String;
    s_code_titre: String;
    s_nom: String;
    s_prenom_1: String;
    s_prenom_2: String;
    s_prenom_3: String;
    s_prenom_4: String;
    s_num_insee: String;
    s_nom_jeune_fille: String;
    s_idfsys_pers_princ_n: String;
    s_idfsys_nom_pers_princ_n: String;
    s_type_lien: String;
    s_erreur: String;
    ace: array of t_controle_erreur;
  end;

  t_entite_410 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_date_naissance_d: String;
    s_type_date: String;
    s_type_assure_ro: String;
    s_ayant_droit_n: String;
    s_date_debut_rattachement_d: String;
    s_date_fin_rattachement_d: String;
    s_rang_naissance_n: String;
    s_numero_ro: String;
    s_cle_ro: String;
    s_code_grand_regime: String;
    s_code_caisse_ro: String;
    s_code_centre_paiement: String;
    s_date_debut_droit_ro_d: String;
    s_date_fin_droit_ro_d: String;
    s_motif_fin_droit_ro: String;
    s_date_fin_droit_prestations_d: String;
    s_motif_fin_droit_prestations: String;
    s_date_fin_droit_vitale_d: String;
    s_date_dern_maj_vitale_d: String;
    s_code_dep_code_grand_regime: String;
    s_regime_principal: String;
    s_date_debut_affiliation_regime_princ_d: String;
    s_regime_secondaire: String;
    s_date_debut_affiliation_regime_secon_d: String;
    s_date_prem_immat_regime_d: String;
    s_code_grand_regime_prec: String;
    s_code_caisse_ro_prec: String;
    s_code_centre_paiement_prec: String;
    s_code_dep_code_grand_regime_prec: String;
    s_code_regime_affiliation_prec: String;
    s_num_contrat_ro_gestion_affiliation: String;
    s_rang_ro_n: String;
    s_code_etablissement_frequente: String;
    s_code_grand_regime_parents: String;
    s_code_caisse_ro_parents: String;
    s_code_centre_paiement_parents: String;
    s_code_petit_regime_parents: String;
    s_nationalite: String;
    s_indic_pris_compte_sec_rattachement: String;
    s_ayant_droit_sec_rattachement_n: String;
    s_date_debut_sec_rattachement_d: String;
    s_date_fin_sec_rattachement_d: String;
    s_numero_ro_sec_rattachement: String;
    s_cle_numero_ro_sec_rattachement: String;
    s_code_grand_regime_sec_rattachement: String;
    s_code_caisse_ro_sec_rattachement: String;
    s_code_centre_paiement_sec_rattachement: String;
    s_date_debut_droits_sec_rattachement_d: String;
    s_date_fin_droits_sec_rattachement_d: String;
    s_motif_fin_droits_sec_rattachement: String;
    s_erreur: String;
    ace: array of t_controle_erreur;
  end;

  t_entite_411 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_indic_action_attestation: String;
    s_type_attestation_acs: String;
    s_date_debut_attestation_acs_d: String;
    s_date_fin_attestation_acs_d: String;
    s_montant_aide_accordee_n: String;
  end;

  t_entite_485 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_code: string;
    s_valeur: string;
    s_erreur: String;
    ace: array of t_controle_erreur;
  end;

  t_entite_490 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_code: string;
    s_valeur: string;
    s_erreur: String;
    ace: array of t_controle_erreur;
  end;

  t_entite_700 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_indic_action_garantie: String;
    s_code_assureur: String;
    s_code_produit: String;
    s_code_garantie: String;
    s_code_condition_vente: String;
    s_code_version_tarifaire: String;
    s_anciennete_garantie_souscr_d: String;
    s_fin_enfant_a_charge_d: String;
    s_reserves_medicale_n: String;
    s_reserves_autres_n: String;
    s_date_naissance_derogee_d: String;
    s_num_externe: String;
    s_sexe_deroge: String;
    s_type_assure_deroge: String;
    s_csp_deroge: String;
    s_categorie_sociale_deroge: String;
    s_coef_migration_n: String;
    s_code_assureur_garantie_remp: String;
    s_code_garantie_remp: String;
    s_appliquer_stage_cv_n: String;
    s_date_fin_stage_1_d: String;
    s_code_stage_1: String;
    s_date_fin_stage_2_d: String;
    s_code_stage_2: String;
    s_date_fin_stage_3_d: String;
    s_code_stage_3: String;
    s_date_fin_stage_4_d: String;
    s_code_stage_4: String;
    s_date_fin_stage_5_d: String;
    s_code_stage_5: String;
    s_type_garantie_assemblee_n: String;
    s_num_produit_groupe_assures_n: String;
    s_num_garantie_groupe_assures_n: String;
    s_zone_banalisee: String;
    s_zone_reservee_mnh: String;
    s_idfsys_periode_condition_vente_n: String;
    s_idfsys_version_tarifaire_n: String;
    s_code_operation_commerciale: String;
    s_idfsys_operation_commerciale_n: String;
    s_erreur: String;
    ace: array of t_controle_erreur;
  end;

  t_entite_800 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_rang_personne_n: String;
    s_indic_action_ref_externe: String;
    s_facette_ref_externe_n: String;
    s_code_systeme_externe: String;
    s_ref_externe: String;
    s_mot_cle_1: String;
    s_valeur_2: String;
    s_mot_cle_2: String;
    s_valeur_3: String;
    s_mot_cle_3: String;
    s_valeur_4: String;
    s_mot_cle_4: String;
    s_valeur_5: String;
    s_mot_cle_5: String;
    s_erreur: String;
    ace: array of t_controle_erreur;
  end;

  t_entite_400 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_rang_personne_n: String;
    s_ref_externe: String;
    s_date_anciennete_d: String;
    s_type_assure: String;
    s_indic_cmu_n: String;
    s_indic_reserve_medicale_n: String;
    s_indic_reserve_autre_n: String;
    s_indic_teletransmission_n: String;
    s_date_debut_teletransmission_d: String;
    s_date_fin_teletransmission_d: String;
    s_indic_surveillance_viager_n: String;
    s_indic_gestion_cetip_n: String;
    s_date_debut_cetip_d: String;
    s_date_fin_cetip_d: String;
    s_code_pays: String;
    s_code_departement: String;
    s_classe_risque: String;
    s_situation_famille: String;
    s_code_sexe: String;
    s_date_naissance_d: String;
    s_categorie_socio_prof: String;
    s_categorie_sociale: String;
    s_secteur_professionnel: String;
    s_salaire_reference_n: String;
    s_code_insee: String;
    s_cle_insee: String;
    s_num_pers_n: String;
    s_num_relation_n: String;
    s_facette_pers_phys_morale_n: String;
    s_date_debut_activite_d: String;
    s_date_fin_activite_d: String;
    s_filiere: String;
    s_profession: String;
    s_categorie_college: String;
    s_position_statutaire: String;
    s_code_usine: String;
    s_code_atelier: String;
    s_montant_prime_annuelle_n: String;
    s_matricule: String;
    s_code_fonction: String;
    s_code_tranche_revenu_annuel: String;
    s_code_exploitant: String;
    s_code_etablissement: String;
    s_coefficient_grade: String;
    s_type_conges: String;
    s_type_contrat_travail: String;
    s_zone_reservee_mnh: String;
    s_indic_presence_critere_libre: String;
    s_critere_libre_1: String;
    s_critere_libre_2: String;
    s_critere_libre_3: String;
    s_critere_libre_4: String;
    s_critere_libre_5: String;
    s_motif_resiliation: String;
    s_modalite_resiliation: String;
    s_societe_concurrente: String;
    s_motif_non_teletransmission: String;
    s_numero_ancien_contrat: String;
    s_ancien_rang_assure: String;
    s_indic_report_prestations_n: String;
    s_num_pers_assuree_n: String;
    s_code_exploitant_dix_carac: String;
    s_unite_mesure_quotite_travail: String;
    s_quotite_travail_ref_entreprise_n: String;
    s_quotite_travail_contrat_travail_n: String;
    s_modalite_exercice_contrat_travail: String;
    s_regime_alsace_moselle: String;
    s_code_convention_collective: String;
    s_code_ro_risque_maladie: String;
    s_siret_lieu_travail: String;
    s_num_brevet_livraison_pension: String;
    s_service_gestionnaire: String;
    s_departement_gestion: String;
    s_num_liaison: String;
    s_code_ministere: String;
    s_tresorerie_centre_paye: String;
    s_departement_centre_paye: String;
    s_identifiant_defense: String;
    s_code_departement_affectation: String;
    s_code_poste: String;
    e405: t_entite_405;
    e410: t_entite_410;
    e411: t_entite_411;
    a_e485: array of t_entite_485;
    a_e490: array of t_entite_490;
    a_e700: array of t_entite_700;
    e800: t_entite_800;
    s_erreur: String;
    ace: array of t_controle_erreur;
  end;

  t_entite_100 = record
    s_num_emetteur: String;
    s_num_dossier_n: String;
    s_num_evt_n: String;
    s_rang_n: String;
    s_num_entite_n: String;
    s_code_evt_n: String;
    s_code_site_n: String;
    s_type_contrat: String;
    s_num_propo: String;
    s_num_contrat_indiv: String;
    s_num_contrat_collectif: String;
    s_code_groupe_assures: String;
    s_code_entite_rattachement: String;
    s_date_effet_acte_d: String;
    s_date_effet_cotisation_d: String;
    s_date_vente_d: String;
    s_date_demande_d: String;
    s_code_offre: String;
    s_code_reseau: String;
    s_code_producteur: String;
    s_code_agence: String;
    s_num_externe_contrat: String;
    s_ech_princ_n: String;
    s_groupe_gestion: String;
    s_centre_gestion: String;
    s_code_contexte: String;
    s_systeme_origine: String;
    s_utilisateur: String;
    s_idt_systeme_origine_n: String;
    s_num_ope_resil_origine_n: String;
    s_idfsys_contrat_n: String;
    s_idfsys_objet_pivot_n: String;
    s_code_evt_annule: String;
    s_idfsys_propo_base_grc_n: String;
    s_idfsys_propo_base_contrat_n: String;
    s_num_ope_propo_n: String;
    s_idfsys_devis_n: String;
    s_idfsys_groupe_gestion_n: String;
    s_idfsys_centre_gestion_n: String;
    s_idfsys_offre_n: String;
    s_idfsys_reseau_n: String;
    s_idfsys_producteur_n: String;
    s_idfsys_agence_n: String;
    s_code_acte_gestion: String;
    s_indic_abrogation_frais_n: String;
    s_code_ope_ciale: String;
    s_idfsys_ope_ciale_n: String;
    s_motif_mise_instance: String;
    s_indic_mise_instance: String;
    s_idfsys_contrat_collectif_n: String;
    s_idfsys_evt_dsn_n: String;
    s_erreur: String;
    e110: t_entite_110;
    e115: t_entite_115;
    e120: t_entite_120;
    e130: t_entite_130;
    e135: t_entite_135;
    e155: t_entite_155;
    e180: t_entite_180;
    a_e125: array of t_entite_125;
    a_e400: array of t_entite_400;
    e990: t_entite_990;
  end;

  t_entite_995 = record
    s_ligne: String;
  end;

  t_entite_001 = record
    s_ligne: String;
    s_num_dossier_n: String;
    a_e100: array of t_entite_100;
    e995: t_entite_995;
  end;

  t_entite_999 = record
    s_ligne: String;
  end;

  t_ac056 = record
    e000: t_entite_000;
    a_e001: array of t_entite_001;
    e999: t_entite_999;
  end;

  TRejetDescriptionModeRecherche = (REJET_NONE, REJET_ALL, REJET_END, REJET_IN, REJET_START);

  t_rejet_description = record
    s_code: String;
    s_recherche_1: String;
    s_recherche_2: String;
    s_recherche_3: String;
    rdmr_recherche_1: TRejetDescriptionModeRecherche;
    rdmr_recherche_2: TRejetDescriptionModeRecherche;
    rdmr_recherche_3: TRejetDescriptionModeRecherche;
    s_explications: String;
  end;

  t_journal_style = (JOURNAL_STYLE_AUCUN, JOURNAL_STYLE_ERREUR, JOURNAL_STYLE_SUCCES, JOURNAL_STYLE_TITRE);

implementation

end.


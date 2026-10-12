unit fMain;

{$mode objfpc}
//{$MODE Delphi}
{$H+}
{$POINTERMATH ON}

interface

uses
  Classes, SysUtils, Forms, Controls, Graphics, Dialogs, ComCtrls, StdCtrls,
  Grids, DateTimePicker, Clipbrd, ExtCtrls, IdFTP, tgputtylib, tgputtysftp,
  uCEFChromium, uCEFWindowParent, uTypes, uCEFInterfaces, uCEFChromiumEvents, uCEFTypes,
  LCLIntf, Buttons, RichMemo, Messages, uCEFConstants, uCEFApplication, Types;

type

  { TfrmMain }

  TfrmMain = class(TForm)
    btnCharger: TButton;
    btnEnregistrer: TButton;
    btnFermer: TButton;
    btnVersion: TButton;
    btnIga: TButton;
    btnApiviaDepot: TButton;
    btnApiviaRejet: TButton;
    btnVeos: TButton;
    cbb100TypeContrat: TComboBox;
    cbb100CodeContexte: TComboBox;
    cbb115CodeCivilite: TComboBox;
    cbb120CodeBtq: TComboBox;
    cbb120CodeNatureVoie: TComboBox;
    cbb120CodeDepartement: TComboBox;
    cbb120CodePays: TComboBox;
    cbb120CodeTypeAdresse: TComboBox;
    cbb125Nature: TComboBox;
    cbb125Type: TComboBox;
    cbb130Pays: TComboBox;
    cbb130Devise: TComboBox;
    cbb180ModePaiement: TComboBox;
    cbb400TypeAssure: TComboBox;
    cbb400CodePaysTarifaire: TComboBox;
    cbb400DepartementTarifaire: TComboBox;
    cbb400SituationFamille: TComboBox;
    cbb400CodeSexe: TComboBox;
    cbb400CategorieSociale: TComboBox;
    cbb405CodeCivilite: TComboBox;
    cefwpChromiumMain: TCEFWindowParent;
    chromiumMain: TChromium;
    dtp110DateAncienneteContrat: TDateTimePicker;
    dtp400DateAncienneteAssure: TDateTimePicker;
    dtp700DateAncienneteGarantie: TDateTimePicker;
    dtp410DateNaissance: TDateTimePicker;
    dtp400DateNaissance: TDateTimePicker;
    dtp155DateDebutPrelevement: TDateTimePicker;
    dtp110DateEffetPremSouscr: TDateTimePicker;
    dtp100DateEffetCotisation: TDateTimePicker;
    dtp100DateVente: TDateTimePicker;
    dtp100DateDemande: TDateTimePicker;
    dtp100DateEffetActe: TDateTimePicker;
    dtp700DateFinStage: TDateTimePicker;
    edt485RangBeneficiaire: TEdit;
    edt490RangBeneficiaire: TEdit;
    edt490Code: TEdit;
    edt485Valeur: TEdit;
    edt490Valeur: TEdit;
    edt700CodeStage: TEdit;
    edt700RangBeneficiaire: TEdit;
    edt700CodeAssureur: TEdit;
    edt700CodeProduit: TEdit;
    edt700CodeGarantie: TEdit;
    edt700CodeConditionVente: TEdit;
    edt700DerogerDateStage: TEdit;
    edt485Code: TEdit;
    edt700TypeGarantie: TEdit;
    edt800RangBeneficiaire: TEdit;
    edt800RangPersonne: TEdit;
    edt800ReferenceExterne: TEdit;
    edt410RangBeneficiaire: TEdit;
    edt410RangNaissance: TEdit;
    edt410NumeroRo: TEdit;
    edt410CleRo: TEdit;
    edt410CodeGrandRegime: TEdit;
    edt410CodeCaisse: TEdit;
    edt410CodeCentrePaiement: TEdit;
    edt405RangBeneficiaire: TEdit;
    edt405Nom: TEdit;
    edt405Prenom: TEdit;
    edt405NumeroInsee: TEdit;
    edt405NomJeuneFille: TEdit;
    edt400RangBeneficiaire: TEdit;
    edt400RangPersonne: TEdit;
    edt400CodeInsee: TEdit;
    edt400CleInsee: TEdit;
    edt115RangPesonne: TEdit;
    edt135RangPesonne: TEdit;
    edt130CodeBanque: TEdit;
    edt130CodeGuichet: TEdit;
    edt130NumeroCompte: TEdit;
    edt130CleCompte: TEdit;
    edt130Titulaire: TEdit;
    edt120ComplementGeo: TEdit;
    edt120NumeroVoie: TEdit;
    edt120LibelleVoie: TEdit;
    edt120LieuDit: TEdit;
    edt120CodePostal: TEdit;
    edt120LibelleLocalite: TEdit;
    edt115Nom: TEdit;
    edt115Prenom: TEdit;
    edt115Insee: TEdit;
    edt100GroupeGestion: TEdit;
    edt100CentreGestion: TEdit;
    edt100EcheancePrinc: TEdit;
    edt100CodeOffre: TEdit;
    edt100CodeReseau: TEdit;
    edt100CodeEntiteRatt: TEdit;
    edt100CodeGroupeAssures: TEdit;
    edt100NumContratColl: TEdit;
    edt100NumContratIndiv: TEdit;
    edt125Valeur: TEdit;
    edt155RangPesonne: TEdit;
    edt180RangPesonne: TEdit;
    ilMain: TImageList;
    lbl110DateAncienneteContrat: TLabel;
    lbl400DateAncienneteAssure: TLabel;
    lbl490RangBeneficiaire: TLabel;
    lbl485Titre: TLabel;
    lbl485RangBeneficiaire: TLabel;
    lbl490Titre: TLabel;
    lbl490Code: TLabel;
    lbl485Valeur: TLabel;
    lbl490Valeur: TLabel;
    lbl700DateAncienneteGarantie: TLabel;
    lbl700DerogerDateStage: TLabel;
    lbl700DateFinStage: TLabel;
    lbl700CodeStage: TLabel;
    lbl700ErreurDescription: TLabel;
    lbl485Code: TLabel;
    lbl800ErreurDescription: TLabel;
    lbl410ErreurDescription: TLabel;
    lbl405ErreurDescription: TLabel;
    lbl400ErreurDescription: TLabel;
    lbl125ErreurDescription: TLabel;
    lbl180ErreurDescription: TLabel;
    lbl155ErreurDescription: TLabel;
    lbl135ErreurDescription: TLabel;
    lbl130ErreurDescription: TLabel;
    lbl120ErreurDescription: TLabel;
    lbl115ErreurDescription: TLabel;
    lbl110ErreurDescription: TLabel;
    lbl100ErreurDescription: TLabel;
    lblJournal: TLabel;
    lbl100Titre: TLabel;
    lbl110Titre: TLabel;
    lbl115Titre: TLabel;
    lbl120Titre: TLabel;
    lbl400Titre: TLabel;
    lbl125Titre: TLabel;
    lbl130Titre: TLabel;
    lbl135Titre: TLabel;
    lbl155Titre: TLabel;
    lbl180Titre: TLabel;
    lbl405Titre: TLabel;
    lbl410Titre: TLabel;
    lbl800Titre: TLabel;
    lbl700RangBeneficiaire: TLabel;
    lbl700CodeAssureur: TLabel;
    lbl700CodeProduit: TLabel;
    lbl700CodeGarantie: TLabel;
    lbl700CodeConditionVente: TLabel;
    lbl700TypeGarantie: TLabel;
    lbl700Erreur: TLabel;
    lbl700ErreurValeur: TLabel;
    lbl800RangBeneficiaire: TLabel;
    lbl800RangPersonne: TLabel;
    lbl800ReferenceExterne: TLabel;
    lbl800Erreur: TLabel;
    lbl800ErreurValeur: TLabel;
    lbl410ErreurValeur: TLabel;
    lbl410RangBeneficiaire: TLabel;
    lbl410DateNaissance: TLabel;
    lbl410RangNaissance: TLabel;
    lbl410NumeroRo: TLabel;
    lbl410CleRo: TLabel;
    lbl410CodeGrandRegime: TLabel;
    lbl410CodeCaisse: TLabel;
    lbl410CodeCentrePaiement: TLabel;
    lbl410Erreur: TLabel;
    lbl405ErreurValeur: TLabel;
    lbl405RangBeneficiaire: TLabel;
    lbl405CodeCivilite: TLabel;
    lbl405Nom: TLabel;
    lbl405Prenom: TLabel;
    lbl405NumeroInsee: TLabel;
    lbl405NomJeuneFille: TLabel;
    lbl405Erreur: TLabel;
    lbl400ErreurValeur: TLabel;
    lbl400RangBeneficiaire: TLabel;
    lbl400CodeInsee: TLabel;
    lbl400CleInsee: TLabel;
    lbl400Erreur: TLabel;
    lbl400RangPersonne: TLabel;
    lbl400TypeAssure: TLabel;
    lbl400CodePaysTarifaire: TLabel;
    lbl400CodeDepartementTarifaire: TLabel;
    lbl400SituationFamille: TLabel;
    lbl400CodeSexe: TLabel;
    lbl400DateNaissance: TLabel;
    lbl400CategorieSociale: TLabel;
    lbl115RangPersonne: TLabel;
    lbl135RangPersonne: TLabel;
    lbl180ModePaiement: TLabel;
    lbl180Erreur: TLabel;
    lbl180ErreurValeur: TLabel;
    lbl155RangPersonne: TLabel;
    lbl155DateDebutPrelevement: TLabel;
    lbl155Erreur: TLabel;
    lbl135Erreur: TLabel;
    lbl155ErreurValeur: TLabel;
    lbl130CodeBanque: TLabel;
    lbl130CodeGuichet: TLabel;
    lbl130NumeroCompte: TLabel;
    lbl130CleCompte: TLabel;
    lbl130Titulaire: TLabel;
    lbl130Pays: TLabel;
    lbl130Devise: TLabel;
    lbl130Erreur: TLabel;
    lbl130ErreurValeur: TLabel;
    lbl120Erreur: TLabel;
    lbl120ErreurValeur: TLabel;
    lbl120ComplementGeo: TLabel;
    lbl115ErreurValeur: TLabel;
    lbl115Erreur: TLabel;
    lbl115Nom: TLabel;
    lbl115Prenom: TLabel;
    lbl115Insee: TLabel;
    lbl115CodeCivilite: TLabel;
    lbl110Erreur: TLabel;
    lbl100ErreurValeur: TLabel;
    lbl100Erreur: TLabel;
    lbl110ErreurValeur: TLabel;
    lbl100TypeContrat: TLabel;
    lbl100CodeOffre: TLabel;
    lbl100CodeReseau: TLabel;
    lbl100EcheancePrinc: TLabel;
    lbl100GroupeGestion: TLabel;
    lbl100CentreGestion: TLabel;
    lbl100CodeContexte: TLabel;
    lbl100NumContratIndiv: TLabel;
    lbl100NumContratColl: TLabel;
    lbl100CodeGroupeAssures: TLabel;
    lbl100CodeEntiteRatt: TLabel;
    lbl100DateEffetActe: TLabel;
    lbl100DateEffetCotisation: TLabel;
    lbl100DateVente: TLabel;
    lbl100DateDemande: TLabel;
    lbl110DateEffetPremSouscr: TLabel;
    lbl120NumeroVoie: TLabel;
    lbl120CodeBtq: TLabel;
    lbl120CodeNatureVoie: TLabel;
    lbl120LibelleVoie: TLabel;
    lbl120LieuDit: TLabel;
    lbl120CodePostal: TLabel;
    lbl120LibelleLocalite: TLabel;
    lbl120CodeDepartement: TLabel;
    lbl120CodePays: TLabel;
    lbl120CodeTypeAdresse: TLabel;
    lbl125Erreur: TLabel;
    lbl125ErreurValeur: TLabel;
    lbl125Nature: TLabel;
    lbl125Type: TLabel;
    lbl125Valeur: TLabel;
    lbl135ErreurValeur: TLabel;
    lbl180RangPersonne: TLabel;
    lblFilAriane: TLabel;
    lbFichiersFtp: TListBox;
    pcVariablesSouscription: TPageControl;
    pcCriteres: TPageControl;
    pcCoordonnees: TPageControl;
    pcGaranties: TPageControl;
    pcEvenements: TPageControl;
    pcBeneficiaires: TPageControl;
    rmJournal: TRichMemo;
    sgCoordonnees: TStringGrid;
    sgGaranties: TStringGrid;
    sgEvenements: TStringGrid;
    sgBeneficiaires: TStringGrid;
    btnJournal: TSpeedButton;
    sgCriteres: TStringGrid;
    sgVariablesSouscription: TStringGrid;
    tsEntite490: TTabSheet;
    tsVariablesSouscriptionListe: TTabSheet;
    tsEntite485: TTabSheet;
    tsCriteresListe: TTabSheet;
    tsCriteres: TTabSheet;
    tsVariablesSouscription: TTabSheet;
    timerMain: TTimer;
    tsEntite125: TTabSheet;
    tsCoordonneesListe: TTabSheet;
    tsEntite700: TTabSheet;
    tsGarantiesListe: TTabSheet;
    tsEntite800: TTabSheet;
    tsEntite411: TTabSheet;
    tsEntite410: TTabSheet;
    tsEntite405: TTabSheet;
    tsEntite400: TTabSheet;
    tsGaranties: TTabSheet;
    tsBeneficiairesListe: TTabSheet;
    tsEntite180: TTabSheet;
    tsEntite155: TTabSheet;
    tsEntite135: TTabSheet;
    tsEntite130: TTabSheet;
    tsCoordonnees: TTabSheet;
    tsEntite120: TTabSheet;
    tsEntite115: TTabSheet;
    tsEntite110: TTabSheet;
    tsEntite100: TTabSheet;
    tsEntite001: TTabSheet;
    tsBeneficiaires: TTabSheet;
    tsEvenementsListe: TTabSheet;
    procedure btnApiviaDepotClick(Sender: TObject);
    procedure btnApiviaRejetClick(Sender: TObject);
    procedure btnChargerClick(Sender: TObject);
    procedure btnEnregistrerClick(Sender: TObject);
    procedure btnFermerClick(Sender: TObject);
    procedure btnIgaClick(Sender: TObject);
    procedure btnJournalClick(Sender: TObject);
    procedure btnVeosClick(Sender: TObject);
    procedure btnVersionClick(Sender: TObject);
    procedure chromiumMainAfterCreated(Sender: TObject;
      const browser: ICefBrowser);
    procedure chromiumMainBeforeClose(Sender: TObject;
      const browser: ICefBrowser);
    procedure chromiumMainClose(Sender: TObject; const browser: ICefBrowser;
      var aAction: TCefCloseBrowserAction);
    procedure chromiumMainLoadEnd(Sender: TObject; const browser: ICefBrowser;
      const frame: ICefFrame; httpStatusCode: Integer);
    procedure chromiumMainTextResultAvailable(Sender: TObject;
      const aText: ustring);
    procedure edt115InseeExit(Sender: TObject);
    procedure edt115NomExit(Sender: TObject);
    procedure edt115PrenomExit(Sender: TObject);
    procedure edt120CodePostalExit(Sender: TObject);
    procedure edt120ComplementGeoExit(Sender: TObject);
    procedure edt120LibelleLocaliteExit(Sender: TObject);
    procedure edt120LibelleVoieExit(Sender: TObject);
    procedure edt120LieuDitExit(Sender: TObject);
    procedure edt120NumeroVoieExit(Sender: TObject);
    procedure edt125ValeurExit(Sender: TObject);
    procedure edt400RangBeneficiaireExit(Sender: TObject);
    procedure edt400RangPersonneExit(Sender: TObject);
    procedure edt405NomExit(Sender: TObject);
    procedure edt405NomJeuneFilleExit(Sender: TObject);
    procedure edt405NumeroInseeExit(Sender: TObject);
    procedure edt405PrenomExit(Sender: TObject);
    procedure edt405RangBeneficiaireExit(Sender: TObject);
    procedure edt410RangBeneficiaireExit(Sender: TObject);
    procedure edt485RangBeneficiaireExit(Sender: TObject);
    procedure edt490RangBeneficiaireExit(Sender: TObject);
    procedure edt700RangBeneficiaireExit(Sender: TObject);
    procedure edt800RangBeneficiaireExit(Sender: TObject);
    procedure edt800RangPersonneExit(Sender: TObject);
    procedure FormClose(Sender: TObject; var CloseAction: TCloseAction);
    procedure FormCloseQuery(Sender: TObject; var CanClose: Boolean);
    procedure FormCreate(Sender: TObject);
    procedure FormDestroy(Sender: TObject);
    procedure FormShow(Sender: TObject);
    procedure lbFichiersFtpSelectionChange(Sender: TObject; User: boolean);
    procedure pcBeneficiairesChange(Sender: TObject);
    procedure pcEvenementsChange(Sender: TObject);
    procedure sgBeneficiairesClick(Sender: TObject);
    procedure sgCoordonneesClick(Sender: TObject);
    procedure sgCriteresClick(Sender: TObject);
    procedure sgEvenementsClick(Sender: TObject);
    procedure sgGarantiesClick(Sender: TObject);
    procedure sgVariablesSouscriptionClick(Sender: TObject);
    procedure timerMainTimer(Sender: TObject);
    procedure tsEntite100Show(Sender: TObject);
    procedure tsEntite110Show(Sender: TObject);
    procedure tsEntite115Show(Sender: TObject);
    procedure tsEntite120Show(Sender: TObject);
    procedure tsEntite125Show(Sender: TObject);
    procedure tsEntite130Show(Sender: TObject);
    procedure tsEntite135Show(Sender: TObject);
    procedure tsEntite155Show(Sender: TObject);
    procedure tsEntite180Show(Sender: TObject);
    procedure tsEntite400Show(Sender: TObject);
    procedure tsEntite405Show(Sender: TObject);
    procedure tsEntite410Show(Sender: TObject);
    procedure tsCriteresShow(Sender: TObject);
    procedure tsEntite485Show(Sender: TObject);
    procedure tsEntite490Show(Sender: TObject);
    procedure tsVariablesSouscriptionShow(Sender: TObject);
    procedure tsEntite700Show(Sender: TObject);
    procedure tsEntite800Show(Sender: TObject);
    procedure tsEvenementsListeShow(Sender: TObject);
  private
    adt_daylight_saving: array[1..20, 1..2] of TDateTime;
    b_avec_lignes_vierges: Boolean;
    b_fichier_rejet: Boolean;
    b_can_close: boolean;  // Passe à True dans l'évènement TChromium.OnBeforeClose
    b_closing: boolean;  // Passe à True dans l'évènement the CloseQuery event.
    b_processus_transfert_demarre: boolean;
    e100_sel: t_entite_100;
    e125_sel: t_entite_125;
    e400_sel: t_entite_400;
    e700_sel: t_entite_700;
    e485_sel: t_entite_485;
    e490_sel: t_entite_490;
    ftp_iga: TIdFTP;
    ftp_apivia: TTGPuttySFTP;
    i_environnement_dev_prod: Integer;
    i_ftp_apivia_action: Integer;
    i_ligne_ac056_lue: Integer;
    i_nb_evenements: Integer;
    i_veos_wf_etape: Integer;
    s_fil_ariane_e100: String;
    s_fil_ariane_e125: String;
    s_fil_ariane_e400: String;
    s_fil_ariane_e700: String;
    s_fil_ariane_e485: string;
    s_fil_ariane_e490: string;
    s_nom_fichier: String;
    s_veos_url: String;
    s_veos_wf_user: String;
    s_veos_wf_password: String;
    sl_fichiers_sort: TStringList;
    procedure ActiverOnglets(ppc: TPageControl; pentites: t_set_entite);
    procedure AfficherFichiersFtp;
    procedure AfficherVersion;
    procedure AnalyserRejets(ppc: TPageControl);
    procedure ChargerBeneficiaires(pa_e400: array of t_entite_400);
    procedure ChargerBeneficiaireSelectionne;
    procedure ChargerCoordonnees(pa_e125: array of t_entite_125);
    procedure ChargerCoordonneeSelectionnee;
    procedure ChargerCriteres(pa_e485: array of t_entite_485);
    procedure ChargerCritereSelectionne;
    procedure ChargerDonneesOnglet(ppc: TPageControl);
    procedure ChargerDonneesOnglet100;
    procedure ChargerDonneesOnglet110;
    procedure ChargerDonneesOnglet115;
    procedure ChargerDonneesOnglet120;
    procedure ChargerDonneesOnglet125;
    procedure ChargerDonneesOnglet130;
    procedure ChargerDonneesOnglet135;
    procedure ChargerDonneesOnglet155;
    procedure ChargerDonneesOnglet180;
    procedure ChargerDonneesOnglet400;
    procedure ChargerDonneesOnglet405;
    procedure ChargerDonneesOnglet410;
    procedure ChargerDonneesOnglet485;
    procedure ChargerDonneesOnglet490;
    procedure ChargerDonneesOnglet700;
    procedure ChargerDonneesOnglet800;
    procedure ChargerEvenementSelectionne;
    procedure ChargerEvenements;
    procedure ChargerFichierAc056;
    procedure ChargerGaranties(pa_e700: array of t_entite_700);
    procedure ChargerGarantieSelectionnee;
    procedure ChargerVariablesSouscription(pa_e490: array of t_entite_490);
    procedure ChargerVariableSouscriptionSelectionne;
    function ConnexionFtpApivia: Boolean;
    function ConnexionFtpIga: Boolean;
    procedure ControlerEvenements;
    procedure DefinirTableauDaylingSaving;
    procedure DesactiverOnglets(ppc: TPageControl);
    procedure DeterminerEnvironnement;
    procedure EnregistrerDonneeModifiee(Sender: TObject);
    procedure EnregistrerJournal;
    function EnregistrerFichierAc056: Boolean;
    function FtpApiviaListingCallback(const names: Pfxp_names): Boolean;
    procedure FtpApiviaMessageCallback(const Msg: AnsiString; const isstderr: Boolean);
    function FtpApiviaVerifyHostKey(const host: PAnsiChar; const port: Integer;
                                    const fingerprint: PAnsiChar;
                                    const verificationstatus: Integer;
                                    var storehostkey: Boolean): Boolean;
    function GetDateFromAc056(ps_date: String): TDateTime;
    function GetDateToAc056(pdt: TDateTime): String;
    function GetDossierProduction(ps_dossier_base: String): String;
    function GetTitreApplication: String;
    procedure InitialisationFtp;
    procedure MarquerControleErreur(ppc: TPageControl);
    procedure MarquerGrilleLigneErreur(psg: TStringGrid; pi_ligne: Integer; pb_erreur: Boolean);
    procedure MettreAJourFilAriane;
    procedure RenseignerPressePapier(ps_texte: String);
    procedure RepererRejet(pts: TTabSheet; ps_erreur: String);
    procedure RepererRejetSurBeneficiaires;
    procedure SetComboIndex(pcbb: TComboBox; ps_code: String);
    procedure SetFichierRejet(pb_rejet: Boolean);
    procedure SetErreur(plbl_erreur, plbl_erreur_valeur, pplbl_erreur_description: TLabel; ps_erreur: String);
    procedure VerrouillerComposants(pcmp_parent: TWinControl);
    procedure AjouterJournalLigne(ps_message: String; pcl_back: TColor);

  protected
    // You have to handle this two messages to call NotifyMoveOrResizeStarted or some page elements will be misaligned.
    procedure WMMove(var aMessage : TWMMove); message WM_MOVE;
    procedure WMMoving(var aMessage : TMessage); message WM_MOVING;
    // You also have to handle these two messages to set GlobalCEFApp.OsmodalLoop
    procedure WMEnterMenuLoop(var aMessage: TMessage); message WM_ENTERMENULOOP;
    procedure WMExitMenuLoop(var aMessage: TMessage); message WM_EXITMENULOOP;

    procedure BrowserCreatedMsg(var aMessage : TMessage); message CEF_AFTERCREATED;
    procedure BrowserDestroyMsg(var aMessage : TMessage); message CEF_DESTROY;

    property FCanClose: Boolean read b_can_close write b_can_close;
    property FClosing: Boolean read b_closing write b_closing;
  public
    procedure AjouterJournal(ps_message: String; pstyle: t_journal_style);
    property FEnvironnementDevProd: Integer read i_environnement_dev_prod write i_environnement_dev_prod;
    property FFichierRejet: Boolean read b_fichier_rejet write SetFichierRejet;
    property FFtpApiviaAction: Integer read i_ftp_apivia_action write i_ftp_apivia_action;
    property FLigneAc056Lue: Integer read i_ligne_ac056_lue;
    property FNbEvenements: Integer read i_nb_evenements write i_nb_evenements;

  end;

var
  frmMain: TfrmMain;

implementation

{$R *.lfm}

{ TfrmMain }

uses DateUtils, LazUTF8, StrUtils, fVersion, uAc056, uConstantes, uControle,
     uRejetsDescription, fVeosConnexion, fJournal, Translations;

procedure TfrmMain.btnFermerClick(Sender: TObject);
begin

  Close;

end;

procedure TfrmMain.btnIgaClick(Sender: TObject);
var
  i_fichier: Integer;
  i_fichier_info: integer;
  s_datetime: String;
  s_fichier_cbb: String;
  s_fichier_info: String;
  sa_fichier: TStringArray;
  sl_fichiers_ftp: TStringList;
begin

  // Initialisation des variables
  b_processus_transfert_demarre := True;

  InitialisationFtp;

  AjouterJournal('IGA', JOURNAL_STYLE_TITRE);

  // Connexion au serveur FTP
  if not ConnexionFtpIga then Exit;

  // Récupérer les X derniers fichiers depuis le serveur FTP d'IGA
  sl_fichiers_ftp  := TStringList.Create;

  try

    ftp_iga.List(sl_fichiers_ftp);

    for i_fichier := 0 to sl_fichiers_ftp.Count - 1 do
    begin

      sa_fichier    := sl_fichiers_ftp[i_fichier].Split(';');
      s_fichier_cbb := '';

      for i_fichier_info := 0 to High(sa_fichier) do
      begin

        s_fichier_info := sa_fichier[i_fichier_info];

        if s_fichier_info.StartsWith('modify') then
        begin

          s_datetime := AnsiReplaceStr(s_fichier_info, 'modify=', '');
          s_fichier_cbb := ' du ' +
                           Copy(s_datetime, 7, 2) + '/' +
                           Copy(s_datetime, 5, 2) + '/' +
                           Copy(s_datetime, 1, 4) + ' ' +
                           Copy(s_datetime, 9, 2) + ':' +
                           Copy(s_datetime, 11, 2) + ':' +
                           Copy(s_datetime, 13, 2);

        end
        else if s_fichier_info.StartsWith('type') then
        begin

          if not s_fichier_info.EndsWith('file') then s_fichier_cbb := '';

        end
        else if (i_fichier_info = High(sa_fichier)) and (s_fichier_cbb <> '') then
          s_fichier_cbb := s_datetime + Trim(s_fichier_info) + s_fichier_cbb;

      end;

      if s_fichier_cbb <> '' then sl_fichiers_sort.Append(s_fichier_cbb);

    end;

    AfficherFichiersFtp;

  finally

    FreeAndNil(sl_fichiers_ftp);

  end;

end;

procedure TfrmMain.btnJournalClick(Sender: TObject);
begin

  frmJournal := TfrmJournal.Create(Self);

  try

    frmJournal.ShowModal;

  finally

    frmJournal.Free;

  end;

end;

procedure TfrmMain.btnVeosClick(Sender: TObject);
begin

  // Initialisation des variables
  i_veos_wf_etape    := C_I_VEOS_ETAPE_WF_INIT;
  s_veos_wf_user     := '';
  s_veos_wf_password := '';
  frmVeosConnexion   := TfrmVeosConnexion.Create(nil);
  b_processus_transfert_demarre := True;

  AjouterJournal('VEOS', JOURNAL_STYLE_TITRE);

  try

    // Récupérer le login et le mot de passe de l'utilisateur pour la connexion à VEOS
    if frmVeosConnexion.ShowModal = mrOK then
    begin

      s_veos_wf_user     := frmVeosConnexion.edtUtilisateur.Text;
      s_veos_wf_password := frmVeosConnexion.edtMotDePasse.Text;

    end;

  finally

    FreeAndNil(frmVeosConnexion);

  end;

  if (s_veos_wf_user = '') or (s_veos_wf_password = '') then Exit;

  // Charger la page
  s_veos_url := '';

  if FEnvironnementDevProd = C_I_ENVIRONNEMENT_PROD then
    s_veos_url := C_S_VEOS_URL_PROD
  else s_veos_url := C_S_VEOS_URL_DEV;

  i_veos_wf_etape := C_I_VEOS_ETAPE_WF_URL;
  AjouterJournal('Connexion à ' + s_veos_url + ' en cours...', JOURNAL_STYLE_AUCUN);
  chromiumMain.LoadURL(UTF8Decode(s_veos_url));

end;

procedure TfrmMain.btnVersionClick(Sender: TObject);
begin

  frmVersion := TfrmVersion.Create(Self);

  try

    frmVersion.ShowModal;

  finally

    frmVersion.Free;

  end;

end;

procedure TfrmMain.chromiumMainAfterCreated(Sender: TObject;
  const browser: ICefBrowser);
begin

  // Now the browser is fully initialized we can send a message to the main form to load the initial web page.
  //PostMessage(Handle, CEF_AFTERCREATED, 0, 0);

end;

procedure TfrmMain.chromiumMainBeforeClose(Sender: TObject;
  const browser: ICefBrowser);
begin

  FCanClose := True;
  PostMessage(Handle, WM_CLOSE, 0, 0);

end;

procedure TfrmMain.chromiumMainClose(Sender: TObject;
  const browser: ICefBrowser; var aAction: TCefCloseBrowserAction);
begin

  PostMessage(Handle, CEF_DESTROY, 0, 0);
  aAction := cbaDelay;

end;

procedure TfrmMain.chromiumMainLoadEnd(Sender: TObject;
  const browser: ICefBrowser; const frame: ICefFrame; httpStatusCode: Integer);
var
  s_message: String;
begin

  if httpStatusCode = 0 then Exit;

  if httpStatusCode = 200 then
  begin

    // Message de réussite de la requête HTTP

    case i_veos_wf_etape of

      C_I_VEOS_ETAPE_WF_URL      : s_message := 'Accès au site de VEOS réussi';
      C_I_VEOS_ETAPE_WF_CONNEXION: s_message := 'Connexion à l''écran de connexion à VEOS réussie';
      C_I_VEOS_ETAPE_WF_EXPORT   : s_message := 'Lancement de l''export APIVIA effectué';

    end;

    AjouterJournal(s_message, JOURNAL_STYLE_SUCCES);

    // Etape suivante

    case i_veos_wf_etape of

      C_I_VEOS_ETAPE_WF_URL:
        begin

          AjouterJournal('Connexion à VEOS en cours...', JOURNAL_STYLE_AUCUN);

          with chromiumMain.Browser.MainFrame do
          begin

            ExecuteJavaScript('document.getElementById("' + C_S_VEOS_USER_TEXTFIELD + '").value="' + s_veos_wf_user + '";', 'about: blank', 0);
            ExecuteJavaScript('document.getElementById("' + C_S_VEOS_PASSWORD_TEXTFIELD + '").value="' + s_veos_wf_password + '";', 'about: blank', 0);
            ExecuteJavaScript('document.getElementById("' + C_S_VEOS_VALIDER_BOUTON + '").click();', 'about: blank', 0);

          end;

          i_veos_wf_etape := C_I_VEOS_ETAPE_WF_CONNEXION;

        end;

      C_I_VEOS_ETAPE_WF_CONNEXION: chromiumMain.RetrieveHTML(chromiumMain.Browser.MainFrame);

    end;

  end
  else
  begin

    AjouterJournal('Erreur ' + IntToStr(httpStatusCode) + ' : contacter le service informatique', JOURNAL_STYLE_ERREUR);

  end;

end;

procedure TfrmMain.chromiumMainTextResultAvailable(Sender: TObject;
  const aText: ustring);
var
  s_url: String;
begin

  // La connexion a-t-elle échouée ?
  if    (Pos('Aucun utilisateur trouvé pour ce login/mot de passe', aText) > 0)
     or (Pos('Mot de passe incorrect', aText) > 0) then
  begin

    AjouterJournal('La connexion VEOS a été refusée car le nom d''utilisateur et/ou le mot de passe est faux.', JOURNAL_STYLE_ERREUR);
    Exit;

  end;

  AjouterJournal('Connexion de l''utilisateur à VEOS réussie', JOURNAL_STYLE_SUCCES);

  s_url := '';

  if FEnvironnementDevProd = C_I_ENVIRONNEMENT_PROD then
    s_url := C_S_VEOS_EXPORT_PROD
  else s_url := C_S_VEOS_EXPORT_DEV;

  AjouterJournal('Lancer le wokflow de l''export APIVIA', JOURNAL_STYLE_AUCUN);

  s_url := s_veos_url + 'tbsGenericComponent.tbs?__topParent__=F_TDB_WF&__mode__=U&__trtKey__=doLaunchWfs&wfHandler=EXPORT_APIVIA:' + s_url + '&wfName=EXPORT_APIVIA';
  chromiumMain.LoadURL(UTF8Decode(s_url));
  i_veos_wf_etape := C_I_VEOS_ETAPE_WF_EXPORT;

end;

procedure TfrmMain.edt115InseeExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt115NomExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt115PrenomExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt120CodePostalExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt120ComplementGeoExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt120LibelleLocaliteExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt120LibelleVoieExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt120LieuDitExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt120NumeroVoieExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt125ValeurExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt400RangBeneficiaireExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt400RangPersonneExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt405NomExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt405NomJeuneFilleExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt405NumeroInseeExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt405PrenomExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt405RangBeneficiaireExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt410RangBeneficiaireExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt485RangBeneficiaireExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt490RangBeneficiaireExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt700RangBeneficiaireExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt800RangBeneficiaireExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.edt800RangPersonneExit(Sender: TObject);
begin

  EnregistrerDonneeModifiee(Sender);

end;

procedure TfrmMain.FormClose(Sender: TObject; var CloseAction: TCloseAction);
begin

  EnregistrerJournal;

end;

procedure TfrmMain.FormCloseQuery(Sender: TObject; var CanClose: Boolean);
var
   s_message: String;
begin

  if b_processus_transfert_demarre then
  begin

    s_message := 'Le processus de transfert a été commencé sans aller jusqu''au bout (VEOS -> IGA -> APIVIA - Dépôt' +
                 LineEnding + 'Confirmez-vous la fermeture de l''application ?';
    CanClose := (MessageDlg('Confirmer la fermeture de l''application', s_message, mtConfirmation, [mbYes, mbNo], 0, mbNo) = mrYes);

  end
  else if b_avec_lignes_vierges then
  begin

    CanClose := False;
    ShowMessage('Veuillez cliquer sur le bouton Enregistrer');

  end
  else
  begin

    CanClose := FCanClose;

    if not FClosing then
    begin

      FClosing := True;
      Visible  := False;
      chromiumMain.CloseBrowser(True);

    end;

  end;

end;

procedure TfrmMain.FormCreate(Sender: TObject);
begin

  DeterminerEnvironnement;
  btnEnregistrer.Enabled := False;
  sgEvenements.RowCount := 1;
  pcEvenements.ActivePageIndex := 0;
  rmJournal.Clear;
  charger_rejets_description;
  charger_rejets_explications;
  DesactiverOnglets(pcEvenements);
  lblFilAriane.Caption := '';
  AfficherVersion;
  ftp_iga := TIdFTP.Create(nil);
  lbFichiersFtp.Clear;
  DefinirTableauDaylingSaving;
  sl_fichiers_sort := TStringList.Create;
  sl_fichiers_sort.Sorted := False;
  b_processus_transfert_demarre := False;
  FCanClose := False;
  FClosing := False;
  frmMain.Caption := GetTitreApplication;
  TranslateUnitResourceStrings('LCLStrConsts', C_S_DOSSIER_TRANSLATIONS + '\lclstrconsts.%s.po', 'fr', '');

end;

procedure TfrmMain.FormDestroy(Sender: TObject);
begin

  if Assigned(sl_fichiers_sort) then FreeAndNil(sl_fichiers_sort);

  if Assigned(ftp_iga) then
  begin

    if ftp_iga.Connected then ftp_iga.Disconnect;
    FreeAndNil(ftp_iga);

  end;

  if Assigned(ftp_apivia) then
  begin

    if ftp_apivia.Connected then ftp_apivia.Disconnect;
    FreeAndNil(ftp_apivia);

  end;

end;

procedure TfrmMain.FormShow(Sender: TObject);
begin

  if not chromiumMain.CreateBrowser(cefwpChromiumMain) then timerMain.Enabled := True;

end;

procedure TfrmMain.lbFichiersFtpSelectionChange(Sender: TObject; User: boolean);
var
  b_ok: Boolean;
  i_date_du_jour: Integer;
  s_fichier: String;
  s_fichier_journal: String;
  s_message: String;
  w_annee: Word;
  w_jour: Word;
  w_mois: Word;
begin

  // Initialisation des variables
  b_ok := True;
  s_fichier_journal := lbFichiersFtp.Items[lbFichiersFtp.ItemIndex];
  s_fichier := Copy(s_fichier_journal, 1, Pos(' ', s_fichier_journal) - 1);

  if s_fichier_journal = '' then Exit;

  AjouterJournal('Téléchargement du fichier ' + s_fichier + ' en cours...', JOURNAL_STYLE_AUCUN);

  // Télécharger le fichier sélectionné

  try

    if Pos(C_S_FTP_FICHIER_REJET, s_fichier) > 0 then
    begin

      // APIVIA

      if FEnvironnementDevProd = C_I_ENVIRONNEMENT_PROD then
        s_nom_fichier := GetDossierProduction(C_S_FTP_APIVIA_DOSSIER_DESTINATION_PROD)
      else s_nom_fichier := C_S_FTP_APIVIA_DOSSIER_DESTINATION_DEV;

      s_nom_fichier := s_nom_fichier + '\' + s_fichier;
      AjouterJournal('Fichier de destination : ' + s_nom_fichier, JOURNAL_STYLE_AUCUN);
      ftp_apivia.ChangeDir(C_S_FTP_APIVIA_DOSSIER_OUT);
      ftp_apivia.DownloadFile(s_fichier, s_nom_fichier, False);

    end
    else
    begin

      // IGA

      if FEnvironnementDevProd = C_I_ENVIRONNEMENT_PROD then
        s_nom_fichier := GetDossierProduction(C_S_FTP_IGA_DOSSIER_DESTINATION_PROD)
      else s_nom_fichier := C_S_FTP_IGA_DOSSIER_DESTINATION_DEV;

      s_nom_fichier := s_nom_fichier + '\' + s_fichier;

      // Vérifier que le nom du fichier correspond à la date du jour
      DecodeDate(Date, w_annee, w_mois, w_jour);
      i_date_du_jour := (w_annee * 10000) + (w_mois * 100) + w_jour;

      // MATH_20220316_053710.txt
      if i_date_du_jour <> StrToInt(Copy(s_fichier, 6, 8)) then
      begin

        s_message := 'La date contenue dans le nom du fichier ' + s_fichier +
                     ' ne correspond pas à la date du jour ' +
                     IntToStr(i_date_du_jour) + '.' + sLineBreak +
                     'Souhaitez-vous quand même télécharger ce fichier ?';
        b_ok := (QuestionDlg('Contrôle sur le nom du fichier à télécharger',
                             s_message,
                             mtConfirmation,
                             [mrYes, '&Oui', mrNo, '&Non', 'IsDefault'], 0
                            ) = mrYes
                );

      end;

      if b_ok then
         ftp_iga.Get(s_fichier, s_nom_fichier, True, False)
      else
        AjouterJournal('Téléchargement du fichier ' + s_fichier + ' abandonné', JOURNAL_STYLE_ERREUR);

    end;

  except

    on e: Exception do
    begin

      AjouterJournal('Problème lors du téléchargement : ' + e.ClassName + ' / ' + e.Message, JOURNAL_STYLE_ERREUR);
      b_ok := False;

    end;

  end;

  if not b_ok then Exit;

  AjouterJournal('Téléchargement du fichier ' + s_fichier + ' terminé', JOURNAL_STYLE_SUCCES);

  // Charger le fichier
  ChargerFichierAc056;

end;

procedure TfrmMain.pcBeneficiairesChange(Sender: TObject);
begin

  ChargerGarantieSelectionnee;

end;

procedure TfrmMain.pcEvenementsChange(Sender: TObject);
begin

  ChargerBeneficiaireSelectionne;
  ChargerCoordonneeSelectionnee;

end;


procedure TfrmMain.sgBeneficiairesClick(Sender: TObject);
begin

  ChargerBeneficiaireSelectionne;

end;

procedure TfrmMain.sgCoordonneesClick(Sender: TObject);
begin

  ChargerCoordonneeSelectionnee;

end;

procedure TfrmMain.sgCriteresClick(Sender: TObject);
begin

  ChargerCritereSelectionne;

end;

procedure TfrmMain.sgEvenementsClick(Sender: TObject);
begin

  ChargerEvenementSelectionne;

end;

procedure TfrmMain.sgGarantiesClick(Sender: TObject);
begin

  ChargerGarantieSelectionnee;

end;

procedure TfrmMain.sgVariablesSouscriptionClick(Sender: TObject);
begin

  ChargerVariableSouscriptionSelectionne;

end;

procedure TfrmMain.timerMainTimer(Sender: TObject);
begin

  timerMain.Enabled := False;

  if (not chromiumMain.CreateBrowser(cefwpChromiumMain)) and (not chromiumMain.Initialized) then
    timerMain.Enabled := True;

end;

procedure TfrmMain.tsEntite100Show(Sender: TObject);
begin

  RenseignerPressePapier(e100_sel.s_erreur);

end;

procedure TfrmMain.tsEntite110Show(Sender: TObject);
begin

  RenseignerPressePapier(e100_sel.e110.s_erreur);

end;

procedure TfrmMain.tsEntite115Show(Sender: TObject);
begin

  RenseignerPressePapier(e100_sel.e115.s_erreur);

end;

procedure TfrmMain.tsEntite120Show(Sender: TObject);
begin

  RenseignerPressePapier(e100_sel.e120.s_erreur);

end;

procedure TfrmMain.tsEntite125Show(Sender: TObject);
begin

  RenseignerPressePapier(e125_sel.s_erreur);

end;

procedure TfrmMain.tsEntite130Show(Sender: TObject);
begin

  RenseignerPressePapier(e100_sel.e130.s_erreur);

end;

procedure TfrmMain.tsEntite135Show(Sender: TObject);
begin

  RenseignerPressePapier(e100_sel.e135.s_erreur);

end;

procedure TfrmMain.tsEntite155Show(Sender: TObject);
begin

  RenseignerPressePapier(e100_sel.e155.s_erreur);

end;

procedure TfrmMain.tsEntite180Show(Sender: TObject);
begin

  RenseignerPressePapier(e100_sel.e180.s_erreur);

end;

procedure TfrmMain.tsEntite400Show(Sender: TObject);
begin

  RenseignerPressePapier(e400_sel.s_erreur);

end;

procedure TfrmMain.tsEntite405Show(Sender: TObject);
begin

  RenseignerPressePapier(e400_sel.e405.s_erreur);

end;

procedure TfrmMain.tsEntite410Show(Sender: TObject);
begin

  RenseignerPressePapier(e400_sel.e410.s_erreur);

end;

procedure TfrmMain.tsCriteresShow(Sender: TObject);
begin

end;

procedure TfrmMain.tsEntite485Show(Sender: TObject);
begin

  RenseignerPressePapier(e485_sel.s_erreur);

end;

procedure TfrmMain.tsEntite490Show(Sender: TObject);
begin

  RenseignerPressePapier(e490_sel.s_erreur);

end;

procedure TfrmMain.tsVariablesSouscriptionShow(Sender: TObject);
begin

end;

procedure TfrmMain.tsEntite700Show(Sender: TObject);
begin

  RenseignerPressePapier(e700_sel.s_erreur);

end;

procedure TfrmMain.tsEntite800Show(Sender: TObject);
begin

  RenseignerPressePapier(e400_sel.e800.s_erreur);

end;

procedure TfrmMain.tsEvenementsListeShow(Sender: TObject);
begin

  RenseignerPressePapier(e100_sel.s_num_contrat_indiv);

end;

procedure TfrmMain.btnChargerClick(Sender: TObject);
var
  od: TOpenDialog;
  s_initial_dir: String;
begin

  // Initialisation des variables
  b_avec_lignes_vierges := False;
  i_ligne_ac056_lue := 0;
  od := TOpenDialog.Create(nil);
  if FEnvironnementDevProd = C_I_ENVIRONNEMENT_PROD then s_initial_dir := C_S_DOSSIER_TRANSFERT_AC056_PROD
  else s_initial_dir := C_S_DOSSIER_TRANSFERT_AC056_DEV;

  AjouterJournal('Charger', JOURNAL_STYLE_TITRE);

  try

    // Récupérer le nom du fichier AC056 à charger
    od.InitialDir  := s_initial_dir;
    od.FileName    := '';
    od.Filter      := 'Fichiers textes (*.txt)|*.txt';
    od.FilterIndex := 1;
    od.Title       := 'Ouvrir un fichier AC056 existant...';
    if od.Execute then s_nom_fichier := od.FileName;

  finally

    FreeAndNil(od);

  end;

  ChargerFichierAc056;

end;

procedure TfrmMain.btnApiviaDepotClick(Sender: TObject);
begin

  if s_nom_fichier = '' then Exit;

  AjouterJournal('APIVIA - Dépôt', JOURNAL_STYLE_TITRE);
  FFtpApiviaAction := C_I_FTP_APIVIA_ACTION_DEPOT;

  // Connexion au serveur FTP
  if not ConnexionFtpApivia then Exit;

  // Télécharger le fichier AC056 actuel
  AjouterJournal('Envoi du fichier...', JOURNAL_STYLE_AUCUN);

  try

    InitialisationFtp;
    ftp_apivia.ChangeDir(C_S_FTP_APIVIA_DOSSIER_IN);
    ftp_apivia.UploadFile(s_nom_fichier, ExtractFileName(s_nom_fichier), False);
    ftp_apivia.ListDir(C_S_FTP_APIVIA_DOSSIER_IN);
    AjouterJournal('Envoi du fichier terminé', JOURNAL_STYLE_SUCCES);

    b_processus_transfert_demarre := False;

  except

    on e: Exception do AjouterJournal('Erreur lors de l''envoi du fichier : ' + e.Message, JOURNAL_STYLE_ERREUR);

  end;

end;

procedure TfrmMain.btnApiviaRejetClick(Sender: TObject);
begin

  InitialisationFtp;

  AjouterJournal('APIVIA - Rejet', JOURNAL_STYLE_TITRE);
  FFtpApiviaAction := C_I_FTP_APIVIA_ACTION_REJET;

  // Connexion au serveur FTP
  if not ConnexionFtpApivia then Exit;

  // Récupérer les X derniers fichiers depuis le serveur FTP d'APIVIA

  try

    ftp_apivia.ListDir(C_S_FTP_APIVIA_DOSSIER_OUT);

  except

    on e: Exception do AjouterJournal('Erreur lors de la récupération de la liste des fichiers : ' + e.Message, JOURNAL_STYLE_ERREUR);

  end;

end;

procedure TfrmMain.btnEnregistrerClick(Sender: TObject);
begin

  AjouterJournal('Enregistrer', JOURNAL_STYLE_TITRE);

  ControlerEvenements;

  if i_nb_controle_erreurs = 0 then EnregistrerFichierAc056
  else ShowMessage('Veuillez corriger les erreurs détectées pour pouvoir enregistrer le fichier AC056');

end;

// Procédures et fonctions privées

procedure TfrmMain.ActiverOnglets(ppc: TPageControl; pentites: t_set_entite);
begin

  case ppc.Name of

    C_S_PAGE_CONTROL_EVENEMENTS_NOM:
      begin

        tsBeneficiaires.TabVisible := (TEntite.E400 in pentites);
        tsEntite100.TabVisible     := (TEntite.E100 in pentites);
        tsEntite110.TabVisible     := (TEntite.E110 in pentites);
        tsEntite115.TabVisible     := (TEntite.E115 in pentites);
        tsEntite120.TabVisible     := (TEntite.E120 in pentites);
        tsCoordonnees.TabVisible   := (TEntite.E125 in pentites);
        tsEntite130.TabVisible     := (TEntite.E130 in pentites);
        tsEntite135.TabVisible     := (TEntite.E135 in pentites);
        tsEntite155.TabVisible     := (TEntite.E155 in pentites);
        tsEntite180.TabVisible     := (TEntite.E180 in pentites);

      end;

    C_S_PAGE_CONTROL_BENEFICIAIRES_NOM:
      begin

        tsGaranties.TabVisible := (TEntite.E700 in pentites);
        tsEntite400.TabVisible := (TEntite.E400 in pentites);
        tsEntite405.TabVisible := (TEntite.E405 in pentites);
        tsEntite410.TabVisible := (TEntite.E410 in pentites);
        tsEntite411.TabVisible := (TEntite.E411 in pentites);
        tsCriteres.TabVisible := (TEntite.E485 in pentites);
        tsVariablesSouscription.TabVisible := (TEntite.E490 in pentites);
        tsEntite800.TabVisible := (TEntite.E800 in pentites);

      end;

    C_S_PAGE_CONTROL_COORDONNEES_NOM:
      begin

        tsEntite125.TabVisible := (TEntite.E125 in pentites);

      end;

    C_S_PAGE_CONTROL_GARANTIES_NOM:
      begin

        tsEntite700.TabVisible := (TEntite.E700 in pentites);

      end;

    C_S_PAGE_CONTROL_CRITERES_NOM:
      begin

        tsEntite485.TabVisible := (TEntite.E485 in pentites);

      end;

    C_S_PAGE_CONTROL_VARIABLES_SOUSCRIPTION:
      begin

        tsEntite490.TabVisible := (TEntite.E490 in pentites);

      end;

    else AjouterJournal('PageControl inconnu : ' + ppc.Name, JOURNAL_STYLE_ERREUR);

  end;

  ChargerDonneesOnglet(ppc);

  ppc.TabIndex := 0;

end;

procedure TfrmMain.AfficherFichiersFtp;
var
  i_fichier: Integer;
  i_fichier_max: Integer;
  sl_fichiers_ftp: TStringList;
begin

  // Trier la liste des fichiers FTP
  sl_fichiers_sort.Sort;

  // Récupérer les X derniers fichiers depuis le serveur FTP d'IGA
  sl_fichiers_ftp := TStringList.Create;

  try

    i_fichier_max := 5;

    if sl_fichiers_sort.Count < i_fichier_max then i_fichier_max := sl_fichiers_sort.Count;

    for i_fichier := sl_fichiers_sort.Count - 1 downto (sl_fichiers_sort.Count - i_fichier_max) do
    begin

      sl_fichiers_ftp.Append(Copy(sl_fichiers_sort[i_fichier], 15, Length(sl_fichiers_sort[i_fichier])));

    end;

    // Récupérer le nom du fichier sélectionné par l'utilisateur
    lbFichiersFtp.Items := sl_fichiers_ftp;

  finally

    FreeAndNil(sl_fichiers_ftp);

  end;

end;

procedure TfrmMain.AfficherVersion;
var
  s_version: String;
begin

  // Initialisation des variables
  s_version := '';

  // Récupérer la version en cours
  frmVersion := TfrmVersion.Create(Self);

  try

    s_version := frmVersion.mmVersion.Lines[0];
    s_version := Copy(s_version, 1, Pos(' ', s_version) - 1);

  finally

    frmVersion.Free;

  end;

  // Afficher la version sur le bouton
  btnVersion.Caption := Trim('Version ' + s_version);

end;

procedure TfrmMain.AnalyserRejets(ppc: TPageControl);
begin

  if not FFichierRejet then Exit;

  case ppc.Name of

    C_S_PAGE_CONTROL_EVENEMENTS_NOM:
      begin

        RepererRejet(tsEntite100, e100_sel.s_erreur);
        RepererRejet(tsEntite110, e100_sel.e110.s_erreur);
        RepererRejet(tsEntite115, e100_sel.e115.s_erreur);
        RepererRejet(tsEntite120, e100_sel.e120.s_erreur);
        RepererRejet(tsEntite130, e100_sel.e130.s_erreur);
        RepererRejet(tsEntite135, e100_sel.e135.s_erreur);
        RepererRejet(tsEntite155, e100_sel.e155.s_erreur);
        RepererRejet(tsEntite180, e100_sel.e180.s_erreur);

      end;

    C_S_PAGE_CONTROL_BENEFICIAIRES_NOM:
      begin

        RepererRejet(tsEntite400, e400_sel.s_erreur);
        RepererRejet(tsEntite405, e400_sel.e405.s_erreur);
        RepererRejet(tsEntite410, e400_sel.e410.s_erreur);
        RepererRejet(tsEntite411, '');
        RepererRejet(tsEntite485, e485_sel.s_erreur);
        RepererRejet(tsEntite490, e490_sel.s_erreur);
        RepererRejet(tsEntite800, e400_sel.e800.s_erreur);

      end;

    C_S_PAGE_CONTROL_COORDONNEES_NOM:
      begin

        RepererRejet(tsEntite125, e125_sel.s_erreur);

      end;

    C_S_PAGE_CONTROL_GARANTIES_NOM:
      begin

        RepererRejet(tsEntite700, e700_sel.s_erreur);

      end;

    C_S_PAGE_CONTROL_CRITERES_NOM:
      begin

        RepererRejet(tsEntite485, e485_sel.s_erreur);

      end;

    C_S_PAGE_CONTROL_VARIABLES_SOUSCRIPTION:
      begin

        RepererRejet(tsEntite490, e490_sel.s_erreur);

      end;

    else AjouterJournal('PageControl inconnu : ' + ppc.Name, JOURNAL_STYLE_ERREUR);

  end;

end;

procedure TfrmMain.ChargerBeneficiaires(pa_e400: array of t_entite_400);
var
  i_beneficiaire, i_ligne: Integer;
begin

  // Réinitialiser la grille
  i_ligne := 0;
  sgBeneficiaires.RowCount := 1;

  if Length(pa_e400) = 0 then Exit;

  sgBeneficiaires.RowCount := Length(pa_e400) + 1;

  // Désactiver les onglets
  DesactiverOnglets(pcBeneficiaires);

  // Remplir la grille
  for i_beneficiaire := 0 to High(pa_e400) do
  begin

    with pa_e400[i_beneficiaire] do
    begin

      i_ligne := i_ligne + 1;
      sgBeneficiaires.Cells[C_I_GRD_BEN_LIEN, i_ligne] := s_type_assure;

      if s_type_assure = C_S_TYPE_ASSURE_PRINCIPAL then
      begin

        sgBeneficiaires.Cells[C_I_GRD_BEN_RANG, i_ligne] := e100_sel.e115.s_rang_personne_n;
        sgBeneficiaires.Cells[C_I_GRD_BEN_NOM, i_ligne] := e100_sel.e115.s_nom;
        sgBeneficiaires.Cells[C_I_GRD_BEN_PRENOM, i_ligne] := e100_sel.e115.s_prenom_1;

      end
      else
      begin

        sgBeneficiaires.Cells[C_I_GRD_BEN_RANG, i_ligne] := e405.s_rang_n;
        sgBeneficiaires.Cells[C_I_GRD_BEN_NOM, i_ligne] := e405.s_nom;
        sgBeneficiaires.Cells[C_I_GRD_BEN_PRENOM, i_ligne] := e405.s_prenom_1;

      end;

    end;

  end;

  ChargerBeneficiaireSelectionne;

end;

procedure TfrmMain.ChargerBeneficiaireSelectionne;
var
  entites: set of TEntite;
  i_beneficiaire, i_ligne_selectionnee: Integer;
  s_nom_sel, s_prenom_sel: String;
begin

  // Initialisation des variables
  entites := [];

  // Désactiver les onglets
  DesactiverOnglets(pcBeneficiaires);

  // Récupérer le bénéficiaire sélectionné
  i_ligne_selectionnee := sgBeneficiaires.row;
  s_nom_sel := sgBeneficiaires.Cells[C_I_GRD_BEN_NOM, i_ligne_selectionnee];
  s_prenom_sel := sgBeneficiaires.Cells[C_I_GRD_BEN_PRENOM, i_ligne_selectionnee];

  for i_beneficiaire := 0 to High(e100_sel.a_e400) do
  begin

    with e100_sel.a_e400[i_beneficiaire] do
    begin

      if    ((e100_sel.e115.s_nom = s_nom_sel) and (e100_sel.e115.s_prenom_1 = s_prenom_sel) and (s_type_assure = C_S_TYPE_ASSURE_PRINCIPAL))
         or ((e405.s_nom = s_nom_sel) and (e405.s_prenom_1 = s_prenom_sel) and (s_type_assure <> C_S_TYPE_ASSURE_PRINCIPAL)) then
      begin

        e400_sel := e100_sel.a_e400[i_beneficiaire];
        break;

      end;

    end;

  end;

  if e400_sel.s_num_dossier_n = '' then Exit;

  // Répérer les onglets à activer
  with e400_sel do
  begin

    if s_num_dossier_n <> '' then entites := entites + [TEntite.E400];
    if e405.s_num_dossier_n <> '' then entites := entites + [TEntite.E405];
    if e410.s_num_dossier_n <> '' then entites := entites + [TEntite.E410];
    if e411.s_num_dossier_n <> '' then entites := entites + [TEntite.E411];
    if e410.s_num_dossier_n <> '' then entites := entites + [TEntite.E410];
    if a_e485 <> nil then entites := entites + [TEntite.E485];
    if a_e490 <> nil then entites := entites + [TEntite.E490];
    if e800.s_num_dossier_n <> '' then entites := entites + [TEntite.E800];
    if a_e700 <> nil then entites := entites + [TEntite.E700];

  end;

  // Charger les garanties
  ChargerGaranties(e400_sel.a_e700);

  // Charger les critères
  ChargerCriteres(e400_sel.a_e485);

  // Charger les valeurs de souscription
  ChargerVariablesSouscription(e400_sel.a_e490);

  // Activer les onglets
  ActiverOnglets(pcBeneficiaires, entites);

  // Mettre à jour le fil d'Ariane
  if e400_sel.s_num_dossier_n <> '' then
  begin

    s_fil_ariane_e400 := e400_sel.s_type_assure + ' ' + s_nom_sel + ' ' + s_prenom_sel;
    s_fil_ariane_e700 := '';
    s_fil_ariane_e485 := '';
    s_fil_ariane_e490 := '';

  end;

  MettreAJourFilAriane;

  if not FFichierRejet then
  begin

    MarquerControleErreur(pcBeneficiaires);
    MarquerControleErreur(pcCriteres);
    MarquerControleErreur(pcVariablesSouscription);
    MarquerControleErreur(pcGaranties);

  end;

end;

procedure TfrmMain.ChargerDonneesOnglet(ppc: TPageControl);
begin

  case ppc.Name of

    C_S_PAGE_CONTROL_EVENEMENTS_NOM:
      begin

        ChargerDonneesOnglet100;
        ChargerDonneesOnglet110;
        ChargerDonneesOnglet115;
        ChargerDonneesOnglet120;
        ChargerDonneesOnglet130;
        ChargerDonneesOnglet135;
        ChargerDonneesOnglet155;
        ChargerDonneesOnglet180;

      end;

    C_S_PAGE_CONTROL_BENEFICIAIRES_NOM:
      begin

        ChargerDonneesOnglet400;
        ChargerDonneesOnglet405;
        ChargerDonneesOnglet410;
        ChargerDonneesOnglet800;

      end;

    C_S_PAGE_CONTROL_COORDONNEES_NOM:
      begin

        ChargerDonneesOnglet125;

      end;

    C_S_PAGE_CONTROL_GARANTIES_NOM:
      begin

        ChargerDonneesOnglet700;

      end;

    C_S_PAGE_CONTROL_CRITERES_NOM:
      begin

        ChargerDonneesOnglet485;

      end;

    C_S_PAGE_CONTROL_VARIABLES_SOUSCRIPTION:
      begin

        ChargerDonneesOnglet490;

      end;

    else AjouterJournal('PageControl inconnu : ' + ppc.Name, JOURNAL_STYLE_ERREUR);

  end;

  AnalyserRejets(ppc);

end;

procedure TfrmMain.ChargerDonneesOnglet100;
begin

  // Effacer les données
  cbb100TypeContrat.ItemIndex    := -1;
  edt100NumContratIndiv.Text     := '';
  edt100NumContratColl.Text      := '';
  edt100CodeGroupeAssures.Text   := '';
  edt100CodeEntiteRatt.Text      := '';
  dtp100DateEffetActe.Date       := NullDate;
  dtp100DateEffetCotisation.Date := NullDate;
  dtp100DateVente.Date           := NullDate;
  dtp100DateDemande.Date         := NullDate;
  edt100CodeOffre.Text           := '';
  edt100CodeReseau.Text          := '';
  edt100EcheancePrinc.Text       := '';
  edt100GroupeGestion.Text       := '';
  edt100CentreGestion.Text       := '';
  cbb100CodeContexte.ItemIndex   := -1;
  lbl100ErreurValeur.Caption     := '';

  if not tsEntite100.TabVisible then Exit;

  // Charger les données
  SetComboIndex(cbb100TypeContrat, e100_sel.s_type_contrat);
  edt100NumContratIndiv.Text     := e100_sel.s_num_contrat_indiv;
  edt100NumContratColl.Text      := e100_sel.s_num_contrat_collectif;
  edt100CodeGroupeAssures.Text   := e100_sel.s_code_groupe_assures;
  edt100CodeEntiteRatt.Text      := e100_sel.s_code_entite_rattachement;
  dtp100DateEffetActe.Date       := GetDateFromAc056(e100_sel.s_date_effet_acte_d);
  dtp100DateEffetCotisation.Date := GetDateFromAc056(e100_sel.s_date_effet_cotisation_d);
  dtp100DateVente.Date           := GetDateFromAc056(e100_sel.s_date_vente_d);
  dtp100DateDemande.Date         := GetDateFromAc056(e100_sel.s_date_demande_d);
  edt100CodeOffre.Text           := e100_sel.s_code_offre;
  edt100CodeReseau.Text          := e100_sel.s_code_reseau;
  edt100EcheancePrinc.Text       := e100_sel.s_ech_princ_n;
  edt100GroupeGestion.Text       := e100_sel.s_groupe_gestion;
  edt100CentreGestion.Text       := e100_sel.s_centre_gestion;
  SetComboIndex(cbb100CodeContexte, e100_sel.s_code_contexte);

  // Erreur
  SetErreur(lbl100Erreur, lbl100ErreurValeur, lbl100ErreurDescription, e100_sel.s_erreur);

end;

procedure TfrmMain.ChargerDonneesOnglet110;
begin

  // Effacer les données
  dtp110DateEffetPremSouscr.Date := NullDate;
  dtp110DateAncienneteContrat.Date := NullDate;

  if not tsEntite110.TabVisible then Exit;

  // Charger les données
  dtp110DateEffetPremSouscr.Date := GetDateFromAc056(e100_sel.e110.s_date_effet_d);
  dtp110DateAncienneteContrat.Date := GetDateFromAc056(e100_sel.e110.s_ancien_contrat_d);

  // Erreur
  SetErreur(lbl110Erreur, lbl110ErreurValeur, lbl110ErreurDescription, e100_sel.e110.s_erreur);

end;

procedure TfrmMain.ChargerDonneesOnglet115;
begin

  // Effacer les données
  edt115RangPesonne.Text       := '';
  cbb115CodeCivilite.ItemIndex := -1;
  edt115Nom.Text               := '';
  edt115Prenom.Text            := '';
  edt115Insee.Text             := '';

  if not tsEntite115.TabVisible then Exit;

  // Charger les données
  SetComboIndex(cbb115CodeCivilite, e100_sel.e115.s_code_civilite);
  edt115RangPesonne.Text := e100_sel.e115.s_rang_personne_n;
  edt115Nom.Text         := e100_sel.e115.s_nom;
  edt115Prenom.Text      := e100_sel.e115.s_prenom_1;
  edt115Insee.Text       := e100_sel.e115.s_num_insee;

  // Erreur
  SetErreur(lbl115Erreur, lbl115ErreurValeur, lbl115ErreurDescription, e100_sel.e115.s_erreur);

end;

procedure TfrmMain.ChargerDonneesOnglet120;
begin

  // Effacer les données
  edt120ComplementGeo.Text        := '';
  edt120NumeroVoie.Text           := '';
  cbb120CodeBtq.ItemIndex         := -1;
  cbb120CodeNatureVoie.ItemIndex  := -1;
  edt120LibelleVoie.Text          := '';
  edt120LieuDit.Text              := '';
  edt120CodePostal.Text           := '';
  edt120LibelleLocalite.Text      := '';
  cbb120CodeDepartement.ItemIndex := -1;
  cbb120CodePays.ItemIndex        := -1;
  cbb120CodeTypeAdresse.ItemIndex := -1;

  if not tsEntite120.TabVisible then Exit;

  // Charger les données
  edt120ComplementGeo.Text        := e100_sel.e120.s_complement_geographique;
  edt120NumeroVoie.Text           := e100_sel.e120.s_numero_voie;
  SetComboIndex(cbb120CodeBtq, e100_sel.e120.s_code_btq);
  SetComboIndex(cbb120CodeNatureVoie, e100_sel.e120.s_code_nature_voie);
  edt120LibelleVoie.Text          := e100_sel.e120.s_libelle_voie;
  edt120LieuDit.Text              := e100_sel.e120.s_lieu_dit;
  edt120CodePostal.Text           := e100_sel.e120.s_code_postal_localite;
  edt120LibelleLocalite.Text      := e100_sel.e120.s_libelle_localite;
  SetComboIndex(cbb120CodeDepartement, e100_sel.e120.s_code_departement);
  SetComboIndex(cbb120CodePays, e100_sel.e120.s_code_pays);
  SetComboIndex(cbb120CodeTypeAdresse, e100_sel.e120.s_code_type_adresse);

  // Erreur
  SetErreur(lbl120Erreur, lbl120ErreurValeur, lbl120ErreurDescription, e100_sel.e120.s_erreur);

end;

procedure TfrmMain.ChargerDonneesOnglet125;
begin

  // Effacer les données
  cbb125Type.ItemIndex   := -1;
  cbb125Nature.ItemIndex := -1;
  edt125Valeur.Text      := '';

  if not tsCoordonnees.TabVisible then Exit;

  // Charger les données
  SetComboIndex(cbb125Type, e125_sel.s_code_type_coordonnee);
  SetComboIndex(cbb125Nature, e125_sel.s_code_nature_communication);
  edt125Valeur.Text := e125_sel.s_valeur_coordonnee_communication;

  // Erreur
  SetErreur(lbl125Erreur, lbl125ErreurValeur, lbl125ErreurDescription, e125_sel.s_erreur);

end;

procedure TfrmMain.ChargerDonneesOnglet130;
begin

  // Effacer les données
  edt130CodeBanque.Text := '';
  edt130CodeGuichet.Text := '';
  edt130NumeroCompte.Text := '';
  edt130CleCompte.Text := '';
  edt130Titulaire.Text := '';
  cbb130Pays.ItemIndex := -1;
  cbb130Devise.ItemIndex := -1;

  if not tsEntite130.TabVisible then Exit;

  // Charger les données
  edt130CodeBanque.Text := e100_sel.e130.s_code_banque;
  edt130CodeGuichet.Text := e100_sel.e130.s_code_guichet;
  edt130NumeroCompte.Text := e100_sel.e130.s_numero_compte;
  edt130CleCompte.Text := e100_sel.e130.s_cle_controle;
  edt130Titulaire.Text := e100_sel.e130.s_titulaire_compte;
  SetComboIndex(cbb130Pays, e100_sel.e130.s_code_pays);
  SetComboIndex(cbb130Devise, e100_sel.e130.s_code_devise);

  // Erreur
  SetErreur(lbl130Erreur, lbl130ErreurValeur, lbl130ErreurDescription, e100_sel.e130.s_erreur);

end;

procedure TfrmMain.ChargerDonneesOnglet135;
begin

  // Effacer les données
  edt135RangPesonne.Text:= '';

  if not tsEntite135.TabVisible then Exit;

  // Charger les données
  edt135RangPesonne.Text := e100_sel.e135.s_rang_personne_n;

  // Erreur
  SetErreur(lbl135Erreur, lbl135ErreurValeur, lbl135ErreurDescription, e100_sel.e135.s_erreur);

end;

procedure TfrmMain.ChargerDonneesOnglet155;
begin

  // Effacer les données
  edt155RangPesonne.Text          := '';
  dtp155DateDebutPrelevement.Date := NullDate;

  if not tsEntite155.TabVisible then Exit;

  // Charger les données
  edt155RangPesonne.Text := e100_sel.e155.s_rang_personne_n;
  dtp155DateDebutPrelevement.Date := GetDateFromAc056(e100_sel.e155.s_debut_prelevement_d);

  // Erreur
  SetErreur(lbl155Erreur, lbl155ErreurValeur, lbl155ErreurDescription, e100_sel.e155.s_erreur);

end;

procedure TfrmMain.ChargerDonneesOnglet180;
begin

  // Effacer les données
  edt180RangPesonne.Text       := '';
  cbb180ModePaiement.ItemIndex := -1;

  if not tsEntite180.TabVisible then Exit;

  // Charger les données
  edt180RangPesonne.Text := e100_sel.e180.s_rang_personne_n;
  SetComboIndex(cbb180ModePaiement, e100_sel.e180.s_mode_paiement);

  // Erreur
  SetErreur(lbl180Erreur, lbl180ErreurValeur, lbl180ErreurDescription, e100_sel.e180.s_erreur);

end;

procedure TfrmMain.ChargerDonneesOnglet400;
begin

  // Effacer les données
  dtp400DateAncienneteAssure.Date      := NullDate;
  cbb400TypeAssure.ItemIndex           := -1;
  cbb400CodePaysTarifaire.ItemIndex    := -1;
  cbb400DepartementTarifaire.ItemIndex := -1;
  cbb400SituationFamille.ItemIndex     := -1;
  cbb400CodeSexe.ItemIndex             := -1;
  cbb400CategorieSociale.ItemIndex     := -1;
  dtp400DateNaissance.Date             := NullDate;
  edt400RangBeneficiaire.Text          := '';
  edt400RangPersonne.Text              := '';
  edt400CodeInsee.Text                 := '';
  edt400CleInsee.Text                  := '';

  if not tsEntite400.TabVisible then Exit;

  // Charger les données
  dtp400DateAncienneteAssure.Date := GetDateFromAc056(e400_sel.s_date_anciennete_d);
  dtp400DateNaissance.Date    := GetDateFromAc056(e400_sel.s_date_naissance_d);
  edt400RangBeneficiaire.Text := e400_sel.s_rang_n;
  edt400RangPersonne.Text     := e400_sel.s_rang_personne_n;
  edt400CodeInsee.Text        := e400_sel.s_code_insee;
  edt400CleInsee.Text         := e400_sel.s_cle_insee;
  SetComboIndex(cbb400TypeAssure, e400_sel.s_type_assure);
  SetComboIndex(cbb400CodePaysTarifaire, e400_sel.s_code_pays);
  SetComboIndex(cbb400DepartementTarifaire, e400_sel.s_code_departement);
  SetComboIndex(cbb400SituationFamille, e400_sel.s_situation_famille);
  SetComboIndex(cbb400CodeSexe, e400_sel.s_code_sexe);
  SetComboIndex(cbb400CategorieSociale, e400_sel.s_categorie_sociale);

  // Erreur
  SetErreur(lbl400Erreur, lbl400ErreurValeur, lbl400ErreurDescription, e400_sel.s_erreur);

end;

procedure TfrmMain.ChargerDonneesOnglet405;
begin

  // Effacer les données
  cbb405CodeCivilite.ItemIndex := -1;
  edt405RangBeneficiaire.Text              := '';
  edt405Nom.Text               := '';
  edt405Prenom.Text            := '';
  edt405NumeroInsee.Text       := '';
  edt405NomJeuneFille.Text     := '';

  if not tsEntite405.TabVisible then Exit;

  // Charger les données
  edt405RangBeneficiaire.Text          := e400_sel.e405.s_rang_n;
  edt405Nom.Text           := e400_sel.e405.s_nom;
  edt405Prenom.Text        := e400_sel.e405.s_prenom_1;
  edt405NumeroInsee.Text   := e400_sel.e405.s_num_insee;
  edt405NomJeuneFille.Text := e400_sel.e405.s_nom_jeune_fille;
  SetComboIndex(cbb405CodeCivilite, e400_sel.e405.s_code_civilite);

  // Erreur
  SetErreur(lbl405Erreur, lbl405ErreurValeur, lbl405ErreurDescription, e400_sel.e405.s_erreur);

end;

procedure TfrmMain.ChargerDonneesOnglet410;
begin

  // Effacer les données
  edt410RangBeneficiaire.Text   := '';
  edt410RangNaissance.Text      := '';
  edt410NumeroRo.Text           := '';
  edt410CleRo.Text              := '';
  edt410CodeGrandRegime.Text    := '';
  edt410CodeCaisse.Text         := '';
  edt410CodeCentrePaiement.Text := '';
  dtp410DateNaissance.Date      := NullDate;

  if not tsEntite410.TabVisible then Exit;

  // Charger les données
  edt410RangBeneficiaire.Text   := e400_sel.e410.s_rang_n;
  edt410RangNaissance.Text      := e400_sel.e410.s_rang_naissance_n;
  edt410NumeroRo.Text           := e400_sel.e410.s_numero_ro;
  edt410CleRo.Text              := e400_sel.e410.s_cle_ro;
  edt410CodeGrandRegime.Text    := e400_sel.e410.s_code_grand_regime;
  edt410CodeCaisse.Text         := e400_sel.e410.s_code_caisse_ro;
  edt410CodeCentrePaiement.Text := e400_sel.e410.s_code_centre_paiement;
  dtp410DateNaissance.Date      := GetDateFromAc056(e400_sel.e410.s_date_naissance_d);

  // Erreur
  SetErreur(lbl410Erreur, lbl410ErreurValeur, lbl410ErreurDescription, e400_sel.e410.s_erreur);

end;

procedure TfrmMain.ChargerDonneesOnglet485;
begin

  // Effacer les données
  edt485RangBeneficiaire.Text := '';
  edt485Code.Text             := '';
  edt485Valeur.Text           := '';

  if not tsEntite485.TabVisible then Exit;

  // Charger les données
  edt485RangBeneficiaire.Text := e485_sel.s_rang_n;
  edt485Code.Text             := e485_sel.s_code;
  edt485Valeur.Text           := e485_sel.s_valeur;

end;

procedure TfrmMain.ChargerDonneesOnglet490;
begin

  // Effacer les données
  edt490RangBeneficiaire.Text := '';
  edt490Code.Text             := '';
  edt490Valeur.Text           := '';

  if not tsEntite490.TabVisible then Exit;

  // Charger les données
  edt490RangBeneficiaire.Text := e490_sel.s_rang_n;
  edt490Code.Text             := e490_sel.s_code;
  edt490Valeur.Text           := e490_sel.s_valeur;

end;

procedure TfrmMain.ChargerDonneesOnglet700;
begin

  // Effacer les données
  edt700RangBeneficiaire.Text       := '';
  edt700CodeAssureur.Text           := '';
  edt700CodeProduit.Text            := '';
  edt700CodeGarantie.Text           := '';
  edt700CodeConditionVente.Text     := '';
  dtp700DateAncienneteGarantie.Date := NullDate;
  edt700DerogerDateStage.Text       := '';
  dtp700DateFinStage.Date           := NullDate;
  edt700CodeStage.Text              := '';
  edt700TypeGarantie.Text           := '';

  if not tsEntite700.TabVisible then Exit;

  // Charger les données
  edt700RangBeneficiaire.Text       := e700_sel.s_rang_n;
  edt700CodeAssureur.Text           := e700_sel.s_code_assureur;
  edt700CodeProduit.Text            := e700_sel.s_code_produit;
  edt700CodeGarantie.Text           := e700_sel.s_code_garantie;
  edt700CodeConditionVente.Text     := e700_sel.s_code_condition_vente;
  dtp700DateAncienneteGarantie.Date := GetDateFromAc056(e700_sel.s_anciennete_garantie_souscr_d);
  edt700DerogerDateStage.Text       := e700_sel.s_appliquer_stage_cv_n;
  dtp700DateFinStage.Date           := GetDateFromAc056(e700_sel.s_date_fin_stage_1_d);
  edt700CodeStage.Text              := e700_sel.s_code_stage_1;
  edt700TypeGarantie.Text           := e700_sel.s_type_garantie_assemblee_n;

  // Erreur
  SetErreur(lbl700Erreur, lbl700ErreurValeur, lbl700ErreurDescription, e700_sel.s_erreur);

end;

procedure TfrmMain.ChargerDonneesOnglet800;
begin

  // Effacer les données
  edt800RangBeneficiaire.Text := '';
  edt800RangPersonne.Text     := '';
  edt800ReferenceExterne.Text := '';

  if not tsEntite800.TabVisible then Exit;

  // Charger les données
  edt800RangBeneficiaire.Text := e400_sel.e800.s_rang_n;
  edt800RangPersonne.Text     := e400_sel.e800.s_rang_personne_n;
  edt800ReferenceExterne.Text := e400_sel.e800.s_ref_externe;

  // Erreur
  SetErreur(lbl800Erreur, lbl800ErreurValeur, lbl800ErreurDescription, e400_sel.e800.s_erreur);

end;

procedure TfrmMain.ChargerCoordonnees(pa_e125: array of t_entite_125);
var
  i_coordonnee, i_ligne: Integer;
begin

  // Réinitialiser la grille
  i_ligne := 0;
  sgCoordonnees.RowCount := 1;

  if Length(pa_e125) = 0 then Exit;

  sgCoordonnees.RowCount := Length(pa_e125) + 1;

  // Désactiver les onglets
  DesactiverOnglets(pcCoordonnees);

  // Remplir la grille
  for i_coordonnee := 0 to High(pa_e125) do
  begin

    with pa_e125[i_coordonnee] do
    begin

      i_ligne := i_ligne + 1;
      sgCoordonnees.Cells[C_I_GRD_COORD_TYPE, i_ligne]   := s_code_type_coordonnee;
      sgCoordonnees.Cells[C_I_GRD_COORD_NATURE, i_ligne] := s_code_nature_communication;
      sgCoordonnees.Cells[C_I_GRD_COORD_VALEUR, i_ligne] := s_valeur_coordonnee_communication;

    end;

  end;

  ChargerCoordonneeSelectionnee;

end;

procedure TfrmMain.ChargerCoordonneeSelectionnee;
var
  entites: set of TEntite;
  i_coordonnee: Integer;
  i_ligne_selectionnee: Integer;
  s_nature_sel: String;
  s_type_sel: String;
begin

  // Initialisation des variables
  entites := [];

  // Désactiver les onglets
  DesactiverOnglets(pcCoordonnees);

  // Récupérer la coordonnée sélectionnée
  i_ligne_selectionnee := sgCoordonnees.row;
  s_nature_sel := sgCoordonnees.Cells[C_I_GRD_COORD_NATURE, i_ligne_selectionnee];
  s_type_sel := sgCoordonnees.Cells[C_I_GRD_COORD_TYPE, i_ligne_selectionnee];

  for i_coordonnee := 0 to High(e100_sel.a_e125) do
  begin

    with e100_sel.a_e125[i_coordonnee] do
    begin

      if (s_code_type_coordonnee = s_type_sel) and (s_code_nature_communication = s_nature_sel) then
      begin

        e125_sel := e100_sel.a_e125[i_coordonnee];
        break;

      end;

    end;

  end;

  if e125_sel.s_num_dossier_n = '' then Exit;

  // Répérer les onglets à activer
  with e125_sel do
  begin

    if s_num_dossier_n <> '' then entites := entites + [TEntite.E125];

  end;

  // Activer les onglets
  ActiverOnglets(pcCoordonnees, entites);

  // Mettre à jour le fil d'Ariane
  if e125_sel.s_num_dossier_n <> '' then
    s_fil_ariane_e125 := s_type_sel + ' ' + s_nature_sel;

  MettreAJourFilAriane;

  if not FFichierRejet then MarquerControleErreur(pcCoordonnees);

end;

procedure TfrmMain.ChargerCriteres(pa_e485: array of t_entite_485);
var
  i_critere, i_ligne: Integer;
begin

  // Réinitialiser la grille
  i_ligne := 0;
  sgCriteres.RowCount := 1;

  if Length(pa_e485) = 0 then Exit;

  sgCriteres.RowCount := Length(pa_e485) + 1;

  // Désactiver les onglets
  DesactiverOnglets(pcCriteres);

  // Remplir la grille
  for i_critere := 0 to High(pa_e485) do
  begin

    with pa_e485[i_critere] do
    begin

      i_ligne := i_ligne + 1;
      sgCriteres.Cells[C_I_GRD_CRIT_CODE, i_ligne] := s_code;
      sgCriteres.Cells[C_I_GRD_CRIT_VALEUR, i_ligne] := s_valeur;

    end;

  end;

  ChargerCritereSelectionne;

end;

procedure TfrmMain.ChargerCritereSelectionne;
var
  entites: set of TEntite;
  i_critere, i_ligne_selectionnee: Integer;
  s_code_sel, s_valeur_sel: String;
begin

  // Initialisation des variables
  entites := [];

  // Désactiver les onglets
  DesactiverOnglets(pcCriteres);

  // Récupérer le bénéficiaire sélectionné
  i_ligne_selectionnee := sgCriteres.row;
  s_code_sel := sgCriteres.Cells[C_I_GRD_CRIT_CODE, i_ligne_selectionnee];
  s_valeur_sel := sgCriteres.Cells[C_I_GRD_CRIT_VALEUR, i_ligne_selectionnee];

  for i_critere := 0 to High(e400_sel.a_e485) do
  begin

    with e400_sel.a_e485[i_critere] do
    begin

      if (s_code = s_code_sel) and (s_valeur = s_valeur_sel) then
      begin

        e485_sel := e400_sel.a_e485[i_critere];
        break;

      end;

    end;

  end;

  if e485_sel.s_num_dossier_n = '' then Exit;

  // Répérer les onglets à activer
  with e485_sel do
  begin

    if s_num_dossier_n <> '' then entites := entites + [TEntite.E485];

  end;

  // Activer les onglets
  ActiverOnglets(pcCriteres, entites);

  // Mettre à jour le fil d'Ariane
  if e485_sel.s_num_dossier_n <> '' then
    s_fil_ariane_e485 := s_code_sel + ' ' + s_valeur_sel;

  MettreAJourFilAriane;

  if not FFichierRejet then MarquerControleErreur(pcCriteres);

end;

procedure TfrmMain.ChargerEvenementSelectionne;
var
  entites: set of TEntite;
  i_indice, i_indice_2: Integer;
  i_ligne_grille, i_ligne_grille_2: Integer;
  i_ligne_selectionnee: Integer;
  s_num_dossier_sel: String;
  s_num_evenement_sel: String;
begin

  // Initialisation des variables
  entites := [];

  // Désactiver les onglets
  DesactiverOnglets(pcEvenements);

  // Verrouiller les composants
  VerrouillerComposants(frmMain);

  // Récupérer l'évènement sélectionné
  i_ligne_selectionnee := sgEvenements.row;
  s_num_dossier_sel := sgEvenements.Cells[C_I_GRD_EVT_NUM_DOSSIER, i_ligne_selectionnee];
  s_num_evenement_sel := sgEvenements.Cells[C_I_GRD_EVT_NUM_EVT, i_ligne_selectionnee];
  e100_sel := GetEvenement(s_num_dossier_sel, s_num_evenement_sel);

  // Aucune ligne sélectionnée
  if e100_sel.s_num_evt_n = '' then Exit;

  // Repérer les onglets à activer
  with e100_sel do
  begin

    if s_num_dossier_n <> '' then entites := entites + [TEntite.E100];
    if e110.s_num_dossier_n <> '' then entites := entites + [TEntite.E110];
    if e115.s_num_dossier_n <> '' then entites := entites + [TEntite.E115];
    if e120.s_num_dossier_n <> '' then entites := entites + [TEntite.E120];
    if a_e125 <> nil then entites := entites + [TEntite.E125];
    if e130.s_num_dossier_n <> '' then entites := entites + [TEntite.E130];
    if e135.s_num_dossier_n <> '' then entites := entites + [TEntite.E135];
    if e155.s_num_dossier_n <> '' then entites := entites + [TEntite.E155];
    if e180.s_num_dossier_n <> '' then entites := entites + [TEntite.E180];
    if a_e400 <> nil then entites := entites + [TEntite.E400];

  end;

  // Charger les bénéficiaires et les coordonnées
  ChargerBeneficiaires(e100_sel.a_e400);
  ChargerCoordonnees(e100_sel.a_e125);

  // Activer les onglets
  ActiverOnglets(pcEvenements, entites);

  // Mettre à jour le fil d'Ariane
  if e100_sel.s_num_dossier_n <> '' then
  begin

    s_fil_ariane_e100 := 'Dossier ' + s_num_dossier_sel + ' / Evènement ' + s_num_evenement_sel + ' / N° contrat ' + e100_sel.s_num_contrat_indiv;
    s_fil_ariane_e125 := '';
    s_fil_ariane_e400 := '';
    s_fil_ariane_e700 := '';
    s_fil_ariane_e485 := '';
    s_fil_ariane_e490 := '';

  end;

  MettreAJourFilAriane;

  // Drapeau sur l'onglet Bénéficiaires si un rejet sur un bénéficiaire ou une garantie
  if FFichierRejet then RepererRejetSurBeneficiaires
  else MarquerControleErreur(pcEvenements);

  with e100_sel do
  begin

    // Entité 125
    i_ligne_grille := 0;

    for i_indice := 0 to High(a_e125) do
    begin

      i_ligne_grille := i_ligne_grille + 1;
      MarquerGrilleLigneErreur(sgCoordonnees, i_ligne_grille, Length(a_e125[i_indice].ace) > 0);

    end;

    // Entité 400
    i_ligne_grille := 0;

    for i_indice := 0 to High(a_e400) do
    begin

      i_ligne_grille := i_ligne_grille + 1;

      if (Length(a_e400[i_indice].ace) > 0) or
         (Length(a_e400[i_indice].e405.ace) > 0) or
         (Length(a_e400[i_indice].e410.ace) > 0) or
         (Length(a_e400[i_indice].e800.ace) > 0) then MarquerGrilleLigneErreur(sgBeneficiaires, i_ligne_grille, True);

      with a_e400[i_indice] do
      begin

        if Assigned(a_e485) then
        begin

          i_ligne_grille_2 := 0;

          for i_indice_2 := 0 to High(a_e485) do

              i_ligne_grille_2 := i_ligne_grille_2 + 1;

              if Length(a_e485[i_indice_2].ace) > 0 then
              begin

                MarquerGrilleLigneErreur(sgBeneficiaires, i_ligne_grille, True);
                MarquerGrilleLigneErreur(sgCriteres, i_ligne_grille_2, True);

              end;

        end;

        if Assigned(a_e490) then
        begin

          i_ligne_grille_2 := 0;

          for i_indice_2 := 0 to High(a_e490) do

              i_ligne_grille_2 := i_ligne_grille_2 + 1;

              if Length(a_e490[i_indice_2].ace) > 0 then
              begin

                MarquerGrilleLigneErreur(sgBeneficiaires, i_ligne_grille, True);
                MarquerGrilleLigneErreur(sgVariablesSouscription, i_ligne_grille_2, True);

              end;

        end;

        if Assigned(a_e700) then
        begin

          i_ligne_grille_2 := 0;

          for i_indice_2 := 0 to High(a_e700) do

              i_ligne_grille_2 := i_ligne_grille_2 + 1;

              if Length(a_e700[i_indice_2].ace) > 0 then
              begin

                MarquerGrilleLigneErreur(sgBeneficiaires, i_ligne_grille, True);
                MarquerGrilleLigneErreur(sgGaranties, i_ligne_grille_2, True);

              end;

        end;

      end;

    end;

  end;

  // Copier le numéro de contrat dans le presse-papier
  RenseignerPressePapier(e100_sel.s_num_contrat_indiv);

end;

procedure TfrmMain.ChargerEvenements;
var
  i_dossier_idx: Integer;
  i_dossier_evt_idx: Integer;
  i_ligne: Integer;
begin

  // Réinitialiser la grille
  sgEvenements.RowCount := i_nb_evenements + 1;
  i_ligne := 0;

  if Length(ac056.a_e001) = 0 then Exit;

  // Charger les évènements dans la grille
  // Pour chaque dossier
  for i_dossier_idx := 0 to High(ac056.a_e001) do
  begin

    with ac056.a_e001[i_dossier_idx] do
    begin

      // Pour chaque évènement du dossier
      for i_dossier_evt_idx := 0 to High(a_e100) do
      begin

         with a_e100[i_dossier_evt_idx] do
         begin

           i_ligne := i_ligne + 1;
           sgEvenements.Cells[C_I_GRD_EVT_NUM_DOSSIER, i_ligne] := s_num_dossier_n;
           sgEvenements.Cells[C_I_GRD_EVT_NUM_EVT, i_ligne] := s_num_evt_n;
           sgEvenements.Cells[C_I_GRD_EVT_NUM_CONTRAT, i_ligne] := s_num_contrat_indiv;
           sgEvenements.Cells[C_I_GRD_EVT_CODE_EVT, i_ligne] := s_code_evt_n;

         end;

       end;

    end;

  end;

end;

procedure TfrmMain.ChargerFichierAc056;
var
  s_fichier: String;
  s_ligne: String;
  tf_ac056: TextFile;
begin

  if s_nom_fichier = '' then Exit;

  s_fichier := ExtractFileName(s_nom_fichier);
  FFichierRejet := s_fichier.StartsWith(C_S_PREFIXE_FICHIER_REJET);
  uAc056.b_entite000_creee := False;

  // Remplir le tableau des évènements
  AssignFile(tf_ac056, s_nom_fichier);
  {$I+} // Pour gérer les exceptions
  try

    try

      Reset(tf_ac056);

      repeat

        ReadLn(tf_ac056, s_ligne);

        if FFichierRejet then s_ligne := Trim(WinCPToUTF8(s_ligne));

        i_ligne_ac056_lue := i_ligne_ac056_lue + 1;

        if s_ligne <> '' then AjouterEntite(s_ligne)
        else b_avec_lignes_vierges := True;

      until EOF(tf_ac056);

      //btnEnregistrer.Enabled := not FFichierRejet;
      ChargerEvenements;

      if not FFichierRejet then ControlerEvenements;

      ChargerEvenementSelectionne;

      frmMain.Caption := GetTitreApplication + ' - ' + s_nom_fichier;
      AjouterJournal('Le fichier ' + s_nom_fichier + ' a été correctement chargé.', JOURNAL_STYLE_SUCCES);

    except
      on e: EInOutError do AjouterJournal('Une exception a été levée : ' + e.ClassName + ' / ' + e.Message, JOURNAL_STYLE_ERREUR);
    end;

  finally

    CloseFile(tf_ac056);

  end;

  // Si le fichier AC056 contient des lignes vierges, il faut enregistrer le fichier depuis ac056 pour éliminer ces lignes vierges.
  if b_avec_lignes_vierges then
  begin

    if EnregistrerFichierAc056 then
    begin

      b_avec_lignes_vierges := False;
      AjouterJournal('Le fichier originel contenait des lignes vierges. Elles ont été supprimées.', JOURNAL_STYLE_AUCUN);

    end;

  end;

end;

procedure TfrmMain.ChargerGaranties(pa_e700: array of t_entite_700);
var
  i_garantie, i_ligne: Integer;
begin

  // Réinitialiser la grille
  i_ligne := 0;
  sgGaranties.RowCount := 1;

  if Length(pa_e700) = 0 then Exit;

  sgGaranties.RowCount := Length(pa_e700) + 1;

  // Désactiver les onglets
  DesactiverOnglets(pcGaranties);

  // Remplir la grille
  for i_garantie := 0 to High(pa_e700) do
  begin

    with pa_e700[i_garantie] do
    begin

      i_ligne := i_ligne + 1;
      sgGaranties.Cells[C_I_GRD_GAR_ASSUREUR, i_ligne] := s_code_assureur;
      sgGaranties.Cells[C_I_GRD_GAR_PRODUIT, i_ligne] := s_code_produit;
      sgGaranties.Cells[C_I_GRD_GAR_GARANTIE, i_ligne] := s_code_garantie;

    end;

  end;

  ChargerGarantieSelectionnee;

end;

procedure TfrmMain.ChargerGarantieSelectionnee;
var
  entites: set of TEntite;
  i_garantie, i_ligne_selectionnee: Integer;
  s_assureur_sel, s_produit_sel, s_garantie_sel: String;
begin

  // Initialisation des variables
  entites := [];

  // Désactiver les onglets
  DesactiverOnglets(pcGaranties);

  // Récupérer le bénéficiaire sélectionné
  i_ligne_selectionnee := sgGaranties.row;
  s_assureur_sel := sgGaranties.Cells[C_I_GRD_GAR_ASSUREUR, i_ligne_selectionnee];
  s_produit_sel := sgGaranties.Cells[C_I_GRD_GAR_PRODUIT, i_ligne_selectionnee];
  s_garantie_sel := sgGaranties.Cells[C_I_GRD_GAR_GARANTIE, i_ligne_selectionnee];

  for i_garantie := 0 to High(e400_sel.a_e700) do
  begin

    with e400_sel.a_e700[i_garantie] do
    begin

      if (s_code_assureur = s_assureur_sel) and (s_code_produit = s_produit_sel) and (s_code_garantie = s_garantie_sel) then
      begin

        e700_sel := e400_sel.a_e700[i_garantie];
        break;

      end;

    end;

  end;

  if e700_sel.s_num_dossier_n = '' then Exit;

  // Répérer les onglets à activer
  with e700_sel do
  begin

    if s_num_dossier_n <> '' then entites := entites + [TEntite.E700];

  end;

  // Activer les onglets
  ActiverOnglets(pcGaranties, entites);

  // Mettre à jour le fil d'Ariane
  if e700_sel.s_num_dossier_n <> '' then
    s_fil_ariane_e700 := s_assureur_sel + ' ' + s_produit_sel + ' ' + s_garantie_sel;

  MettreAJourFilAriane;

end;

procedure TfrmMain.ChargerVariablesSouscription(pa_e490: array of t_entite_490);
var
  i_variable, i_ligne: Integer;
begin

  // Réinitialiser la grille
  i_ligne := 0;
  sgVariablesSouscription.RowCount := 1;

  if Length(pa_e490) = 0 then Exit;

  sgVariablesSouscription.RowCount := Length(pa_e490) + 1;

  // Désactiver les onglets
  DesactiverOnglets(pcVariablesSouscription);

  // Remplir la grille
  for i_variable := 0 to High(pa_e490) do
  begin

    with pa_e490[i_variable] do
    begin

      i_ligne := i_ligne + 1;
      sgVariablesSouscription.Cells[C_I_GRD_VALSC_CODE, i_ligne] := s_code;
      sgVariablesSouscription.Cells[C_I_GRD_VALSC_VALEUR, i_ligne] := s_valeur;

    end;

  end;

  ChargerVariableSouscriptionSelectionne;

end;

procedure TfrmMain.ChargerVariableSouscriptionSelectionne;
var
  entites: set of TEntite;
  i_valeur, i_ligne_selectionnee: Integer;
  s_code_sel, s_valeur_sel: String;
begin

  // Initialisation des variables
  entites := [];

  // Désactiver les onglets
  DesactiverOnglets(pcVariablesSouscription);

  // Récupérer le bénéficiaire sélectionné
  i_ligne_selectionnee := sgVariablesSouscription.row;
  s_code_sel := sgVariablesSouscription.Cells[C_I_GRD_VALSC_CODE, i_ligne_selectionnee];
  s_valeur_sel := sgVariablesSouscription.Cells[C_I_GRD_VALSC_VALEUR, i_ligne_selectionnee];

  for i_valeur := 0 to High(e400_sel.a_e490) do
  begin

    with e400_sel.a_e490[i_valeur] do
    begin

      if (s_code = s_code_sel) and (s_valeur = s_valeur_sel) then
      begin

        e490_sel := e400_sel.a_e490[i_valeur];
        break;

      end;

    end;

  end;

  if e490_sel.s_num_dossier_n = '' then Exit;

  // Répérer les onglets à activer
  with e490_sel do
  begin

    if s_num_dossier_n <> '' then entites := entites + [TEntite.E490];

  end;

  // Activer les onglets
  ActiverOnglets(pcVariablesSouscription, entites);

  // Mettre à jour le fil d'Ariane
  if e490_sel.s_num_dossier_n <> '' then
    s_fil_ariane_e490 := s_code_sel + ' ' + s_valeur_sel;

  MettreAJourFilAriane;

  if not FFichierRejet then MarquerControleErreur(pcVariablesSouscription);

end;

function TfrmMain.ConnexionFtpApivia: Boolean;
var
  b_result: Boolean;
  s_password: String;
  s_username: String;
begin

  // Initialisation des variables
  b_result := False;

  if not Assigned(ftp_apivia) then ftp_apivia := TTGPuttySFTP.Create(True);

  if not ftp_apivia.Connected then
  begin

    ftp_apivia.Port     := C_I_FTP_APIVIA_PORT;

    ftp_apivia.HostName := C_S_FTP_APIVIA_HOST_DEV;
    s_username := C_S_FTP_APIVIA_USER_DEV;
    s_password := C_S_FTP_APIVIA_PWD_DEV;

    if FEnvironnementDevProd = C_I_ENVIRONNEMENT_PROD then
    begin

      ftp_apivia.HostName := C_S_FTP_APIVIA_HOST_PROD;
      s_username := C_S_FTP_APIVIA_USER_PROD;
      s_password := C_S_FTP_APIVIA_PWD_PROD;

    end;
    ftp_apivia.UserName  := s_username;
    ftp_apivia.Password  := s_password;
    ftp_apivia.Keyfile   := GetCurrentDir + '\' + C_S_FTP_APIVIA_KEYFILE;
    ftp_apivia.OnListing := @FtpApiviaListingCallback;
    ftp_apivia.OnMessage := @FtpApiviaMessageCallback;
    ftp_apivia.OnVerifyHostKey := @FtpApiviaVerifyHostKey;

    try

      AjouterJournal('Connexion à APIVIA en cours...', JOURNAL_STYLE_AUCUN);
      ftp_apivia.Connect;
      AjouterJournal('Connexion à APIVIA réussie', JOURNAL_STYLE_SUCCES);

      b_result := True;

    except

      on e: Exception do AjouterJournal('Erreur lors de la connexion à APIVIA : ' + e.Message, JOURNAL_STYLE_ERREUR);

    end;

  end
  else b_result := True;

  Result := b_result;

end;

function TfrmMain.ConnexionFtpIga: Boolean;
var
  b_result: Boolean;
begin

  // Initialisation des variables
  b_result := False;

  // Connexion au serveur FTP
  if not ftp_iga.Connected then
  begin

    ftp_iga.host     := C_S_FTP_IGA_HOST;
    ftp_iga.Username := C_S_FTP_IGA_USER;
    ftp_iga.Password := C_S_FTP_IGA_PWD;

    try

      AjouterJournal('Connexion à IGA en cours...', JOURNAL_STYLE_AUCUN);
      ftp_iga.Connect;
      AjouterJournal('Connexion à IGA réussie', JOURNAL_STYLE_SUCCES);

      // Se positionner dans le dossier APIVIA
      ftp_iga.ChangeDir(C_S_FTP_IGA_APIVIA_FOLDER);

      b_result := True;

    except

      on e: Exception do AjouterJournal('Erreur lors de la connexion à IGA : ' + e.Message, JOURNAL_STYLE_ERREUR);

    end;

  end
  else b_result := True;

  Result := b_result;

end;

procedure TfrmMain.ControlerEvenements;
var
  b_avec_erreur: Boolean;
  i_dossier: Integer;
  i_evenement: Integer;
  i_indice: Integer;
  i_indice_2: Integer;
  i_ligne: Integer;
begin

  // Initialisation des variables
  i_nb_controle_erreurs := 0;
  i_ligne := 0;

  // Repérer les erreurs
  for i_dossier := 0 to High(ac056.a_e001) do
  begin

    for i_evenement := 0 to High(ac056.a_e001[i_dossier].a_e100) do
    begin

      i_ligne := i_ligne + 1;

      ControlerEvenement(ac056.a_e001[i_dossier].a_e100[i_evenement]);

      with ac056.a_e001[i_dossier].a_e100[i_evenement] do
      begin

        // Entités 115 et 120
        b_avec_erreur := (Length(e115.ace) > 0) or (Length(e120.ace) > 0);

        // Entité 125
        if (not b_avec_erreur) and (Length(a_e125) > 0) then

          for i_indice := 0 to High(a_e125) do
          begin

            if Length(a_e125[i_indice].ace) > 0 then
            begin

              b_avec_erreur := True;
              Break;

            end;

          end;

        // Entité 400
        if (not b_avec_erreur) and (Length(a_e400) > 0) then

          for i_indice := 0 to High(a_e400) do
          begin

            if Length(a_e400[i_indice].ace) > 0 then
            begin

              b_avec_erreur := True;
              Break;

            end;

            if Length(a_e400[i_indice].e405.ace) > 0 then
            begin

              b_avec_erreur := True;
              Break;

            end;

            with a_e400[i_indice] do
            begin

              if Length(a_e485) > 0 then

                for i_indice_2 := 0 to High(a_e485) do
                begin

                  if Length(a_e485[i_indice_2].ace) > 0 then
                  begin

                    b_avec_erreur := True;
                    Break;

                  end;

                end;

              if not b_avec_erreur then

                if Length(a_e490) > 0 then

                  for i_indice_2 := 0 to High(a_e490) do
                  begin

                    if Length(a_e490[i_indice_2].ace) > 0 then
                    begin

                      b_avec_erreur := True;
                      Break;

                    end;

                  end;

            end;

          end;

        MarquerGrilleLigneErreur(sgEvenements, i_ligne, b_avec_erreur);

      end;

    end;

  end;

  AjouterJournal('----- Fin des contrôles -----', JOURNAL_STYLE_AUCUN);

end;

procedure TfrmMain.DefinirTableauDaylingSaving;
begin

  adt_daylight_saving[1, 1] := StrToDateTime('28/03/2010 02:00');
  adt_daylight_saving[1, 2] := StrToDateTime('31/10/2010 03:00');
  adt_daylight_saving[2, 1] := StrToDateTime('27/03/2011 02:00');
  adt_daylight_saving[2, 2] := StrToDateTime('30/10/2011 03:00');
  adt_daylight_saving[3, 1] := StrToDateTime('25/03/2012 02:00');
  adt_daylight_saving[3, 2] := StrToDateTime('28/10/2012 03:00');
  adt_daylight_saving[4, 1] := StrToDateTime('31/03/2013 02:00');
  adt_daylight_saving[4, 2] := StrToDateTime('27/10/2013 03:00');
  adt_daylight_saving[5, 1] := StrToDateTime('30/03/2014 02:00');
  adt_daylight_saving[5, 2] := StrToDateTime('26/10/2014 03:00');
  adt_daylight_saving[6, 1] := StrToDateTime('29/03/2015 02:00');
  adt_daylight_saving[6, 2] := StrToDateTime('25/10/2015 03:00');
  adt_daylight_saving[7, 1] := StrToDateTime('27/03/2016 02:00');
  adt_daylight_saving[7, 2] := StrToDateTime('30/10/2016 03:00');
  adt_daylight_saving[8, 1] := StrToDateTime('26/03/2017 02:00');
  adt_daylight_saving[8, 2] := StrToDateTime('29/10/2017 03:00');
  adt_daylight_saving[9, 1] := StrToDateTime('25/03/2018 02:00');
  adt_daylight_saving[9, 2] := StrToDateTime('28/10/2018 03:00');
  adt_daylight_saving[10, 1] := StrToDateTime('31/03/2019 02:00');
  adt_daylight_saving[10, 2] := StrToDateTime('27/10/2019 03:00');
  adt_daylight_saving[11, 1] := StrToDateTime('29/03/2020 02:00');
  adt_daylight_saving[11, 2] := StrToDateTime('25/10/2020 03:00');
  adt_daylight_saving[12, 1] := StrToDateTime('28/03/2021 02:00');
  adt_daylight_saving[12, 2] := StrToDateTime('31/10/2021 03:00');
  adt_daylight_saving[13, 1] := StrToDateTime('27/03/2022 02:00');
  adt_daylight_saving[13, 2] := StrToDateTime('30/10/2022 03:00');
  adt_daylight_saving[14, 1] := StrToDateTime('26/03/2023 02:00');
  adt_daylight_saving[14, 2] := StrToDateTime('29/10/2023 03:00');
  adt_daylight_saving[15, 1] := StrToDateTime('31/03/2024 02:00');
  adt_daylight_saving[15, 2] := StrToDateTime('27/10/2024 03:00');
  adt_daylight_saving[16, 1] := StrToDateTime('30/03/2025 02:00');
  adt_daylight_saving[16, 2] := StrToDateTime('26/10/2025 03:00');
  adt_daylight_saving[17, 1] := StrToDateTime('29/03/2026 02:00');
  adt_daylight_saving[17, 2] := StrToDateTime('25/10/2026 03:00');
  adt_daylight_saving[18, 1] := StrToDateTime('28/03/2027 02:00');
  adt_daylight_saving[18, 2] := StrToDateTime('31/10/2027 03:00');
  adt_daylight_saving[19, 1] := StrToDateTime('26/03/2028 02:00');
  adt_daylight_saving[19, 2] := StrToDateTime('29/10/2028 03:00');
  adt_daylight_saving[20, 1] := StrToDateTime('25/03/2029 02:00');
  adt_daylight_saving[20, 2] := StrToDateTime('28/10/2029 03:00');

end;

procedure TfrmMain.DesactiverOnglets(ppc: TPageControl);
var
  i_onglet: Integer;
begin
  for i_onglet := 1 to ppc.PageCount - 1 do
  begin
    ppc.Pages[i_onglet].TabVisible := False;
  end;

end;

procedure TfrmMain.SetComboIndex(pcbb: TComboBox; ps_code: String);
var
  i_index: Integer;
  i_item: Integer;
  s_rec: String;
begin

  // Initialisation des variables
  i_index := -1;
  s_rec := ps_code + ' - ';

  // Recherche le code parmi les éléments de la liste déroulante
  for i_item := 0 to pcbb.Items.Count - 1 do
  begin

    if pcbb.Items[i_item].StartsWith(s_rec, True) then
    begin

      i_index := i_item;
      Break;

    end;

  end;

  // Affecter l'indice à la combo
  pcbb.ItemIndex := i_index;

end;

procedure TfrmMain.SetFichierRejet(pb_rejet: Boolean);
begin

  b_fichier_rejet := pb_rejet;
  btnEnregistrer.Enabled := not pb_rejet;
  btnApiviaDepot.Enabled := not pb_rejet;

end;

procedure TfrmMain.DeterminerEnvironnement;
begin

  //ShowMessage('Environnement : ' + GetCurrentDir);
  if GetCurrentDir = C_S_DOSSIER_PROD then FEnvironnementDevProd := C_I_ENVIRONNEMENT_PROD
  else FEnvironnementDevProd := C_I_ENVIRONNEMENT_DEV;

end;

procedure TfrmMain.EnregistrerDonneeModifiee(Sender: TObject);

  function GetComposantValeur(Sender: TObject): String;
  begin

    if Sender is TEdit then Result := (Sender as TEdit).Text
    else Result := '';

  end;

var
  s_dossier: String;
  s_evenement: String;
  s_valeur: String;

begin

  // Si le composant TEdit n'a pas été modifié, sortir de la procédure
  if Sender is TEdit then

     if not (Sender as TEdit).Modified then Exit;

  // Initialisation des variables
  s_dossier   := e100_sel.s_num_dossier_n;
  s_evenement := e100_sel.s_num_evt_n;
  s_valeur    := GetComposantValeur(Sender);

  case (Sender as TComponent).Name of

    'edt115Nom'             : ModifierDonnee(s_dossier, s_evenement, -1                 , -1                         , E115_NOM              , s_valeur);
    'edt115Prenom'          : ModifierDonnee(s_dossier, s_evenement, -1                 , -1                         , E115_PRENOM           , s_valeur);
    'edt115Insee'           : ModifierDonnee(s_dossier, s_evenement, -1                 , -1                         , E115_INSEE            , s_valeur);
    'edt120ComplementGeo'   : ModifierDonnee(s_dossier, s_evenement, -1                 , -1                         , E120_COMPLEMENT_GEO   , s_valeur);
    'edt120NumeroVoie'      : ModifierDonnee(s_dossier, s_evenement, -1                 , -1                         , E120_NUMERO_VOIE      , s_valeur);
    'edt120LibelleVoie'     : ModifierDonnee(s_dossier, s_evenement, -1                 , -1                         , E120_LIBELLE_VOIE     , s_valeur);
    'edt120LieuDit'         : ModifierDonnee(s_dossier, s_evenement, -1                 , -1                         , E120_LIEU_DIT         , s_valeur);
    'edt120CodePostal'      : ModifierDonnee(s_dossier, s_evenement, -1                 , -1                         , E120_CODE_POSTAL      , s_valeur);
    'edt120LibelleLocalite' : ModifierDonnee(s_dossier, s_evenement, -1                 , -1                         , E120_LIBELLE_LOCALITE , s_valeur);
    'edt125Valeur'          : ModifierDonnee(s_dossier, s_evenement, sgCoordonnees.Row  , -1                         , E125_VALEUR           , s_valeur);
    'edt400RangBeneficiaire': ModifierDonnee(s_dossier, s_evenement, sgBeneficiaires.Row, -1                         , E400_RANG_BENEFICIAIRE, s_valeur);
    'edt400RangPersonne'    : ModifierDonnee(s_dossier, s_evenement, sgBeneficiaires.Row, -1                         , E400_RANG_PERSONNE    , s_valeur);
    'edt405RangBeneficiaire': ModifierDonnee(s_dossier, s_evenement, sgBeneficiaires.Row, -1                         , E405_RANG_BENEFICIAIRE, s_valeur);
    'edt405Nom'             : ModifierDonnee(s_dossier, s_evenement, sgBeneficiaires.Row, -1                         , E405_NOM              , s_valeur);
    'edt405Prenom'          : ModifierDonnee(s_dossier, s_evenement, sgBeneficiaires.Row, -1                         , E405_PRENOM           , s_valeur);
    'edt405NumeroInsee'     : ModifierDonnee(s_dossier, s_evenement, sgBeneficiaires.Row, -1                         , E405_INSEE            , s_valeur);
    'edt405NomJeuneFille'   : ModifierDonnee(s_dossier, s_evenement, sgBeneficiaires.Row, -1                         , E405_NOM_JEUNE_FILLE  , s_valeur);
    'edt410RangBeneficiaire': ModifierDonnee(s_dossier, s_evenement, sgBeneficiaires.Row, -1                         , E410_RANG_BENEFICIAIRE, s_valeur);
    'edt485RangBeneficiaire': ModifierDonnee(s_dossier, s_evenement, sgBeneficiaires.Row, sgCriteres.Row             , E485_RANG_BENEFICIAIRE, s_valeur);
    'edt490RangBeneficiaire': ModifierDonnee(s_dossier, s_evenement, sgBeneficiaires.Row, sgvariablesSouscription.Row, E490_RANG_BENEFICIAIRE, s_valeur);
    'edt700RangBeneficiaire': ModifierDonnee(s_dossier, s_evenement, sgBeneficiaires.Row, sgGaranties.Row            , E700_RANG_BENEFICIAIRE, s_valeur);
    'edt800RangBeneficiaire': ModifierDonnee(s_dossier, s_evenement, sgBeneficiaires.Row, -1                         , E800_RANG_BENEFICIAIRE, s_valeur);
    'edt800RangPersonne'    : ModifierDonnee(s_dossier, s_evenement, sgBeneficiaires.Row, -1                         , E800_RANG_PERSONNE    , s_valeur);

  end;

end;

procedure TfrmMain.EnregistrerJournal;
var
  s_annee: String;
  s_date: String;
  s_dossier: String;
  s_fichier_index: String;
  s_fichier_journal: String;
  s_mois: String;
  s_utilisateur: String;
  tf: TextFile;

begin

  // Ne pas enregistrer si le journal est vide
  if rmJournal.Lines.Count = 0 then Exit;

  // Créer le dossier Journal s'il n'existe pas
  s_dossier := '.\' + C_S_JOURNAL_DOSSIER;

  if not DirectoryExists(s_dossier) then
  begin

    if not CreateDir(s_dossier) then
    begin

      ShowMessage('Impossible de créer le dossier Journal. Le journal ne sera pas sauvegardé.');
      Exit;

    end;

  end;

  // Définir les informations nécessaires à l'enregistrement du journal
  s_date := FormatDateTime('yyyymmdd-hhnnss', Now);
  s_annee := Copy(s_date, 1, 4);
  s_mois := Copy(s_date, 5, 2);
  s_utilisateur := GetEnvironmentVariable('USERNAME');

  // Définir les noms des fichiers
  s_fichier_index   := s_dossier + '\' + C_S_JOURNAL_INDEX;

  s_dossier := s_dossier + '\' + s_annee + '\' + s_mois;

  if not ForceDirectories(s_dossier) then
  begin

    ShowMessage('Impossible de créer le dossier ' + s_dossier + '. Le journal ne sera pas sauvegardé.');
    Exit;

  end;

  s_fichier_journal := s_dossier + '\' + s_date + '.txt';

  // Enregistrer le journal dans l'index
  AssignFile(tf, s_fichier_index);

  try

    try

      if FileExists(s_fichier_index) then Append(tf)
      else Rewrite(tf);

      Writeln(tf, s_date + ';' + s_utilisateur + ';' + s_fichier_journal);

    except

      on e: Exception do
      begin

        ShowMessage('Erreur lors de l''ouverture du fichier ' + s_fichier_index + ' : ' + e.ClassName + ' / ' + e.Message);
        Exit;

      end;

    end;

  finally

    CloseFile(tf);

  end;

  // Créer un fichier pour sauvegarder le journal
  //rmJournal.Lines.SaveToFile(s_fichier_journal);
  AssignFile(tf, s_fichier_journal);

  try

    try

      Rewrite(tf);
      WriteLn(tf, rmJournal.Rtf);

    except

      on e: Exception do
      begin

        ShowMessage('Erreur lors de l''ouverture du fichier ' + s_fichier_journal + ' : ' + e.ClassName + ' / ' + e.Message);
        Exit;

      end;

    end;

  finally

    CloseFile(tf);

  end;

end;

function TfrmMain.EnregistrerFichierAc056: Boolean;

  procedure EnregistrerLigne(var ptf: TextFile; ps_ligne: String);
  begin

    if ps_ligne <> '' then WriteLn(ptf, AddCharR(' ', ps_ligne, 700));

  end;

var
  b_result: Boolean;
  i_indice_e001: Integer;
  i_indice_e100: Integer;
  i_indice_e125: Integer;
  i_indice_e400: Integer;
  i_indice_e485: Integer;
  i_indice_e490: Integer;
  i_indice_e700: Integer;
  tf_ac056: TextFile;
begin

  // Initialisation des variables
  b_result := False;

  AssignFile(tf_ac056, s_nom_fichier);
  {$I+} // Pour gérer les exceptions
  try

    try

      Rewrite(tf_ac056);

      with ac056 do
      begin

        WriteLn(tf_ac056, e000.s_ligne);

        for i_indice_e001 := 0 to High(a_e001) do
        begin

          with a_e001[i_indice_e001] do
          begin

            Writeln(tf_ac056, s_ligne);

            for i_indice_e100 := 0 to High(a_e100) do
            begin

              with a_e100[i_indice_e100] do
              begin

                EnregistrerLigne(tf_ac056, GetEntite100Ligne(a_e100[i_indice_e100]));
                EnregistrerLigne(tf_ac056, GetEntite110Ligne(e110));
                EnregistrerLigne(tf_ac056, GetEntite115Ligne(e115));
                EnregistrerLigne(tf_ac056, GetEntite120Ligne(e120));

                for i_indice_e125 := 0 to High(a_e125) do
                begin

                  EnregistrerLigne(tf_ac056, GetEntite125Ligne(a_e125[i_indice_e125]));

                end;

                EnregistrerLigne(tf_ac056, GetEntite130Ligne(e130));
                EnregistrerLigne(tf_ac056, GetEntite135Ligne(e135));
                EnregistrerLigne(tf_ac056, GetEntite155Ligne(e155));
                EnregistrerLigne(tf_ac056, GetEntite180Ligne(e180));

                for i_indice_e400 := 0 to High(a_e400) do
                begin

                  with a_e400[i_indice_e400] do
                  begin

                    EnregistrerLigne(tf_ac056, GetEntite400Ligne(a_e400[i_indice_e400]));
                    EnregistrerLigne(tf_ac056, GetEntite405Ligne(e405));
                    EnregistrerLigne(tf_ac056, GetEntite410Ligne(e410));
                    EnregistrerLigne(tf_ac056, GetEntite411Ligne(e411));

                    for i_indice_e485 := 0 to High(a_e485) do
                    begin

                      EnregistrerLigne(tf_ac056, GetEntite485Ligne(a_e485[i_indice_e485]));

                    end;

                    for i_indice_e490 := 0 to High(a_e490) do
                    begin

                      EnregistrerLigne(tf_ac056, GetEntite490Ligne(a_e490[i_indice_e490]));

                    end;

                    for i_indice_e700 := 0 to High(a_e700) do
                    begin

                      EnregistrerLigne(tf_ac056, GetEntite700Ligne(a_e700[i_indice_e700]));

                    end;

                    EnregistrerLigne(tf_ac056, GetEntite800Ligne(e800));

                  end;

                end;

                EnregistrerLigne(tf_ac056, e990.s_ligne);

              end;

            end;

            EnregistrerLigne(tf_ac056, e995.s_ligne);

          end;

        end;

        EnregistrerLigne(tf_ac056, e999.s_ligne);

      end;

      b_result := True;
      AjouterJournal('Le fichier ' + s_nom_fichier + ' a été enregistré.', JOURNAL_STYLE_SUCCES);

    except
      on e: EInOutError do AjouterJournal('Une exception a été levée : ' + e.ClassName + ' / ' + e.Message, JOURNAL_STYLE_ERREUR);
    end;

  finally

    CloseFile(tf_ac056);

  end;

  Result := b_result;

end;

function TfrmMain.FtpApiviaListingCallback(const names: Pfxp_names): Boolean;
var
  dt: TDateTime;
  i_daylight_saving: Integer;
  i_fichier: Integer;
  s_date: String;
  s_fichier_lb: String;
  s_fichier_nom: String;
  sl_fichiers_ftp: TStringList;
  ul: TUnsignedLong;
begin

  sl_fichiers_ftp  := TStringList.Create;

  try

    for i_fichier := 0 to names^.nnames - 1 do
    begin

      s_fichier_nom := names^.names[i_fichier].filename;

      if    ((FFtpApiviaAction = C_I_FTP_APIVIA_ACTION_REJET) and (Pos(C_S_FTP_FICHIER_REJET, s_fichier_nom) > 0))
         or ((FFtpApiviaAction = C_I_FTP_APIVIA_ACTION_DEPOT) and (s_fichier_nom <> '.') and (s_fichier_nom <> '..')) then
      begin

        try

          s_date := '';
          ul     := names^.names[i_fichier].attrs.mtime;
          dt     := UniversalTimeToLocal(UnixToDateTime(ul));

          for i_daylight_saving := Low(adt_daylight_saving) to High(adt_daylight_saving) do
          begin

            if (dt >= adt_daylight_saving[i_daylight_saving, 1]) and (dt <= adt_daylight_saving[i_daylight_saving, 2]) then
            begin

              dt := IncHour(dt, 1);
              Break;

            end;

          end;

          s_date := DateToStr(dt) + ' ' + TimeToStr(dt);
          s_fichier_lb := FormatDateTime('yyyymmddhhmmss', dt) + s_fichier_nom + ' du ' + s_date;

        except

        end;

        sl_fichiers_sort.Append(s_fichier_lb);

      end;

    end;

    AfficherFichiersFtp;

  finally

    FreeAndNil(sl_fichiers_ftp);

  end;

  //lbFichiersFtp.Items.Append(s_date + ' ' + names^.names[i_fichier].filename);
  Result := True;

end;

procedure TfrmMain.FtpApiviaMessageCallback(const Msg: AnsiString; const isstderr: Boolean);
begin

  AjouterJournal(Msg, JOURNAL_STYLE_AUCUN);

end;

function TfrmMain.FtpApiviaVerifyHostKey(const host: PAnsiChar; const port: Integer;
                                const fingerprint: PAnsiChar;
                                const verificationstatus: Integer;
                                var storehostkey: Boolean): Boolean;
begin

  Result := True;
  storehostkey := True;

end;

function TfrmMain.GetDateFromAc056(ps_date: String): TDateTime;
var
  dt_result: TDateTime;
  s_date: String;
begin

  dt_result := 0;
  s_date := trim(ps_date);

  if s_date <> '' then

  begin

    s_date := RightStr(s_date, 2) + '/' + Copy(s_date, 5, 2) + '/' + LeftStr(s_date, 4);

    try

      dt_result := StrToDate(s_date);

    except

      dt_result := NullDate;

    end;

  end
  else
      Result := NullDate;

  Result := dt_result;

end;

function TfrmMain.GetDateToAc056(pdt: TDateTime): String;
var
  s_result: String;
  w_annee: Word;
  w_jour: Word;
  w_mois: Word;
begin

  try

    DecodeDate(pdt, w_annee, w_mois, w_jour);
    s_result := Format('%4d%2d%2d', [w_annee, w_mois, w_jour]);

  except
  end;

  Result := s_result;

end;

function TfrmMain.GetDossierProduction(ps_dossier_base: String): String;
var
  s_dossier: String;
begin

  s_dossier := ps_dossier_base + IntToStr(CurrentYear);
  if not DirectoryExists(s_dossier) then CreateDir(s_dossier);

  Result := s_dossier;

end;

function TfrmMain.GetTitreApplication: String;
var
  s_titre: String;
begin

  s_titre := 'Flussi';

  if FEnvironnementDevProd = C_I_ENVIRONNEMENT_DEV then
    s_titre := s_titre + ' - DEV/RECETTE';

  Result := s_titre;

end;

procedure TfrmMain.InitialisationFtp;
begin

  // Effacer le contenu de la liste
  sl_fichiers_sort.Clear;
  lbFichiersFtp.Clear;

end;

procedure TfrmMain.MarquerControleErreur(ppc: TPageControl);

  procedure MarquerOnglet(pts: TTabSheet; pace: t_a_controle_erreur);
  var
    i_image_index: Integer;
    i_indice: Integer;
    wcmp: TWinControl;
  begin

    // Initialisation des variables
    i_image_index := -1;

    // Onglet Entité
    if pts.Name.StartsWith('tsEntite') then
    begin

      for i_indice := 0 to High(pace) do
      begin

        wcmp := pace[i_indice].wcmp;

        if wcmp is TComboBox then (wcmp as TComboBox).Enabled := True
        else if wcmp is TEdit then (wcmp as TEdit).ReadOnly := False
        else if wcmp is TDateTimePicker then (wcmp as TDateTimePicker).ReadOnly := False;

        wcmp.Color := C_CL_MARQUAGE_ERREUR_COMPOSANT_EDITION;
        wcmp.Hint  := pace[i_indice].s_erreur;

        i_image_index := C_I_IMAGE_INDICE_GREEN_FLAG;

      end;

    end
    else if Length(pace) > 0 then i_image_index := C_I_IMAGE_INDICE_GREEN_FLAG;

    pts.ImageIndex := i_image_index;

  end;

begin

  if FFichierRejet then Exit;

  case ppc.Name of

    C_S_PAGE_CONTROL_EVENEMENTS_NOM:
      begin

        MarquerOnglet(tsEntite115, e100_sel.e115.ace);
        MarquerOnglet(tsEntite120, e100_sel.e120.ace);
        MarquerOnglet(tsCoordonnees, e125_sel.ace);

      end;

    C_S_PAGE_CONTROL_COORDONNEES_NOM:
      begin

        MarquerOnglet(tsEntite125, e125_sel.ace);

      end;

    C_S_PAGE_CONTROL_BENEFICIAIRES_NOM:
      begin

        MarquerOnglet(tsEntite400, e400_sel.ace);
        MarquerOnglet(tsEntite405, e400_sel.e405.ace);
        MarquerOnglet(tsEntite410, e400_sel.e410.ace);
        MarquerOnglet(tsCriteres, e485_sel.ace);

        //if tsBeneficiaires.ImageIndex = -1 then
           MarquerOnglet(tsVariablesSouscription, e490_sel.ace);

        MarquerOnglet(tsGaranties, e700_sel.ace);
        MarquerOnglet(tsEntite800, e400_sel.e800.ace);

      end;

    C_S_PAGE_CONTROL_CRITERES_NOM:
      begin

        //MarquerOnglet(tsCriteres, e485_sel.ace);
        MarquerOnglet(tsEntite485, e485_sel.ace);

      end;

    C_S_PAGE_CONTROL_VARIABLES_SOUSCRIPTION:
      begin

        //MarquerOnglet(tsVariablesSouscription, e490_sel.ace);
        MarquerOnglet(tsEntite490, e490_sel.ace);

      end;

    C_S_PAGE_CONTROL_GARANTIES_NOM:
      begin

        MarquerOnglet(tsEntite700, e700_sel.ace);

      end;

  end;
end;

procedure TfrmMain.MarquerGrilleLigneErreur(psg: TStringGrid; pi_ligne: Integer; pb_erreur: Boolean);
var
  s_marqueur_ligne: String;
begin

  if pb_erreur then s_marqueur_ligne := C_S_MARQUER_GRILLE_LIGNE_ERREUR
  else s_marqueur_ligne := '';

  psg.Cells[0, pi_ligne] := s_marqueur_ligne;

end;

procedure TfrmMain.MettreAJourFilAriane;
var
  s_fil_ariane: String;
begin

  s_fil_ariane := '';

  if s_fil_ariane_e100 <> '' then s_fil_ariane := s_fil_ariane_e100;

  if (s_fil_ariane_e125 <> '') and (pcEvenements.TabIndex = tsCoordonnees.PageIndex) then s_fil_ariane := s_fil_ariane + ' / ' + s_fil_ariane_e125;

  if (s_fil_ariane_e400 <> '') and (pcEvenements.TabIndex = tsBeneficiaires.PageIndex) then s_fil_ariane := s_fil_ariane + ' / ' + s_fil_ariane_e400;

  if (s_fil_ariane_e700 <> '') and (pcBeneficiaires.TabIndex = tsGaranties.PageIndex) then s_fil_ariane := s_fil_ariane + ' / ' + s_fil_ariane_e700;

  if (s_fil_ariane_e485 <> '') and (pcBeneficiaires.TabIndex = tsCriteres.PageIndex) then s_fil_ariane := s_fil_ariane + ' / ' + s_fil_ariane_e485;

  if (s_fil_ariane_e490 <> '') and (pcBeneficiaires.TabIndex = tsVariablesSouscription.PageIndex) then s_fil_ariane := s_fil_ariane + ' / ' + s_fil_ariane_e490;

  lblFilAriane.Caption := s_fil_ariane;
end;

procedure TfrmMain.RenseignerPressePapier(ps_texte: String);
begin

  Clipboard.AsText := ps_texte;

end;

procedure TfrmMain.RepererRejet(pts: TTabSheet; ps_erreur: String);
var
  i_image_index: Integer;
begin

  i_image_index := -1;

  if ps_erreur <> '' then i_image_index := C_I_IMAGE_INDICE_RED_FLAG;

  pts.ImageIndex := i_image_index;

end;

procedure TfrmMain.RepererRejetSurBeneficiaires;
var
  i_beneficiaire: Integer;
  i_critere: Integer;
  i_garantie: Integer;
  i_image_index_beneficiaire: Integer;
  i_image_index_garantie: Integer;
  i_valeur_souscription: Integer;
begin

  // Initialisation des variables
  i_image_index_beneficiaire := -1;
  i_image_index_garantie     := -1;

  // Rechercher les rejets sur les bénéficiaires et les garanties
  for i_beneficiaire := 0 to High(e100_sel.a_e400) do
  begin

    with e100_sel.a_e400[i_beneficiaire] do
    begin

      if (s_erreur <> '') or (e405.s_erreur <> '') or (e410.s_erreur <> '') or (e800.s_erreur <> '') then
         i_image_index_beneficiaire := C_I_IMAGE_INDICE_RED_FLAG;

      for i_garantie := 0 to High(a_e700) do
      begin

         if a_e700[i_garantie].s_erreur <> '' then
         begin

           i_image_index_beneficiaire := C_I_IMAGE_INDICE_RED_FLAG;
           i_image_index_garantie     := C_I_IMAGE_INDICE_RED_FLAG;

         end;

      end;

      for i_critere := 0 to High(a_e485) do
      begin

         if a_e485[i_critere].s_erreur <> '' then
         begin

           i_image_index_beneficiaire := C_I_IMAGE_INDICE_RED_FLAG;
           i_image_index_garantie     := C_I_IMAGE_INDICE_RED_FLAG;

         end;

      end;

      for i_valeur_souscription := 0 to High(a_e490) do
      begin

         if a_e490[i_valeur_souscription].s_erreur <> '' then
         begin

           i_image_index_beneficiaire := C_I_IMAGE_INDICE_RED_FLAG;
           i_image_index_garantie     := C_I_IMAGE_INDICE_RED_FLAG;

         end;

      end;

    end;

  end;

  // Marquer ou pas les onglets
  tsBeneficiaires.ImageIndex := i_image_index_beneficiaire;
  tsGaranties.ImageIndex     := i_image_index_garantie;

end;

procedure TfrmMain.SetErreur(plbl_erreur, plbl_erreur_valeur, pplbl_erreur_description: TLabel; ps_erreur: String);
begin

  plbl_erreur.Visible              := (ps_erreur <> '');
  plbl_erreur_valeur.Caption       := ps_erreur;
  pplbl_erreur_description.Caption := get_description(ps_erreur);

end;

procedure TfrmMain.VerrouillerComposants(pcmp_parent: TWinControl);
var
  cmp: TComponent;
  i_component: Integer;
  wcmp: TWinControl;
begin

  for i_component := 0 to pcmp_parent.ComponentCount -1 do
  begin

    cmp := pcmp_parent.Components[i_component];

    if cmp is TWinControl then
    begin

      wcmp := (cmp as TWinControl);

      if wcmp is TComboBox then (wcmp as TComboBox).Enabled := False
      else if wcmp is TEdit then (wcmp as TEdit).ReadOnly := True
      else if wcmp is TDateTimePicker then (wcmp as TDateTimePicker).ReadOnly := True
      else if (wcmp is TPageControl) or (wcmp is TTabSheet) then
      begin

        VerrouillerComposants(wcmp);

        if wcmp is TTabSheet then (wcmp as TTabSheet).ImageIndex := -1;

      end;

      wcmp.Color := clDefault;
      wcmp.Hint  := '';

    end;

  end;

end;

procedure TfrmMain.AjouterJournalLigne(ps_message: String; pcl_back: TColor);
begin

  with rmJournal do
  begin

    Lines.Add('');
    Lines.Delete(Lines.Count - 1);

    SelStart  := Length(Text);
    SelText   := ps_message;
    SelLength := Length(ps_message);
    SetRangeColor(SelStart, SelLength, pcl_back);

    SelStart  := Length(Text);
    SelText   := '';

  end;

end;

// Procédures et fonctions protégées

procedure TfrmMain.WMMove(var aMessage: TWMMove);
begin

  inherited;

  if chromiumMain <> nil then chromiumMain.NotifyMoveOrResizeStarted;

end;

procedure TfrmMain.WMMoving(var aMessage: TMessage);
begin

  inherited;

  if chromiumMain <> nil then chromiumMain.NotifyMoveOrResizeStarted;
end;

procedure TfrmMain.WMEnterMenuLoop(var aMessage: TMessage);
begin

  inherited;

  if (aMessage.wParam = 0) and (GlobalCEFApp <> nil) then GlobalCEFApp.OsmodalLoop := True;
end;

procedure TfrmMain.WMExitMenuLoop(var aMessage: TMessage);
begin

  inherited;

  if (aMessage.wParam = 0) and (GlobalCEFApp <> nil) then GlobalCEFApp.OsmodalLoop := False;
end;

procedure TfrmMain.BrowserCreatedMsg(var aMessage: TMessage);
begin

  btnVeos.Click;

end;

procedure TfrmMain.BrowserDestroyMsg(var aMessage: TMessage);
begin

  cefwpChromiumMain.Free;

end;

// Procédures et fonctions publiques

procedure TfrmMain.AjouterJournal(ps_message: String; pstyle: t_journal_style);
var
  cl_back: TColor;
  s_ligne: String;
begin

  // Initialisation des variables
  cl_back := clBlack;

  // Définir la couleur du texte
  if      pstyle in [JOURNAL_STYLE_AUCUN]  then cl_back := C_CL_JOURNAL_STYLE_AUCUN
  else if pstyle in [JOURNAL_STYLE_ERREUR] then cl_back := C_CL_JOURNAL_STYLE_ERREUR
  else if pstyle in [JOURNAL_STYLE_SUCCES] then cl_back := C_CL_JOURNAL_STYLE_SUCCES
  else if pstyle in [JOURNAL_STYLE_TITRE]  then cl_back := C_CL_JOURNAL_STYLE_TITRE;

  if not (pstyle in [JOURNAL_STYLE_AUCUN]) then
  begin

    rmJournal.Lines.Add('');

    if pstyle in [JOURNAL_STYLE_TITRE] then AjouterJournalLigne(StringOfChar('*', 20), cl_back);

  end;

  s_ligne := ps_message;

  if pstyle in [JOURNAL_STYLE_TITRE] then s_ligne := s_ligne + ' ' + FormatDateTime('le dd/mm/yyyy à hh:nn:ss', Now);

  AjouterJournalLigne(s_ligne, cl_back);

  if not (pstyle in [JOURNAL_STYLE_AUCUN]) then
  begin

    rmJournal.Lines.Add('');

    if pstyle in [JOURNAL_STYLE_TITRE] then AjouterJournalLigne(StringOfChar('*', 20), cl_back);

  end;

end;

end.


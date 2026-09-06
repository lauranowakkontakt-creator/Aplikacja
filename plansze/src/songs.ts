/**
 * Pięć plansz — nazwy odtworzone z folderów montażowych,
 * z przywróconymi polskimi znakami diakrytycznymi.
 *
 *   1_Pan_pasterzem_jest      -> Pan pasterzem jest
 *   2_Blogoslawmy_Panu        -> Błogosławmy Panu
 *   3_Daje_ci_siebie          -> Daję Ci siebie
 *   4_Uwielbiam_Cie           -> Uwielbiam Cię
 *   5_W_obecnosci_chwaly_twej -> W obecności chwały Twej
 */

export type Song = {
  id: string;
  folder: string;
  title: string;
};

export const SONGS: Song[] = [
  {id: 'Plansza1', folder: '1_Pan_pasterzem_jest', title: 'Pan pasterzem jest'},
  {id: 'Plansza2', folder: '2_Blogoslawmy_Panu', title: 'Błogosławmy Panu'},
  {id: 'Plansza3', folder: '3_Daje_ci_siebie', title: 'Daję Ci siebie'},
  {id: 'Plansza4', folder: '4_Uwielbiam_Cie', title: 'Uwielbiam Cię'},
  {id: 'Plansza5', folder: '5_W_obecnosci_chwaly_twej', title: 'W obecności chwały Twej'},
];

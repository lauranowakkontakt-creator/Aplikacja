// Wspólna paleta kolorów osób.
//
// Osoba jest współdzielona między modułami — Kalendarz, Modlitwa i Osoby czytają
// tę samą kolekcję `calendarPeople` — więc musi wyglądać wszędzie tak samo.
// Ta lista była skopiowana w trzech plikach; dorzucenie koloru w jednym z nich
// dawało osobę, która w innym module wyglądała inaczej.
//
// Osobny plik, a nie people.js: tamten ciąga Firebase, przez co nie da się go
// zaimportować w teście jednostkowym.
export const PERSON_COLORS = [
  '#E74C3C', '#E91E63', '#9C27B0', '#8B5CF6', '#3F51B5', '#2196F3',
  '#00BCD4', '#009688', '#4CAF50', '#F59E0B', '#FF9800', '#FF5722',
  '#EC4899', '#14B8A6', '#84CC16', '#6366F1',
]

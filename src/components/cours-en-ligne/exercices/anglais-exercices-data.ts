// Exercices Anglais — Parts 1 à 4
// Source: Anglais_Exercices_Part1-4.docx

import type { ExerciceItem, ExerciceQuestion } from "./t3p-exercices-data";

// ===== PART 1 — Vocabulary: Station, Airport, Vehicle, Weather =====

const ANGLAIS_P1_QUESTIONS: ExerciceQuestion[] = [
  // Section 1 — At the Station
  { id: 1, enonce: "Comment dit-on « le train » en anglais ?", choix: [
    { lettre: "A", texte: "The bus" }, { lettre: "B", texte: "The train", correct: true }, { lettre: "C", texte: "The plane" },
  ]},
  { id: 2, enonce: "Comment dit-on « le quai » en anglais ?", choix: [
    { lettre: "A", texte: "The platform", correct: true }, { lettre: "B", texte: "The ticket office" }, { lettre: "C", texte: "The waiting room" },
  ]},
  { id: 3, enonce: "Comment dit-on « un voyageur » en anglais ?", choix: [
    { lettre: "A", texte: "A driver" }, { lettre: "B", texte: "A passenger", correct: true }, { lettre: "C", texte: "A pilot" },
  ]},
  { id: 4, enonce: "Comment dit-on « la gare » en anglais ?", choix: [
    { lettre: "A", texte: "The airport" }, { lettre: "B", texte: "The bus stop" }, { lettre: "C", texte: "The railway station", correct: true },
  ]},
  { id: 5, enonce: "Comment dit-on « le contrôleur » en anglais ?", choix: [
    { lettre: "A", texte: "The ticket inspector", correct: true }, { lettre: "B", texte: "The ticket machine" }, { lettre: "C", texte: "The customs officer" },
  ]},
  { id: 6, enonce: "Comment dit-on « le guichet » en anglais ?", choix: [
    { lettre: "A", texte: "The ticket machine" }, { lettre: "B", texte: "The ticket office", correct: true }, { lettre: "C", texte: "The platform" },
  ]},
  { id: 7, enonce: "Comment dit-on « la billetterie automatique » en anglais ?", choix: [
    { lettre: "A", texte: "The ticket office" }, { lettre: "B", texte: "The ticket machine", correct: true }, { lettre: "C", texte: "The information desk" },
  ]},
  { id: 8, enonce: "Comment dit-on « les renseignements » en anglais ?", choix: [
    { lettre: "A", texte: "Lost property office" }, { lettre: "B", texte: "Information desk", correct: true }, { lettre: "C", texte: "Waiting room" },
  ]},
  { id: 9, enonce: "Comment dit-on « les objets trouvés » en anglais ?", choix: [
    { lettre: "A", texte: "Lost property office", correct: true }, { lettre: "B", texte: "Information desk" }, { lettre: "C", texte: "Ticket office" },
  ]},
  { id: 10, enonce: "Comment dit-on « le panneau d'affichage » en anglais ?", choix: [
    { lettre: "A", texte: "The waiting room" }, { lettre: "B", texte: "Arrival/departure board", correct: true }, { lettre: "C", texte: "The platform" },
  ]},
  { id: 11, enonce: "Comment dit-on « aller simple » en anglais ?", choix: [
    { lettre: "A", texte: "A return ticket" }, { lettre: "B", texte: "A single ticket", correct: true }, { lettre: "C", texte: "A season ticket" },
  ]},
  { id: 12, enonce: "Comment dit-on « aller-retour » en anglais ?", choix: [
    { lettre: "A", texte: "A single ticket" }, { lettre: "B", texte: "A return ticket", correct: true }, { lettre: "C", texte: "A season ticket" },
  ]},
  { id: 13, enonce: "Comment dit-on « carte d'abonnement » en anglais ?", choix: [
    { lettre: "A", texte: "A return ticket" }, { lettre: "B", texte: "A single ticket" }, { lettre: "C", texte: "A season ticket", correct: true },
  ]},
  { id: 14, enonce: "Comment dit-on « composter » en anglais ?", choix: [
    { lettre: "A", texte: "To check" }, { lettre: "B", texte: "To punch", correct: true }, { lettre: "C", texte: "To cancel" },
  ]},
  { id: 15, enonce: "Comment dit-on « la salle d'attente » en anglais ?", choix: [
    { lettre: "A", texte: "The waiting room", correct: true }, { lettre: "B", texte: "The platform" }, { lettre: "C", texte: "The ticket office" },
  ]},
  // Section 2 — At the Airport
  { id: 16, enonce: "Comment dit-on « départs / arrivées » en anglais ?", choix: [
    { lettre: "A", texte: "Boarding / Landing" }, { lettre: "B", texte: "Departures / Arrivals", correct: true }, { lettre: "C", texte: "Check-in / Check-out" },
  ]},
  { id: 17, enonce: "Comment dit-on « un terminal » en anglais ?", choix: [
    { lettre: "A", texte: "A check-in counter" }, { lettre: "B", texte: "An airport terminal", correct: true }, { lettre: "C", texte: "A customs office" },
  ]},
  { id: 18, enonce: "Comment dit-on « heure d'arrivée » en anglais ?", choix: [
    { lettre: "A", texte: "The departure time" }, { lettre: "B", texte: "The arrival time", correct: true }, { lettre: "C", texte: "The flight number" },
  ]},
  { id: 19, enonce: "Comment dit-on « rater l'avion » en anglais ?", choix: [
    { lettre: "A", texte: "To catch the plane" }, { lettre: "B", texte: "To miss the plane", correct: true }, { lettre: "C", texte: "To board the plane" },
  ]},
  { id: 20, enonce: "Comment dit-on « enregistrer les bagages » en anglais ?", choix: [
    { lettre: "A", texte: "To pack luggage" }, { lettre: "B", texte: "To check in luggage", correct: true }, { lettre: "C", texte: "To carry luggage" },
  ]},
  { id: 21, enonce: "Comment dit-on « bagage à main » en anglais ?", choix: [
    { lettre: "A", texte: "Carry-on luggage", correct: true }, { lettre: "B", texte: "Check-in luggage" }, { lettre: "C", texte: "A suitcase" },
  ]},
  { id: 22, enonce: "Comment dit-on « la douane » en anglais ?", choix: [
    { lettre: "A", texte: "The crew" }, { lettre: "B", texte: "Customs", correct: true }, { lettre: "C", texte: "The terminal" },
  ]},
  { id: 23, enonce: "Comment dit-on « un douanier » en anglais ?", choix: [
    { lettre: "A", texte: "A pilot" }, { lettre: "B", texte: "A customs officer", correct: true }, { lettre: "C", texte: "An air hostess" },
  ]},
  { id: 24, enonce: "Comment dit-on « embarquement » en anglais ?", choix: [
    { lettre: "A", texte: "Departures" }, { lettre: "B", texte: "Boarding", correct: true }, { lettre: "C", texte: "Landing" },
  ]},
  { id: 25, enonce: "Comment dit-on « décoller » en anglais ?", choix: [
    { lettre: "A", texte: "To land" }, { lettre: "B", texte: "To take off", correct: true }, { lettre: "C", texte: "To board" },
  ]},
  { id: 26, enonce: "Comment dit-on « atterrir » en anglais ?", choix: [
    { lettre: "A", texte: "To take off" }, { lettre: "B", texte: "To land", correct: true }, { lettre: "C", texte: "To fly" },
  ]},
  { id: 27, enonce: "Comment dit-on « un vol direct » en anglais ?", choix: [
    { lettre: "A", texte: "A direct flight", correct: true }, { lettre: "B", texte: "A return flight" }, { lettre: "C", texte: "A cheap flight" },
  ]},
  { id: 28, enonce: "Comment dit-on « classe affaires » en anglais ?", choix: [
    { lettre: "A", texte: "Economy class" }, { lettre: "B", texte: "Business class", correct: true }, { lettre: "C", texte: "First class" },
  ]},
  { id: 29, enonce: "Comment dit-on « ceinture de sécurité » en anglais ?", choix: [
    { lettre: "A", texte: "A seat belt", correct: true }, { lettre: "B", texte: "A steering wheel" }, { lettre: "C", texte: "A dashboard" },
  ]},
  { id: 30, enonce: "Que signifie « jetlag » en français ?", choix: [
    { lettre: "A", texte: "Retard de vol" }, { lettre: "B", texte: "Décalage horaire", correct: true }, { lettre: "C", texte: "Annulation" },
  ]},
  // Section 3 — The Vehicle
  { id: 31, enonce: "Comment dit-on « coffre » en anglais britannique ?", choix: [
    { lettre: "A", texte: "Trunk" }, { lettre: "B", texte: "Boot", correct: true }, { lettre: "C", texte: "Dashboard" },
  ]},
  { id: 32, enonce: "Comment dit-on « coffre » en anglais américain ?", choix: [
    { lettre: "A", texte: "Boot" }, { lettre: "B", texte: "Trunk", correct: true }, { lettre: "C", texte: "Bumper" },
  ]},
  { id: 33, enonce: "Comment dit-on « le volant » en anglais ?", choix: [
    { lettre: "A", texte: "The dashboard" }, { lettre: "B", texte: "The steering wheel", correct: true }, { lettre: "C", texte: "The brake" },
  ]},
  { id: 34, enonce: "Comment dit-on « le tableau de bord » en anglais ?", choix: [
    { lettre: "A", texte: "The steering wheel" }, { lettre: "B", texte: "The dashboard", correct: true }, { lettre: "C", texte: "The windshield" },
  ]},
  { id: 35, enonce: "Comment dit-on « siège arrière » en anglais ?", choix: [
    { lettre: "A", texte: "Front seat" }, { lettre: "B", texte: "Back seat", correct: true }, { lettre: "C", texte: "Seat belt" },
  ]},
  { id: 36, enonce: "Comment dit-on « batterie / moteur » en anglais ?", choix: [
    { lettre: "A", texte: "Brake / Clutch" }, { lettre: "B", texte: "Battery / Engine", correct: true }, { lettre: "C", texte: "Pedal / Wheel" },
  ]},
  { id: 37, enonce: "Comment dit-on « frein / embrayage » en anglais ?", choix: [
    { lettre: "A", texte: "Battery / Engine" }, { lettre: "B", texte: "Brake / Clutch", correct: true }, { lettre: "C", texte: "Lock / Bumper" },
  ]},
  { id: 38, enonce: "Comment dit-on « phares / clignotants » en anglais ?", choix: [
    { lettre: "A", texte: "Doors / Gears" }, { lettre: "B", texte: "Lights / Indicator", correct: true }, { lettre: "C", texte: "Lock / Bumper" },
  ]},
  { id: 39, enonce: "Comment dit-on « pare-brise » en anglais ?", choix: [
    { lettre: "A", texte: "Bumper" }, { lettre: "B", texte: "Windshield", correct: true }, { lettre: "C", texte: "Dashboard" },
  ]},
  { id: 40, enonce: "Comment dit-on « pneu / roue » en anglais ?", choix: [
    { lettre: "A", texte: "Brake / Clutch" }, { lettre: "B", texte: "Tire / Wheel", correct: true }, { lettre: "C", texte: "Pedal / Door" },
  ]},
  // Section 4 — Weather & Prepositions
  { id: 41, enonce: "Comment dit-on « chaud / très chaud » en anglais ?", choix: [
    { lettre: "A", texte: "Cold / Freezing" }, { lettre: "B", texte: "Hot / Boiling hot", correct: true }, { lettre: "C", texte: "Sunny / Cloudy" },
  ]},
  { id: 42, enonce: "Comment dit-on « froid / très froid » en anglais ?", choix: [
    { lettre: "A", texte: "Hot / Boiling hot" }, { lettre: "B", texte: "Cold / Freezing", correct: true }, { lettre: "C", texte: "Humid / Dry" },
  ]},
  { id: 43, enonce: "Comment dit-on « ensoleillé / nuageux » en anglais ?", choix: [
    { lettre: "A", texte: "Rainy / Snowy" }, { lettre: "B", texte: "Sunny / Cloudy", correct: true }, { lettre: "C", texte: "Hot / Cold" },
  ]},
  { id: 44, enonce: "Comment dit-on « il pleut » en anglais ?", choix: [
    { lettre: "A", texte: "It's snowing" }, { lettre: "B", texte: "It's raining", correct: true }, { lettre: "C", texte: "It's sunny" },
  ]},
  { id: 45, enonce: "Comment dit-on « il neige » en anglais ?", choix: [
    { lettre: "A", texte: "It's raining" }, { lettre: "B", texte: "It's snowing", correct: true }, { lettre: "C", texte: "It's cloudy" },
  ]},
  { id: 46, enonce: "Que signifie « the thunderstorm » en français ?", choix: [
    { lettre: "A", texte: "La neige" }, { lettre: "B", texte: "L'orage", correct: true }, { lettre: "C", texte: "Le vent" },
  ]},
  { id: 47, enonce: "Comment dit-on « devant / derrière » en anglais ?", choix: [
    { lettre: "A", texte: "Close to / Far from" }, { lettre: "B", texte: "In front of / Behind", correct: true }, { lettre: "C", texte: "Over / Underneath" },
  ]},
  { id: 48, enonce: "Comment dit-on « près de / loin de » en anglais ?", choix: [
    { lettre: "A", texte: "In front of / Behind" }, { lettre: "B", texte: "Close to / Far from", correct: true }, { lettre: "C", texte: "Next to / Facing" },
  ]},
  { id: 49, enonce: "Comment dit-on « à côté de / en face de » en anglais ?", choix: [
    { lettre: "A", texte: "Over / Underneath" }, { lettre: "B", texte: "Next to / Facing", correct: true }, { lettre: "C", texte: "Before / After" },
  ]},
  { id: 50, enonce: "Comment dit-on « au-dessus / au-dessous » en anglais ?", choix: [
    { lettre: "A", texte: "Before / After" }, { lettre: "B", texte: "Over / Underneath", correct: true }, { lettre: "C", texte: "Close to / Far from" },
  ]},
  { id: 51, enonce: "Comment dit-on « avant / après » en anglais ?", choix: [
    { lettre: "A", texte: "Over / Underneath" }, { lettre: "B", texte: "Before / After", correct: true }, { lettre: "C", texte: "In front of / Behind" },
  ]},
  { id: 52, enonce: "Comment dit-on « au milieu de » en anglais ?", choix: [
    { lettre: "A", texte: "Next to" }, { lettre: "B", texte: "In the middle of", correct: true }, { lettre: "C", texte: "In front of" },
  ]},
  { id: 53, enonce: "Que signifie « humid » en français ?", choix: [
    { lettre: "A", texte: "Chaud" }, { lettre: "B", texte: "Humide", correct: true }, { lettre: "C", texte: "Sec" },
  ]},
];

// ===== PART 2 — Transport, Useful Words, Verbs, BE & HAVE =====

const ANGLAIS_P2_QUESTIONS: ExerciceQuestion[] = [
  { id: 1, enonce: "Comment dit-on « monter (dans un bus) » en anglais ?", choix: [
    { lettre: "A", texte: "Get off" }, { lettre: "B", texte: "Board / Get on", correct: true }, { lettre: "C", texte: "Break down" },
  ]},
  { id: 2, enonce: "Comment dit-on « descendre (d'un bus) » en anglais ?", choix: [
    { lettre: "A", texte: "Board" }, { lettre: "B", texte: "Get off", correct: true }, { lettre: "C", texte: "Get on" },
  ]},
  { id: 3, enonce: "Comment dit-on « arrêt de bus » en anglais ?", choix: [
    { lettre: "A", texte: "Bus lane" }, { lettre: "B", texte: "Bus stop", correct: true }, { lettre: "C", texte: "Bus station" },
  ]},
  { id: 4, enonce: "Comment dit-on « annulation / retard » en anglais ?", choix: [
    { lettre: "A", texte: "Reservation / Schedule" }, { lettre: "B", texte: "Cancellation / Delay", correct: true }, { lettre: "C", texte: "Early / On time" },
  ]},
  { id: 5, enonce: "Comment dit-on « tôt / à l'heure » en anglais ?", choix: [
    { lettre: "A", texte: "Late / Delayed" }, { lettre: "B", texte: "Early / On time", correct: true }, { lettre: "C", texte: "Fast / Slow" },
  ]},
  { id: 6, enonce: "Comment dit-on « passager / horaire » en anglais ?", choix: [
    { lettre: "A", texte: "Driver / Map" }, { lettre: "B", texte: "Passenger / Schedule", correct: true }, { lettre: "C", texte: "Pilot / Timetable" },
  ]},
  { id: 7, enonce: "Comment dit-on « un supplément » en anglais ?", choix: [
    { lettre: "A", texte: "A tip" }, { lettre: "B", texte: "An extra charge", correct: true }, { lettre: "C", texte: "A reservation" },
  ]},
  { id: 8, enonce: "Comment dit-on « la course (VTC/Taxi) » en anglais ?", choix: [
    { lettre: "A", texte: "The tip" }, { lettre: "B", texte: "The ride", correct: true }, { lettre: "C", texte: "The toll" },
  ]},
  { id: 9, enonce: "Que signifie « keep the change » ?", choix: [
    { lettre: "A", texte: "Changez de place" }, { lettre: "B", texte: "Gardez la monnaie", correct: true }, { lettre: "C", texte: "Faites l'appoint" },
  ]},
  { id: 10, enonce: "Comment dit-on « tomber en panne » en anglais ?", choix: [
    { lettre: "A", texte: "Slow down" }, { lettre: "B", texte: "Break down", correct: true }, { lettre: "C", texte: "Get off" },
  ]},
  { id: 11, enonce: "Comment dit-on « pourboire » en anglais ?", choix: [
    { lettre: "A", texte: "A ride" }, { lettre: "B", texte: "A tip", correct: true }, { lettre: "C", texte: "A fare" },
  ]},
  { id: 12, enonce: "Comment dit-on « banlieue » en anglais ?", choix: [
    { lettre: "A", texte: "Downtown" }, { lettre: "B", texte: "The suburb", correct: true }, { lettre: "C", texte: "City centre" },
  ]},
  { id: 13, enonce: "Comment dit-on « péage » en anglais ?", choix: [
    { lettre: "A", texte: "Bus lane" }, { lettre: "B", texte: "Toll", correct: true }, { lettre: "C", texte: "Suburb" },
  ]},
  { id: 14, enonce: "Comment dit-on « voie de bus » en anglais ?", choix: [
    { lettre: "A", texte: "Bus stop" }, { lettre: "B", texte: "Bus lane", correct: true }, { lettre: "C", texte: "Toll road" },
  ]},
  { id: 15, enonce: "Comment dit-on « location de voiture » en anglais US ?", choix: [
    { lettre: "A", texte: "Car hire" }, { lettre: "B", texte: "Car rental", correct: true }, { lettre: "C", texte: "Car lease" },
  ]},
  { id: 16, enonce: "Comment dit-on « location de voiture » en anglais GB ?", choix: [
    { lettre: "A", texte: "Car rental" }, { lettre: "B", texte: "Car hire", correct: true }, { lettre: "C", texte: "Car lease" },
  ]},
  { id: 17, enonce: "Comment dit-on « réservation » en anglais ?", choix: [
    { lettre: "A", texte: "Schedule" }, { lettre: "B", texte: "Reservation", correct: true }, { lettre: "C", texte: "Cancellation" },
  ]},
  // Useful words
  { id: 18, enonce: "Comment dit-on « centre-ville » en anglais ?", choix: [
    { lettre: "A", texte: "City centre / Downtown", correct: true }, { lettre: "B", texte: "Suburb / Outskirts" }, { lettre: "C", texte: "Theme park" },
  ]},
  { id: 19, enonce: "Comment dit-on « prix d'entrée » en anglais ?", choix: [
    { lettre: "A", texte: "Theme park" }, { lettre: "B", texte: "Admission fee", correct: true }, { lettre: "C", texte: "Extra charge" },
  ]},
  { id: 20, enonce: "Que signifie « pedestrian street » ?", choix: [
    { lettre: "A", texte: "Rue piétonne", correct: true }, { lettre: "B", texte: "Autoroute" }, { lettre: "C", texte: "Parking" },
  ]},
  // Verbs
  { id: 21, enonce: "Comment dit-on « porter (un objet) » en anglais ?", choix: [
    { lettre: "A", texte: "Wear" }, { lettre: "B", texte: "Carry", correct: true }, { lettre: "C", texte: "Take" },
  ]},
  { id: 22, enonce: "Comment dit-on « porter (un vêtement) » en anglais ?", choix: [
    { lettre: "A", texte: "Carry" }, { lettre: "B", texte: "Wear", correct: true }, { lettre: "C", texte: "Open" },
  ]},
  { id: 23, enonce: "Que signifie « pick me up » ?", choix: [
    { lettre: "A", texte: "Dépose-moi" }, { lettre: "B", texte: "Viens me chercher", correct: true }, { lettre: "C", texte: "Attends-moi" },
  ]},
  { id: 24, enonce: "Que signifie « allowed » ?", choix: [
    { lettre: "A", texte: "Interdit" }, { lettre: "B", texte: "Permis / Autorisé", correct: true }, { lettre: "C", texte: "Obligatoire" },
  ]},
  { id: 25, enonce: "Comment dit-on « profiter » en anglais ?", choix: [
    { lettre: "A", texte: "Use" }, { lettre: "B", texte: "Enjoy", correct: true }, { lettre: "C", texte: "Try" },
  ]},
  // TO BE & TO HAVE
  { id: 26, enonce: "Complétez : « I ___ a driver. » (être)", choix: [
    { lettre: "A", texte: "have" }, { lettre: "B", texte: "am", correct: true }, { lettre: "C", texte: "has" },
  ]},
  { id: 27, enonce: "Complétez : « She ___ a new car. » (avoir)", choix: [
    { lettre: "A", texte: "have" }, { lettre: "B", texte: "is" }, { lettre: "C", texte: "has", correct: true },
  ]},
  { id: 28, enonce: "Complétez : « They ___ at the airport. » (être)", choix: [
    { lettre: "A", texte: "is" }, { lettre: "B", texte: "are", correct: true }, { lettre: "C", texte: "has" },
  ]},
  { id: 29, enonce: "Complétez : « We ___ two suitcases. » (avoir)", choix: [
    { lettre: "A", texte: "has" }, { lettre: "B", texte: "are" }, { lettre: "C", texte: "have", correct: true },
  ]},
  { id: 30, enonce: "Complétez : « He ___ tired yesterday. » (être, passé)", choix: [
    { lettre: "A", texte: "were" }, { lettre: "B", texte: "was", correct: true }, { lettre: "C", texte: "is" },
  ]},
  { id: 31, enonce: "Complétez : « ___ a taxi outside. » (il y a, singulier)", choix: [
    { lettre: "A", texte: "There are" }, { lettre: "B", texte: "There is", correct: true }, { lettre: "C", texte: "There have" },
  ]},
  { id: 32, enonce: "Complétez : « ___ many passengers. » (il y a, pluriel)", choix: [
    { lettre: "A", texte: "There is" }, { lettre: "B", texte: "There are", correct: true }, { lettre: "C", texte: "There has" },
  ]},
];

// ===== PART 3 — Grammar =====

const ANGLAIS_P3_QUESTIONS: ExerciceQuestion[] = [
  // Prepositions
  { id: 1, enonce: "Complétez : « The flight is ___ July. »", choix: [
    { lettre: "A", texte: "on" }, { lettre: "B", texte: "in", correct: true }, { lettre: "C", texte: "at" },
  ]},
  { id: 2, enonce: "Complétez : « I'll meet you ___ Tuesday. »", choix: [
    { lettre: "A", texte: "in" }, { lettre: "B", texte: "on", correct: true }, { lettre: "C", texte: "at" },
  ]},
  { id: 3, enonce: "Complétez : « He arrives ___ 5 o'clock. »", choix: [
    { lettre: "A", texte: "in" }, { lettre: "B", texte: "on" }, { lettre: "C", texte: "at", correct: true },
  ]},
  { id: 4, enonce: "Complétez : « We are going ___ Lyon. »", choix: [
    { lettre: "A", texte: "at" }, { lettre: "B", texte: "in" }, { lettre: "C", texte: "to", correct: true },
  ]},
  { id: 5, enonce: "Complétez : « She lives ___ Italy. »", choix: [
    { lettre: "A", texte: "in", correct: true }, { lettre: "B", texte: "on" }, { lettre: "C", texte: "at" },
  ]},
  { id: 6, enonce: "Complétez : « I'll wait ___ the airport. »", choix: [
    { lettre: "A", texte: "in" }, { lettre: "B", texte: "on" }, { lettre: "C", texte: "at", correct: true },
  ]},
  // Preterit & Present Perfect
  { id: 7, enonce: "Le PRETERIT s'utilise pour :", choix: [
    { lettre: "A", texte: "Des actions liées au présent" }, { lettre: "B", texte: "Des actions terminées dans le passé", correct: true }, { lettre: "C", texte: "Des actions futures" },
  ]},
  { id: 8, enonce: "Comment forme-t-on le prétérit des verbes réguliers ?", choix: [
    { lettre: "A", texte: "HAVE + participe passé" }, { lettre: "B", texte: "Verbe + ED", correct: true }, { lettre: "C", texte: "WILL + verbe" },
  ]},
  { id: 9, enonce: "Quel est le prétérit de « go » ?", choix: [
    { lettre: "A", texte: "Goed" }, { lettre: "B", texte: "Went", correct: true }, { lettre: "C", texte: "Gone" },
  ]},
  { id: 10, enonce: "Quels adverbes accompagnent le PRETERIT ?", choix: [
    { lettre: "A", texte: "Already, just, yet" }, { lettre: "B", texte: "Ago, last week, yesterday", correct: true },
  ]},
  { id: 11, enonce: "Le PRESENT PERFECT se forme avec :", choix: [
    { lettre: "A", texte: "Verbe + ED" }, { lettre: "B", texte: "HAVE + participe passé", correct: true }, { lettre: "C", texte: "WILL + verbe" },
  ]},
  // Since & For / Future / Conditional
  { id: 12, enonce: "FOR s'utilise avec :", choix: [
    { lettre: "A", texte: "Une date précise" }, { lettre: "B", texte: "Une durée (for 5 hours, for a week)", correct: true },
  ]},
  { id: 13, enonce: "SINCE s'utilise avec :", choix: [
    { lettre: "A", texte: "Un point précis dans le temps (since 2020)", correct: true }, { lettre: "B", texte: "Une durée" },
  ]},
  { id: 14, enonce: "Le FUTUR en anglais se forme avec :", choix: [
    { lettre: "A", texte: "Sujet + WOULD + verbe" }, { lettre: "B", texte: "Sujet + WILL + verbe", correct: true },
  ]},
  { id: 15, enonce: "Le CONDITIONNEL se forme avec :", choix: [
    { lettre: "A", texte: "Sujet + WILL + verbe" }, { lettre: "B", texte: "Sujet + WOULD + verbe", correct: true },
  ]},
  // Modal verbs
  { id: 16, enonce: "CAN exprime :", choix: [
    { lettre: "A", texte: "L'obligation" }, { lettre: "B", texte: "La capacité / permission (pouvoir, savoir)", correct: true }, { lettre: "C", texte: "La suggestion" },
  ]},
  { id: 17, enonce: "MUST exprime :", choix: [
    { lettre: "A", texte: "La capacité" }, { lettre: "B", texte: "L'obligation (devoir)", correct: true }, { lettre: "C", texte: "La suggestion" },
  ]},
  { id: 18, enonce: "SHOULD exprime :", choix: [
    { lettre: "A", texte: "L'obligation" }, { lettre: "B", texte: "Le conseil", correct: true }, { lettre: "C", texte: "La permission" },
  ]},
  // Comparatives
  { id: 19, enonce: "Comparatif des adjectifs COURTS :", choix: [
    { lettre: "A", texte: "MORE + adj + THAN" }, { lettre: "B", texte: "Adj + ER + THAN", correct: true },
  ]},
  { id: 20, enonce: "Comparatif des adjectifs LONGS :", choix: [
    { lettre: "A", texte: "Adj + ER + THAN" }, { lettre: "B", texte: "MORE + adj + THAN", correct: true },
  ]},
  { id: 21, enonce: "Que signifie « half past three » ?", choix: [
    { lettre: "A", texte: "3h15" }, { lettre: "B", texte: "3h30", correct: true }, { lettre: "C", texte: "3h45" },
  ]},
  { id: 22, enonce: "MUCH s'utilise avec :", choix: [
    { lettre: "A", texte: "Les noms dénombrables" }, { lettre: "B", texte: "Les noms indénombrables", correct: true },
  ]},
  { id: 23, enonce: "MANY s'utilise avec :", choix: [
    { lettre: "A", texte: "Les noms indénombrables" }, { lettre: "B", texte: "Les noms dénombrables", correct: true },
  ]},
];

// ===== PART 4 — Welcoming, Ride, Lyon, Goodbye & Question Words =====

const ANGLAIS_P4_QUESTIONS: ExerciceQuestion[] = [
  { id: 1, enonce: "Comment dit-on « Bonjour, vous êtes M. ou Mme… ? » en anglais ?", choix: [
    { lettre: "A", texte: "Good morning, what's your name?" }, { lettre: "B", texte: "Hello, are you Mr or Mrs…?", correct: true }, { lettre: "C", texte: "Hi, who are you?" },
  ]},
  { id: 2, enonce: "Comment dit-on « Puis-je confirmer votre identité ? » en anglais ?", choix: [
    { lettre: "A", texte: "What's your name?" }, { lettre: "B", texte: "May I confirm your identity?", correct: true }, { lettre: "C", texte: "Show me your ID." },
  ]},
  { id: 3, enonce: "Comment dit-on « Je vous en prie. Montez… » en anglais ?", choix: [
    { lettre: "A", texte: "Get in now." }, { lettre: "B", texte: "You're welcome. If you'd like to get in…", correct: true }, { lettre: "C", texte: "Hurry up please." },
  ]},
  { id: 4, enonce: "Comment dit-on « Où êtes-vous exactement ? » en anglais ?", choix: [
    { lettre: "A", texte: "Where do you live?" }, { lettre: "B", texte: "What's your current location?", correct: true }, { lettre: "C", texte: "Where are you going?" },
  ]},
  { id: 5, enonce: "Comment dit-on « Allez tout droit » en anglais ?", choix: [
    { lettre: "A", texte: "Turn left." }, { lettre: "B", texte: "Go straight on.", correct: true }, { lettre: "C", texte: "Stop here." },
  ]},
  // During the ride
  { id: 6, enonce: "Comment dit-on « Installez-vous confortablement » en anglais ?", choix: [
    { lettre: "A", texte: "Sit down." }, { lettre: "B", texte: "Make yourself comfortable.", correct: true }, { lettre: "C", texte: "Don't move." },
  ]},
  { id: 7, enonce: "Comment dit-on « Tout va bien ? » en anglais ?", choix: [
    { lettre: "A", texte: "What's wrong?" }, { lettre: "B", texte: "Is everything alright?", correct: true }, { lettre: "C", texte: "Are you sick?" },
  ]},
  { id: 8, enonce: "Comment dit-on « Où allez-vous ? » en anglais ?", choix: [
    { lettre: "A", texte: "Where do you live?" }, { lettre: "B", texte: "What's your destination?", correct: true }, { lettre: "C", texte: "Where are you from?" },
  ]},
  { id: 9, enonce: "Comment proposer de l'eau poliment en anglais ?", choix: [
    { lettre: "A", texte: "Give me water." }, { lettre: "B", texte: "Would you like some water?", correct: true }, { lettre: "C", texte: "Do you need water?" },
  ]},
  { id: 10, enonce: "Comment dit-on « Attachez votre ceinture SVP » en anglais ?", choix: [
    { lettre: "A", texte: "Open the door." }, { lettre: "B", texte: "Please, fasten your seat belt.", correct: true }, { lettre: "C", texte: "Make yourself comfortable." },
  ]},
  { id: 11, enonce: "Comment dit-on « Connaissez-vous Lyon ? » en anglais ?", choix: [
    { lettre: "A", texte: "Where is Lyon?" }, { lettre: "B", texte: "Do you know the city of Lyon?", correct: true }, { lettre: "C", texte: "Lyon is beautiful." },
  ]},
  // Goodbye & Loyalty
  { id: 12, enonce: "Comment dit-on « Merci de nous avoir choisis » en anglais ?", choix: [
    { lettre: "A", texte: "Thanks for coming." }, { lettre: "B", texte: "Thank you for choosing us.", correct: true }, { lettre: "C", texte: "You're welcome." },
  ]},
  { id: 13, enonce: "Comment dit-on « Bonne journée ! » en anglais ?", choix: [
    { lettre: "A", texte: "Good morning!" }, { lettre: "B", texte: "Have a great day!", correct: true }, { lettre: "C", texte: "See you tomorrow!" },
  ]},
  { id: 14, enonce: "Comment dit-on « Profitez de Lyon ! » en anglais ?", choix: [
    { lettre: "A", texte: "Lyon is nice." }, { lettre: "B", texte: "Enjoy your stay in Lyon!", correct: true }, { lettre: "C", texte: "Do you like Lyon?" },
  ]},
  // Question words
  { id: 15, enonce: "WHERE signifie :", choix: [
    { lettre: "A", texte: "Quand" }, { lettre: "B", texte: "Où", correct: true }, { lettre: "C", texte: "Pourquoi" },
  ]},
  { id: 16, enonce: "WHEN signifie :", choix: [
    { lettre: "A", texte: "Où" }, { lettre: "B", texte: "Quand", correct: true }, { lettre: "C", texte: "Comment" },
  ]},
  { id: 17, enonce: "HOW LONG signifie :", choix: [
    { lettre: "A", texte: "Combien (prix)" }, { lettre: "B", texte: "Combien de temps", correct: true }, { lettre: "C", texte: "Pourquoi" },
  ]},
  { id: 18, enonce: "WHY signifie :", choix: [
    { lettre: "A", texte: "Quand" }, { lettre: "B", texte: "Pourquoi", correct: true }, { lettre: "C", texte: "Comment" },
  ]},
];

export const ANGLAIS_EXERCICE_PART_1: ExerciceItem = {
  id: 3,
  titre: "Exercices Anglais — Part 1",
  sousTitre: "53 questions : Station, Airport, Vehicle, Weather & Prepositions",
  actif: true,
  questions: ANGLAIS_P1_QUESTIONS,
};

export const ANGLAIS_EXERCICE_PART_2: ExerciceItem = {
  id: 4,
  titre: "Exercices Anglais — Part 2",
  sousTitre: "32 questions : Transport words, Useful words, Common verbs, TO BE & TO HAVE",
  actif: true,
  questions: ANGLAIS_P2_QUESTIONS,
};

export const ANGLAIS_EXERCICE_PART_3: ExerciceItem = {
  id: 5,
  titre: "Exercices Anglais — Part 3",
  sousTitre: "23 questions : Prepositions, Tenses, Modals, Comparatives, Quantifiers",
  actif: true,
  questions: ANGLAIS_P3_QUESTIONS,
};

export const ANGLAIS_EXERCICE_PART_4: ExerciceItem = {
  id: 6,
  titre: "Exercices Anglais — Part 4",
  sousTitre: "18 questions : Welcoming, During the ride, Lyon, Goodbye & Question Words",
  actif: true,
  questions: ANGLAIS_P4_QUESTIONS,
};

export const ANGLAIS_EXERCICES: ExerciceItem[] = [
  ANGLAIS_EXERCICE_PART_1,
  ANGLAIS_EXERCICE_PART_2,
  ANGLAIS_EXERCICE_PART_3,
  ANGLAIS_EXERCICE_PART_4,
];

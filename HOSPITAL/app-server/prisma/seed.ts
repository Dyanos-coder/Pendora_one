import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient, Role } from '../src/generated/prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { getDbConnectionConfig } from '../src/db/connection-config'

const config = getDbConnectionConfig()
const adapter = new PrismaMariaDb({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  password: config.password,
  connectionLimit: 5
})
const prisma = new PrismaClient({ adapter })

const DEMO_PASSWORD = 'demo1234'

async function main(): Promise<void> {
  const companyCount = await prisma.company.count()
  if (companyCount === 0) {
    await prisma.company.create({
      data: { name: 'Hôpital Démo', sector: 'sante' }
    })
  }

  await prisma.user.upsert({
    where: { email: 'directeur@demo.pandorahealth' },
    update: {},
    create: {
      email: 'directeur@demo.pandorahealth',
      name: 'Alain K.',
      passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
      role: Role.DIRIGEANT
    }
  })

  await prisma.user.upsert({
    where: { email: 'praticien@demo.pandorahealth' },
    update: {},
    create: {
      email: 'praticien@demo.pandorahealth',
      name: 'Fatou Mensah',
      passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
      role: Role.MEDECIN
    }
  })

  await seedPatients()
  await seedEmployees()
  await seedAppointments()
  await seedConsultations()
  await seedBeds()
  await seedHospitalizations()
  await seedEmergencyVisits()
  await seedOperatingRooms()
  await seedSurgeries()
  await seedLabRequests()
  await seedImagingRequests()
  await seedCardioExams()
  await seedPathologyRequests()
  await seedEndoscopyProcedures()
  await seedMedications()
  await seedDepots()
  await seedProcurement()
  await seedBloodPouches()
  await seedFinanceTransactions()
  await seedQuality()
  await seedRisks()
  await seedAuditCompliance()
  await seedProtocolDocuments()
  await seedAutomationRules()

  console.log('Seed OK — comptes de démo (MySQL distant) :')
  console.log(`  directeur@demo.pandorahealth / ${DEMO_PASSWORD}  (rôle DIRIGEANT)`)
  console.log(`  praticien@demo.pandorahealth / ${DEMO_PASSWORD}  (rôle MEDECIN)`)
}

// Les 10 patients canoniques du mock frontend (features/patients/mock-data.ts) gardent leurs
// ids fixes (p-1245, etc.) pour que toutes les références patientId déjà présentes dans les
// autres mocks (rendez-vous, consultations, urgences...) restent valides une fois ces domaines
// raccordés au vrai backend.
const CANONICAL_PATIENTS = [
  {
    id: 'p-1245',
    code: 'P-2025-0001245',
    firstName: 'Brice',
    lastName: 'Koffi',
    gender: 'M' as const,
    age: 32,
    service: 'Cardiologie',
    insuranceProvider: 'CNAM',
    phone: '+229 97 12 34 56',
    email: 'koffi.brice@gmail.com',
    bloodType: 'A+',
    allergies: 'Aucune connue',
    insuranceNumber: '7894561230',
    emergencyContactName: 'Koffi Alice (Épouse)',
    emergencyContactPhone: '+229 90 11 22 33',
    medicalHistory: [
      'Hypertension artérielle — Diagnostiquée en 2021',
      'Diabète de type 2 — Diagnostiqué en 2022',
      'Aucun antécédent chirurgical'
    ],
    familyHistory: ['Diabète (Père)', 'Hypertension (Mère)'],
    lifestyle: ['Non fumeur', 'Activité physique : Modérée', 'Alimentation : Équilibrée']
  },
  { id: 'p-1982', code: 'P-2025-0001982', firstName: 'Léa', lastName: 'Ahouré', gender: 'F' as const, age: 28, service: 'Gynécologie', insuranceProvider: 'CNAM' },
  { id: 'p-1112', code: 'P-2025-0001112', firstName: 'Clément', lastName: 'Dossou', gender: 'M' as const, age: 42, service: 'Médecine interne', insuranceProvider: 'ASSNAT' },
  { id: 'p-0766', code: 'P-2025-0000766', firstName: 'Emmanuel', lastName: 'Mensah', gender: 'M' as const, age: 50, service: 'Cardiologie', insuranceProvider: 'CNAM' },
  { id: 'p-0556', code: 'P-2025-0000556', firstName: 'Kossi', lastName: 'Amoussou', gender: 'M' as const, age: 31, service: 'Dermatologie', insuranceProvider: null },
  { id: 'p-1045', code: 'P-2025-0001045', firstName: 'Marie', lastName: 'Adjovi', gender: 'F' as const, age: 29, service: 'Gynécologie', insuranceProvider: 'CNAM' },
  { id: 'p-0983', code: 'P-2025-0000983', firstName: 'Franci', lastName: 'Zinsou', gender: 'M' as const, age: 45, service: 'Médecine interne', insuranceProvider: 'ASSNAT' },
  { id: 'p-1667', code: 'P-2025-0001667', firstName: 'Tové', lastName: 'Savi de', gender: 'M' as const, age: 65, service: 'Endocrinologie', insuranceProvider: 'CNAM' },
  { id: 'p-1333', code: 'P-2025-0001333', firstName: 'Alexandre', lastName: 'Tchibaoo', gender: 'M' as const, age: 37, service: 'Pneumologie', insuranceProvider: 'CNAM' },
  { id: 'p-1721', code: 'P-2025-0001721', firstName: 'Brigitte', lastName: 'Kouassi', gender: 'F' as const, age: 23, service: 'Ophtalmologie', insuranceProvider: null }
]

function birthDateForAge(age: number): Date {
  const now = new Date()
  return new Date(now.getFullYear() - age, now.getMonth(), now.getDate())
}

async function seedPatients(): Promise<void> {
  for (const p of CANONICAL_PATIENTS) {
    const data = {
      code: p.code,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      birthDate: birthDateForAge(p.age),
      service: p.service,
      insuranceProvider: p.insuranceProvider,
      phone: 'phone' in p ? p.phone : undefined,
      email: 'email' in p ? p.email : undefined,
      bloodType: 'bloodType' in p ? p.bloodType : undefined,
      allergies: 'allergies' in p ? p.allergies : undefined,
      insuranceNumber: 'insuranceNumber' in p ? p.insuranceNumber : undefined,
      emergencyContactName: 'emergencyContactName' in p ? p.emergencyContactName : undefined,
      emergencyContactPhone: 'emergencyContactPhone' in p ? p.emergencyContactPhone : undefined,
      medicalHistory: 'medicalHistory' in p ? p.medicalHistory : undefined,
      familyHistory: 'familyHistory' in p ? p.familyHistory : undefined,
      lifestyle: 'lifestyle' in p ? p.lifestyle : undefined
    }

    await prisma.patient.upsert({
      where: { id: p.id },
      update: data,
      create: { id: p.id, ...data }
    })
  }
}

// Personnel médical qui revient dans la quasi-totalité des mocks (Rendez-vous, Consultations,
// Urgences, Bloc opératoire, plateau technique...) — ids fixes réutilisables tel que décidé en
// Phase 1 (Employee unique référencé par employeeId au lieu de texte libre).
const DOCTORS = [
  { id: 'emp-martin', firstName: 'A', lastName: 'Martin', specialty: 'Cardiologie' },
  { id: 'emp-mensah', firstName: 'E', lastName: 'Mensah', specialty: 'Médecine interne' },
  { id: 'emp-adjovi', firstName: 'M', lastName: 'Adjovi', specialty: 'Gynécologie-Obstétrique' },
  { id: 'emp-houngbo', firstName: 'F', lastName: 'Houngbo', specialty: 'Pneumologie' },
  { id: 'emp-dossou', firstName: 'C', lastName: 'Dossou', specialty: 'Endocrinologie' },
  { id: 'emp-fiadjoe', firstName: 'G', lastName: 'Fiadjoe', specialty: 'Ophtalmologie' },
  { id: 'emp-agbodan', firstName: 'M', lastName: 'Agbodan', specialty: 'Anesthésie-Réanimation' },
  { id: 'emp-yao', firstName: 'A', lastName: 'Yao', specialty: 'Médecine générale' },
  { id: 'emp-gbetoe', firstName: 'K', lastName: 'Gbétoé', specialty: 'Radiologie' },
  { id: 'emp-hounsou', firstName: 'B', lastName: 'Hounsou', specialty: 'Rhumatologie' },
  { id: 'emp-loko', firstName: 'P', lastName: 'Loko', specialty: 'Psychiatrie' },
  { id: 'emp-kpahou', firstName: 'E', lastName: 'Kpahou', specialty: 'Neurologie' },
  { id: 'emp-amegbe', firstName: 'S', lastName: 'Amégbé', specialty: 'ORL' },
  { id: 'emp-tchibozo', firstName: 'A', lastName: 'Tchibozo', specialty: 'Imagerie médicale' },
  { id: 'emp-ametepe', firstName: 'K', lastName: 'Amétépé', specialty: 'Anesthésie-Réanimation' },
  { id: 'emp-lawson', firstName: 'E', lastName: 'Lawson', specialty: 'Anesthésie-Réanimation' }
]

// Techniciens de laboratoire — ids distincts des médecins même en cas d'homonymie (ex. "E.
// Lawson" ici vs l'anesthésiste "Dr. Lawson E." : deux personnes différentes du personnel).
const TECHNICIANS = [
  { id: 'emp-tech-mensah-a', firstName: 'A', lastName: 'Mensah' },
  { id: 'emp-tech-lawson-e', firstName: 'E', lastName: 'Lawson' },
  { id: 'emp-tech-amegan-k', firstName: 'K', lastName: 'Amégan' },
  { id: 'emp-tech-tchibozo-m', firstName: 'M', lastName: 'Tchibozo' }
]

const WORKING_DAYS_PER_MONTH = 21

interface HrProfile {
  matricule: string
  hireDate: string
  contractType: 'CDI' | 'CDD'
  contractEndInDays?: number
  dailyStatus: 'PRESENT' | 'ABSENT' | 'CONGE' | 'RETARD'
  absentDays: number
  lateDays: number
  averageHoursMin: number
  overtimeHoursMin: number
}

// Profils RH individuels (Phase 4) — un jeu de valeurs plausibles par employé du roster
// existant (pas d'agrégat global inventé) : matricule, contrat, statut du jour et compteurs de
// présence du mois en cours, sur une base de 21 jours ouvrés/mois.
const HR_PROFILES: Record<string, HrProfile> = {
  'emp-martin': { matricule: 'EMP-2021-0045', hireDate: '2021-03-12', contractType: 'CDI', dailyStatus: 'PRESENT', absentDays: 1, lateDays: 1, averageHoursMin: 9730, overtimeHoursMin: 500 },
  'emp-mensah': { matricule: 'EMP-2020-0078', hireDate: '2020-01-19', contractType: 'CDI', dailyStatus: 'ABSENT', absentDays: 4, lateDays: 2, averageHoursMin: 7710, overtimeHoursMin: 765 },
  'emp-adjovi': { matricule: 'EMP-2019-0032', hireDate: '2019-09-05', contractType: 'CDI', dailyStatus: 'PRESENT', absentDays: 0, lateDays: 0, averageHoursMin: 10080, overtimeHoursMin: 255 },
  'emp-houngbo': { matricule: 'EMP-2023-0112', hireDate: '2023-06-02', contractType: 'CDD', contractEndInDays: 90, dailyStatus: 'CONGE', absentDays: 1, lateDays: 1, averageHoursMin: 9000, overtimeHoursMin: 120 },
  'emp-dossou': { matricule: 'EMP-2022-0067', hireDate: '2022-04-10', contractType: 'CDI', dailyStatus: 'PRESENT', absentDays: 0, lateDays: 0, averageHoursMin: 9900, overtimeHoursMin: 180 },
  'emp-fiadjoe': { matricule: 'EMP-2018-0021', hireDate: '2018-11-08', contractType: 'CDI', dailyStatus: 'PRESENT', absentDays: 2, lateDays: 0, averageHoursMin: 9600, overtimeHoursMin: 90 },
  'emp-agbodan': { matricule: 'EMP-2021-0099', hireDate: '2021-08-15', contractType: 'CDI', dailyStatus: 'PRESENT', absentDays: 1, lateDays: 0, averageHoursMin: 9780, overtimeHoursMin: 360 },
  'emp-yao': { matricule: 'EMP-2024-0015', hireDate: '2024-02-20', contractType: 'CDD', contractEndInDays: 45, dailyStatus: 'RETARD', absentDays: 1, lateDays: 3, averageHoursMin: 8400, overtimeHoursMin: 0 },
  'emp-gbetoe': { matricule: 'EMP-2020-0056', hireDate: '2020-07-01', contractType: 'CDI', dailyStatus: 'PRESENT', absentDays: 0, lateDays: 1, averageHoursMin: 9960, overtimeHoursMin: 300 },
  'emp-hounsou': { matricule: 'EMP-2019-0043', hireDate: '2019-05-22', contractType: 'CDI', dailyStatus: 'PRESENT', absentDays: 1, lateDays: 0, averageHoursMin: 9480, overtimeHoursMin: 150 },
  'emp-loko': { matricule: 'EMP-2023-0078', hireDate: '2023-09-11', contractType: 'CDD', contractEndInDays: 20, dailyStatus: 'PRESENT', absentDays: 0, lateDays: 0, averageHoursMin: 9300, overtimeHoursMin: 60 },
  'emp-kpahou': { matricule: 'EMP-2017-0012', hireDate: '2017-03-30', contractType: 'CDI', dailyStatus: 'PRESENT', absentDays: 0, lateDays: 0, averageHoursMin: 10200, overtimeHoursMin: 420 },
  'emp-amegbe': { matricule: 'EMP-2022-0134', hireDate: '2022-10-17', contractType: 'CDI', dailyStatus: 'ABSENT', absentDays: 3, lateDays: 1, averageHoursMin: 8100, overtimeHoursMin: 0 },
  'emp-tchibozo': { matricule: 'EMP-2021-0088', hireDate: '2021-04-25', contractType: 'CDI', dailyStatus: 'PRESENT', absentDays: 0, lateDays: 0, averageHoursMin: 10020, overtimeHoursMin: 240 },
  'emp-ametepe': { matricule: 'EMP-2019-0091', hireDate: '2019-12-03', contractType: 'CDI', dailyStatus: 'PRESENT', absentDays: 1, lateDays: 0, averageHoursMin: 9660, overtimeHoursMin: 540 },
  'emp-lawson': { matricule: 'EMP-2021-0156', hireDate: '2021-07-30', contractType: 'CDI', dailyStatus: 'PRESENT', absentDays: 1, lateDays: 0, averageHoursMin: 9860, overtimeHoursMin: 600 },
  'emp-tech-mensah-a': { matricule: 'EMP-2022-0201', hireDate: '2022-02-14', contractType: 'CDI', dailyStatus: 'PRESENT', absentDays: 0, lateDays: 0, averageHoursMin: 10200, overtimeHoursMin: 90 },
  'emp-tech-lawson-e': { matricule: 'EMP-2024-0088', hireDate: '2024-01-11', contractType: 'CDD', contractEndInDays: 60, dailyStatus: 'PRESENT', absentDays: 2, lateDays: 0, averageHoursMin: 9520, overtimeHoursMin: 195 },
  'emp-tech-amegan-k': { matricule: 'EMP-2020-0134', hireDate: '2020-11-23', contractType: 'CDI', dailyStatus: 'RETARD', absentDays: 1, lateDays: 3, averageHoursMin: 9310, overtimeHoursMin: 45 },
  'emp-tech-tchibozo-m': { matricule: 'EMP-2023-0055', hireDate: '2023-03-08', contractType: 'CDD', contractEndInDays: 15, dailyStatus: 'PRESENT', absentDays: 0, lateDays: 1, averageHoursMin: 9120, overtimeHoursMin: 75 }
}

function hrFields(hr: HrProfile) {
  return {
    matricule: hr.matricule,
    contractType: hr.contractType,
    contractNumber: `CT-${hr.matricule.slice(4)}`,
    hireDate: new Date(hr.hireDate),
    contractEndDate: hr.contractEndInDays !== undefined ? daysFromNow(hr.contractEndInDays) : null,
    dailyStatus: hr.dailyStatus,
    presentDays: WORKING_DAYS_PER_MONTH - hr.absentDays,
    absentDays: hr.absentDays,
    lateDays: hr.lateDays,
    averageHoursMin: hr.averageHoursMin,
    overtimeHoursMin: hr.overtimeHoursMin
  }
}

async function seedEmployees(): Promise<void> {
  for (const d of DOCTORS) {
    const hr = HR_PROFILES[d.id]
    await prisma.employee.upsert({
      where: { id: d.id },
      update: hrFields(hr),
      create: {
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
        role: Role.MEDECIN,
        specialty: d.specialty,
        ...hrFields(hr)
      }
    })
  }
  for (const t of TECHNICIANS) {
    const hr = HR_PROFILES[t.id]
    await prisma.employee.upsert({
      where: { id: t.id },
      update: hrFields(hr),
      create: {
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        role: Role.TECHNICIEN,
        specialty: 'Laboratoire',
        ...hrFields(hr)
      }
    })
  }
}

interface AppointmentSeed {
  id: string
  patientId?: string
  patientName?: string
  patientAge?: number
  doctorId?: string
  dayOffset: number
  time: string
  durationMin?: number
  service: string
  room?: string
  type: 'CONSULTATION' | 'SUIVI' | 'EXAMEN' | 'RESULTAT' | 'CHIRURGIE' | 'CAMPAGNE' | 'AUTRE'
  motive: string
  status: 'CONFIRME' | 'EN_ATTENTE' | 'ANNULE' | 'TERMINE'
  reminder?: string
}

// Reprend la structure de features/appointments/mock-data.ts, mais avec de vraies dates
// (dayOffset = jours depuis le lundi de la semaine courante) au lieu d'un dayIndex relatif à une
// semaine figée dans le mock — voir seedAppointments() pour le calcul de date réel.
const APPOINTMENTS_SEED: AppointmentSeed[] = [
  // Lundi
  { id: 'cal-1', patientId: 'p-1245', doctorId: 'emp-martin', dayOffset: 0, time: '09:00', service: 'Cardiologie', room: 'Salle 203', type: 'CONSULTATION', motive: 'Suivi HTA', status: 'TERMINE' },
  { id: 'cal-2', patientId: 'p-0766', doctorId: 'emp-martin', dayOffset: 0, time: '10:00', service: 'Cardiologie', room: 'Salle 203', type: 'SUIVI', motive: 'Suivi HTA', status: 'TERMINE' },
  { id: 'cal-3', patientName: 'Akouessi S.', patientAge: 40, doctorId: 'emp-mensah', dayOffset: 0, time: '11:00', service: 'Médecine interne', room: 'Salle 110', type: 'CONSULTATION', motive: 'Contrôle', status: 'TERMINE' },
  { id: 'cal-4', patientName: 'Assogba C.', patientAge: 38, doctorId: 'emp-mensah', dayOffset: 0, time: '12:00', service: 'Médecine interne', room: 'Salle 110', type: 'CONSULTATION', motive: 'Contrôle', status: 'TERMINE' },
  { id: 'cal-5', patientId: 'p-1045', doctorId: 'emp-adjovi', dayOffset: 0, time: '14:00', service: 'Gynécologie', room: 'Salle gynéco', type: 'CONSULTATION', motive: 'Suivi grossesse', status: 'TERMINE' },
  { id: 'cal-6', patientId: 'p-1333', doctorId: 'emp-houngbo', dayOffset: 0, time: '16:00', service: 'Pneumologie', room: 'Salle 401', type: 'CONSULTATION', motive: 'Contrôle', status: 'TERMINE' },

  // Mardi
  { id: 'cal-7', patientId: 'p-1112', doctorId: 'emp-mensah', dayOffset: 1, time: '09:00', service: 'Médecine interne', room: 'Salle 110', type: 'CONSULTATION', motive: 'Céphalées', status: 'TERMINE' },
  { id: 'cal-8', patientId: 'p-1982', doctorId: 'emp-adjovi', dayOffset: 1, time: '10:00', service: 'Gynécologie', room: 'Salle gynéco', type: 'CONSULTATION', motive: 'Suivi grossesse', status: 'TERMINE' },
  { id: 'cal-9', patientId: 'p-1667', doctorId: 'emp-dossou', dayOffset: 1, time: '13:00', service: 'Endocrinologie', room: 'Salle 501', type: 'SUIVI', motive: 'Suivi diabète', status: 'TERMINE' },
  { id: 'cal-10', patientId: 'p-0556', doctorId: 'emp-martin', dayOffset: 1, time: '14:00', service: 'Cardiologie', room: 'Salle ECG', type: 'EXAMEN', motive: 'ECG', status: 'TERMINE' },
  { id: 'cal-11', patientId: 'p-1112', doctorId: 'emp-mensah', dayOffset: 1, time: '16:00', service: 'Médecine interne', room: 'Salle 110', type: 'CONSULTATION', motive: 'Contrôle', status: 'TERMINE' },
  { id: 'c-1', patientId: 'p-1721', doctorId: 'emp-fiadjoe', dayOffset: 1, time: '09:30', service: 'Ophtalmologie', room: 'Salle 601', type: 'CONSULTATION', motive: 'Contrôle visuel', status: 'ANNULE' },

  // Jeudi
  { id: 'cal-16', patientId: 'p-1333', doctorId: 'emp-houngbo', dayOffset: 3, time: '09:00', service: 'Pneumologie', room: 'Salle 401', type: 'CONSULTATION', motive: 'Contrôle', status: 'CONFIRME' },
  { id: 'cal-17', patientName: 'Soglo R.', patientAge: 33, doctorId: 'emp-mensah', dayOffset: 3, time: '10:00', service: 'Médecine interne', room: 'Salle 110', type: 'CONSULTATION', motive: 'Contrôle', status: 'CONFIRME' },
  { id: 'cal-18', patientId: 'p-0983', doctorId: 'emp-mensah', dayOffset: 3, time: '11:00', service: 'Médecine interne', room: 'Salle 110', type: 'CONSULTATION', motive: 'Contrôle', status: 'CONFIRME' },
  { id: 'cal-19', patientId: 'p-1045', doctorId: 'emp-adjovi', dayOffset: 3, time: '12:00', service: 'Gynécologie', room: 'Salle gynéco', type: 'CONSULTATION', motive: 'Suivi grossesse', status: 'CONFIRME' },
  { id: 'c-2', patientName: 'Alakouté S.', patientAge: 55, doctorId: 'emp-fiadjoe', dayOffset: 3, time: '15:30', service: 'Rhumatologie', room: 'Salle 302', type: 'CONSULTATION', motive: 'Douleur articulaire', status: 'ANNULE' },

  // Vendredi
  { id: 'cal-20', patientName: 'Koffi B.', patientAge: 41, dayOffset: 4, time: '14:00', service: 'Laboratoire', room: 'Labo', type: 'RESULTAT', motive: 'Bilan biologique', status: 'CONFIRME' },
  { id: 'cal-21', patientId: 'p-0556', doctorId: 'emp-houngbo', dayOffset: 4, time: '15:00', service: 'Dermatologie', room: 'Salle 401', type: 'CONSULTATION', motive: 'Acné sévère', status: 'CONFIRME' },
  { id: 'cal-22', patientName: 'Assogba C.', patientAge: 38, doctorId: 'emp-mensah', dayOffset: 4, time: '16:00', service: 'Médecine interne', room: 'Salle 110', type: 'CONSULTATION', motive: 'Contrôle', status: 'CONFIRME' },
  { id: 'c-3', patientName: "N'Guessan Mireille", patientAge: 60, doctorId: 'emp-loko', dayOffset: 4, time: '10:00', service: 'Psychiatrie', room: 'Salle 801', type: 'SUIVI', motive: 'Anxiété', status: 'ANNULE' },

  // Samedi
  { id: 'cal-23', patientName: 'Consultations Spéciales', dayOffset: 5, time: '13:00', durationMin: 60, service: 'Toutes spécialités', room: '—', type: 'AUTRE', motive: 'Consultations spéciales', status: 'CONFIRME' },
  { id: 'cal-24', patientName: 'Campagne HTA', dayOffset: 5, time: '14:00', durationMin: 60, service: 'Prévention', room: 'Hall', type: 'CAMPAGNE', motive: "Dépistage de l'hypertension", status: 'CONFIRME' }
]

// Liste détaillée du jour courant (granularité demi-heure) — placée sur le vrai "aujourd'hui"
// plutôt que sur le mercredi figé du mock, pour que le calendrier soit cohérent quel que soit le
// jour où le seed est exécuté.
const TODAY_LIST_SEED: Omit<AppointmentSeed, 'dayOffset'>[] = [
  { id: 't-1', patientId: 'p-1245', doctorId: 'emp-martin', time: '08:30', service: 'Cardiologie', room: 'Salle 203', type: 'CONSULTATION', motive: 'Suivi HTA', status: 'CONFIRME', reminder: 'SMS & Email envoyés' },
  { id: 't-2', patientId: 'p-1982', doctorId: 'emp-adjovi', time: '09:00', service: 'Gynécologie', room: 'Salle gynéco', type: 'CONSULTATION', motive: 'Suivi grossesse', status: 'CONFIRME', reminder: 'SMS envoyé' },
  { id: 't-3', patientId: 'p-1112', doctorId: 'emp-mensah', time: '09:30', service: 'Médecine interne', room: 'Salle 110', type: 'CONSULTATION', motive: 'Diabète', status: 'CONFIRME', reminder: 'SMS envoyé' },
  { id: 't-4', patientId: 'p-0766', doctorId: 'emp-martin', time: '10:00', service: 'Cardiologie', room: 'Salle ECG', type: 'EXAMEN', motive: 'ECG de contrôle', status: 'CONFIRME', reminder: 'SMS envoyé' },
  { id: 't-5', patientId: 'p-0556', doctorId: 'emp-houngbo', time: '10:30', service: 'Dermatologie', room: 'Salle 401', type: 'CONSULTATION', motive: 'Acné sévère', status: 'EN_ATTENTE' },
  { id: 't-6', patientId: 'p-1045', doctorId: 'emp-adjovi', time: '11:00', service: 'Gynécologie', room: 'Salle gynéco', type: 'CONSULTATION', motive: 'Suivi grossesse', status: 'CONFIRME' },
  { id: 't-7', patientId: 'p-0983', doctorId: 'emp-mensah', time: '11:30', service: 'Médecine interne', room: 'Salle 110', type: 'SUIVI', motive: 'Contrôle régulier', status: 'EN_ATTENTE' }
]

function currentWeekMonday(): Date {
  const now = new Date()
  const day = now.getDay() // 0 = dimanche ... 6 = samedi
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)
  return monday
}

function dateAt(monday: Date, dayOffset: number, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date(monday)
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function seedAppointments(): Promise<void> {
  const existing = await prisma.appointment.count()
  if (existing > 0) return

  const monday = currentWeekMonday()
  const todayOffset = (new Date().getDay() + 6) % 7 // lundi=0 ... dimanche=6

  const all: AppointmentSeed[] = [
    ...APPOINTMENTS_SEED,
    ...TODAY_LIST_SEED.map((a) => ({ ...a, dayOffset: todayOffset }))
  ]

  for (const a of all) {
    await prisma.appointment.create({
      data: {
        id: a.id,
        patientId: a.patientId,
        patientName: a.patientName,
        patientAge: a.patientAge,
        doctorId: a.doctorId,
        date: dateAt(monday, a.dayOffset, a.time),
        durationMin: a.durationMin ?? 30,
        service: a.service,
        room: a.room,
        type: a.type,
        motive: a.motive,
        status: a.status,
        reminder: a.reminder
      }
    })
  }
}

interface ConsultationSeed {
  id: string
  dossier: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: 'M' | 'F'
  doctorId?: string
  time: string
  service: string
  motive: string
  status: 'TERMINEE' | 'EN_COURS' | 'EN_ATTENTE' | 'ANNULEE'
}

// Reprend features/consultations/mock-data.ts, placé sur la vraie journée courante. Les
// couples doctor/service incohérents du mock ("Dr. Martin Adjovi", "Dr. Adjovi Marie" — en
// réalité des collages de noms de patients) sont corrigés vers le bon Employee du roster.
const CONSULTATIONS_SEED: ConsultationSeed[] = [
  { id: 'cs-1', dossier: 'DOS-2025-015678', patientId: 'p-1245', doctorId: 'emp-martin', time: '08:30', service: 'Cardiologie', motive: 'Suivi HTA', status: 'TERMINEE' },
  { id: 'cs-2', dossier: 'DOS-2025-015679', patientId: 'p-1982', doctorId: 'emp-adjovi', time: '08:45', service: 'Gynécologie', motive: 'Suivi grossesse', status: 'EN_COURS' },
  { id: 'cs-3', dossier: 'DOS-2025-015680', patientId: 'p-1112', doctorId: 'emp-mensah', time: '09:00', service: 'Médecine interne', motive: 'Céphalées', status: 'TERMINEE' },
  { id: 'cs-4', dossier: 'DOS-2025-015681', patientId: 'p-0766', doctorId: 'emp-martin', time: '09:15', service: 'Cardiologie', motive: 'Douleur thoracique', status: 'TERMINEE' },
  { id: 'cs-5', dossier: 'DOS-2025-015682', patientId: 'p-0556', doctorId: 'emp-houngbo', time: '09:30', service: 'Dermatologie', motive: 'Acné sévère', status: 'EN_COURS' },
  { id: 'cs-6', dossier: 'DOS-2025-015683', patientId: 'p-1045', doctorId: 'emp-adjovi', time: '10:00', service: 'Gynécologie', motive: 'Suivi grossesse', status: 'EN_ATTENTE' },
  { id: 'cs-7', dossier: 'DOS-2025-015684', patientId: 'p-0983', doctorId: 'emp-mensah', time: '10:15', service: 'Médecine interne', motive: 'Contrôle régulier', status: 'EN_COURS' },
  { id: 'cs-8', dossier: 'DOS-2025-015685', patientId: 'p-1667', doctorId: 'emp-dossou', time: '10:30', service: 'Endocrinologie', motive: 'Diabète', status: 'TERMINEE' },
  { id: 'cs-9', dossier: 'DOS-2025-015686', patientId: 'p-1333', doctorId: 'emp-agbodan', time: '10:45', service: 'Pneumologie', motive: 'Toux persistante', status: 'TERMINEE' },
  { id: 'cs-10', dossier: 'DOS-2025-015687', patientId: 'p-1721', doctorId: 'emp-yao', time: '11:00', service: 'Ophtalmologie', motive: "Baisse d'acuité visuelle", status: 'EN_ATTENTE' },
  { id: 'cs-11', dossier: 'DOS-2025-015688', patientName: 'Akouété Sébastien', patientCode: 'PAT-2025-001086', patientAge: 55, patientGender: 'M', doctorId: 'emp-fiadjoe', time: '11:15', service: 'Rhumatologie', motive: 'Douleur articulaire', status: 'EN_COURS' },
  { id: 'cs-12', dossier: 'DOS-2025-015689', patientName: 'Hounkpe Josiane', patientCode: 'PAT-2025-001904', patientAge: 27, patientGender: 'F', doctorId: 'emp-adjovi', time: '11:30', service: 'Gynécologie', motive: 'Contrôle post-natal', status: 'EN_ATTENTE' },
  { id: 'cs-13', dossier: 'DOS-2025-015690', patientName: 'Soglo Raymond', patientCode: 'PAT-2025-000754', patientAge: 60, patientGender: 'M', doctorId: 'emp-martin', time: '11:45', service: 'Cardiologie', motive: 'Essoufflement', status: 'EN_COURS' },
  { id: 'cs-14', dossier: 'DOS-2025-015691', patientName: 'Ahouandjinou C.', patientCode: 'PAT-2025-000632', patientAge: 33, patientGender: 'F', doctorId: 'emp-gbetoe', time: '12:00', service: 'ORL', motive: 'Otite', status: 'TERMINEE' },
  { id: 'cs-15', dossier: 'DOS-2025-015692', patientName: 'Kpadonou Isidore', patientCode: 'PAT-2025-001276', patientAge: 48, patientGender: 'M', doctorId: 'emp-hounsou', time: '12:15', service: 'Urologie', motive: 'Douleur lombaire', status: 'EN_COURS' },
  { id: 'cs-16', dossier: 'DOS-2025-015693', patientName: "N'Guessan Mireille", patientCode: 'PAT-2025-000845', patientAge: 30, patientGender: 'F', doctorId: 'emp-loko', time: '12:30', service: 'Psychiatrie', motive: 'Anxiété', status: 'TERMINEE' },
  { id: 'cs-17', dossier: 'DOS-2025-015694', patientName: 'Dato Francis', patientCode: 'PAT-2025-001516', patientAge: 53, patientGender: 'M', doctorId: 'emp-kpahou', time: '12:45', service: 'Gastro-entérologie', motive: 'Douleur abdominale', status: 'TERMINEE' },
  { id: 'cs-18', dossier: 'DOS-2025-015695', patientName: 'Agbeko Nathalie', patientCode: 'PAT-2025-001197', patientAge: 24, patientGender: 'F', doctorId: 'emp-houngbo', time: '13:00', service: 'Dermatologie', motive: 'Eczéma', status: 'EN_ATTENTE' },
  { id: 'cs-19', dossier: 'DOS-2025-015696', patientName: 'Tessy Romain', patientCode: 'PAT-2025-000945', patientAge: 61, patientGender: 'M', doctorId: 'emp-agbodan', time: '13:15', service: 'Neurologie', motive: 'Vertiges', status: 'EN_COURS' },
  { id: 'cs-20', dossier: 'DOS-2025-015697', patientName: 'Biaou Julienne', patientCode: 'PAT-2025-001601', patientAge: 36, patientGender: 'F', doctorId: 'emp-amegbe', time: '13:30', service: 'Pédiatrie', motive: "Fièvre chez l'enfant", status: 'EN_ATTENTE' },
  { id: 'cs-c1', dossier: 'DOS-2025-015540', patientName: 'Kokou Servais', patientCode: 'PAT-2025-000821', patientAge: 44, patientGender: 'M', doctorId: 'emp-martin', time: '09:00', service: 'Cardiologie', motive: 'Contrôle', status: 'ANNULEE' },
  { id: 'cs-c2', dossier: 'DOS-2025-015551', patientName: 'Lawson Bernadette', patientCode: 'PAT-2025-000933', patientAge: 52, patientGender: 'F', doctorId: 'emp-yao', time: '14:30', service: 'Ophtalmologie', motive: 'Contrôle visuel', status: 'ANNULEE' }
]

function todayAt(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function seedConsultations(): Promise<void> {
  const existing = await prisma.consultation.count()
  if (existing > 0) return

  for (const c of CONSULTATIONS_SEED) {
    await prisma.consultation.create({
      data: {
        id: c.id,
        dossier: c.dossier,
        patientId: c.patientId,
        patientName: c.patientName,
        patientCode: c.patientCode,
        patientAge: c.patientAge,
        patientGender: c.patientGender,
        doctorId: c.doctorId,
        date: todayAt(c.time),
        service: c.service,
        motive: c.motive,
        status: c.status
      }
    })
  }
}

// Inventaire de lits proportionné au volume de ce jeu de démo (16 hospitalisations) plutôt
// qu'un chiffre de façade type "280 lits" sans rapport avec les données réellement seedées —
// voir HospitalizationPage.tsx pour l'occupation calculée dynamiquement à partir de cette table.
interface BedSeed {
  room: string
  label: string
  service: string
  status?: 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE'
}

const BEDS_SEED: BedSeed[] = [
  { room: '203', label: 'Lit 1', service: 'Cardiologie' },
  { room: '203', label: 'Lit 2', service: 'Cardiologie' },
  { room: '204', label: 'Lit 1', service: 'Cardiologie' },
  { room: '204', label: 'Lit 2', service: 'Cardiologie' },
  { room: '205', label: 'Lit 1', service: 'Cardiologie' },
  { room: '205', label: 'Lit 2', service: 'Cardiologie', status: 'CLEANING' },
  { room: '110', label: 'Lit 1', service: 'Médecine interne' },
  { room: '112', label: 'Lit 1', service: 'Médecine interne' },
  { room: '112', label: 'Lit 2', service: 'Médecine interne' },
  { room: '305', label: 'Lit 1', service: 'Gynécologie' },
  { room: '305', label: 'Lit 2', service: 'Gynécologie' },
  { room: '306', label: 'Lit 1', service: 'Gynécologie' },
  { room: '307', label: 'Lit 1', service: 'Gynécologie' },
  { room: '401', label: 'Lit 1', service: 'Dermatologie' },
  { room: '401', label: 'Lit 2', service: 'Dermatologie' },
  { room: '501', label: 'Lit 1', service: 'Endocrinologie' },
  { room: '503', label: 'Lit 1', service: 'ORL' },
  { room: '601', label: 'Lit 1', service: 'Urologie' },
  { room: '602', label: 'Lit 1', service: 'Pneumologie' },
  { room: '602', label: 'Lit 2', service: 'Pneumologie', status: 'CLEANING' },
  { room: '701', label: 'Lit 1', service: 'Ophtalmologie' },
  { room: '302', label: 'Lit 1', service: 'Rhumatologie' },
  { room: '302', label: 'Lit 2', service: 'Rhumatologie', status: 'MAINTENANCE' },
  { room: '801', label: 'Lit 1', service: 'Psychiatrie' },
  { room: '801', label: 'Lit 2', service: 'Psychiatrie' }
]

async function seedBeds(): Promise<void> {
  for (const b of BEDS_SEED) {
    await prisma.bed.upsert({
      where: { room_label: { room: b.room, label: b.label } },
      update: {},
      create: { room: b.room, label: b.label, service: b.service, status: b.status ?? 'AVAILABLE' }
    })
  }
}

interface HospitalizationSeed {
  id: string
  patientId?: string
  patientName?: string
  patientCode?: string
  bedRoom?: string
  bedLabel?: string
  doctorId?: string
  daysAgo: number
  time: string
  service: string
  motive: string
  status: 'HOSPITALISE' | 'EN_ATTENTE' | 'SORTI'
}

// Reprend features/hospitalization/mock-data.ts — les 3 patients "En attente" (h-6, h-10, h-12)
// n'ont volontairement pas de lit assigné : le mock leur en attribuait un par erreur alors que
// leur statut dit l'inverse (en attente d'affectation).
const HOSPITALIZATIONS_SEED: HospitalizationSeed[] = [
  { id: 'h-1', patientId: 'p-1245', bedRoom: '203', bedLabel: 'Lit 1', doctorId: 'emp-martin', daysAgo: 0, time: '08:30', service: 'Cardiologie', motive: 'Suivi HTA', status: 'HOSPITALISE' },
  { id: 'h-2', patientId: 'p-1982', bedRoom: '305', bedLabel: 'Lit 2', doctorId: 'emp-adjovi', daysAgo: 0, time: '10:15', service: 'Gynécologie', motive: 'Suivi grossesse', status: 'HOSPITALISE' },
  { id: 'h-3', patientId: 'p-1112', bedRoom: '110', bedLabel: 'Lit 1', doctorId: 'emp-mensah', daysAgo: 0, time: '09:45', service: 'Médecine interne', motive: 'Céphalées', status: 'HOSPITALISE' },
  { id: 'h-4', patientId: 'p-0766', bedRoom: '205', bedLabel: 'Lit 1', doctorId: 'emp-martin', daysAgo: 1, time: '15:20', service: 'Cardiologie', motive: 'Douleur thoracique', status: 'HOSPITALISE' },
  { id: 'h-5', patientId: 'p-0556', bedRoom: '401', bedLabel: 'Lit 1', doctorId: 'emp-houngbo', daysAgo: 1, time: '11:10', service: 'Dermatologie', motive: 'Acné sévère', status: 'HOSPITALISE' },
  { id: 'h-6', patientId: 'p-1045', doctorId: 'emp-adjovi', daysAgo: 0, time: '16:40', service: 'Gynécologie', motive: 'Suivi grossesse', status: 'EN_ATTENTE' },
  { id: 'h-7', patientId: 'p-0983', bedRoom: '112', bedLabel: 'Lit 2', doctorId: 'emp-mensah', daysAgo: 0, time: '13:25', service: 'Médecine interne', motive: 'Contrôle régulier', status: 'HOSPITALISE' },
  { id: 'h-8', patientId: 'p-1667', bedRoom: '501', bedLabel: 'Lit 1', doctorId: 'emp-dossou', daysAgo: 2, time: '14:00', service: 'Endocrinologie', motive: 'Diabète', status: 'HOSPITALISE' },
  { id: 'h-9', patientId: 'p-1333', bedRoom: '602', bedLabel: 'Lit 1', doctorId: 'emp-agbodan', daysAgo: 1, time: '17:30', service: 'Pneumologie', motive: 'Toux persistante', status: 'HOSPITALISE' },
  { id: 'h-10', patientId: 'p-1721', doctorId: 'emp-yao', daysAgo: 2, time: '09:10', service: 'Ophtalmologie', motive: "Baisse d'acuité visuelle", status: 'EN_ATTENTE' },
  { id: 'h-11', patientName: 'Alakouté Sébastien', patientCode: 'PAT-2025-001086', bedRoom: '302', bedLabel: 'Lit 1', doctorId: 'emp-fiadjoe', daysAgo: 1, time: '12:50', service: 'Rhumatologie', motive: 'Douleur articulaire', status: 'HOSPITALISE' },
  { id: 'h-12', patientName: 'Hounkpé Josiane', patientCode: 'PAT-2025-001904', doctorId: 'emp-adjovi', daysAgo: 0, time: '18:20', service: 'Gynécologie', motive: 'Contrôle post-natal', status: 'EN_ATTENTE' },
  { id: 'h-13', patientName: 'Soglo Raymond', patientCode: 'PAT-2025-000754', bedRoom: '204', bedLabel: 'Lit 2', doctorId: 'emp-martin', daysAgo: 3, time: '10:30', service: 'Cardiologie', motive: 'Essoufflement', status: 'HOSPITALISE' },
  { id: 'h-14', patientName: 'Ahouandjino C.', patientCode: 'PAT-2025-000632', bedRoom: '503', bedLabel: 'Lit 1', doctorId: 'emp-gbetoe', daysAgo: 2, time: '16:40', service: 'ORL', motive: 'Otite', status: 'HOSPITALISE' },
  { id: 'h-15', patientName: 'Kpadonou Isidore', patientCode: 'PAT-2025-001276', bedRoom: '601', bedLabel: 'Lit 1', doctorId: 'emp-hounsou', daysAgo: 3, time: '13:40', service: 'Urologie', motive: 'Douleur lombaire', status: 'HOSPITALISE' },
  { id: 'h-16', patientName: "N'Guessan Mireille", patientCode: 'PAT-2025-000845', bedRoom: '801', bedLabel: 'Lit 1', doctorId: 'emp-loko', daysAgo: 2, time: '08:20', service: 'Psychiatrie', motive: 'Anxiété', status: 'HOSPITALISE' }
]

function daysAgoAt(daysAgo: number, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function seedHospitalizations(): Promise<void> {
  const existing = await prisma.hospitalization.count()
  if (existing > 0) return

  for (const h of HOSPITALIZATIONS_SEED) {
    let bedId: string | undefined
    if (h.bedRoom && h.bedLabel) {
      const bed = await prisma.bed.findUnique({ where: { room_label: { room: h.bedRoom, label: h.bedLabel } } })
      bedId = bed?.id
    }

    await prisma.hospitalization.create({
      data: {
        id: h.id,
        patientId: h.patientId,
        patientName: h.patientName,
        patientCode: h.patientCode,
        bedId,
        doctorId: h.doctorId,
        admissionDate: daysAgoAt(h.daysAgo, h.time),
        service: h.service,
        motive: h.motive,
        status: h.status
      }
    })
  }
}

interface EmergencySeed {
  id: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: 'M' | 'F'
  doctorId?: string
  durationMin: number
  motive: string
  detail?: string
  severity: 'CRITIQUE' | 'ELEVE' | 'MOYEN' | 'FAIBLE'
  zone: string
  status: 'EN_COURS' | 'EN_OBSERVATION' | 'EN_ATTENTE_TRIAGE'
}

// Reprend features/emergencies/mock-data.ts. L'heure d'arrivée est dérivée de la durée du
// passage indiquée dans le mock (arrivalTime = maintenant - durée) plutôt qu'une heure d'horloge
// fixe, pour que les visites restent cohérentes quelle que soit l'heure où le seed est exécuté.
const EMERGENCIES_SEED: EmergencySeed[] = [
  { id: 'e-1', patientId: 'p-1245', doctorId: 'emp-martin', durationMin: 75, motive: 'Douleur thoracique', detail: 'Oppression', severity: 'CRITIQUE', zone: 'Salle de réanimation · Lit 02', status: 'EN_COURS' },
  { id: 'e-2', patientId: 'p-1982', doctorId: 'emp-adjovi', durationMin: 58, motive: 'Fièvre élevée', detail: 'Céphalées', severity: 'ELEVE', zone: 'Box 3', status: 'EN_COURS' },
  { id: 'e-3', patientId: 'p-1112', doctorId: 'emp-mensah', durationMin: 65, motive: 'Traumatisme', detail: 'Accident de moto', severity: 'ELEVE', zone: 'Salle de soins 1 · Lit 01', status: 'EN_COURS' },
  { id: 'e-4', patientId: 'p-0766', doctorId: 'emp-martin', durationMin: 45, motive: 'Dyspnée', detail: 'Essoufflement', severity: 'MOYEN', zone: 'Box 5', status: 'EN_COURS' },
  { id: 'e-5', patientId: 'p-0556', doctorId: 'emp-houngbo', durationMin: 30, motive: 'Douleur faciale aiguë', detail: 'Abcès dentaire', severity: 'FAIBLE', zone: 'Box 8', status: 'EN_COURS' },
  { id: 'e-6', patientId: 'p-1045', doctorId: 'emp-adjovi', durationMin: 80, motive: 'Saignement vaginal', detail: 'Grossesse', severity: 'ELEVE', zone: 'Salle gynéco · Lit 01', status: 'EN_COURS' },
  { id: 'e-7', patientId: 'p-0983', doctorId: 'emp-mensah', durationMin: 130, motive: 'Hypertension sévère', detail: 'Céphalées', severity: 'MOYEN', zone: 'Box 2', status: 'EN_OBSERVATION' },
  { id: 'e-8', patientId: 'p-1667', doctorId: 'emp-dossou', durationMin: 90, motive: 'Diabète déséquilibré', detail: 'Fatigue', severity: 'MOYEN', zone: 'Box 6', status: 'EN_OBSERVATION' },
  { id: 'e-9', patientId: 'p-1333', doctorId: 'emp-agbodan', durationMin: 25, motive: 'Douleur abdominale', detail: 'Nausées', severity: 'FAIBLE', zone: 'Box 9', status: 'EN_ATTENTE_TRIAGE' },
  { id: 'e-10', patientId: 'p-1721', doctorId: 'emp-fiadjoe', durationMin: 18, motive: 'Conjonctivite', detail: 'Yeux rouges', severity: 'FAIBLE', zone: 'Box 10', status: 'EN_ATTENTE_TRIAGE' },
  { id: 'e-11', patientName: 'Alakouté Sébastien', patientCode: 'PAT-2025-001086', patientAge: 55, patientGender: 'M', doctorId: 'emp-fiadjoe', durationMin: 15, motive: 'Arthrose', detail: 'Douleur articulaire', severity: 'FAIBLE', zone: 'Box 11', status: 'EN_ATTENTE_TRIAGE' },
  { id: 'e-12', patientName: 'Hounkpe Josiane', patientCode: 'PAT-2025-001904', patientAge: 27, patientGender: 'F', doctorId: 'emp-adjovi', durationMin: 125, motive: 'Contrôle post-opératoire', detail: 'Césarienne', severity: 'MOYEN', zone: 'Box 4', status: 'EN_OBSERVATION' }
]

interface DischargeSeed {
  id: string
  patientName: string
  outcome: string
  status: 'SORTI' | 'TRANSFERE'
  dischargedMinAgo: number
}

const DISCHARGES_SEED: DischargeSeed[] = [
  { id: 'e-d1', patientName: 'Sogo Raymond', outcome: 'Amélioré', status: 'SORTI', dischargedMinAgo: 90 },
  { id: 'e-d2', patientName: "N'Guessan Mireille", outcome: 'Transféré', status: 'TRANSFERE', dischargedMinAgo: 75 },
  { id: 'e-d3', patientName: 'Kpadonou Isidore', outcome: 'Amélioré', status: 'SORTI', dischargedMinAgo: 60 },
  { id: 'e-d4', patientName: 'Ahouandjinou C.', outcome: 'Sorti', status: 'SORTI', dischargedMinAgo: 45 },
  { id: 'e-d5', patientName: 'Yérey Romani', outcome: 'Sorti', status: 'SORTI', dischargedMinAgo: 30 }
]

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60000)
}

async function seedEmergencyVisits(): Promise<void> {
  const existing = await prisma.emergencyVisit.count()
  if (existing > 0) return

  for (const e of EMERGENCIES_SEED) {
    await prisma.emergencyVisit.create({
      data: {
        id: e.id,
        patientId: e.patientId,
        patientName: e.patientName,
        patientCode: e.patientCode,
        patientAge: e.patientAge,
        patientGender: e.patientGender,
        doctorId: e.doctorId,
        arrivalTime: minutesAgo(e.durationMin),
        motive: e.motive,
        detail: e.detail,
        severity: e.severity,
        zone: e.zone,
        status: e.status
      }
    })
  }

  for (const d of DISCHARGES_SEED) {
    const dischargeTime = minutesAgo(d.dischargedMinAgo)
    await prisma.emergencyVisit.create({
      data: {
        id: d.id,
        patientName: d.patientName,
        arrivalTime: new Date(dischargeTime.getTime() - 50 * 60000),
        dischargeTime,
        severity: 'FAIBLE',
        status: d.status,
        outcome: d.outcome
      }
    })
  }
}

const OPERATING_ROOMS_SEED: { name: string; status?: 'AVAILABLE' | 'MAINTENANCE' }[] = [
  { name: 'Salle 1' },
  { name: 'Salle 2' },
  { name: 'Salle 3' },
  { name: 'Salle 4' },
  { name: 'Salle 5', status: 'MAINTENANCE' }
]

async function seedOperatingRooms(): Promise<void> {
  for (const r of OPERATING_ROOMS_SEED) {
    await prisma.operatingRoom.upsert({
      where: { name: r.name },
      update: {},
      create: { name: r.name, status: r.status ?? 'AVAILABLE' }
    })
  }
}

interface SurgerySeed {
  id: string
  patientId: string
  surgeonId: string
  anesthetistId: string
  roomName: string
  time: string
  procedure: string
  procedureDetail?: string
  specialty: string
  status: 'TERMINEE' | 'EN_COURS' | 'EN_ATTENTE' | 'ANNULEE'
  expectedDurationMin: number
}

// Reprend features/operating-room/mock-data.ts — les 10 patients canoniques couvrent déjà tout
// le jeu (aucun walk-in ici, contrairement aux autres domaines).
const SURGERIES_SEED: SurgerySeed[] = [
  { id: 's-1', patientId: 'p-1245', surgeonId: 'emp-martin', anesthetistId: 'emp-tchibozo', roomName: 'Salle 1', time: '08:00', procedure: 'Hernie inguinale', procedureDetail: 'Hernioplastie', specialty: 'Chirurgie générale', status: 'TERMINEE', expectedDurationMin: 90 },
  { id: 's-2', patientId: 'p-1982', surgeonId: 'emp-adjovi', anesthetistId: 'emp-ametepe', roomName: 'Salle 2', time: '08:30', procedure: 'Césarienne', specialty: 'Gynécologie', status: 'EN_COURS', expectedDurationMin: 60 },
  { id: 's-3', patientId: 'p-1112', surgeonId: 'emp-mensah', anesthetistId: 'emp-lawson', roomName: 'Salle 3', time: '09:00', procedure: 'Appendicectomie', procedureDetail: 'Laparoscopique', specialty: 'Chirurgie générale', status: 'EN_COURS', expectedDurationMin: 75 },
  { id: 's-4', patientId: 'p-0766', surgeonId: 'emp-martin', anesthetistId: 'emp-tchibozo', roomName: 'Salle 1', time: '09:30', procedure: 'Cholécystectomie', procedureDetail: 'Laparoscopique', specialty: 'Chirurgie générale', status: 'EN_ATTENTE', expectedDurationMin: 90 },
  { id: 's-5', patientId: 'p-0556', surgeonId: 'emp-houngbo', anesthetistId: 'emp-ametepe', roomName: 'Salle 2', time: '10:00', procedure: 'Varicocèle', procedureDetail: 'Ligature', specialty: 'Urologie', status: 'EN_ATTENTE', expectedDurationMin: 45 },
  { id: 's-6', patientId: 'p-1045', surgeonId: 'emp-adjovi', anesthetistId: 'emp-lawson', roomName: 'Salle 3', time: '10:30', procedure: 'Myomectomie', procedureDetail: 'Laparoscopique', specialty: 'Gynécologie', status: 'EN_COURS', expectedDurationMin: 120 },
  { id: 's-7', patientId: 'p-0983', surgeonId: 'emp-mensah', anesthetistId: 'emp-tchibozo', roomName: 'Salle 1', time: '11:00', procedure: 'Prostatectomie', procedureDetail: 'TURP', specialty: 'Urologie', status: 'TERMINEE', expectedDurationMin: 80 },
  { id: 's-8', patientId: 'p-1667', surgeonId: 'emp-adjovi', anesthetistId: 'emp-ametepe', roomName: 'Salle 2', time: '11:30', procedure: 'Remplacement prothèse de genou', specialty: 'Orthopédie', status: 'EN_COURS', expectedDurationMin: 150 },
  { id: 's-9', patientId: 'p-1333', surgeonId: 'emp-agbodan', anesthetistId: 'emp-lawson', roomName: 'Salle 3', time: '12:00', procedure: 'Laminectomie', procedureDetail: 'Lombaire', specialty: 'Orthopédie', status: 'EN_ATTENTE', expectedDurationMin: 135 },
  { id: 's-10', patientId: 'p-1721', surgeonId: 'emp-adjovi', anesthetistId: 'emp-tchibozo', roomName: 'Salle 1', time: '12:30', procedure: 'Ablation kyste ovarien', procedureDetail: 'Laparoscopique', specialty: 'Gynécologie', status: 'EN_ATTENTE', expectedDurationMin: 60 }
]

function todayClockTime(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function seedSurgeries(): Promise<void> {
  const existing = await prisma.surgery.count()
  if (existing > 0) return

  const rooms = await prisma.operatingRoom.findMany()
  const roomIdByName = new Map(rooms.map((r) => [r.name, r.id]))

  for (const s of SURGERIES_SEED) {
    await prisma.surgery.create({
      data: {
        id: s.id,
        patientId: s.patientId,
        surgeonId: s.surgeonId,
        anesthetistId: s.anesthetistId,
        roomId: roomIdByName.get(s.roomName),
        scheduledAt: todayClockTime(s.time),
        procedure: s.procedure,
        procedureDetail: s.procedureDetail,
        specialty: s.specialty,
        status: s.status,
        expectedDurationMin: s.expectedDurationMin
      }
    })
  }
}

interface LabRequestSeed {
  id: string
  requestNumber: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: 'M' | 'F'
  time: string
  service: string
  analysisType: string
  status: 'RESULTAT_VALIDE' | 'EN_COURS' | 'EN_ATTENTE_PRELEVEMENT' | 'ANNULEE'
  priority: 'NORMALE' | 'ELEVEE' | 'CRITIQUE'
  sample: string
  technicianId: string
}

// Reprend features/laboratory/mock-data.ts, placé sur la vraie journée courante.
const LAB_REQUESTS_SEED: LabRequestSeed[] = [
  { id: 'l-1', requestNumber: 'LAB-2025-00568', patientId: 'p-1245', time: '08:45', service: 'Cardiologie', analysisType: 'NFS + CRP', status: 'RESULTAT_VALIDE', priority: 'NORMALE', sample: 'Sang (EDTA)', technicianId: 'emp-tech-mensah-a' },
  { id: 'l-2', requestNumber: 'LAB-2025-00567', patientId: 'p-1982', time: '08:30', service: 'Gynécologie', analysisType: 'Bilan prénatal', status: 'EN_COURS', priority: 'NORMALE', sample: 'Sang (EDTA)', technicianId: 'emp-tech-lawson-e' },
  { id: 'l-3', requestNumber: 'LAB-2025-00566', patientId: 'p-1112', time: '08:15', service: 'Médecine interne', analysisType: 'Ionogramme sanguin', status: 'RESULTAT_VALIDE', priority: 'NORMALE', sample: 'Sang (Héparine)', technicianId: 'emp-tech-amegan-k' },
  { id: 'l-4', requestNumber: 'LAB-2025-00565', patientId: 'p-0766', time: '08:05', service: 'Cardiologie', analysisType: 'Troponine I', status: 'EN_COURS', priority: 'ELEVEE', sample: 'Sang (Sérum)', technicianId: 'emp-tech-mensah-a' },
  { id: 'l-5', requestNumber: 'LAB-2025-00564', patientId: 'p-0556', time: '07:55', service: 'Dermatologie', analysisType: 'Sérologie VIH', status: 'EN_ATTENTE_PRELEVEMENT', priority: 'NORMALE', sample: 'Sang (Sec)', technicianId: 'emp-tech-tchibozo-m' },
  { id: 'l-6', requestNumber: 'LAB-2025-00563', patientId: 'p-1045', time: '07:45', service: 'Gynécologie', analysisType: 'Glycémie à jeun', status: 'RESULTAT_VALIDE', priority: 'NORMALE', sample: 'Sang (Fluorure)', technicianId: 'emp-tech-lawson-e' },
  { id: 'l-7', requestNumber: 'LAB-2025-00562', patientId: 'p-0983', time: '07:30', service: 'Médecine interne', analysisType: 'VS', status: 'RESULTAT_VALIDE', priority: 'NORMALE', sample: 'Sang (EDTA)', technicianId: 'emp-tech-amegan-k' },
  { id: 'l-8', requestNumber: 'LAB-2025-00561', patientId: 'p-1667', time: '07:20', service: 'Endocrinologie', analysisType: 'TSH Ultrasensible', status: 'EN_COURS', priority: 'NORMALE', sample: 'Sang (Sérum)', technicianId: 'emp-tech-mensah-a' },
  { id: 'l-9', requestNumber: 'LAB-2025-00560', patientId: 'p-1333', time: '07:10', service: 'Pneumologie', analysisType: 'Gaz du sang', status: 'EN_ATTENTE_PRELEVEMENT', priority: 'CRITIQUE', sample: 'Sang (Héparine)', technicianId: 'emp-tech-tchibozo-m' },
  { id: 'l-10', requestNumber: 'LAB-2025-00559', patientId: 'p-1721', time: '07:00', service: 'Ophtalmologie', analysisType: 'Sérologie Toxo', status: 'RESULTAT_VALIDE', priority: 'NORMALE', sample: 'Sang (Sec)', technicianId: 'emp-tech-lawson-e' },
  { id: 'l-11', requestNumber: 'LAB-2025-00558', patientName: 'Alakouté Sébastien', patientCode: 'PAT-2025-001086', patientAge: 55, patientGender: 'M', time: '06:50', service: 'Rhumatologie', analysisType: 'Facteur rhumatoïde', status: 'EN_COURS', priority: 'NORMALE', sample: 'Sang (Sérum)', technicianId: 'emp-tech-amegan-k' },
  { id: 'l-12', requestNumber: 'LAB-2025-00557', patientName: 'Hounkpe Josiane', patientCode: 'PAT-2025-001904', patientAge: 27, patientGender: 'F', time: '06:40', service: 'Gynécologie', analysisType: 'HCG Quantitatif', status: 'RESULTAT_VALIDE', priority: 'ELEVEE', sample: 'Sang (Sérum)', technicianId: 'emp-tech-mensah-a' }
]

const TURNAROUND_MIN_BY_PRIORITY: Record<LabRequestSeed['priority'], number> = { CRITIQUE: 58, ELEVEE: 105, NORMALE: 195 }

function todayClockTimeLab(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function seedLabRequests(): Promise<void> {
  const existing = await prisma.labRequest.count()
  if (existing > 0) return

  for (const r of LAB_REQUESTS_SEED) {
    const requestedAt = todayClockTimeLab(r.time)
    const resultAt =
      r.status === 'RESULTAT_VALIDE' ? new Date(requestedAt.getTime() + TURNAROUND_MIN_BY_PRIORITY[r.priority] * 60000) : undefined

    await prisma.labRequest.create({
      data: {
        id: r.id,
        requestNumber: r.requestNumber,
        patientId: r.patientId,
        patientName: r.patientName,
        patientCode: r.patientCode,
        patientAge: r.patientAge,
        patientGender: r.patientGender,
        requestedAt,
        resultAt,
        service: r.service,
        analysisType: r.analysisType,
        status: r.status,
        priority: r.priority,
        sample: r.sample,
        technicianId: r.technicianId
      }
    })
  }
}

interface ImagingRequestSeed {
  id: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: 'M' | 'F'
  time: string
  examType: string
  region: string
  service: string
  doctorId: string
  status: 'RESULTAT_VALIDE' | 'EN_COURS' | 'EN_ATTENTE_LECTURE' | 'ANNULE'
  priority: 'NORMAL' | 'URGENT'
  expectedDurationMin: number
}

// Reprend features/imaging/mock-data.ts, placé sur la vraie journée courante.
const IMAGING_REQUESTS_SEED: ImagingRequestSeed[] = [
  { id: 'im-1', patientId: 'p-1245', time: '08:30', examType: 'TDM', region: 'Thorax', service: 'Pneumologie', doctorId: 'emp-martin', status: 'EN_COURS', priority: 'NORMAL', expectedDurationMin: 90 },
  { id: 'im-2', patientId: 'p-1982', time: '08:15', examType: 'Échographie', region: 'Abdomen', service: 'Gynécologie', doctorId: 'emp-adjovi', status: 'EN_ATTENTE_LECTURE', priority: 'NORMAL', expectedDurationMin: 120 },
  { id: 'im-3', patientId: 'p-1112', time: '08:00', examType: 'Radiographie', region: 'Thorax', service: 'Médecine interne', doctorId: 'emp-mensah', status: 'RESULTAT_VALIDE', priority: 'NORMAL', expectedDurationMin: 60 },
  { id: 'im-4', patientId: 'p-0766', time: '07:45', examType: 'IRM', region: 'Cérébrale', service: 'Neurologie', doctorId: 'emp-agbodan', status: 'EN_ATTENTE_LECTURE', priority: 'URGENT', expectedDurationMin: 180 },
  { id: 'im-5', patientId: 'p-0556', time: '07:30', examType: 'Échographie', region: 'Obstétricale', service: 'Gynécologie', doctorId: 'emp-adjovi', status: 'RESULTAT_VALIDE', priority: 'NORMAL', expectedDurationMin: 45 },
  { id: 'im-6', patientId: 'p-1045', time: '07:20', examType: 'Mammographie', region: 'Seins', service: 'Imagerie', doctorId: 'emp-tchibozo', status: 'EN_ATTENTE_LECTURE', priority: 'NORMAL', expectedDurationMin: 150 },
  { id: 'im-7', patientId: 'p-0983', time: '07:10', examType: 'TDM / Scanner', region: 'Abdomen', service: 'Chirurgie générale', doctorId: 'emp-mensah', status: 'EN_COURS', priority: 'URGENT', expectedDurationMin: 75 },
  { id: 'im-8', patientId: 'p-1667', time: '07:00', examType: 'Radiographie', region: 'Genou', service: 'Rhumatologie', doctorId: 'emp-fiadjoe', status: 'RESULTAT_VALIDE', priority: 'NORMAL', expectedDurationMin: 30 },
  { id: 'im-9', patientId: 'p-1333', time: '06:45', examType: 'IRM', region: 'Rachis lombaire', service: 'Neurochirurgie', doctorId: 'emp-agbodan', status: 'EN_ATTENTE_LECTURE', priority: 'URGENT', expectedDurationMin: 210 },
  { id: 'im-10', patientId: 'p-1721', time: '06:30', examType: 'Échographie', region: 'Thyroïde', service: 'Endocrinologie', doctorId: 'emp-fiadjoe', status: 'RESULTAT_VALIDE', priority: 'NORMAL', expectedDurationMin: 60 },
  { id: 'im-11', patientName: 'Alakouté Sébastien', patientCode: 'PAT-2025-001086', patientAge: 55, patientGender: 'M', time: '06:15', examType: 'TDM', region: 'Sinus', service: 'ORL', doctorId: 'emp-gbetoe', status: 'RESULTAT_VALIDE', priority: 'NORMAL', expectedDurationMin: 80 },
  { id: 'im-12', patientName: 'Hounkpe Josiane', patientCode: 'PAT-2025-001904', patientAge: 27, patientGender: 'F', time: '06:05', examType: 'Échographie', region: 'Abdomen', service: 'Médecine interne', doctorId: 'emp-martin', status: 'EN_COURS', priority: 'NORMAL', expectedDurationMin: 70 }
]

// Délai réel (minutes) utilisé pour calculer resultAt des examens validés, par modalité —
// reprend les ordres de grandeur de DELAY_BY_MODALITY dans le mock.
const ACTUAL_TURNAROUND_MIN: Record<string, number> = {
  IRM: 205,
  'TDM / Scanner': 130,
  TDM: 130,
  Échographie: 65,
  Radiographie: 35,
  Mammographie: 40
}

function todayClockTimeImaging(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function seedImagingRequests(): Promise<void> {
  const existing = await prisma.imagingRequest.count()
  if (existing > 0) return

  for (const r of IMAGING_REQUESTS_SEED) {
    const requestedAt = todayClockTimeImaging(r.time)
    const resultAt =
      r.status === 'RESULTAT_VALIDE'
        ? new Date(requestedAt.getTime() + (ACTUAL_TURNAROUND_MIN[r.examType] ?? 60) * 60000)
        : undefined

    await prisma.imagingRequest.create({
      data: {
        id: r.id,
        patientId: r.patientId,
        patientName: r.patientName,
        patientCode: r.patientCode,
        patientAge: r.patientAge,
        patientGender: r.patientGender,
        requestedAt,
        resultAt,
        examType: r.examType,
        region: r.region,
        service: r.service,
        doctorId: r.doctorId,
        status: r.status,
        priority: r.priority,
        expectedDurationMin: r.expectedDurationMin
      }
    })
  }
}

interface CardioExamSeed {
  id: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: 'M' | 'F'
  time: string
  examType: string
  indication: string
  doctorId: string
  status: 'RESULTAT_VALIDE' | 'EN_COURS' | 'EN_ATTENTE' | 'PROGRAMME' | 'ANNULE'
  priority: 'NORMALE' | 'URGENT'
  expectedDurationMin: number
  room: string
  actualMin?: number
}

// Reprend features/cardiology/mock-data.ts, placé sur la vraie journée courante.
const CARDIO_EXAMS_SEED: CardioExamSeed[] = [
  { id: 'c-1', patientId: 'p-1245', time: '08:30', examType: 'ECG', indication: 'Douleurs thoraciques', doctorId: 'emp-martin', status: 'RESULTAT_VALIDE', priority: 'NORMALE', expectedDurationMin: 30, room: 'Salle ECG 1', actualMin: 25 },
  { id: 'c-2', patientId: 'p-1982', time: '08:45', examType: 'Échocardiographie', indication: 'Souffle cardiaque', doctorId: 'emp-adjovi', status: 'EN_COURS', priority: 'NORMALE', expectedDurationMin: 60, room: 'Echo 1' },
  { id: 'c-3', patientId: 'p-1112', time: '09:00', examType: 'Holter ECG 24h', indication: 'Palpitations', doctorId: 'emp-mensah', status: 'EN_ATTENTE', priority: 'NORMALE', expectedDurationMin: 120, room: 'Holter 2' },
  { id: 'c-4', patientId: 'p-0766', time: '09:15', examType: "Épreuve d'effort", indication: 'Bilan pré-opératoire', doctorId: 'emp-martin', status: 'EN_COURS', priority: 'URGENT', expectedDurationMin: 90, room: 'Salle Effort' },
  { id: 'c-5', patientId: 'p-0556', time: '09:30', examType: 'Écho doppler cardiaque', indication: 'Insuffisance cardiaque', doctorId: 'emp-houngbo', status: 'RESULTAT_VALIDE', priority: 'NORMALE', expectedDurationMin: 75, room: 'Echo 2', actualMin: 70 },
  { id: 'c-6', patientId: 'p-1045', time: '10:00', examType: 'MAPA 24h (TA)', indication: 'Hypertension', doctorId: 'emp-adjovi', status: 'EN_ATTENTE', priority: 'NORMALE', expectedDurationMin: 120, room: 'MAPA 1' },
  { id: 'c-7', patientId: 'p-0983', time: '10:00', examType: 'Coronarographie', indication: 'Douleurs angineuses', doctorId: 'emp-mensah', status: 'PROGRAMME', priority: 'URGENT', expectedDurationMin: 240, room: 'Salle Catho 1' },
  { id: 'c-8', patientId: 'p-1667', time: '10:15', examType: 'ECG + Consultation', indication: 'Suivi HTA', doctorId: 'emp-fiadjoe', status: 'RESULTAT_VALIDE', priority: 'NORMALE', expectedDurationMin: 30, room: 'Salle ECG 2', actualMin: 32 },
  { id: 'c-9', patientId: 'p-1333', time: '10:45', examType: 'Scanner coronaire', indication: 'Bilan ischémique', doctorId: 'emp-agbodan', status: 'EN_COURS', priority: 'URGENT', expectedDurationMin: 150, room: 'Scanner Cardio' },
  { id: 'c-10', patientId: 'p-1721', time: '10:30', examType: 'Écho cardiaque fœtale', indication: 'Grossesse (22 SA)', doctorId: 'emp-adjovi', status: 'EN_ATTENTE', priority: 'NORMALE', expectedDurationMin: 60, room: 'Echo 3' },
  { id: 'c-11', patientName: 'Alakouté Sébastien', patientCode: 'PAT-2025-001086', patientAge: 55, patientGender: 'M', time: '11:15', examType: 'Holter tensionnel', indication: 'HTA résistante', doctorId: 'emp-fiadjoe', status: 'PROGRAMME', priority: 'NORMALE', expectedDurationMin: 120, room: 'Holter TA 1' },
  { id: 'c-12', patientName: 'Hounkpe Josiane', patientCode: 'PAT-2025-001904', patientAge: 27, patientGender: 'F', time: '11:30', examType: 'Écho transœsophagienne', indication: 'Fibrillation auriculaire', doctorId: 'emp-martin', status: 'PROGRAMME', priority: 'URGENT', expectedDurationMin: 180, room: 'Salle Echo-TOE' }
]

function todayClockTimeCardio(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function seedCardioExams(): Promise<void> {
  const existing = await prisma.cardioExam.count()
  if (existing > 0) return

  for (const e of CARDIO_EXAMS_SEED) {
    const requestedAt = todayClockTimeCardio(e.time)
    const resultAt = e.status === 'RESULTAT_VALIDE' && e.actualMin ? new Date(requestedAt.getTime() + e.actualMin * 60000) : undefined

    await prisma.cardioExam.create({
      data: {
        id: e.id,
        patientId: e.patientId,
        patientName: e.patientName,
        patientCode: e.patientCode,
        patientAge: e.patientAge,
        patientGender: e.patientGender,
        requestedAt,
        resultAt,
        examType: e.examType,
        indication: e.indication,
        doctorId: e.doctorId,
        status: e.status,
        priority: e.priority,
        expectedDurationMin: e.expectedDurationMin,
        room: e.room
      }
    })
  }
}

interface PathologySeed {
  id: string
  patientId: string
  time: string
  sampleType: string
  location: string
  service: string
  doctorId: string
  status: 'RESULTAT_VALIDE' | 'EN_COURS' | 'EN_ATTENTE_PRELEVEMENT' | 'ANNULEE'
  priority: 'NORMALE' | 'URGENT'
  expectedDurationMin: number
  actualMin?: number
}

// Reprend features/pathology/mock-data.ts, placé sur la vraie journée courante.
const PATHOLOGY_SEED: PathologySeed[] = [
  { id: 'p-1', patientId: 'p-1245', time: '09:20', sampleType: 'Biopsie', location: 'Poumon', service: 'Pneumologie', doctorId: 'emp-martin', status: 'RESULTAT_VALIDE', priority: 'NORMALE', expectedDurationMin: 2880, actualMin: 2820 },
  { id: 'p-2', patientId: 'p-1982', time: '09:05', sampleType: 'Exérèse', location: 'Sein', service: 'Gynécologie', doctorId: 'emp-adjovi', status: 'EN_COURS', priority: 'NORMALE', expectedDurationMin: 4320 },
  { id: 'p-3', patientId: 'p-1112', time: '08:40', sampleType: 'Biopsie endoscopique', location: 'Estomac', service: 'Gastro-entérologie', doctorId: 'emp-mensah', status: 'EN_COURS', priority: 'URGENT', expectedDurationMin: 1440 },
  { id: 'p-4', patientId: 'p-0766', time: '08:30', sampleType: 'Pièce opératoire', location: 'Côlon', service: 'Chirurgie générale', doctorId: 'emp-tchibozo', status: 'EN_ATTENTE_PRELEVEMENT', priority: 'NORMALE', expectedDurationMin: 4320 },
  { id: 'p-5', patientId: 'p-0556', time: '08:15', sampleType: 'Ponction', location: 'Thyroïde', service: 'Endocrinologie', doctorId: 'emp-houngbo', status: 'RESULTAT_VALIDE', priority: 'NORMALE', expectedDurationMin: 2880, actualMin: 2760 },
  { id: 'p-6', patientId: 'p-1045', time: '07:55', sampleType: 'Curetage', location: 'Utérus', service: 'Gynécologie', doctorId: 'emp-adjovi', status: 'EN_COURS', priority: 'NORMALE', expectedDurationMin: 2880 },
  { id: 'p-7', patientId: 'p-0983', time: '07:40', sampleType: 'Biopsie cutanée', location: 'Peau', service: 'Dermatologie', doctorId: 'emp-agbodan', status: 'RESULTAT_VALIDE', priority: 'NORMALE', expectedDurationMin: 2880, actualMin: 2700 },
  { id: 'p-8', patientId: 'p-1667', time: '07:30', sampleType: 'Pièce opératoire', location: 'Vésicule biliaire', service: 'Chirurgie générale', doctorId: 'emp-mensah', status: 'EN_ATTENTE_PRELEVEMENT', priority: 'URGENT', expectedDurationMin: 1440 },
  { id: 'p-9', patientId: 'p-1333', time: '07:10', sampleType: 'Biopsie', location: 'Rein', service: 'Néphrologie', doctorId: 'emp-agbodan', status: 'EN_COURS', priority: 'NORMALE', expectedDurationMin: 4320 },
  { id: 'p-10', patientId: 'p-1721', time: '06:55', sampleType: "Ponction à l'aiguille fine", location: 'Ganglion', service: 'ORL', doctorId: 'emp-fiadjoe', status: 'RESULTAT_VALIDE', priority: 'NORMALE', expectedDurationMin: 2880, actualMin: 2650 }
]

function todayClockTimePathology(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function seedPathologyRequests(): Promise<void> {
  const existing = await prisma.pathologyRequest.count()
  if (existing > 0) return

  for (const r of PATHOLOGY_SEED) {
    const requestedAt = todayClockTimePathology(r.time)
    const resultAt = r.status === 'RESULTAT_VALIDE' && r.actualMin ? new Date(requestedAt.getTime() + r.actualMin * 60000) : undefined

    await prisma.pathologyRequest.create({
      data: {
        id: r.id,
        patientId: r.patientId,
        requestedAt,
        resultAt,
        sampleType: r.sampleType,
        location: r.location,
        service: r.service,
        doctorId: r.doctorId,
        status: r.status,
        priority: r.priority,
        expectedDurationMin: r.expectedDurationMin
      }
    })
  }
}

interface EndoscopySeed {
  id: string
  patientId: string
  time: string
  procedureType: string
  indication: string
  service: string
  endoscopistId: string
  status: 'REALISE' | 'EN_COURS' | 'EN_ATTENTE' | 'PROGRAMME' | 'ANNULE'
  priority: 'NORMALE' | 'URGENT'
  expectedDurationMin: number
  room: string
  actualMin?: number
}

// Reprend features/endoscopy/mock-data.ts, placé sur la vraie journée courante.
const ENDOSCOPY_SEED: EndoscopySeed[] = [
  { id: 'e-1', patientId: 'p-1245', time: '09:00', procedureType: 'Fibroscopie œsogastroduodénale', indication: 'Douleurs épigastriques', service: 'Gastro-entérologie', endoscopistId: 'emp-mensah', status: 'EN_COURS', priority: 'NORMALE', expectedDurationMin: 2880, room: 'Salle Endo 1 · Olympus EVIS X1' },
  { id: 'e-2', patientId: 'p-1982', time: '09:30', procedureType: 'Coloscopie', indication: 'Sang dans les selles', service: 'Médecine interne', endoscopistId: 'emp-adjovi', status: 'EN_ATTENTE', priority: 'NORMALE', expectedDurationMin: 2880, room: 'Salle Endo 1 · Olympus EVIS X1' },
  { id: 'e-3', patientId: 'p-1112', time: '10:00', procedureType: 'Fibroscopie bronchique', indication: 'Hémoptysie, exploration', service: 'Pneumologie', endoscopistId: 'emp-martin', status: 'PROGRAMME', priority: 'URGENT', expectedDurationMin: 1440, room: 'Salle Endo 3 · Pentax EB-19V' },
  { id: 'e-4', patientId: 'p-0766', time: '10:30', procedureType: 'CPRE (Canulation biliaire)', indication: 'Ictère obstructif', service: 'Chirurgie générale', endoscopistId: 'emp-tchibozo', status: 'REALISE', priority: 'URGENT', expectedDurationMin: 2160, room: 'Salle Endo 1 · Olympus TJF-Q190V', actualMin: 2100 },
  { id: 'e-5', patientId: 'p-0556', time: '11:00', procedureType: 'Rectosigmoïdoscopie', indication: 'Douleurs abdominales', service: 'Gynécologie', endoscopistId: 'emp-houngbo', status: 'EN_ATTENTE', priority: 'NORMALE', expectedDurationMin: 2880, room: 'Salle Endo 2 · Olympus EVIS X1' },
  { id: 'e-6', patientId: 'p-1045', time: '11:30', procedureType: 'Écho-endoscopie haute', indication: 'Nodule sous-muqueux', service: 'Gastro-entérologie', endoscopistId: 'emp-mensah', status: 'PROGRAMME', priority: 'NORMALE', expectedDurationMin: 4320, room: 'Salle Endo 3 · Pentax EUS' },
  { id: 'e-7', patientId: 'p-0983', time: '12:00', procedureType: 'Gastroscopie (contrôle varices)', indication: 'Cirrhose hépatique', service: 'Hépatologie', endoscopistId: 'emp-adjovi', status: 'REALISE', priority: 'URGENT', expectedDurationMin: 1440, room: 'Salle Endo 1 · Olympus EVIS X1', actualMin: 1380 },
  { id: 'e-8', patientId: 'p-1667', time: '14:00', procedureType: 'Coloscopie + Polypectomie', indication: 'Polypose colique', service: 'Gastro-entérologie', endoscopistId: 'emp-fiadjoe', status: 'PROGRAMME', priority: 'NORMALE', expectedDurationMin: 4320, room: 'Salle Endo 2 · Olympus EVIS X1' },
  { id: 'e-9', patientId: 'p-1333', time: '14:30', procedureType: 'Entéroscopie', indication: 'Anémie chronique', service: 'Hématologie', endoscopistId: 'emp-martin', status: 'EN_ATTENTE', priority: 'NORMALE', expectedDurationMin: 5760, room: 'Salle Endo 3 · Olympus EN-580T' },
  { id: 'e-10', patientId: 'p-1721', time: '15:00', procedureType: 'Fibroscopie naso-laryngée', indication: 'Dysphonie', service: 'ORL', endoscopistId: 'emp-agbodan', status: 'PROGRAMME', priority: 'NORMALE', expectedDurationMin: 2880, room: 'Salle Endo 4 · Pentax EB-15V' }
]

function todayClockTimeEndoscopy(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function seedEndoscopyProcedures(): Promise<void> {
  const existing = await prisma.endoscopyProcedure.count()
  if (existing > 0) return

  for (const p of ENDOSCOPY_SEED) {
    const requestedAt = todayClockTimeEndoscopy(p.time)
    const resultAt = p.status === 'REALISE' && p.actualMin ? new Date(requestedAt.getTime() + p.actualMin * 60000) : undefined

    await prisma.endoscopyProcedure.create({
      data: {
        id: p.id,
        patientId: p.patientId,
        requestedAt,
        resultAt,
        procedureType: p.procedureType,
        indication: p.indication,
        service: p.service,
        endoscopistId: p.endoscopistId,
        status: p.status,
        priority: p.priority,
        expectedDurationMin: p.expectedDurationMin,
        room: p.room
      }
    })
  }
}

// Reprend features/pharmacy/mock-data.ts (CRITICAL_STOCKS) — les dates d'expération ("28/06/2025"
// etc.) sont recalées par rapport à aujourd'hui pour rester crédibles quelle que soit la date
// d'exécution du seed, en gardant le nombre de jours relatif d'origine.
function daysFromNow(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(0, 0, 0, 0)
  return date
}

interface MedicationSeed {
  id: string
  name: string
  category: string
  location: string
  available: number
  minThreshold: number
  expiryInDays?: number
}

const MEDICATIONS_SEED: MedicationSeed[] = [
  { id: 'm-1', name: 'Ceftriaxone 1 g inj.', category: 'Antibiotiques', location: 'Pharmacie Centrale', available: 0, minThreshold: 50 },
  { id: 'm-2', name: 'Amoxicilline 500 mg', category: 'Antibiotiques', location: 'Pharmacie Centrale', available: 82, minThreshold: 100, expiryInDays: 38 },
  { id: 'm-3', name: 'Paracétamol 1 g', category: 'Analgésiques', location: 'Pharmacie Centrale', available: 428, minThreshold: 100, expiryInDays: 460 },
  { id: 'm-4', name: 'Diclofénac 75 mg inj.', category: 'Anti-inflammatoires', location: 'Pharmacie Centrale', available: 36, minThreshold: 80, expiryInDays: 55 },
  { id: 'm-5', name: 'Metformine 850 mg', category: 'Antidiabétiques', location: 'Dépôt Pédiatrie', available: 95, minThreshold: 150, expiryInDays: 81 }
]

async function seedMedications(): Promise<void> {
  for (const m of MEDICATIONS_SEED) {
    await prisma.medication.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        name: m.name,
        category: m.category,
        location: m.location,
        available: m.available,
        minThreshold: m.minThreshold,
        nearestExpiry: m.expiryInDays !== undefined ? daysFromNow(m.expiryInDays) : undefined
      }
    })
  }
}

// Reprend features/stocks/mock-data.ts (DEPOTS + DEPOT_ITEMS).
const DEPOTS_SEED = ['Dépôt Central', 'Dépôt Maintenance', 'Dépôt Hygiène', 'Dépôt Linge', 'Dépôt Cuisine']

interface DepotItemSeed {
  id: string
  name: string
  category: string
  depotName: string
  available: number
  minThreshold: number
  daysSinceMovement: number
}

const DEPOT_ITEMS_SEED: DepotItemSeed[] = [
  { id: 'i-1', name: 'Gants latex M (boîte 100)', category: 'Hygiène', depotName: 'Dépôt Central', available: 1200, minThreshold: 500, daysSinceMovement: 1 },
  { id: 'i-2', name: 'Compresses stériles 10x10', category: 'Hygiène', depotName: 'Dépôt Central', available: 340, minThreshold: 400, daysSinceMovement: 0 },
  { id: 'i-3', name: 'Draps housse blancs', category: 'Hôtellerie', depotName: 'Dépôt Linge', available: 85, minThreshold: 100, daysSinceMovement: 2 },
  { id: 'i-4', name: 'Détergent surface 5L', category: 'Entretien', depotName: 'Dépôt Hygiène', available: 0, minThreshold: 20, daysSinceMovement: 6 },
  { id: 'i-5', name: 'Désinfectant mains 500ml', category: 'Hygiène', depotName: 'Dépôt Central', available: 210, minThreshold: 150, daysSinceMovement: 0 },
  { id: 'i-6', name: 'Papier hygiénique (rouleau)', category: 'Hôtellerie', depotName: 'Dépôt Central', available: 620, minThreshold: 300, daysSinceMovement: 1 },
  { id: 'i-7', name: 'Masques chirurgicaux (boîte 50)', category: 'Hygiène', depotName: 'Dépôt Central', available: 45, minThreshold: 100, daysSinceMovement: 0 },
  { id: 'i-8', name: 'Ampoules LED 60W', category: 'Maintenance', depotName: 'Dépôt Maintenance', available: 18, minThreshold: 30, daysSinceMovement: 3 }
]

async function seedDepots(): Promise<void> {
  const depotIdByName = new Map<string, string>()
  for (const name of DEPOTS_SEED) {
    const depot = await prisma.depot.upsert({ where: { name }, update: {}, create: { name } })
    depotIdByName.set(name, depot.id)
  }

  for (const item of DEPOT_ITEMS_SEED) {
    const depotId = depotIdByName.get(item.depotName)
    if (!depotId) continue

    await prisma.depotItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        name: item.name,
        category: item.category,
        depotId,
        available: item.available,
        minThreshold: item.minThreshold,
        lastMovementAt: daysFromNow(-item.daysSinceMovement)
      }
    })
  }
}

interface ProcurementSeed {
  id: string
  reference: string
  daysAgo: number
  article: string
  category: string
  quantity: number
  priority: 'NORMALE' | 'URGENTE'
  status: 'A_VALIDER' | 'VALIDE' | 'COMMANDE' | 'RECU' | 'RETARD'
  requester: string
}

// Reprend features/procurement/mock-data.ts (MOCK_REQUESTS + SUPPLIERS) — les 3 premières
// lignes reprennent volontairement les mêmes articles que les stocks critiques de Pharmacie
// (Ceftriaxone, Amoxicilline, Diclofénac) pour illustrer le flux Pharmacie → Achats.
const PROCUREMENT_SEED: ProcurementSeed[] = [
  { id: 'pr-1', reference: 'BES-2025-0574', daysAgo: 0, article: 'Ceftriaxone 1 g inj.', category: 'Pharmacie', quantity: 500, priority: 'URGENTE', status: 'A_VALIDER', requester: 'Pharmacie Centrale' },
  { id: 'pr-2', reference: 'BES-2025-0573', daysAgo: 0, article: 'Amoxicilline 500 mg', category: 'Pharmacie', quantity: 300, priority: 'NORMALE', status: 'VALIDE', requester: 'Pharmacie Centrale' },
  { id: 'pr-3', reference: 'BES-2025-0572', daysAgo: 1, article: 'Diclofénac 75 mg inj.', category: 'Pharmacie', quantity: 200, priority: 'NORMALE', status: 'COMMANDE', requester: 'Pharmacie Centrale' },
  { id: 'pr-4', reference: 'BES-2025-0571', daysAgo: 1, article: 'Gants latex M (boîte 100)', category: 'Stocks généraux', quantity: 400, priority: 'NORMALE', status: 'COMMANDE', requester: 'Dépôt Central' },
  { id: 'pr-5', reference: 'BES-2025-0570', daysAgo: 2, article: 'Détergent surface 5L', category: 'Stocks généraux', quantity: 40, priority: 'URGENTE', status: 'RETARD', requester: 'Dépôt Hygiène' },
  { id: 'pr-6', reference: 'BES-2025-0569', daysAgo: 2, article: 'Réactifs biochimie', category: 'Laboratoire', quantity: 25, priority: 'URGENTE', status: 'A_VALIDER', requester: 'Laboratoire' },
  { id: 'pr-7', reference: 'BES-2025-0568', daysAgo: 3, article: 'Films radiographiques', category: 'Imagerie', quantity: 60, priority: 'NORMALE', status: 'RECU', requester: 'Imagerie médicale' },
  { id: 'pr-8', reference: 'BES-2025-0567', daysAgo: 3, article: "Valves d'endoscope", category: 'Endoscopie', quantity: 15, priority: 'NORMALE', status: 'RECU', requester: 'Endoscopie' },
  { id: 'pr-9', reference: 'BES-2025-0566', daysAgo: 4, article: 'Draps housse blancs', category: 'Hôtellerie', quantity: 150, priority: 'NORMALE', status: 'VALIDE', requester: 'Dépôt Linge' },
  { id: 'pr-10', reference: 'BES-2025-0565', daysAgo: 4, article: 'Ampoules LED 60W', category: 'Maintenance', quantity: 50, priority: 'NORMALE', status: 'COMMANDE', requester: 'Dépôt Maintenance' }
]

const SUPPLIERS_SEED = [
  { name: 'MediSarl SARL', orders: 42, onTimePercent: 94, quality: 96, rating: 5 },
  { name: 'PharmaPlus Bénin', orders: 38, onTimePercent: 91, quality: 93, rating: 4 },
  { name: 'Bétock Services', orders: 27, onTimePercent: 87, quality: 89, rating: 4 },
  { name: 'Sonipex SA', orders: 19, onTimePercent: 78, quality: 82, rating: 3 },
  { name: 'Ahmed Supplies', orders: 14, onTimePercent: 72, quality: 80, rating: 3 }
]

async function seedProcurement(): Promise<void> {
  for (const r of PROCUREMENT_SEED) {
    await prisma.procurementRequest.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        reference: r.reference,
        requestedAt: daysFromNow(-r.daysAgo),
        article: r.article,
        category: r.category,
        quantity: r.quantity,
        priority: r.priority,
        status: r.status,
        requester: r.requester
      }
    })
  }

  for (const s of SUPPLIERS_SEED) {
    await prisma.supplier.upsert({
      where: { name: s.name },
      update: {},
      create: s
    })
  }
}

interface BloodPouchSeed {
  id: string
  pouchNumber: string
  bloodGroup: string
  component: string
  volumeMl: number | null
  status: 'DISPONIBLE' | 'EN_ATTENTE_ANALYSE' | 'RESERVEE' | 'TRANSFUSEE' | 'PERIMEE'
  collectedDaysAgo: number
  expiryInDays: number
  donorName: string
  patientId: string | null
}

// Reprend features/blood-bank/mock-data.ts (MOCK_POUCHES) — dates recalées par rapport à
// aujourd'hui comme pour la Pharmacie, en gardant l'écart relatif collecte/expiration d'origine.
const BLOOD_POUCHES_SEED: BloodPouchSeed[] = [
  { id: 'bp-1', pouchNumber: 'PC-2025-00587', bloodGroup: 'O+', component: 'Concentré de globules rouges', volumeMl: 450, status: 'DISPONIBLE', collectedDaysAgo: 10, expiryInDays: 25, donorName: 'Koffi Brice', patientId: 'p-1245' },
  { id: 'bp-2', pouchNumber: 'PC-2025-00586', bloodGroup: 'A+', component: 'Plasma frais congelé', volumeMl: 250, status: 'DISPONIBLE', collectedDaysAgo: 10, expiryInDays: 300, donorName: 'Ahouré Léa', patientId: 'p-1982' },
  { id: 'bp-3', pouchNumber: 'PC-2025-00585', bloodGroup: 'B+', component: 'Plaquettes', volumeMl: null, status: 'EN_ATTENTE_ANALYSE', collectedDaysAgo: 2, expiryInDays: 3, donorName: 'Mensah Emmanuel', patientId: 'p-0766' },
  { id: 'bp-4', pouchNumber: 'PC-2025-00584', bloodGroup: 'O-', component: 'Concentré de globules rouges', volumeMl: 450, status: 'RESERVEE', collectedDaysAgo: 11, expiryInDays: 24, donorName: 'Adjobi Pascal', patientId: null },
  { id: 'bp-5', pouchNumber: 'PC-2025-00583', bloodGroup: 'AB+', component: 'Plasma thérapeutique', volumeMl: 250, status: 'DISPONIBLE', collectedDaysAgo: 11, expiryInDays: 300, donorName: 'Sélancé K. Irène', patientId: null },
  { id: 'bp-6', pouchNumber: 'PC-2025-00582', bloodGroup: 'A-', component: 'Concentré de globules rouges', volumeMl: 450, status: 'TRANSFUSEE', collectedDaysAgo: 11, expiryInDays: 24, donorName: 'Zinsou Aubin', patientId: null },
  { id: 'bp-7', pouchNumber: 'PC-2025-00581', bloodGroup: 'B-', component: 'Plasma frais congelé', volumeMl: 250, status: 'PERIMEE', collectedDaysAgo: 20, expiryInDays: -3, donorName: 'Hounkpè Josiane', patientId: null },
  { id: 'bp-8', pouchNumber: 'PC-2025-00580', bloodGroup: 'O+', component: 'Plaquettes', volumeMl: null, status: 'DISPONIBLE', collectedDaysAgo: 11, expiryInDays: 2, donorName: 'Dossou Germain', patientId: null }
]

async function seedBloodPouches(): Promise<void> {
  for (const p of BLOOD_POUCHES_SEED) {
    await prisma.bloodPouch.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        pouchNumber: p.pouchNumber,
        bloodGroup: p.bloodGroup,
        component: p.component,
        volumeMl: p.volumeMl,
        status: p.status,
        collectionDate: daysFromNow(-p.collectedDaysAgo),
        expiryDate: daysFromNow(p.expiryInDays),
        donorName: p.donorName,
        patientId: p.patientId
      }
    })
  }
}

interface FinanceTransactionSeed {
  id: string
  reference: string
  daysAgo: number
  type: 'RECETTE' | 'DEPENSE'
  party: string
  category: string
  amount: number
  status: 'PAYE' | 'EN_ATTENTE' | 'EN_RETARD'
  paymentMode: string
}

// Reprend features/finance/mock-data.ts (MOCK_TRANSACTIONS).
const FINANCE_TRANSACTIONS_SEED: FinanceTransactionSeed[] = [
  { id: 'ft-1', reference: 'REC-2025-0187', daysAgo: 0, type: 'RECETTE', party: 'Koffi Brice', category: 'Consultation', amount: 15000, status: 'PAYE', paymentMode: 'Espèces' },
  { id: 'ft-2', reference: 'FAC-2025-0204', daysAgo: 0, type: 'DEPENSE', party: 'MediSarl Pharma', category: 'Pharmacie', amount: 12450000, status: 'EN_ATTENTE', paymentMode: 'Virement' },
  { id: 'ft-3', reference: 'REC-2025-0186', daysAgo: 1, type: 'RECETTE', party: 'Ahouré Léa', category: 'Imagerie', amount: 25000, status: 'PAYE', paymentMode: 'Carte bancaire' },
  { id: 'ft-4', reference: 'FAC-2025-0203', daysAgo: 1, type: 'DEPENSE', party: 'PharmaPlus Bénin', category: 'Médicaments', amount: 8750000, status: 'PAYE', paymentMode: 'Virement' },
  { id: 'ft-5', reference: 'PAI-2025-0145', daysAgo: 2, type: 'RECETTE', party: 'CNSS', category: 'Assurances', amount: 3200000, status: 'PAYE', paymentMode: 'Virement' },
  { id: 'ft-6', reference: 'FAC-2025-0202', daysAgo: 2, type: 'DEPENSE', party: "Société d'énergie", category: 'Énergie', amount: 2150000, status: 'EN_ATTENTE', paymentMode: 'Prélèvement' },
  { id: 'ft-7', reference: 'FAC-2025-0201', daysAgo: 3, type: 'DEPENSE', party: 'Ahmed Supplies', category: 'Équipements', amount: 6500000, status: 'PAYE', paymentMode: 'Virement' },
  { id: 'ft-8', reference: 'FAC-2025-0198', daysAgo: 3, type: 'DEPENSE', party: 'Mensah Emmanuel', category: 'Hospitalisation', amount: 120000, status: 'EN_RETARD', paymentMode: 'Espèces' }
]

async function seedFinanceTransactions(): Promise<void> {
  for (const t of FINANCE_TRANSACTIONS_SEED) {
    await prisma.financeTransaction.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        reference: t.reference,
        occurredAt: daysFromNow(-t.daysAgo),
        type: t.type,
        party: t.party,
        category: t.category,
        amount: t.amount,
        status: t.status,
        paymentMode: t.paymentMode
      }
    })
  }
}

// Phase 5 — Gouvernance : modules conçus sans maquette source (voir demande utilisateur), les
// jeux de données reprennent tels quels les valeurs déjà écrites dans les mock-data.ts front
// (mêmes libellés, mêmes chiffres), avec des dates recalées en relatif par rapport à
// aujourd'hui. Les noms de médecins fictifs incohérents avec le roster ("Dr. Martin Adjovi",
// collage de deux prénoms du roster) sont corrigés vers le bon Employee, comme pour
// seedConsultations().

interface QualityIndicatorSeed {
  id: string
  name: string
  category: string
  currentValue: string
  target: string
  status: 'CONFORME' | 'A_SURVEILLER' | 'NON_CONFORME'
  daysAgo: number
}

const QUALITY_INDICATORS_SEED: QualityIndicatorSeed[] = [
  { id: 'qi-1', name: "Taux d'infections nosocomiales", category: 'Sécurité patient', currentValue: '1,2%', target: '< 1,5%', status: 'CONFORME', daysAgo: 6 },
  { id: 'qi-2', name: 'Délai moyen de prise en charge (urgences)', category: 'Processus clinique', currentValue: '36 min', target: '< 30 min', status: 'A_SURVEILLER', daysAgo: 1 },
  { id: 'qi-3', name: 'Taux de satisfaction patients', category: 'Satisfaction patient', currentValue: '88%', target: '> 85%', status: 'CONFORME', daysAgo: 11 },
  { id: 'qi-4', name: 'Taux de réadmission à 30 jours', category: 'Sécurité patient', currentValue: '6,8%', target: '< 6%', status: 'A_SURVEILLER', daysAgo: 3 },
  { id: 'qi-5', name: "Conformité à l'hygiène des mains", category: 'Hygiène', currentValue: '94%', target: '> 90%', status: 'CONFORME', daysAgo: 2 },
  { id: 'qi-6', name: 'Taux d’erreurs médicamenteuses', category: 'Sécurité patient', currentValue: '0,9%', target: '< 1%', status: 'CONFORME', daysAgo: 4 },
  { id: 'qi-7', name: 'Disponibilité des équipements critiques', category: 'Processus clinique', currentValue: '96%', target: '> 98%', status: 'NON_CONFORME', daysAgo: 0 },
  { id: 'qi-8', name: 'Respect des protocoles chirurgicaux', category: 'Processus clinique', currentValue: '99%', target: '> 97%', status: 'CONFORME', daysAgo: 1 }
]

interface QualityCertificationSeed {
  id: string
  name: string
  issuer: string
  expiryInDays: number
}

const QUALITY_CERTIFICATIONS_SEED: QualityCertificationSeed[] = [
  { id: 'qc-1', name: 'Accréditation HAS', issuer: 'Haute Autorité de Santé', expiryInDays: 650 },
  { id: 'qc-2', name: 'ISO 9001:2015', issuer: 'Bureau Veritas', expiryInDays: 450 },
  { id: 'qc-3', name: 'Label Hôpital Numérique', issuer: 'Ministère de la Santé', expiryInDays: 45 },
  { id: 'qc-4', name: 'ISO 15189 (Laboratoire)', issuer: 'COFRAC', expiryInDays: 300 },
  { id: 'qc-5', name: 'Charte Hygiène & Sécurité', issuer: 'Interne', expiryInDays: 20 }
]

const QUALITY_ACTIONS_SEED = [
  { id: 'qa-1', label: 'Réduction du délai de triage aux urgences', owner: 'Dr. Martin A.', progress: 65 },
  { id: 'qa-2', label: 'Renouvellement du parc de pousse-seringues', owner: 'Direction technique', progress: 40 },
  { id: 'qa-3', label: 'Campagne hygiène des mains — Service Pédiatrie', owner: 'Comité qualité', progress: 85 },
  { id: 'qa-4', label: 'Mise à jour du protocole de réanimation', owner: 'Dr. Lawson E.', progress: 20 }
]

async function seedQuality(): Promise<void> {
  for (const i of QUALITY_INDICATORS_SEED) {
    await prisma.qualityIndicator.upsert({
      where: { id: i.id },
      update: {},
      create: {
        id: i.id,
        name: i.name,
        category: i.category,
        currentValue: i.currentValue,
        target: i.target,
        status: i.status,
        lastMeasuredAt: daysFromNow(-i.daysAgo)
      }
    })
  }
  for (const c of QUALITY_CERTIFICATIONS_SEED) {
    await prisma.qualityCertification.upsert({
      where: { id: c.id },
      update: {},
      create: { id: c.id, name: c.name, issuer: c.issuer, expiryDate: daysFromNow(c.expiryInDays) }
    })
  }
  for (const a of QUALITY_ACTIONS_SEED) {
    await prisma.qualityAction.upsert({
      where: { id: a.id },
      update: {},
      create: { id: a.id, label: a.label, owner: a.owner, progress: a.progress }
    })
  }
}

interface RiskSeed {
  id: string
  title: string
  category: string
  probability: number
  impact: number
  status: 'OUVERT' | 'EN_TRAITEMENT' | 'CLOS'
  owner: string
  daysAgo: number
}

const RISKS_SEED: RiskSeed[] = [
  { id: 'rk-1', title: "Rupture de stock d'électrodes ECG", category: 'Approvisionnement', probability: 3, impact: 2, status: 'EN_TRAITEMENT', owner: 'Pharmacie', daysAgo: 11 },
  { id: 'rk-2', title: 'Panne prolongée du scanner', category: 'Équipement', probability: 2, impact: 4, status: 'OUVERT', owner: 'Imagerie médicale', daysAgo: 9 },
  { id: 'rk-3', title: 'Erreur de transfusion (groupe sanguin)', category: 'Sécurité patient', probability: 1, impact: 4, status: 'EN_TRAITEMENT', owner: 'Banque de sang', daysAgo: 13 },
  { id: 'rk-4', title: 'Surcharge du service des urgences', category: 'Organisation', probability: 4, impact: 3, status: 'OUVERT', owner: 'Dr. Martin A.', daysAgo: 3 },
  { id: 'rk-5', title: "Panne du système d'information hospitalier", category: 'Systèmes', probability: 2, impact: 4, status: 'OUVERT', owner: 'Direction technique', daysAgo: 6 },
  { id: 'rk-6', title: 'Non-respect du circuit du médicament', category: 'Sécurité patient', probability: 2, impact: 3, status: 'EN_TRAITEMENT', owner: 'Pharmacie', daysAgo: 7 },
  { id: 'rk-7', title: 'Incendie en zone de stockage', category: 'Sécurité des locaux', probability: 1, impact: 4, status: 'CLOS', owner: 'Maintenance', daysAgo: 49 },
  { id: 'rk-8', title: 'Retard répété des livraisons fournisseurs', category: 'Approvisionnement', probability: 3, impact: 2, status: 'OUVERT', owner: 'Approvisionnement', daysAgo: 2 }
]

async function seedRisks(): Promise<void> {
  for (const r of RISKS_SEED) {
    await prisma.risk.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        title: r.title,
        category: r.category,
        probability: r.probability,
        impact: r.impact,
        status: r.status,
        owner: r.owner,
        identifiedAt: daysFromNow(-r.daysAgo)
      }
    })
  }
}

interface AuditSeed {
  id: string
  title: string
  type: 'INTERNE' | 'EXTERNE'
  service: string
  status: 'PLANIFIE' | 'EN_COURS' | 'TERMINE'
  score: number | null
  scheduleOffsetDays: number
}

const AUDITS_SEED: AuditSeed[] = [
  { id: 'au-1', title: 'Audit hygiène — Bloc opératoire', type: 'INTERNE', service: 'Bloc opératoire', status: 'TERMINE', score: 94, scheduleOffsetDays: -6 },
  { id: 'au-2', title: 'Audit circuit du médicament', type: 'INTERNE', service: 'Pharmacie', status: 'TERMINE', score: 88, scheduleOffsetDays: -1 },
  { id: 'au-3', title: 'Audit de certification HAS', type: 'EXTERNE', service: 'Établissement', status: 'PLANIFIE', score: null, scheduleOffsetDays: 15 },
  { id: 'au-4', title: 'Audit traçabilité des poches de sang', type: 'INTERNE', service: 'Banque de sang', status: 'EN_COURS', score: null, scheduleOffsetDays: 0 },
  { id: 'au-5', title: 'Audit conformité RGPD / dossier patient', type: 'EXTERNE', service: "Systèmes d'information", status: 'PLANIFIE', score: null, scheduleOffsetDays: 8 },
  { id: 'au-6', title: 'Audit sécurité incendie', type: 'EXTERNE', service: 'Maintenance', status: 'TERMINE', score: 91, scheduleOffsetDays: -21 },
  { id: 'au-7', title: 'Audit qualité laboratoire (ISO 15189)', type: 'EXTERNE', service: 'Laboratoire', status: 'TERMINE', score: 96, scheduleOffsetDays: -11 }
]

const AUDIT_FINDINGS_SEED = [
  { id: 'af-1', auditId: 'au-1', category: 'Hygiène & sécurité', description: 'Non-conformité mineure sur le protocole de lavage des mains' },
  { id: 'af-2', auditId: 'au-1', category: 'Hygiène & sécurité', description: 'Traçabilité des dispositifs stériles à renforcer' },
  { id: 'af-3', auditId: 'au-2', category: 'Traçabilité', description: 'Traçabilité incomplète des lots de médicaments à risque' },
  { id: 'af-4', auditId: 'au-2', category: 'Documentation', description: 'Procédure de double-contrôle non actualisée' },
  { id: 'af-5', auditId: 'au-6', category: 'Documentation', description: 'Registre de sécurité incendie à mettre à jour' },
  { id: 'af-6', auditId: 'au-6', category: 'Traçabilité', description: 'Exercices d’évacuation non tous documentés' },
  { id: 'af-7', auditId: 'au-7', category: 'Documentation', description: 'Fiches de vie des équipements à compléter' },
  { id: 'af-8', auditId: 'au-7', category: "Systèmes d'information", description: 'Interface LIS-SIH à sécuriser' }
]

const COMPLIANCE_FRAMEWORKS_SEED = [
  { name: 'HAS (Certification V2024)', compliancePercent: 91 },
  { name: 'ISO 9001:2015', compliancePercent: 88 },
  { name: 'ISO 15189 (Laboratoire)', compliancePercent: 96 },
  { name: 'RGPD / Protection des données', compliancePercent: 82 }
]

async function seedAuditCompliance(): Promise<void> {
  for (const a of AUDITS_SEED) {
    await prisma.audit.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        title: a.title,
        type: a.type,
        service: a.service,
        status: a.status,
        score: a.score,
        scheduledAt: daysFromNow(a.scheduleOffsetDays)
      }
    })
  }
  for (const f of AUDIT_FINDINGS_SEED) {
    await prisma.auditFinding.upsert({
      where: { id: f.id },
      update: {},
      create: { id: f.id, auditId: f.auditId, category: f.category, description: f.description }
    })
  }
  for (const f of COMPLIANCE_FRAMEWORKS_SEED) {
    await prisma.complianceFramework.upsert({
      where: { name: f.name },
      update: {},
      create: f
    })
  }
}

interface ProtocolDocumentSeed {
  id: string
  title: string
  category: string
  version: string
  status: 'PUBLIE' | 'EN_VALIDATION' | 'A_REVISER'
  owner: string
  daysAgo: number
}

const PROTOCOL_DOCUMENTS_SEED: ProtocolDocumentSeed[] = [
  { id: 'pd-1', title: 'Protocole de prise en charge des urgences vitales', category: 'Protocoles cliniques', version: 'v3.2', status: 'PUBLIE', owner: 'Dr. Martin A.', daysAgo: 35 },
  { id: 'pd-2', title: 'Procédure de circuit du médicament', category: 'Procédures qualité', version: 'v2.0', status: 'EN_VALIDATION', owner: 'Pharmacie', daysAgo: 1 },
  { id: 'pd-3', title: "Protocole d'hygiène des mains", category: 'Hygiène & sécurité', version: 'v4.1', status: 'PUBLIE', owner: 'Comité qualité', daysAgo: 56 },
  { id: 'pd-4', title: 'Protocole de transfusion sanguine', category: 'Protocoles cliniques', version: 'v2.3', status: 'A_REVISER', owner: 'Banque de sang', daysAgo: 180 },
  { id: 'pd-5', title: 'Procédure de gestion des déchets biomédicaux', category: 'Hygiène & sécurité', version: 'v1.5', status: 'PUBLIE', owner: 'Maintenance', daysAgo: 68 },
  { id: 'pd-6', title: 'Règlement intérieur du personnel', category: 'Administratif', version: 'v5.0', status: 'PUBLIE', owner: 'Ressources Humaines', daysAgo: 115 },
  { id: 'pd-7', title: 'Protocole de réanimation cardio-pulmonaire', category: 'Protocoles cliniques', version: 'v3.0', status: 'A_REVISER', owner: 'Dr. Lawson E.', daysAgo: 205 },
  { id: 'pd-8', title: 'Procédure de gestion des risques', category: 'Procédures qualité', version: 'v1.2', status: 'PUBLIE', owner: 'Comité qualité', daysAgo: 4 }
]

async function seedProtocolDocuments(): Promise<void> {
  for (const d of PROTOCOL_DOCUMENTS_SEED) {
    await prisma.protocolDocument.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        title: d.title,
        category: d.category,
        version: d.version,
        status: d.status,
        owner: d.owner,
        revisedAt: daysFromNow(-d.daysAgo)
      }
    })
  }
}

// Phase 6 — Automation Studio : les 7 règles du mock front (features/automation-studio/mock-data.ts)
// deviennent réelles, avec une condition évaluable en code (voir automation.service.ts). Pas de
// AutomationLog seedé : le vrai scheduler (index.ts) peuple le journal dès le démarrage du serveur
// — un log fabriqué à la main serait daté du jour du seed, pas du jour où l'app est ouverte.
const AUTOMATION_RULES_SEED = [
  { id: 'ar-1', name: 'Alerte rupture de stock pharmacie', trigger: 'Stock disponible = 0', action: 'Créer une alerte + notifier la Pharmacie', category: 'STOCKS' as const, active: true },
  { id: 'ar-2', name: 'Rappel de rendez-vous SMS', trigger: '24h avant le rendez-vous', action: 'Envoyer un SMS de rappel au patient', category: 'RENDEZ_VOUS' as const, active: true },
  { id: 'ar-3', name: 'Notification résultat critique', trigger: 'Résultat de laboratoire critique validé', action: 'Notifier le médecin demandeur immédiatement', category: 'LABORATOIRE' as const, active: true },
  { id: 'ar-4', name: 'Relance facture impayée', trigger: 'Facture impayée depuis 30 jours', action: 'Envoyer une relance automatique', category: 'FINANCES' as const, active: true },
  { id: 'ar-5', name: 'Alerte péremption médicament', trigger: 'Péremption dans moins de 30 jours', action: 'Créer une alerte pour la Pharmacie', category: 'STOCKS' as const, active: true },
  { id: 'ar-6', name: 'Suivi post-hospitalisation', trigger: 'Sortie de patient à risque de réadmission', action: 'Planifier un appel de suivi à J+7', category: 'SOINS_PATIENTS' as const, active: false },
  { id: 'ar-7', name: 'Alerte contrat arrivant à échéance', trigger: 'Contrat employé < 30 jours avant fin', action: 'Notifier les Ressources Humaines', category: 'RH' as const, active: true }
]

async function seedAutomationRules(): Promise<void> {
  for (const r of AUTOMATION_RULES_SEED) {
    await prisma.automationRule.upsert({
      where: { id: r.id },
      update: {},
      create: r
    })
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

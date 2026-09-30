-- Nouveau statut « Non admis » (valeur par défaut) : un patient peut être enregistré sans admission.
ALTER TABLE `patient` MODIFY `admissionType` ENUM('NON_ADMIS', 'AMBULATOIRE', 'HOSPITALISE', 'URGENCE') NOT NULL DEFAULT 'NON_ADMIS';

-- HOSPITALISE/URGENCE sont désormais calculés à partir des vraies hospitalisations et passages aux
-- urgences en cours (voir patient-admission.service.ts) : recalcul des fiches existantes, jusqu'ici
-- saisies à la main.
UPDATE `patient` SET `admissionType` = 'NON_ADMIS' WHERE `admissionType` IN ('HOSPITALISE', 'URGENCE');

UPDATE `patient` p SET p.`admissionType` = 'URGENCE'
WHERE EXISTS (
  SELECT 1 FROM `emergency_visit` e
  WHERE e.`patientId` = p.`id` AND e.`deletedAt` IS NULL
    AND e.`status` IN ('EN_COURS', 'EN_OBSERVATION', 'EN_ATTENTE_TRIAGE')
);

UPDATE `patient` p SET p.`admissionType` = 'HOSPITALISE'
WHERE EXISTS (
  SELECT 1 FROM `hospitalization` h
  WHERE h.`patientId` = p.`id` AND h.`deletedAt` IS NULL
    AND h.`status` IN ('HOSPITALISE', 'EN_ATTENTE')
);

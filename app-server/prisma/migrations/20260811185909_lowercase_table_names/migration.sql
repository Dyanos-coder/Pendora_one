-- Aligne les noms de table physiques sur les directives @@map (minuscules), nécessaire pour les
-- hôtes MySQL/MariaDB sensibles à la casse (ex. Hostinger, lower_case_table_names=0) où les
-- requêtes Prisma ciblant "User", "Company", etc. échouaient avec TableDoesNotExist.
RENAME TABLE `Company` TO `company`;
RENAME TABLE `User` TO `user`;
RENAME TABLE `AuditLog` TO `auditlog`;
RENAME TABLE `Invoice` TO `invoice`;

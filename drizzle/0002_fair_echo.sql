ALTER TABLE `crypto_snapshots` MODIFY COLUMN `snapshotDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_snapshots` MODIFY COLUMN `snapshotDate` varchar(10) NOT NULL;
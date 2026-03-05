CREATE TABLE `company_holdings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticker` varchar(16) NOT NULL,
	`company` varchar(128) NOT NULL,
	`category` varchar(16) NOT NULL,
	`datAsset` varchar(16) NOT NULL,
	`holdings` double NOT NULL DEFAULT 0,
	`otherAssets` double NOT NULL DEFAULT 0,
	`liabilities` double NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` varchar(128),
	CONSTRAINT `company_holdings_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_holdings_ticker_unique` UNIQUE(`ticker`)
);
--> statement-breakpoint
CREATE TABLE `crypto_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotDate` date NOT NULL,
	`symbol` varchar(16) NOT NULL,
	`name` varchar(64) NOT NULL,
	`price` double NOT NULL DEFAULT 0,
	`change1d` double NOT NULL DEFAULT 0,
	`change7d` double NOT NULL DEFAULT 0,
	`change30d` double NOT NULL DEFAULT 0,
	`volume` double NOT NULL DEFAULT 0,
	`marketCap` double NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crypto_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotDate` date NOT NULL,
	`ticker` varchar(16) NOT NULL,
	`company` varchar(128) NOT NULL,
	`category` varchar(16) NOT NULL,
	`datAsset` varchar(16) NOT NULL,
	`price` double NOT NULL DEFAULT 0,
	`change1d` double NOT NULL DEFAULT 0,
	`change7d` double NOT NULL DEFAULT 0,
	`change30d` double NOT NULL DEFAULT 0,
	`tokenPrice` double NOT NULL DEFAULT 0,
	`tokenPrice7d` double NOT NULL DEFAULT 0,
	`tokenPrice30d` double NOT NULL DEFAULT 0,
	`mcap` double NOT NULL DEFAULT 0,
	`nav` double NOT NULL DEFAULT 0,
	`mNAV` double NOT NULL DEFAULT 0,
	`vol24h` double NOT NULL DEFAULT 0,
	`vol1dPct` double NOT NULL DEFAULT 0,
	`vol7dAvg` double NOT NULL DEFAULT 0,
	`vol7dPct` double NOT NULL DEFAULT 0,
	`vol30dAvg` double NOT NULL DEFAULT 0,
	`vol30dPct` double NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_snapshots_id` PRIMARY KEY(`id`)
);

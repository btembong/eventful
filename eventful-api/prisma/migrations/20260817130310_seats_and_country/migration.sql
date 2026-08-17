-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "country" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "seatLabel" TEXT;

-- AlterTable
ALTER TABLE "TicketTier" ADD COLUMN     "blockedSeats" TEXT[],
ADD COLUMN     "hasSeating" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "premiumRows" TEXT[],
ADD COLUMN     "seatCols" INTEGER,
ADD COLUMN     "seatRows" INTEGER,
ADD COLUMN     "seatSections" JSONB;

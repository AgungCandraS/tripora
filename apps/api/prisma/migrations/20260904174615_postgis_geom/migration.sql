CREATE EXTENSION IF NOT EXISTS postgis;

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "geom" geography(Point, 4326);

-- AlterTable
ALTER TABLE "destinations" ADD COLUMN     "geom" geography(Point, 4326);

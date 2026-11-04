-- One open request per renter and listing (plan 8 review): repeated requests would each email the owner.
-- A partial unique index on a table that is new in this release: built at once, no lock on older tables.
CREATE UNIQUE INDEX "Booking_one_open_request" ON "Booking" ("renterId", "listingId") WHERE "status" = 'REQUESTED';

/*
# Update administrator password

## Purpose
Sets the password for the existing administrator account (fricaurtes@gmail.com)
to the new credential "aafriga2027-" using bcrypt hashing via pgcrypto.

## What changes
- Updates `auth.users.encrypted_password` for the existing admin user.
- No tables, columns, policies, or grants are modified.
- No data is lost; only the password hash of one existing row changes.

## Security
- The password is hashed with bcrypt (cost factor 10) before storage.
- The plaintext password is NOT stored anywhere.
- This migration is idempotent: re-running it sets the same bcrypt hash.
*/

UPDATE auth.users
SET encrypted_password = crypt('aafriga2027-', gen_salt('bf', 10)),
    updated_at = now()
WHERE email = 'fricaurtes@gmail.com';

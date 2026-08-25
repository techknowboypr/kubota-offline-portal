/*
# Create enquiries table for contact form submissions

1. New Tables
- `enquiries`
- `id` (uuid, primary key)
- `name` (text, not null) - name of the person submitting the enquiry
- `email` (text, not null) - email address
- `phone` (text) - optional phone number
- `state` (text) - optional state selection from dealer locator
- `district` (text) - optional district selection
- `message` (text, not null) - the enquiry message
- `product` (text) - optional product/tractor model interest
- `created_at` (timestamptz, default now())
2. Security
- Enable RLS on `enquiries`.
- Allow anon + authenticated to INSERT (contact form submissions from public visitors).
- No SELECT/UPDATE/DELETE for anon or authenticated (submissions are private to admin).
*/

CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  state text,
  district text,
  message text NOT NULL,
  product text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_enquiries" ON enquiries;
CREATE POLICY "anon_insert_enquiries" ON enquiries FOR INSERT
TO anon, authenticated WITH CHECK (true);

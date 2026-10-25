/**
 * Membuat akun admin, atau mengganti passwordnya jika username sudah ada.
 *
 *   npm run create-admin -w @signage/api -- <username> <password>
 */
import { hashPassword } from "../src/lib/passwords";
import { supabase } from "../src/lib/supabase";

const [rawUsername, password] = process.argv.slice(2);
const username = rawUsername?.trim().toLowerCase();

if (!username || !password) {
  console.error(
    "Usage: npm run create-admin -w @signage/api -- <username> <password>",
  );
  process.exit(1);
}
if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
  console.error(
    "Username must be 3-50 characters: letters, numbers, dot, dash or underscore.",
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const passwordHash = await hashPassword(password);

const { data: existing, error: findError } = await supabase
  .from("admins")
  .select("id")
  .eq("username", username)
  .maybeSingle();
if (findError) {
  console.error("Database error:", findError.message);
  process.exit(1);
}

const { error } = existing
  ? await supabase
      .from("admins")
      .update({ password_hash: passwordHash })
      .eq("id", existing.id)
  : await supabase
      .from("admins")
      .insert({ username, password_hash: passwordHash });
if (error) {
  console.error("Database error:", error.message);
  process.exit(1);
}

console.log(
  existing
    ? `Password updated for "${username}".`
    : `Admin "${username}" created.`,
);

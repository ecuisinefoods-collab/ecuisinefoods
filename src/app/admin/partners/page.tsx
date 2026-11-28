import { redirect } from "next/navigation";

// The former content-creator/referral workflow has been retired.
// Historical partner, click and commission records remain in the database;
// active affiliate management now lives in the rebuilt programme workspace.
export default function LegacyPartnersRedirect() {
  redirect("/admin/affiliate-manager");
}

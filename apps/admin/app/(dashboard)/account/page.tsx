import { PageHeader } from "@shinju-date/ui";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  EmailUpdateForm,
  EmailUpdateFormSkeleton,
} from "./_components/email-update-form";
import { PasswordUpdateForm } from "./_components/password-update-form";
import { getCurrentUserEmail } from "./_lib/get-current-user-email";

export const metadata: Metadata = {
  title: "アカウント設定",
};

const UserEmailData = async () => {
  const currentEmail = await getCurrentUserEmail();

  if (currentEmail === null) {
    redirect("/login");
  }

  return <EmailUpdateForm currentEmail={currentEmail} />;
};

export default function AccountPage() {
  return (
    <div>
      {/* Static header */}
      <PageHeader
        description="ログイン情報を管理し、アカウントのセキュリティを維持します。"
        title="アカウント設定"
      />

      <div className="space-y-8">
        {/* Email form - requires user data */}
        <Suspense fallback={<EmailUpdateFormSkeleton />}>
          <UserEmailData />
        </Suspense>

        {/* Password form - static component */}
        <PasswordUpdateForm />
      </div>
    </div>
  );
}

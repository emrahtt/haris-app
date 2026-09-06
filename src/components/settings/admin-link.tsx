import Link from "next/link";
import { Shield } from "lucide-react";
import { getCurrentAdmin } from "@/lib/admin/auth";
import { Card } from "@/components/ui/card";

/**
 * Settings sayfasında admin olan kullanıcılara gösterilen panel girişi.
 * Server component — non-admin için hiç render edilmez (zero-leak).
 */
export async function AdminLink() {
  const admin = await getCurrentAdmin();
  if (!admin) return null;

  return (
    <Card className="!border-[var(--color-danger)]/30 !bg-[var(--color-danger)]/[0.04] mt-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)] flex items-center justify-center flex-shrink-0">
          <Shield size={16} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-[14px] text-[var(--color-danger)] mb-1">
            Admin Paneli
          </h4>
          <p className="text-[12.5px] text-[var(--color-text-2)] mb-3">
            <code className="text-[var(--color-gold-bright)]">{admin.adminRole}</code>{" "}
            yetkisiyle giriş yaptınız. KVKK başvuruları, audit logları, hesap silme
            kuyruğu ve sistem metriklerine erişebilirsiniz.
          </p>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-[13px] text-[var(--color-danger)] hover:underline font-medium"
          >
            <Shield size={12} /> Admin Paneline Git →
          </Link>
        </div>
      </div>
    </Card>
  );
}

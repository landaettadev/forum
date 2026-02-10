import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { RulesContent } from '@/components/pages/rules-content';
import { RulesBreadcrumb } from '@/components/pages/rules-breadcrumb';

export default function ReglasPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full">
        <RulesBreadcrumb />

        <div className="flex gap-6">
          <main className="flex-1">
            <RulesContent />
          </main>

          <div className="hidden lg:block">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}

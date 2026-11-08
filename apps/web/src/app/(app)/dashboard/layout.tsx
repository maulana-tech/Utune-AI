import { Sidebar } from '../../../components/layout/Sidebar';
import { Topbar } from '../../../components/layout/Topbar';
import { ChatFab } from '../../../features/assistant/ChatPanel';
import { getWorkspaceId } from '../../../lib/get-workspace';
import { WorkspaceProvider } from '../../../lib/workspace-context';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const workspaceId = await getWorkspaceId();

  return (
    <WorkspaceProvider workspaceId={workspaceId}>
      <div className="brutalist flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar workspaceId={workspaceId} />
          <main className="flex-1 overflow-auto bg-muted/20 relative">
            {children}
            <ChatFab />
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
